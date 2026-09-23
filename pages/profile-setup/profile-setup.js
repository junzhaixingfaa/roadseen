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
    hasProfile: false,
    onboarding: false
  },

  async onLoad(options) {
    this.setData({ onboarding: options && options.onboarding === '1' });
    const u = await userService.ensureCurrent();
    if (!u) { wx.reLaunch({ url: '/pages/login/login' }); return; }
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
    if (!d.device) {
      wx.showToast({ title: '请选择辅助器具', icon: 'none' });
      return;
    }
    const width = d.deviceWidth === '' ? null : Number(d.deviceWidth);
    if (width != null && (Number.isNaN(width) || width < 30 || width > 120)) {
      wx.showToast({ title: '设备宽度请填写30-120cm', icon: 'none' });
      return;
    }
    await userService.saveProfile({
      device: d.device || '未设置',
      deviceWidth: width,
      accompanied: d.accompanied,
      mustUseElevator: d.mustUseElevator,
      acceptLowThreshold: d.acceptLowThreshold,
      acceptAssist: d.acceptAssist
    });
    wx.showToast({ title: '已保存，通行判断已更新', icon: 'none' });
    setTimeout(() => d.onboarding ? wx.switchTab({ url: '/pages/map/map' }) : wx.navigateBack(), 800);
  },

  async skip() {
    if (this.data.onboarding) {
      wx.showToast({ title: '首次使用请完成基本情况', icon: 'none' });
      return;
    }
    await userService.saveProfile(null);
    wx.showToast({ title: '已清除档案，按通用条件显示', icon: 'none' });
    setTimeout(() => wx.navigateBack(), 700);
  }
});
