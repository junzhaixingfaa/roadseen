const incidentService = require('../../services/incidentService');
const placeService = require('../../services/placeService');
const userService = require('../../services/userService');
const fileService = require('../../services/fileService');
const storage = require('../../services/storage');
const util = require('../../utils/util');
const campus = placeService.getCampusConfig();

Page({
  data: {
    placeId: '',
    places: [],
    placeIndex: 0,
    types: campus.incidentTypes,
    typeIndex: 0,
    facility: campus.incidentTypes[0].facility,
    description: '',
    occurredAt: util.formatDate(new Date()),
    expectedEndAt: '',
    photo: '',
    submitting: false
  },

  onLoad() {
    this.ensurePlaces();
  },

  async onShow() {
    await this.ensurePlaces();
    const targetId = storage.get('lj_incident_target', '');
    if (!targetId) return;
    storage.remove('lj_incident_target');
    const idx = this.data.places.findIndex(p => p.id === targetId);
    if (idx >= 0) this.setData({ placeId: targetId, placeIndex: idx });
  },

  ensurePlaces() {
    if (this._placesPromise) return this._placesPromise;
    this._placesPromise = placeService.list().then(places => {
      if (!places.length) {
        wx.showModal({ title: '暂无地点', content: '请先添加地点后再上报动态。', showCancel: false });
        return;
      }
      this.setData({
        placeId: this.data.placeId || places[0].id,
        places: places.map(p => ({ id: p.id, name: p.name })),
        placeIndex: this.data.placeIndex || 0,
        facility: this.data.types[0].facility
      });
    }).finally(() => { this._placesPromise = null; });
    return this._placesPromise;
  },

  onPlace(e) {
    const i = Number(e.detail.value);
    this.setData({ placeIndex: i, placeId: this.data.places[i].id });
  },
  onType(e) {
    const i = Number(e.detail.value);
    this.setData({ typeIndex: i, facility: this.data.types[i].facility });
  },
  onDesc(e) { this.setData({ description: e.detail.value }); },
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
    if (!this.data.description.trim()) { wx.showToast({ title: '请填写说明', icon: 'none' }); return; }
    if (!this.data.placeId) { wx.showToast({ title: '请先选择地点', icon: 'none' }); return; }
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
        placeId: this.data.placeId,
        facility: t.facility,
        type: t.label,
        description: this.data.description.trim(),
        imageUrl: this.data.photo,
        occurredAt: this.data.occurredAt,
        expectedEndAt: this.data.expectedEndAt,
        reportBy: user ? user.id : 'user'
      });
      wx.showToast({ title: '已上报，已记入该地点通行卡', icon: 'none' });
      this.setData({ description: '', expectedEndAt: '', photo: '' });
      setTimeout(() => wx.switchTab({ url: '/pages/map/map' }), 800);
    } finally {
      this.setData({ submitting: false });
    }
  }
});
