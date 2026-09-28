const placeService = require('../../services/placeService');
const incidentService = require('../../services/incidentService');
const userService = require('../../services/userService');
const ruleEngine = require('../../services/ruleEngine');
const { getStatus } = require('../../utils/status');

Page({
  data: { items: [], empty: false },
  async onShow() {
    const user = await userService.ensureCurrent();
    if (!user) { wx.reLaunch({ url: '/pages/login/login' }); return; }
    const recent = userService.recentPlaces();
    const places = await placeService.list();
    const activeMap = incidentService.activeByPlace();
    const byId = {};
    places.forEach(p => { byId[p.id] = p; });
    const items = recent.map(x => {
      const p = byId[x.id];
      if (!p) return null;
      const judge = ruleEngine.judgeAccess(p, user.profile || null, activeMap[p.id] || []);
      const status = getStatus(judge.result);
      return { id: p.id, name: p.name, category: p.category, resultText: status.text, resultCls: status.cls, summary: judge.reasons[0] || '', timeText: this.relativeTime(x.at) };
    }).filter(Boolean);
    this.setData({ items, empty: items.length === 0 });
  },
  relativeTime(at) {
    const mins = Math.max(0, Math.floor((Date.now() - Number(at || 0)) / 60000));
    if (mins < 1) return '刚刚查看';
    if (mins < 60) return mins + ' 分钟前';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + ' 小时前';
    return Math.floor(hours / 24) + ' 天前';
  },
  open(e) { wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + e.currentTarget.dataset.id }); },
  goMap() { wx.switchTab({ url: '/pages/map/map' }); }
});
