const placeService = require('../../services/placeService');
const incidentService = require('../../services/incidentService');
const userService = require('../../services/userService');
const ruleEngine = require('../../services/ruleEngine');
const { getStatus } = require('../../utils/status');
const campus = require('../../data/campus');

Page({
  data: {
    lat: campus.center.latitude,
    lng: campus.center.longitude,
    scale: campus.defaultZoom,
    mapH: 480,
    markers: [],
    rows: [],
    filteredRows: [],
    f: { hasElevator: false, hasToilet: false, onlyPass: false },
    showFilter: false,
    sel: null,
    loading: true,
    hasProfile: false
  },

  onLoad() {
    try {
      const si = wx.getSystemInfoSync();
      this.setData({ mapH: si.windowHeight - 100 });
    } catch (e) { /* ignore */ }
    this.locate();
  },

  onShow() { this.load(); },

  locate() {
    wx.getLocation({
      type: 'gcj02',
      success: (r) => this.setData({ lat: r.latitude, lng: r.longitude }),
      fail: () => { /* 用默认校园中心 */ }
    });
  },

  async load() {
    this.setData({ loading: true });
    try {
      const user = await userService.ensureCurrent();
      const profile = user && user.profile;
      const places = await placeService.list();
      const active = incidentService.activeByPlace();
      const rows = places.map(p => {
        const j = ruleEngine.judgeAccess(p, profile || null, active[p.id] || []);
        return {
          id: p.id, name: p.name, category: p.category,
          result: j.result, summary: j.reasons[0] || '',
          lat: p.location.latitude, lng: p.location.longitude,
          elev: !!(p.facilities && p.facilities.elevator && p.facilities.elevator.has),
          toilet: !!(p.facilities && p.facilities.accessibleToilet && p.facilities.accessibleToilet.has),
          rec: p.entrances[0] || null
        };
      });
      this.setData({ rows, hasProfile: !!profile }, () => this.applyFilters());
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
    this.setData({ loading: false });
  },

  applyFilters() {
    const f = this.data.f;
    const fr = this.data.rows.filter(r => {
      if (f.hasElevator && !r.elev) return false;
      if (f.hasToilet && !r.toilet) return false;
      if (f.onlyPass && r.result !== 'pass') return false;
      return true;
    });
    const markers = fr.map((r, i) => ({
      id: i,
      latitude: r.lat,
      longitude: r.lng,
      iconPath: '/images/markers/' + r.result + '.png',
      width: 30,
      height: 30,
      callout: {
        content: r.name, color: '#303133', fontSize: 11, borderRadius: 6,
        borderWidth: 1, borderColor: '#dcdfe6', bgColor: '#ffffff', padding: 4,
        display: 'ALWAYS', textAlign: 'center'
      }
    }));
    this.setData({ filteredRows: fr, markers });
  },

  toggleFilter() { this.setData({ showFilter: !this.data.showFilter }); },
  onChip(e) {
    const k = e.currentTarget.dataset.k;
    const f = this.data.f;
    f[k] = !f[k];
    this.setData({ f }, () => this.applyFilters());
  },
  goSearch() { wx.navigateTo({ url: '/pages/search/search' }); },
  onMarkerTap(e) {
    const r = this.data.filteredRows[e.markerId];
    if (r) this.setData({ sel: r });
  },
  closeSheet() { this.setData({ sel: null }); },
  viewDetail() {
    const r = this.data.sel;
    if (r) wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + r.id });
  },
  navTo() {
    const r = this.data.sel;
    if (!r) return;
    const loc = (r.rec && r.rec.location) ? r.rec.location : { latitude: r.lat, longitude: r.lng };
    wx.openLocation({
      latitude: loc.latitude, longitude: loc.longitude,
      name: r.name, address: (r.rec && r.rec.direction) || '推荐无障碍入口', scale: 18
    });
  },
  async addFav() {
    const r = this.data.sel;
    if (!r) return;
    const res = await userService.toggleFavorite(r.id);
    wx.showToast({ title: res.favorite ? '已收藏' : '已取消收藏', icon: 'none' });
  }
});
