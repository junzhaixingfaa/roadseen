const incidentService = require('../../services/incidentService');
const placeService = require('../../services/placeService');
const userService = require('../../services/userService');
const fileService = require('../../services/fileService');
const storage = require('../../services/storage');
const util = require('../../utils/util');
const surveyData = require('../../data/surveySites');
const campus = placeService.getCampusConfig();

const QUICK_PLACES = surveyData.sites.map(site => ({
  id: site.id,
  name: site.name,
  category: site.category
}));

Page({
  data: {
    placeId: '',
    placeName: '',
    quickPlaces: QUICK_PLACES,
    types: campus.incidentTypes,
    typeIndex: 0,
    facility: campus.incidentTypes[0].facility,
    description: '',
    occurredAt: util.formatDate(new Date()),
    expectedEndAt: '',
    photo: '',
    submitting: false
  },

  async onShow() {
    const targetId = storage.get('lj_incident_target', '');
    if (!targetId) return;
    storage.remove('lj_incident_target');
    const quick = QUICK_PLACES.find(place => place.id === targetId);
    const place = quick || await placeService.get(targetId);
    if (place) this.selectPlace(place.id, place.name);
  },

  selectPlace(placeId, placeName) {
    this._placeName = placeName;
    this._placeId = placeId;
    this.setData({ placeId, placeName });
  },
  chooseQuickPlace(e) {
    const place = QUICK_PLACES.find(item => item.id === e.currentTarget.dataset.id);
    if (place) this.selectPlace(place.id, place.name);
  },
  onPlaceInput(e) {
    const value = e.detail.value;
    this._placeName = value;
    if (value.trim() !== this.data.placeName.trim()) this._placeId = '';
  },
  onPlaceBlur(e) {
    const placeName = e.detail.value.trim();
    const quick = QUICK_PLACES.find(item => item.name === placeName);
    this._placeName = placeName;
    this._placeId = quick ? quick.id : '';
    this.setData({ placeName, placeId: this._placeId });
  },
  onType(e) {
    const i = Number(e.detail.value);
    this.setData({ typeIndex: i, facility: this.data.types[i].facility });
  },
  onDescInput(e) { this._description = e.detail.value; },
  onDescBlur(e) {
    this._description = e.detail.value;
    this.setData({ description: e.detail.value });
  },
  onOccurred(e) { this.setData({ occurredAt: e.detail.value }); },
  onEnd(e) { this.setData({ expectedEndAt: e.detail.value }); },
  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async res => {
        const photo = await fileService.persist(res.tempFiles[0].tempFilePath);
        this.setData({ photo });
      }
    });
  },

  async submit() {
    if (this.data.submitting) return;
    const description = String(this._description === undefined ? this.data.description : this._description).trim();
    const placeName = String(this._placeName === undefined ? this.data.placeName : this._placeName).trim();
    if (!placeName) { wx.showToast({ title: '请填写地点', icon: 'none' }); return; }
    if (!description) { wx.showToast({ title: '请填写说明', icon: 'none' }); return; }
    const quick = QUICK_PLACES.find(item => item.name === placeName);
    const placeId = quick ? quick.id : (this._placeId || `custom:${placeName}`);
    // 预计结束时间早于今天会被 expireSweep 立刻降级，用户会看到「上报了但地图没变化」
    if (this.data.expectedEndAt && this.data.expectedEndAt < util.formatDate(new Date())) {
      wx.showToast({ title: '预计结束时间不能早于今天', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      const user = userService.current();
      const t = this.data.types[this.data.typeIndex];
      await incidentService.report({
        placeId,
        placeName,
        facility: t.facility,
        type: t.label,
        description,
        imageUrl: this.data.photo,
        occurredAt: this.data.occurredAt,
        expectedEndAt: this.data.expectedEndAt,
        reportBy: user ? user.id : 'user'
      });
      wx.showToast({ title: '已上报，已记入该地点通行卡', icon: 'none' });
      this._description = '';
      this._placeName = '';
      this._placeId = '';
      this.setData({ placeId: '', placeName: '', description: '', expectedEndAt: '', photo: '' });
      setTimeout(() => wx.switchTab({ url: '/pages/map/map' }), 800);
    } finally {
      this.setData({ submitting: false });
    }
  }
});
