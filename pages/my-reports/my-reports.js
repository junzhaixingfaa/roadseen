const incidentService = require('../../services/incidentService');
const placeService = require('../../services/placeService');
const userService = require('../../services/userService');

const STATUS = {
  active: { text: '处理中', cls: 'active', step: '已记录，等待现场恢复' },
  resolved: { text: '已恢复', cls: 'resolved', step: '管理员已确认恢复' },
  pending_review: { text: '待复核', cls: 'review', step: '已到预计时间，等待现场复核' }
};

Page({
  data: { items: [], empty: false, stats: { active: 0, resolved: 0, review: 0 } },
  async onShow() {
    const user = await userService.ensureCurrent();
    if (!user) { wx.reLaunch({ url: '/pages/login/login' }); return; }
    const [incidents, places] = await Promise.all([incidentService.listAll(), placeService.list()]);
    const names = {};
    places.forEach(p => { names[p.id] = p.name; });
    const mine = incidents.filter(i => i.reportBy === user.id).sort((a, b) => String(b.occurredAt || '').localeCompare(String(a.occurredAt || '')));
    const stats = { active: 0, resolved: 0, review: 0 };
    const items = mine.map(i => {
      const status = STATUS[i.status] || STATUS.pending_review;
      if (i.status === 'active') stats.active++;
      else if (i.status === 'resolved') stats.resolved++;
      else stats.review++;
      return Object.assign({}, i, { placeName: names[i.placeId] || '未知地点', statusText: status.text, statusCls: status.cls, progressText: status.step });
    });
    this.setData({ items, stats, empty: items.length === 0 });
  },
  open(e) { wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + e.currentTarget.dataset.id }); },
  goReport() { wx.switchTab({ url: '/pages/incident-report/incident-report' }); }
});
