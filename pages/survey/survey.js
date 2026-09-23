const placeService = require('../../services/placeService');
const userService = require('../../services/userService');
const inspectionService = require('../../services/inspectionService');

const ROLE_TEXT = { user: '普通用户', volunteer: '志愿者', maintainer: '维护者', admin: '管理员' };

Page({
  data: {
    tasks: [],
    contributions: { submitted: 0, places: 0 },
    roleText: '',
    isCollector: false
  },

  async onShow() {
    const u = await userService.ensureCurrent();
    if (!u) { wx.reLaunch({ url: '/pages/login/login' }); return; }
    const tasks = await placeService.getPendingTasks();
    const myInsp = inspectionService.list();
    this.setData({
      roleText: u ? (ROLE_TEXT[u.role] || u.role) : '',
      isCollector: !!u && (u.role === 'volunteer' || u.role === 'maintainer' || u.role === 'admin'),
      tasks: tasks.map(p => ({
        id: p.id, name: p.name, category: p.category,
        reason: (p.entrances || []).length === 0 ? '缺少入口信息' : (!p.lastVerifiedAt ? '未采集' : '信息待复核')
      })),
      contributions: { submitted: myInsp.length, places: new Set(myInsp.map(i => i.placeId)).size }
    });
  },

  newCapture() {
    if (!this.data.isCollector) {
      wx.showToast({ title: '完整勘察需要志愿者或维护者身份', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/capture/capture' });
  },

  quickCheck() {
    wx.switchTab({ url: '/pages/quick-check/quick-check' });
  },

  pickTask(e) {
    if (!this.data.isCollector) return;
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/capture/capture?id=' + id });
  }
});
