const placeService = require('../../services/placeService');
const storage = require('../../services/storage');

const STEPS = [
  { key: 'entrance', title: '入口全景', hint: '正对建筑主入口，拍到门与周边通道', required: true },
  { key: 'path', title: '道路到入口的连续通道', hint: '沿轮椅实际路线拍摄，尽量拍到转弯与最窄处', required: true },
  { key: 'step', title: '台阶 / 坡道 / 门槛', hint: '拍清地面高差与坡度', required: true },
  { key: 'door', title: '门与开门方式', hint: '拍清门型、把手和自动开门按钮', required: false },
  { key: 'elevator', title: '电梯入口与通知', hint: '电梯厅、楼层牌、维修通知', required: false },
  { key: 'toilet', title: '无障碍厕所及指示牌', hint: '标识牌与门', required: false },
  { key: 'notice', title: '现场文字通知', hint: '开放时间 / 维修等文字，便于 OCR', required: false },
  { key: 'other', title: '其他障碍', hint: '拍摄临时堆物、狭窄转角等其他影响通行的情况', required: false }
];

Page({
  data: {
    placeId: '',
    placeName: '',
    places: [],
    placeIndex: -1,
    steps: [],
    filledRequired: 0,
    requiredTotal: STEPS.filter(s => s.required).length
  },

  async onLoad(options) {
    const placeId = options.id || '';
    const places = await placeService.list();
    let placeName = '';
    let placeIndex = -1;
    if (placeId) {
      const p = await placeService.get(placeId);
      placeName = p ? p.name : '';
      placeIndex = places.findIndex(item => item.id === placeId);
    }
    const draft = storage.get('lj_capture_draft', {});
    const photos = (draft.placeId === placeId || (!placeId && draft.placeId === '')) ? (draft.photos || {}) : {};
    const steps = STEPS.map(s => Object.assign({}, s, { photo: photos[s.key] || '' }));
    this.setData({
      placeId,
      placeName,
      placeIndex,
      places: places.map(p => ({ id: p.id, name: p.name })),
      steps
    });
    this.recalc();
  },

  onPlace(e) {
    const placeIndex = Number(e.detail.value);
    const place = this.data.places[placeIndex];
    if (!place) return;
    this.setData({ placeIndex, placeId: place.id, placeName: place.name }, () => this.saveDraft());
  },

  recalc() {
    const n = this.data.steps.filter(s => s.required && s.photo).length;
    this.setData({ filledRequired: n });
  },

  choose(e) {
    const idx = e.currentTarget.dataset.idx;
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath;
        const steps = this.data.steps;
        steps[idx].photo = path;
        this.setData({ steps });
        this.saveDraft();
        this.recalc();
      }
    });
  },

  retake(e) {
    const idx = e.currentTarget.dataset.idx;
    const steps = this.data.steps;
    steps[idx].photo = '';
    this.setData({ steps });
    this.saveDraft();
    this.recalc();
  },

  saveDraft() {
    const photos = {};
    this.data.steps.forEach(s => { if (s.photo) photos[s.key] = s.photo; });
    storage.set('lj_capture_draft', { placeId: this.data.placeId, photos });
  },

  preview(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ urls: [url] });
  },

  toAi() {
    if (!this.data.placeId) {
      wx.showToast({ title: '请先选择勘察地点', icon: 'none' });
      return;
    }
    if (this.data.filledRequired < this.data.requiredTotal) {
      wx.showToast({ title: '请先完成必填项拍摄', icon: 'none' });
      return;
    }
    this.saveDraft();
    wx.navigateTo({ url: '/pages/ai-confirm/ai-confirm?id=' + this.data.placeId });
  }
});
