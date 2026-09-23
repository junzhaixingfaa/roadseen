const placeService = require('../../services/placeService');
const incidentService = require('../../services/incidentService');
const userService = require('../../services/userService');
const ruleEngine = require('../../services/ruleEngine');
const { getStatus } = require('../../utils/status');

Page({
  data: {
    id: '',
    place: null,
    status: { text: '', cls: 'unknown', color: '' },
    summary: '',
    reasons: [],
    rec: null,
    steps: [],
    assistPoints: [],
    activeIncidents: [],
    meetNote: '',
    loading: true
  },

  onLoad(options) { this.setData({ id: options.id || '' }); },
  onShow() { this.load(); },

  async load() {
    const id = this.data.id;
    if (!id) { this.setData({ loading: false }); return; }
    this.setData({ loading: true });
    try {
      const user = await userService.ensureCurrent();
      const profile = user && user.profile;
      const place = await placeService.get(id);
      if (!place) { this.setData({ loading: false }); return; }
      const active = await incidentService.listActiveForPlace(id);
      const j = ruleEngine.judgeAccess(place, profile || null, active);
      const st = getStatus(j.result);
      const rec = (place.entrances || []).find(e => e.isRecommended) || (place.entrances || [])[0] || null;

      const assistPoints = [];
      if (rec) {
        if (rec.hasSteps && !rec.hasRamp) assistPoints.push('入口有台阶，需要搬抬或使用移动坡道');
        if (rec.hasThreshold && rec.thresholdHeight > 0) assistPoints.push('入口门槛约 ' + rec.thresholdHeight + ' cm，注意通过');
        if (rec.needAssistToOpen || rec.doorType === '需他人开门') assistPoints.push('门需他人协助开启');
        const elev = (place.facilities || {}).elevator || {};
        if (elev.has && elev.status === 'fault') assistPoints.push('电梯当前故障，需改走其他路线或求助');
      }
      active.forEach(i => assistPoints.push('临时事件：' + (i.description || i.type || '')));

      this.setData({
        place,
        status: st,
        summary: j.reasons[0] || '',
        reasons: j.reasons || [],
        rec,
        steps: place.steps || [],
        assistPoints,
        activeIncidents: active,
        meetNote: rec ? ('建议集合点：' + (rec.direction || rec.name || place.name)) : ('建议集合点：' + place.name),
        loading: false
      });
      wx.setNavigationBarTitle({ title: '同行接力卡' });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '接力卡加载失败', icon: 'none' });
    }
  },

  goMap() { wx.switchTab({ url: '/pages/map/map' }); },

  openPlace() {
    wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + this.data.id });
  },

  onShareAppMessage() {
    const p = this.data.place || {};
    return {
      title: '同行接力卡 · ' + (p.name || '路见') + '（' + this.data.status.text + '）',
      // 落地页必须是接力卡本身：它只含同行所需信息，不含完整个人档案
      path: '/pages/relay-card/relay-card?id=' + this.data.id
    };
  }
});
