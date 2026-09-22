const aiService = require('../../services/aiService');
const userService = require('../../services/userService');

Page({
  data: {
    photo: '',
    state: 'idle',
    result: null,
    location: null,
    locationText: '尚未记录位置',
    canSurvey: false
  },

  onShow() {
    const user = userService.current();
    this.setData({ canSurvey: !!user && (user.role === 'volunteer' || user.role === 'maintainer' || user.role === 'admin') });
  },

  choosePhoto() {
    wx.showActionSheet({
      itemList: ['现场拍照', '从相册选择'],
      success: choice => this.openImagePicker(choice.tapIndex === 0 ? 'camera' : 'album')
    });
  },

  openImagePicker(source) {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: [source],
      success: res => {
        const path = res.tempFilePaths && res.tempFilePaths[0];
        if (path) this.setData({ photo: path, state: 'ready', result: null });
      },
      fail: err => {
        if (!err || !String(err.errMsg || '').includes('cancel')) {
          wx.showModal({
            title: source === 'camera' ? '暂时无法打开相机' : '暂时无法选择图片',
            content: '开发者工具中建议选择“从相册选择”；真机体验时再测试现场拍照。',
            showCancel: false
          });
        }
      }
    });
  },

  preview() {
    if (this.data.photo) wx.previewImage({ urls: [this.data.photo] });
  },

  retake() {
    this.setData({ photo: '', state: 'idle', result: null });
    this.choosePhoto();
  },

  locate() {
    wx.getLocation({
      type: 'gcj02',
      success: res => this.setData({
        location: { latitude: res.latitude, longitude: res.longitude },
        locationText: '已记录当前定位'
      }),
      fail: () => wx.showToast({ title: '未获得定位权限，不影响拍照检查', icon: 'none' })
    });
  },

  async analyze() {
    if (!this.data.photo || this.data.state === 'analyzing') return;
    this.setData({ state: 'analyzing', result: null });
    try {
      const result = await aiService.quickAssess(this.data.photo);
      this.setData({ state: 'done', result });
    } catch (e) {
      this.setData({ state: 'error' });
      wx.showToast({ title: e.message || '识别失败，请稍后再试', icon: 'none' });
    }
  },

  fullSurvey() { wx.navigateTo({ url: '/pages/capture/capture' }); },
  report() { wx.switchTab({ url: '/pages/incident-report/incident-report' }); },
  backMap() { wx.switchTab({ url: '/pages/map/map' }); }
});
