const userService = require('../../services/userService');
const storage = require('../../services/storage');

Page({
  data: {
    mode: 'login',
    account: '',
    password: '',
    nickname: '',
    showPassword: false,
    busy: false,
    currentUser: null,
    error: ''
  },

  onLoad() {
    // 旧版本把“演示身份选择”当成登录状态；升级后清理一次，要求真正输入账号密码。
    if (!storage.get('lj_auth_v2_migrated', false)) {
      userService.logout();
      storage.set('lj_auth_v2_migrated', true);
    }
  },

  onShow() {
    this.setData({ currentUser: userService.current() });
  },

  switchMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode, error: '' });
  },
  onAccount(e) { this.setData({ account: e.detail.value, error: '' }); },
  onPassword(e) { this.setData({ password: e.detail.value, error: '' }); },
  onNickname(e) { this.setData({ nickname: e.detail.value, error: '' }); },
  togglePassword() { this.setData({ showPassword: !this.data.showPassword }); },

  fillDemo(e) {
    const role = e.currentTarget.dataset.role;
    this.setData(role === 'admin'
      ? { mode: 'login', account: 'admin', password: 'admin123', error: '' }
      : { mode: 'login', account: 'demo', password: '123456', error: '' });
  },

  validate() {
    const account = this.data.account.trim();
    const password = this.data.password;
    if (account.length < 3) return '账号至少需要3个字符';
    if (password.length < 6) return '密码至少需要6个字符';
    if (this.data.mode === 'register' && this.data.nickname.trim().length < 2) return '请填写至少2个字符的昵称';
    return '';
  },

  async submit() {
    if (this.data.busy) return;
    const error = this.validate();
    if (error) { this.setData({ error }); return; }
    this.setData({ busy: true, error: '' });
    try {
      if (this.data.mode === 'login') {
        const user = await userService.authenticate(this.data.account, this.data.password);
        if (!user) throw new Error('账号或密码不正确');
        wx.switchTab({ url: '/pages/map/map' });
      } else {
        await userService.register({
          account: this.data.account,
          password: this.data.password,
          nickname: this.data.nickname
        });
        wx.navigateTo({ url: '/pages/profile-setup/profile-setup?onboarding=1' });
      }
    } catch (err) {
      this.setData({ error: err.message || '操作失败，请重试' });
    } finally {
      this.setData({ busy: false });
    }
  },

  continueSession() { wx.switchTab({ url: '/pages/map/map' }); },

  changeAccount() {
    // 误触会直接登出并清空已填账号，答辩演示时很难挽回，先确认一次
    wx.showModal({
      title: '切换账号',
      content: '将退出当前登录并清空已填内容，确定继续？',
      success: async (res) => {
        if (!res.confirm) return;
        await userService.logout();
        this.setData({ currentUser: null, account: '', password: '', error: '' });
      }
    });
  }
});
