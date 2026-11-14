const surveyData = require('../data/surveySites');

Page({
  data: {
    site: null,
    collectedAt: '2026-11-01'
  },

  onLoad(options) {
    const site = surveyData.findSite(options.site);
    if (!site) {
      wx.showToast({ title: '没有找到该地点', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    this.setData({ site });
    wx.setNavigationBarTitle({ title: site.name });
  },

  openLocation() {
    const site = this.data.site;
    if (!site) return;
    wx.openLocation({
      latitude: site.latitude,
      longitude: site.longitude,
      name: site.name,
      address: site.address,
      scale: 18
    });
  },

  preview(event) {
    const site = this.data.site;
    if (!site) return;
    const current = event.currentTarget.dataset.src;
    const urls = site.groups.reduce((all, group) => all.concat(group.images), []);
    wx.previewImage({ current, urls });
  }
});
