const placeService = require('../../services/placeService');
const incidentService = require('../../services/incidentService');
const userService = require('../../services/userService');
const ruleEngine = require('../../services/ruleEngine');
const { getStatus } = require('../../utils/status');

Page({
  data: {
    items: [],
    empty: false
  },

  async onShow() {
    const user = await userService.ensureCurrent();
    const profile = user && user.profile;
    const ids = userService.favorites();
    if (!ids.length) { this.setData({ items: [], empty: true }); return; }
    const places = await placeService.list();
    const activeMap = incidentService.activeByPlace();
    const byId = {};
    places.forEach(p => { byId[p.id] = p; });
    const items = [];
    ids.forEach(id => {
      const place = byId[id];
      if (!place) return;
      const j = ruleEngine.judgeAccess(place, profile || null, activeMap[id] || []);
      const st = getStatus(j.result);
      items.push({
        id: place.id,
        name: place.name,
        category: place.category || '',
        address: place.address || '',
        resultText: st.text,
        resultCls: st.cls,
        summary: j.reasons[0] || ''
      });
    });
    this.setData({ items, empty: items.length === 0 });
  },

  open(e) {
    wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + e.currentTarget.dataset.id });
  },

  goMap() { wx.switchTab({ url: '/pages/map/map' }); }
});
