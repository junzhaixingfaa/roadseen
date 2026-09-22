const userService = require('../../services/userService');

const ROLE_TEXT = { user: '普通用户', volunteer: '志愿者', maintainer: '场所维护者', admin: '管理员' };

Page({
  data: {
    user: null,
    avatar: '',
    roleText: '',
    users: [],
    hasProfile: false,
    profileSummary: '',
    favCount: 0
  },

  async onShow() {
    const users = await userService.listUsers();
    const u = await userService.ensureCurrent();
    const favs = userService.favorites();
    const p = u && u.profile;
    this.setData({
      user: u,
      avatar: u ? (u.nickname || '?').slice(0, 1) : '',
      users: users.map(x => ({ id: x.id, nickname: x.nickname, roleText: ROLE_TEXT[x.role] || x.role })),
      roleText: u ? (ROLE_TEXT[u.role] || u.role) : '',
      hasProfile: !!p,
      profileSummary: p ? (p.device + ' · ' + (p.accompanied ? '有人陪同' : '独立出行') + ' · ' + (p.acceptAssist ? '接受协助' : '不接受协助')) : '未建立',
      favCount: favs.length
    });
  },

  onUserTap(e) {
    const id = e.currentTarget.dataset.id;
    userService.setCurrent(id).then(() => this.onShow());
  },

  goProfile() { wx.navigateTo({ url: '/pages/profile-setup/profile-setup' }); },
  goFavorites() { wx.navigateTo({ url: '/pages/favorites/favorites' }); },
  goSurvey() { wx.switchTab({ url: '/pages/survey/survey' }); },
  goAdmin() { wx.navigateTo({ url: '/pages/admin/admin' }); },
  goHistory() { wx.showToast({ title: '历史记录（雏形略）', icon: 'none' }); },
  goSettings() { wx.showToast({ title: '设置（雏形略）', icon: 'none' }); }
});
