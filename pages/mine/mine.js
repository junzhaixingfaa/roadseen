const userService = require('../../services/userService');
const incidentService = require('../../services/incidentService');
const storage = require('../../services/storage');

const ROLE_TEXT = { user: '普通用户', volunteer: '志愿者', maintainer: '场所维护者', admin: '管理员' };

Page({
  data: {
    user: null,
    avatar: '',
    roleText: '',
    account: '',
    hasProfile: false,
    profileSummary: '',
    favCount: 0,
    subCount: 0,
    reportCount: 0,
    recentCount: 0,
    canCollect: false,
    isAdmin: false
  },

  async onShow() {
    const u = await userService.ensureCurrent();
    if (!u) { wx.reLaunch({ url: '/pages/login/login' }); return; }
    const favs = userService.favorites();
    const subs = userService.subscriptions();
    const incidents = await incidentService.listAll();
    const p = u && u.profile;
    this.setData({
      user: u,
      avatar: u ? (u.nickname || '?').slice(0, 1) : '',
      account: u.account || '',
      roleText: u ? (ROLE_TEXT[u.role] || u.role) : '',
      canCollect: !!u && (u.role === 'volunteer' || u.role === 'maintainer' || u.role === 'admin'),
      isAdmin: !!u && u.role === 'admin',
      hasProfile: !!p,
      profileSummary: p ? (p.device + ' · ' + (p.accompanied ? '有人陪同' : '独立出行') + ' · ' + (p.acceptAssist ? '接受协助' : '不接受协助')) : '未建立',
      favCount: favs.length,
      subCount: subs.length,
      reportCount: incidents.filter(i => i.reportBy === u.id).length,
      recentCount: userService.recentPlaces().length
    });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后，本机保存的通行档案和收藏不会删除。',
      success: async r => {
        if (!r.confirm) return;
        await userService.logout();
        wx.reLaunch({ url: '/pages/login/login' });
      }
    });
  },

  goProfile() { wx.navigateTo({ url: '/pages/profile-setup/profile-setup' }); },
  goFavorites() { wx.navigateTo({ url: '/pages/favorites/favorites' }); },
  goSubscriptions() { wx.navigateTo({ url: '/pages/subscriptions/subscriptions' }); },
  goRecent() { wx.navigateTo({ url: '/pages/recent/recent' }); },
  goMyReports() { wx.navigateTo({ url: '/pages/my-reports/my-reports' }); },
  goQuickCheck() { wx.switchTab({ url: '/pages/quick-check/quick-check' }); },
  goReport() { wx.switchTab({ url: '/pages/incident-report/incident-report' }); },
  goMessages() { wx.switchTab({ url: '/pages/messages/messages' }); },
  replayGuide() {
    storage.remove('lj_onboarding_done');
    storage.set('lj_replay_guide', true);
    wx.switchTab({ url: '/pages/map/map' });
  },
  goSurvey() { wx.navigateTo({ url: '/pages/survey/survey' }); },
  goAdmin() { wx.navigateTo({ url: '/pages/admin/admin' }); }
});
