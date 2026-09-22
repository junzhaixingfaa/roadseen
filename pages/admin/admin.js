const placeService = require('../../services/placeService');
const incidentService = require('../../services/incidentService');
const aiService = require('../../services/aiService');
const userService = require('../../services/userService');
const ruleEngine = require('../../services/ruleEngine');
const storage = require('../../services/storage');
const { getStatus } = require('../../utils/status');
const util = require('../../utils/util');

const TABS = [
  { key: 'inspection', label: '勘察审核' },
  { key: 'incident', label: '事件管理' },
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
    timeText: util.formatDateTime(new Date(i.submittedAt))
  }));
}

function setInspection(id, status) {
  const list = storage.get('lj_inspections', []);
  const it = list.find(x => x.id === id);
  if (it) { it.status = status; it.reviewedAt = Date.now(); storage.set('lj_inspections', list); }
}

Page({
  data: {
    isAdmin: false,
    tabs: TABS,
    tab: 'inspection',
    inspections: [],
    incidents: [],
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
    const [all, incidents, logs] = await Promise.all([
      placeService.list(),
      incidentService.listAll(),
      aiService.listLogs()
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
      places,
      aiLogs: logs.map(l => ({ stepKey: l.stepKey, ok: l.ok, msg: l.msg, timeText: util.formatDateTime(new Date(l.at)) }))
    });
  },

  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.key }); },

  approve(e) {
    setInspection(e.currentTarget.dataset.id, 'approved');
    wx.showToast({ title: '已通过', icon: 'none' });
    this.setData({ inspections: fmtInspections() });
  },
  reject(e) {
    setInspection(e.currentTarget.dataset.id, 'rejected');
    wx.showToast({ title: '已驳回', icon: 'none' });
    this.setData({ inspections: fmtInspections() });
  },

  resolveIncident(e) {
    const id = e.currentTarget.dataset.id;
    incidentService.resolve(id).then(() => {
      wx.showToast({ title: '已标记恢复，触发重算', icon: 'none' });
      this.loadAll();
    });
  },

  openPlace(e) {
    wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + e.currentTarget.dataset.id });
  },

  goMine() { wx.switchTab({ url: '/pages/mine/mine' }); }
});
