const surveyData = require('../data/surveySites');

Page({
  data: {
    sites: surveyData.sites,
    collectedAt: '2026-11-01',
  },
  openSite(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/field-survey/detail?site=${id}` });
  }
});
