const placeService = require('../../services/placeService');
const incidentService = require('../../services/incidentService');
const userService = require('../../services/userService');
const ruleEngine = require('../../services/ruleEngine');
const { getStatus } = require('../../utils/status');
const campus = placeService.getCampusConfig();

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
    showList: false,
    loading: true,
    hasProfile: false,
    userHint: '按通用轮椅条件计算',
    stats: { pass: 0, assist: 0, blocked: 0, unknown: 0 },
    locating: false,
    locationText: '定位到我',
    pickedMarker: null,
    mapReady: false,
    mapLoaded: false,
    mapSlow: false,
    mapError: ''
  },

  onLoad() {
    try {
      const si = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.setData({ mapH: Math.max(350, Math.min(410, si.windowHeight - 230)) });
    } catch (e) { /* ignore */ }
    this.startMapTimer();
  },

  startMapTimer() {
    if (this.mapLoadTimer) clearTimeout(this.mapLoadTimer);
    this.mapLoadTimer = setTimeout(() => {
      if (!this.data.mapLoaded) this.setData({ mapSlow: true });
    }, 3500);
  },

  onUnload() {
    if (this.mapLoadTimer) clearTimeout(this.mapLoadTimer);
  },

  onShow() { this.load(); },

  async load() {
    this.setData({ loading: true });
    try {
      const user = await userService.ensureCurrent();
      if (!user) {
        wx.reLaunch({ url: '/pages/login/login' });
        return;
      }
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
          rec: p.entrances[0] || null,
          statusText: getStatus(j.result).text
        };
      });
      const latitudes = rows.map(r => r.lat);
      const longitudes = rows.map(r => r.lng);
      const minLat = Math.min.apply(null, latitudes);
      const maxLat = Math.max.apply(null, latitudes);
      const minLng = Math.min.apply(null, longitudes);
      const maxLng = Math.max.apply(null, longitudes);
      rows.forEach(r => {
        r.mapX = Math.round(12 + 76 * ((r.lng - minLng) / ((maxLng - minLng) || 1)));
        r.mapY = Math.round(14 + 68 * ((maxLat - r.lat) / ((maxLat - minLat) || 1)));
      });
      const stats = { pass: 0, assist: 0, blocked: 0, unknown: 0 };
      rows.forEach(r => { stats[r.result] = (stats[r.result] || 0) + 1; });
      this.setData({
        rows,
        stats,
        hasProfile: !!profile,
        userHint: profile ? ('已按“' + (profile.device || '个人档案') + '”条件计算') : '按通用轮椅条件计算'
      }, () => this.applyFilters());
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
        display: 'BYCLICK', textAlign: 'center'
      }
    }));
    if (this.data.pickedMarker) markers.push(this.data.pickedMarker);
    this.setData({ filteredRows: fr, markers });
  },

  toggleFilter() { this.setData({ showFilter: !this.data.showFilter }); },
  onChip(e) {
    const k = e.currentTarget.dataset.k;
    const f = Object.assign({}, this.data.f, { [k]: !this.data.f[k] });
    this.setData({ f }, () => this.applyFilters());
  },
  toggleList() { this.setData({ showList: !this.data.showList }); },
  goQuickCheck() { wx.switchTab({ url: '/pages/quick-check/quick-check' }); },
  reportIncident() { wx.switchTab({ url: '/pages/incident-report/incident-report' }); },
  pickFromList(e) {
    const r = this.data.filteredRows.find(item => item.id === e.currentTarget.dataset.id);
    if (!r) return;
    wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + r.id });
  },
  locateMe() {
    if (this.data.locating) return;
    this.setData({ locating: true, locationText: '正在定位…' });
    wx.getLocation({
      type: 'gcj02',
      success: res => {
        this.setData({
          lat: res.latitude,
          lng: res.longitude,
          scale: 17,
          locating: false,
          locationText: '已定位到我'
        });
        if (this.mapCtx && typeof this.mapCtx.moveToLocation === 'function') {
          this.mapCtx.moveToLocation({ latitude: res.latitude, longitude: res.longitude });
        }
      },
      fail: () => {
        this.setData({ locating: false, locationText: '定位到我' });
        wx.showModal({
          title: '暂时无法定位',
          content: '仍可使用地点列表体验全部功能。真机使用时，请允许微信获取位置信息。',
          showCancel: false
        });
      }
    });
  },
  onMapReady() {
    if (this.mapLoadTimer) clearTimeout(this.mapLoadTimer);
    if (!this.data.mapReady) this.mapCtx = wx.createMapContext('m', this);
    if (!this.data.mapLoaded || !this.data.mapReady) {
      this.setData({ mapReady: true, mapLoaded: true, mapSlow: false, mapError: '' });
    }
  },
  onMapError(e) {
    const msg = e && e.detail && e.detail.errMsg ? e.detail.errMsg : '地图底图加载失败';
    this.setData({ mapLoaded: false, mapError: msg, mapSlow: false });
  },
  retryMap() {
    this.setData({ mapSlow: false, mapError: '', mapLoaded: false });
    this.startMapTimer();
  },
  chooseRealPlace() {
    wx.chooseLocation({
      success: res => {
        const marker = {
          id: 9999,
          latitude: res.latitude,
          longitude: res.longitude,
          iconPath: '/images/markers/unknown.png',
          width: 30,
          height: 30,
          callout: {
            content: (res.name || '所选地点') + '（未检查）', color: '#103F4A', fontSize: 12,
            borderRadius: 8, borderWidth: 1, borderColor: '#C8D8D6',
            bgColor: '#ffffff', padding: 6, display: 'ALWAYS'
          }
        };
        this.setData({
          pickedMarker: marker,
          lat: res.latitude,
          lng: res.longitude,
          scale: 17,
          locationText: res.name || '已选择地点'
        }, () => this.applyFilters());
      },
      fail: err => {
        if (!err || !String(err.errMsg || '').includes('cancel')) {
          wx.showToast({ title: '暂时无法打开地点选择', icon: 'none' });
        }
      }
    });
  },
  goSearch() { wx.navigateTo({ url: '/pages/search/search' }); },
  onMarkerTap(e) {
    const markerId = Number(e.markerId);
    if (markerId === 9999) return;
    const r = this.data.filteredRows[markerId];
    if (r) wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + r.id });
  },
  openPlace(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + id });
  }
});
