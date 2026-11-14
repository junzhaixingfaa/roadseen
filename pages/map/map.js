const incidentService = require('../../services/incidentService');
const userService = require('../../services/userService');
const storage = require('../../services/storage');
const surveyData = require('../../data/surveySites');

// 微信 map 使用 GCJ-02。首页固定展示富丰桥调研区域，用户可主动点击“定位到我”。
const SURVEY_CENTER = { latitude: 39.8358, longitude: 116.2873 };
const SURVEY_SITES = surveyData.sites.map((site, markerId) => ({
  id: site.id,
  markerId,
  name: site.name,
  category: site.category,
  lat: site.latitude,
  lng: site.longitude,
  result: site.result,
  summary: site.shortSummary,
  elev: site.elev,
  toilet: site.toilet
}));

Page({
  data: {
    lat: SURVEY_CENTER.latitude,
    lng: SURVEY_CENTER.longitude,
    scale: 16,
    mapH: 480,
    markers: [],
    rows: [],
    filteredRows: [],
    f: { hasElevator: false, hasToilet: false, onlyPass: false },
    showFilter: false,
    showList: false,
    loading: true,
    hasProfile: false,
    userHint: '2026-11-01 实地采集 · 3个已定位点位',
    stats: { pass: 0, assist: 0, blocked: 0, unknown: 0 },
    locating: false,
    locationText: '定位到我',
    pickedMarker: null,
    mapReady: false,
    mapLoaded: false,
    mapSlow: false,
    mapError: '',
    showGuide: false
  },

  onLoad() {
    try {
      const si = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.setData({ mapH: Math.max(350, Math.min(410, si.windowHeight - 230)) });
    } catch (e) { /* ignore */ }
    this.setData({ showGuide: !storage.get('lj_onboarding_done', false) });
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

  onShow() {
    if (storage.get('lj_replay_guide', false)) {
      storage.remove('lj_replay_guide');
      this.setData({ showGuide: true });
    }
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const user = await userService.ensureCurrent();
      if (!user) {
        wx.reLaunch({ url: '/pages/login/login' });
        return;
      }
      const allIncidents = await incidentService.listAll();
      const rows = SURVEY_SITES.map(site => Object.assign({}, site));
      const stats = { pass: 0, assist: 0, blocked: 0, unknown: 0 };
      rows.forEach(r => { stats[r.result] = (stats[r.result] || 0) + 1; });
      this.setData({
        rows,
        stats,
        hasProfile: !!(user && user.profile),
        userHint: '2026-11-01 实地采集 · 3个已定位点位'
      }, () => this.applyFilters());
      const messageIds = allIncidents.map(i => (i.status === 'resolved' ? 'r' : (i.status === 'active' ? 'a' : 'p')) + i.id);
      const unread = userService.unreadMessageCount(messageIds);
      if (unread > 0) wx.setTabBarBadge({ index: 3, text: String(Math.min(unread, 99)) });
      else wx.removeTabBarBadge({ index: 3 });
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
    const markers = fr.map(r => ({
      id: r.markerId,
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
    this.openSurveyDetail(r.id);
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
  focusSurveyArea() {
    this.setData({
      lat: SURVEY_CENTER.latitude,
      lng: SURVEY_CENTER.longitude,
      scale: 16,
      locationText: '富丰桥调研区域'
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
  goSearch() { this.setData({ showList: true }); },
  onMarkerTap(e) {
    const markerId = Number(e.markerId);
    if (markerId === 9999) return;
    const r = this.data.rows.find(item => item.markerId === markerId);
    if (r) this.openSurveyDetail(r.id);
  },
  openPlace(e) {
    const id = e.currentTarget.dataset.id;
    if (id) this.openSurveyDetail(id);
  },
  openSurveyDetail(id) { wx.navigateTo({ url: `/field-survey/detail?site=${id}` }); },
  openSurveyGallery() { wx.navigateTo({ url: '/field-survey/gallery' }); },
  dismissGuide() {
    storage.set('lj_onboarding_done', true);
    this.setData({ showGuide: false });
  },
  guideProfile() {
    storage.set('lj_onboarding_done', true);
    this.setData({ showGuide: false });
    wx.navigateTo({ url: '/pages/profile-setup/profile-setup' });
  }
});
