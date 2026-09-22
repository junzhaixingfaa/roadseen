const placeService = require('../../services/placeService');
const incidentService = require('../../services/incidentService');
const evidenceService = require('../../services/evidenceService');
const userService = require('../../services/userService');
const ruleEngine = require('../../services/ruleEngine');
const { getStatus } = require('../../utils/status');

const TYPE_MAP = { entrance: '入口', ramp: '坡道', elevator: '电梯', toilet: '厕所', sign: '标识', notice: '通知', path: '通道' };
const CONFIRM_MAP = { confirmed: '已确认', pending: '待确认', unknown: '未知' };
const FAC_MAP = { elevator: '电梯', ramp: '坡道', path: '通道', toilet: '厕所', door: '门', openTime: '开放时间', other: '其他' };

Page({
  data: {
    id: '',
    place: null,
    status: { text: '', color: '', cls: 'unknown' },
    summary: '',
    reasons: [],
    alternatives: [],
    facilities: [],
    steps: [],
    evidences: [],
    incidents: [],
    resolved: [],
    rec: null,
    isFav: false,
    hasProfile: false,
    profileTip: '',
    disclaimer: '仅供出行准备参考',
    loading: true
  },

  onLoad(options) {
    this.setData({ id: options.id || '' });
  },

  onShow() { this.load(); },

  async load() {
    const id = this.data.id;
    if (!id) { wx.showToast({ title: '缺少地点', icon: 'none' }); return; }
    this.setData({ loading: true });
    try {
      const user = await userService.ensureCurrent();
      const profile = user && user.profile;
      const place = await placeService.get(id);
      if (!place) { wx.showToast({ title: '地点不存在', icon: 'none' }); return; }
      const [activeInc, resolvedInc, evs] = await Promise.all([
        incidentService.listActiveForPlace(id),
        incidentService.listResolvedForPlace(id),
        evidenceService.allForPlace(id)
      ]);
      const j = ruleEngine.judgeAccess(place, profile || null, activeInc);
      const st = getStatus(j.result);

      this.setData({
        place,
        rec: (place.entrances || []).find(e => e.isRecommended) || (place.entrances || [])[0] || null,
        status: st,
        summary: j.reasons[0] || '',
        reasons: j.reasons,
        alternatives: j.alternatives || [],
        facilities: this.buildFacilities(place),
        steps: place.steps || [],
        evidences: evs.map(e => ({
          imageUrl: e.imageUrl,
          typeText: TYPE_MAP[e.type] || e.type,
          collectedAt: e.collectedAt,
          confirmStatusText: CONFIRM_MAP[e.confirmStatus] || e.confirmStatus,
          aiTagsText: (e.aiTags || []).join('、')
        })),
        incidents: activeInc.map(i => Object.assign({}, i, { facilityText: FAC_MAP[i.facility] || i.facility })),
        resolved: resolvedInc,
        isFav: userService.isFavorite(id),
        hasProfile: !!profile,
        profileTip: profile ? '' : '未建立通行档案，以下为按通用轮椅条件的判断；到「我的 - 通行档案」设置后更准确',
        loading: false
      });
      wx.setNavigationBarTitle({ title: place.name });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  buildFacilities(place) {
    const rec = (place.entrances || []).find(e => e.isRecommended) || (place.entrances || [])[0] || null;
    const fac = place.facilities || {};
    const elev = fac.elevator || {};
    const toilet = fac.accessibleToilet || {};
    const isU = v => (v === undefined || v === null || v === '' || v === '未知');
    return [
      { label: '入口台阶', value: rec ? (rec.hasSteps ? ('有，约' + rec.stepCount + ' 级') : '无') : '未知', unknown: !rec },
      { label: '坡道', value: rec ? (rec.hasRamp ? (rec.rampCondition || '有') : '无') : '未知', unknown: !rec },
      { label: '门槛', value: rec ? (rec.hasThreshold ? (rec.thresholdHeight + ' cm') : '无') : '未知', unknown: !rec },
      { label: '门', value: rec ? ((rec.doorType || '未知') + (rec.needAssistToOpen ? '（需他人开门）' : '')) : '未知', unknown: !rec },
      { label: '电梯', value: elev.status === 'unknown' ? '未知' : (elev.has ? ('有' + (elev.location ? ' · ' + elev.location : '') + (elev.status === 'fault' ? '（故障）' : '')) : '无'), unknown: elev.status === 'unknown' },
      { label: '无障碍厕所', value: toilet.status === 'unknown' ? '未知' : (toilet.has ? ('有' + (toilet.location ? ' · ' + toilet.location : '') + (toilet.status === 'closed' ? '（关闭）' : '')) : '无'), unknown: toilet.status === 'unknown' },
      { label: '路面状况', value: fac.pathCondition || '未知', unknown: isU(fac.pathCondition) },
      { label: '其他障碍', value: fac.otherObstacles || '无', unknown: false }
    ];
  },

  navTo() {
    const r = this.data.rec;
    const p = this.data.place;
    if (!p) return;
    const loc = (r && r.location) ? r.location : p.location;
    wx.openLocation({ latitude: loc.latitude, longitude: loc.longitude, name: p.name, address: (r && r.direction) || '推荐入口', scale: 18 });
  },

  async toggleFav() {
    const res = await userService.toggleFavorite(this.data.id);
    this.setData({ isFav: res.favorite });
    wx.showToast({ title: res.favorite ? '已收藏' : '已取消收藏', icon: 'none' });
  },

  goRelay() {
    wx.navigateTo({ url: '/pages/relay-card/relay-card?id=' + this.data.id });
  },

  goIncident() {
    wx.navigateTo({ url: '/pages/incident-report/incident-report?id=' + this.data.id });
  },

  doCorrect() {
    wx.showActionSheet({
      itemList: ['仍然准确', '已经变化（上传新证据）', '不确定'],
      success: (r) => {
        const map = ['已反馈：仍然准确', '感谢反馈，该信息将进入复核', '已标记为不确定，将请求复核'];
        wx.showToast({ title: map[r.tapIndex], icon: 'none' });
      }
    });
  },

  subscribe() {
    wx.showToast({ title: '已订阅该地点状态更新（雏形）', icon: 'none' });
  },

  onShareAppMessage() {
    const p = this.data.place;
    return {
      title: p ? ('【通行卡】' + p.name + ' · ' + this.data.status.text) : '路见 · 无障碍通行卡',
      path: '/pages/place-detail/place-detail?id=' + this.data.id
    };
  }
});
