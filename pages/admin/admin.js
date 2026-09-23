const placeService = require('../../services/placeService');
const incidentService = require('../../services/incidentService');
const evidenceService = require('../../services/evidenceService');
const aiService = require('../../services/aiService');
const userService = require('../../services/userService');
const ruleEngine = require('../../services/ruleEngine');
const reviewService = require('../../services/reviewService');
const inspectionService = require('../../services/inspectionService');
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
  const list = inspectionService.list();
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
    const activeMap = incidentService.activeByPlace();
    const places = all.map(p => {
      const j = ruleEngine.judgeAccess(p, profile || null, activeMap[p.id] || []);
      const st = getStatus(j.result);
      return { id: p.id, name: p.name, resultText: st.text, resultCls: st.cls, entrance: (p.entrances || []).length, pending: !!p.pendingInspection };
    });
    this.setData({
      inspections: fmtInspections(),
      incidents: incidents.map(i => ({
        id: i.id, placeId: i.placeId, facilityText: FAC_TEXT[i.facility] || i.facility,
        type: i.type, description: i.description, status: i.status,
        statusText: i.status === 'active' ? '进行中' : (i.status === 'resolved' ? '已恢复' : '已过期，待复核'),
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
    const inspection = inspectionService.getById(id);
    if (!inspection) return;
    const publish = async () => {
      try {
        const r = await inspectionService.publish(inspection);
        inspectionService.setStatus(id, 'approved', { reviewNote: '审核通过，已发布到地点资料' });
        wx.showToast({ title: r.changes.length ? ('已发布 ' + r.changes.length + ' 项变更') : '已发布', icon: 'none' });
        await this.loadAll();
      } catch (err) {
        wx.showModal({ title: '无法发布', content: err.message || '请检查勘察数据', showCancel: false });
      }
    };
    const place = await placeService.get(inspection.placeId);
    if (inspectionService.hasVerifiedEntrance(place)) {
      // AI 识别目前是演示数据，覆盖已核实地点会把真实结论换成假结论，必须显式确认。
      wx.showModal({
        title: '覆盖已核实数据？',
        content: '「' + place.name + '」已有核实过的入口信息，发布将用本次勘察结果覆盖。当前 AI 识别为演示数据，建议只在待勘察地点上演示发布。',
        confirmText: '仍要发布',
        cancelText: '取消',
        success: r => { if (r.confirm) publish(); }
      });
      return;
    }
    await publish();
  },
  reject(e) {
    const id = e.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: ['照片不清晰，需要补拍', '字段信息不完整', '地点选择错误'],
      success: r => {
        const notes = ['照片不清晰，需要补拍', '字段信息不完整', '地点选择错误'];
        inspectionService.setStatus(id, 'rejected', { reviewNote: notes[r.tapIndex] });
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

  // 事件到期后进入 pending_review，必须由管理员判定是已恢复还是仍在进行，否则会成为死状态
  reactivateIncident(e) {
    const id = e.currentTarget.dataset.id;
    incidentService.reactivate(id).then(() => {
      wx.showToast({ title: '已恢复为进行中，需再次人工确认恢复', icon: 'none' });
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
