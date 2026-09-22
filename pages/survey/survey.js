const placeService = require('../../services/placeService');
const userService = require('../../services/userService');
const storage = require('../../services/storage');

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
    const tasks = await placeService.getPendingTasks();
    const myInsp = storage.get('lj_inspections', []);
    this.setData({
      roleText: u ? (ROLE_TEXT[u.role] || u.role) : '',
      isCollector: !!u && (u.role === 'volunteer' || u.role === 'user' || u.role === 'maintainer' || u.role === 'admin'),
      tasks: tasks.map(p => ({
        id: p.id, name: p.name, category: p.category,
        reason: (p.entrances || []).length === 0 ? '缺少入口信息' : (!p.lastVerifiedAt ? '未采集' : '信息待复核')
      })),
      contributions: { submitted: myInsp.length, places: new Set(myInsp.map(i => i.placeId)).size }
    });
  },

  newCapture() {
    wx.navigateTo({ url: '/pages/capture/capture' });
  },

  pickTask(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/capture/capture?id=' + id });
  }
});
