const placeService = require('../../services/placeService');
const incidentService = require('../../services/incidentService');
const evidenceService = require('../../services/evidenceService');
const aiService = require('../../services/aiService');
const userService = require('../../services/userService');
const ruleEngine = require('../../services/ruleEngine');
const reviewService = require('../../services/reviewService');
const storage = require('../../services/storage');
const { getStatus } = require('../../utils/status');
const util = require('../../utils/util');

const TABS = [
  { key: 'inspection', label: '勘察审核' },
  { key: 'incident', label: '事件管理' },
  { key: 'review', label: '纠错复核' },
  { key: 'place', label: '地点状态' },
  { key: 'ai', label: 'AI 日志' }
];

const FAC_TEXT = { elevator: '电梯', ramp: '坡道', path: '通道', toilet: '无障碍厕所', door: '门', openTime: '开放时间', other: '其他' };

function fmtInspections() {
  const list = storage.get('lj_inspections', []);
  return list.map(i => ({
    id: i.id,
    placeName: i.placeName,
    submittedBy: i.submittedBy,
    status: i.status,
    statusText: i.status === 'pending' ? '待审核' : (i.status === 'approved' ? '已通过' : '已驳回'),
    itemCount: (i.items || []).length,
    items: (i.items || []).map(x => ({
      key: x.key,
      title: x.title,
      photo: x.photo || '',
      choice: x.choice,
      choiceText: x.choice === 'confirmed' ? '已确认' : (x.choice === 'modified' ? '人工修改' : '标记未知'),
      detectedText: (x.aiDetected || []).join('、') || '未识别到明确设施',
      ocrText: x.ocrText || '',
      detailText: [x.stepCount !== '' && x.stepCount != null ? ('台阶 ' + x.stepCount + ' 级') : '', x.doorType || '', x.elevatorStatus || ''].filter(Boolean).join(' · ')
    })),
    reviewNote: i.reviewNote || '',
    timeText: util.formatDateTime(new Date(i.submittedAt))
  }));
}

function setInspection(id, status, extra) {
  const list = storage.get('lj_inspections', []);
  const it = list.find(x => x.id === id);
  if (it) {
    Object.assign(it, extra || {}, { status, reviewedAt: Date.now() });
    storage.set('lj_inspections', list);
  }
  return it || null;
}

function hasLabel(item, label) {
  return !!item && (item.aiDetected || []).indexOf(label) >= 0;
}

async function publishInspection(inspection) {
  const place = await placeService.get(inspection.placeId);
  if (!place) throw new Error('关联地点不存在');

  const usable = (inspection.items || []).filter(i => i.choice !== 'unknown');
  const byKey = key => usable.find(i => i.key === key);
  const entrances = (place.entrances || []).map(e => Object.assign({}, e));
  const rec = entrances.find(e => e.isRecommended) || entrances[0];
  const entrance = byKey('entrance');
  const step = byKey('step');
  const door = byKey('door') || entrance;
  if (rec) {
    if (entrance) rec.hasRamp = hasLabel(entrance, '坡道');
    if (step) {
      rec.hasSteps = hasLabel(step, '台阶') || Number(step.stepCount) > 0;
      rec.stepCount = step.stepCount === '' ? rec.stepCount : Number(step.stepCount);
      rec.hasRamp = hasLabel(step, '坡道');
    }
    if (door && door.doorType) rec.doorType = door.doorType;
  }

  const facilities = Object.assign({}, place.facilities);
  const elevator = byKey('elevator');
  if (elevator) {
    facilities.elevator = Object.assign({}, facilities.elevator, {
      has: hasLabel(elevator, '电梯'),
      status: elevator.elevatorStatus || 'unknown'
    });
  }
  const toilet = byKey('toilet');
  if (toilet) {
    facilities.accessibleToilet = Object.assign({}, facilities.accessibleToilet, {
      has: hasLabel(toilet, '厕所标识'),
      status: hasLabel(toilet, '厕所标识') ? 'open' : 'unknown'
    });
  }

  placeService.saveOverride(place.id, {
    entrances,
    facilities,
    lastVerifiedAt: util.formatDate(new Date()),
    collectedBy: inspection.submittedBy,
    pendingInspection: false
  });
  usable.filter(i => i.photo).forEach(i => evidenceService.addEvidence({
    placeId: place.id,
    entranceId: rec ? rec.id : '',
    type: i.key,
    imageUrl: i.photo,
    collectedAt: util.formatDate(new Date()),
    source: 'volunteer',
    aiTags: i.aiDetected || [],
    confirmStatus: 'confirmed',
    isTestData: true
  }));
}

Page({
  data: {
    isAdmin: false,
    tabs: TABS,
    tab: 'inspection',
    inspections: [],
    incidents: [],
    reviews: [],
    places: [],
    aiLogs: []
  },

  async onShow() {
    const u = await userService.ensureCurrent();
    const ok = u && u.role === 'admin';
    this.setData({ isAdmin: ok });
    if (!ok) return;
    await this.loadAll();
  },

  async loadAll() {
    const user = userService.current();
    const profile = user && user.profile;
    const [all, incidents, logs, reviews] = await Promise.all([
      placeService.list(),
      incidentService.listAll(),
      aiService.listLogs(),
      reviewService.listAll()
    ]);
    const places = [];
    for (const p of all) {
      const active = await incidentService.listActiveForPlace(p.id);
      const j = ruleEngine.judgeAccess(p, profile || null, active);
      const st = getStatus(j.result);
      places.push({ id: p.id, name: p.name, resultText: st.text, resultCls: st.cls, entrance: (p.entrances || []).length, pending: !!p.pendingInspection });
    }
    this.setData({
      inspections: fmtInspections(),
      incidents: incidents.map(i => ({
        id: i.id, placeId: i.placeId, facilityText: FAC_TEXT[i.facility] || i.facility,
        type: i.type, description: i.description, status: i.status,
        statusText: i.status === 'active' ? '进行中' : (i.status === 'resolved' ? '已恢复' : '待复核'),
        expectedEndAt: i.expectedEndAt || '', isTestData: !!i.isTestData
      })),
      reviews: reviews.map(r => ({
        id: r.id,
        placeId: r.placeId,
        placeName: r.placeName || '未知地点',
        kindText: r.kindText || r.kind,
        submittedBy: r.submittedBy || '匿名',
        status: r.status,
        statusText: r.status === 'pending' ? '待处理' : (r.status === 'accepted' ? '已采纳' : '已忽略'),
        reviewNote: r.reviewNote || '',
        timeText: util.formatDateTime(new Date(r.createdAt))
      })),
      places,
      aiLogs: logs.map(l => ({ stepKey: l.stepKey, ok: l.ok, msg: l.msg, timeText: util.formatDateTime(new Date(l.at)) }))
    });
  },

  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.key }); },

  async approve(e) {
    const id = e.currentTarget.dataset.id;
    const inspection = storage.get('lj_inspections', []).find(x => x.id === id);
    if (!inspection) return;
    try {
      await publishInspection(inspection);
      setInspection(id, 'approved', { reviewNote: '审核通过，已发布到地点资料' });
      wx.showToast({ title: '已审核并发布', icon: 'none' });
      await this.loadAll();
    } catch (err) {
      wx.showModal({ title: '无法发布', content: err.message || '请检查勘察数据', showCancel: false });
    }
  },
  reject(e) {
    const id = e.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: ['照片不清晰，需要补拍', '字段信息不完整', '地点选择错误'],
      success: r => {
        const notes = ['照片不清晰，需要补拍', '字段信息不完整', '地点选择错误'];
        setInspection(id, 'rejected', { reviewNote: notes[r.tapIndex] });
        wx.showToast({ title: '已驳回并记录原因', icon: 'none' });
        this.setData({ inspections: fmtInspections() });
      }
    });
  },

  resolveIncident(e) {
    const id = e.currentTarget.dataset.id;
    incidentService.resolve(id).then(() => {
      wx.showToast({ title: '已标记恢复，触发重算', icon: 'none' });
      this.loadAll();
    });
  },

  reviewFeedback(e) {
    const id = e.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: ['采纳并记录', '忽略该反馈'],
      success: r => {
        const accepted = r.tapIndex === 0;
        reviewService.setStatus(id, accepted ? 'accepted' : 'ignored', accepted ? '管理员已采纳该复核反馈' : '管理员判断无需修改').then(() => {
          wx.showToast({ title: accepted ? '已采纳' : '已忽略', icon: 'none' });
          this.loadAll();
        });
      }
    });
  },

  openPlace(e) {
    wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + e.currentTarget.dataset.id });
  },

  goMine() { wx.switchTab({ url: '/pages/mine/mine' }); }
});
