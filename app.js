App({
  globalData: {
    currentUser: null,
    location: null,
    systemInfo: null
  },

  onLaunch() {
    try {
      this.globalData.systemInfo = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync();
    } catch (e) {
      // ignore
    }
  }
});
