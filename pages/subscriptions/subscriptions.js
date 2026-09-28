const placeService = require('../../services/placeService');
const incidentService = require('../../services/incidentService');
const userService = require('../../services/userService');
const ruleEngine = require('../../services/ruleEngine');
const { getStatus } = require('../../utils/status');

Page({
  data: { items: [], empty: false },

  async onShow() { await this.load(); },

  async load() {
    const user = await userService.ensureCurrent();
    if (!user) { wx.reLaunch({ url: '/pages/login/login' }); return; }
    const ids = userService.subscriptions();
    if (!ids.length) { this.setData({ items: [], empty: true }); return; }
    const places = await placeService.list();
    const activeMap = incidentService.activeByPlace();
    const byId = {};
    places.forEach(p => { byId[p.id] = p; });
    const items = ids.map(id => {
      const place = byId[id];
      if (!place) return null;
      const incidents = activeMap[id] || [];
      const judge = ruleEngine.judgeAccess(place, user.profile || null, incidents);
      const status = getStatus(judge.result);
      return {
        id,
        name: place.name,
        category: place.category,
        resultText: status.text,
        resultCls: status.cls,
        summary: judge.reasons[0] || '暂无状态说明',
        incidentCount: incidents.length
      };
    }).filter(Boolean);
    this.setData({ items, empty: items.length === 0 });
  },

  open(e) {
    wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + e.currentTarget.dataset.id });
  },

  async unsubscribe(e) {
    const id = e.currentTarget.dataset.id;
    if (!userService.isSubscribed(id)) return;
    await userService.toggleSubscription(id);
    wx.showToast({ title: '已取消订阅', icon: 'none' });
    await this.load();
  },

  goMap() { wx.switchTab({ url: '/pages/map/map' }); }
});
