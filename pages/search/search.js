const placeService = require('../../services/placeService');
const incidentService = require('../../services/incidentService');
const userService = require('../../services/userService');
const ruleEngine = require('../../services/ruleEngine');

Page({
  data: {
    keyword: '',
    f: { hasElevator: false, hasToilet: false, onlyPass: false },
    list: []
  },

  onLoad() { this.load(); },

  onInput(e) { this.setData({ keyword: e.detail.value }, () => this.load()); },

  onChip(e) {
    const k = e.currentTarget.dataset.k;
    const f = this.data.f;
    f[k] = !f[k];
    this.setData({ f }, () => this.load());
  },

  async load() {
    const user = await userService.ensureCurrent();
    const profile = user && user.profile;
    const places = await placeService.search(this.data.keyword);
    const active = incidentService.activeByPlace();
    let rows = places.map(p => {
      const j = ruleEngine.judgeAccess(p, profile || null, active[p.id] || []);
      return {
        id: p.id, name: p.name, category: p.category, address: p.address,
        result: j.result, summary: j.reasons[0] || '',
        elev: !!(p.facilities && p.facilities.elevator && p.facilities.elevator.has),
        toilet: !!(p.facilities && p.facilities.accessibleToilet && p.facilities.accessibleToilet.has)
      };
    });
    const f = this.data.f;
    rows = rows.filter(r => {
      if (f.hasElevator && !r.elev) return false;
      if (f.hasToilet && !r.toilet) return false;
      if (f.onlyPass && r.result !== 'pass') return false;
      return true;
    });
    this.setData({ list: rows });
  },

  open(e) {
    wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + e.currentTarget.dataset.id });
  }
});
