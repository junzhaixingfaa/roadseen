const userService = require('../../services/userService');

Page({
  data: {
    deviceOptions: ['手动轮椅', '电动轮椅', '助行器', '拐杖', '其他'],
    deviceIndex: 0,
    device: '',
    deviceWidth: '',
    accompanied: false,
    mustUseElevator: false,
    acceptLowThreshold: false,
    acceptAssist: false,
    hasProfile: false
  },

  async onLoad() {
    const u = await userService.ensureCurrent();
    const p = u && u.profile;
    if (p) {
      let idx = this.data.deviceOptions.indexOf(p.device);
      if (idx < 0) idx = 0;
      this.setData({
        deviceIndex: idx,
        device: p.device || '',
        deviceWidth: p.deviceWidth == null ? '' : String(p.deviceWidth),
        accompanied: !!p.accompanied,
        mustUseElevator: !!p.mustUseElevator,
        acceptLowThreshold: !!p.acceptLowThreshold,
        acceptAssist: !!p.acceptAssist,
        hasProfile: true
      });
    }
  },

  onDevice(e) {
    const idx = Number(e.detail.value);
    this.setData({ deviceIndex: idx, device: this.data.deviceOptions[idx] });
  },
  onWidth(e) { this.setData({ deviceWidth: e.detail.value }); },
  onSwitch(e) {
    const k = e.currentTarget.dataset.k;
    this.setData({ [k]: e.detail.value });
  },

  async save() {
    const d = this.data;
    const width = d.deviceWidth === '' ? null : Number(d.deviceWidth);
    await userService.saveProfile({
      device: d.device || '未设置',
      deviceWidth: width,
      accompanied: d.accompanied,
      mustUseElevator: d.mustUseElevator,
      acceptLowThreshold: d.acceptLowThreshold,
      acceptAssist: d.acceptAssist
    });
    wx.showToast({ title: '已保存，通行判断已更新', icon: 'none' });
    setTimeout(() => wx.navigateBack(), 800);
  },

  async skip() {
    await userService.saveProfile(null);
    wx.showToast({ title: '已清除档案，按通用条件显示', icon: 'none' });
    setTimeout(() => wx.navigateBack(), 700);
  }
});
