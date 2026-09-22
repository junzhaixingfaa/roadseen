const incidentService = require('../../services/incidentService');
const placeService = require('../../services/placeService');
const userService = require('../../services/userService');
const campus = require('../../data/campus');
const util = require('../../utils/util');

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
    photo: ''
  },

  async onLoad(options) {
    const places = await placeService.list();
    let idx = 0;
    if (options.id) {
      const found = places.findIndex(p => p.id === options.id);
      if (found >= 0) idx = found;
    }
    this.setData({
      placeId: options.id || places[0].id,
      places: places.map(p => ({ id: p.id, name: p.name })),
      placeIndex: idx,
      facility: this.data.types[idx >= 0 ? 0 : 0].facility
    });
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
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => this.setData({ photo: res.tempFiles[0].tempFilePath }) });
  },

  async submit() {
    if (!this.data.description.trim()) { wx.showToast({ title: '请填写说明', icon: 'none' }); return; }
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
    wx.showToast({ title: '已上报，将重算通行结果', icon: 'none' });
    setTimeout(() => wx.navigateBack(), 800);
  }
});
