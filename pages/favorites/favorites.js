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
    const items = [];
    for (const id of ids) {
      const place = await placeService.get(id);
      if (!place) continue;
      const active = await incidentService.listActiveForPlace(id);
      const j = ruleEngine.judgeAccess(place, profile || null, active);
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
    }
    this.setData({ items, empty: false });
  },

  open(e) {
    wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + e.currentTarget.dataset.id });
  },

  goMap() { wx.switchTab({ url: '/pages/map/map' }); }
});
