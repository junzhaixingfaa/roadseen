App({
  globalData: {
    currentUser: null,
    location: null,
    systemInfo: null
  },

  onLaunch() {
    try {
      this.globalData.systemInfo = wx.getSystemInfoSync();
    } catch (e) {
      // ignore
    }
  }
});
