const userService = require('../../services/userService');

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
    canCollect: false,
    isAdmin: false
  },

  async onShow() {
    const u = await userService.ensureCurrent();
    if (!u) { wx.reLaunch({ url: '/pages/login/login' }); return; }
    const favs = userService.favorites();
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
      favCount: favs.length
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
  goSurvey() { wx.navigateTo({ url: '/pages/survey/survey' }); },
  goAdmin() { wx.navigateTo({ url: '/pages/admin/admin' }); }
});
