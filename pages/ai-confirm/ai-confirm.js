const aiService = require('../../services/aiService');
const aiSchema = require('../../services/aiSchema');
const placeService = require('../../services/placeService');
const userService = require('../../services/userService');
const inspectionService = require('../../services/inspectionService');
const storage = require('../../services/storage');

const STEP_TITLES = {};
aiSchema.STEPS.forEach(s => { STEP_TITLES[s.key] = s.title; });

Page({
  data: {
    placeId: '',
    placeName: '',
    entranceName: '',
    entranceDirection: '',
    hasExistingEntrance: false,
    needElevatorToTarget: false,
    needAccessibleToilet: false,
    sourceOptions: ['实地采集', '演示数据'],
    sourceIndex: 1,
    items: [],
    aiFailed: false,
    submitting: false
  },

  async onLoad(options) {
    const placeId = options.id || '';
    let placeName = '';
    let entranceName = '';
    let entranceDirection = '';
    let hasExistingEntrance = false;
    let needElevatorToTarget = false;
    let needAccessibleToilet = false;
    if (placeId) {
      const p = await placeService.get(placeId);
      placeName = p ? p.name : '';
      needElevatorToTarget = !!(p && p.needElevatorToTarget);
      needAccessibleToilet = !!(p && p.needAccessibleToilet);
      const rec = p && ((p.entrances || []).find(e => e.isRecommended) || (p.entrances || [])[0]);
      if (rec) {
        hasExistingEntrance = true;
        entranceName = rec.name || '';
        entranceDirection = rec.direction || '';
      }
    }
    const draft = storage.get('lj_capture_draft', {});
    const photos = draft.placeId === placeId ? (draft.photos || {}) : {};
    const keys = aiSchema.STEP_KEYS.filter(k => photos[k]);
    const items = (keys.length ? keys : ['entrance']).map(k => ({
      key: k, title: STEP_TITLES[k] || k, photo: photos[k] || '',
      loading: true, error: '', detected: [], flags: aiSchema.flagsFromLabels([]),
      ocrText: '', basis: '', confidence: '', unknownFields: [], suggestRetake: [],
      unknownText: '', retakeText: '',
      stepCount: '', thresholdHeight: '', doorWidth: '', minPassageWidth: '',
      rampCondition: '', needAssistToOpen: false,
      doorType: '', elevatorStatus: '', toiletStatus: '',
      choice: 'confirmed' // confirmed / modified / unknown
    }));
    this.setData({ placeId, placeName, entranceName, entranceDirection, hasExistingEntrance, needElevatorToTarget, needAccessibleToilet, items });
    items.forEach((it, i) => this.recognize(i, {}));
  },

  recognize(i, opts) {
    const key = this.data.items[i].key;
    this.setData({ ['items[' + i + '].loading']: true, ['items[' + i + '].error']: '' });
    aiService.recognize(key, Object.assign({ delay: 500 }, opts)).then(r => {
      const obs = r.observable || {};
      const labels = aiSchema.detectedLabels(r.detected);
      const needsManual = (r.unknownFields || []).indexOf('all') >= 0;
      const patch = {};
      patch['items[' + i + '].loading'] = false;
      patch['items[' + i + '].error'] = '';
      patch['items[' + i + '].detected'] = labels;
      patch['items[' + i + '].flags'] = aiSchema.flagsFromLabels(labels);
      patch['items[' + i + '].ocrText'] = r.ocrText || '';
      patch['items[' + i + '].basis'] = r.basis || '';
      patch['items[' + i + '].confidence'] = r.confidence || '';
      patch['items[' + i + '].unknownFields'] = r.unknownFields || [];
      patch['items[' + i + '].suggestRetake'] = r.suggestRetake || [];
      patch['items[' + i + '].unknownText'] = needsManual ? '全部字段（需人工确认）' : (r.unknownFields || []).join('、');
      patch['items[' + i + '].retakeText'] = (r.suggestRetake || []).join('；');
      patch['items[' + i + '].stepCount'] = obs.stepCount != null ? String(obs.stepCount) : '';
      patch['items[' + i + '].thresholdHeight'] = obs.thresholdHeight != null ? String(obs.thresholdHeight) : '';
      patch['items[' + i + '].doorWidth'] = obs.doorWidth != null ? String(obs.doorWidth) : '';
      patch['items[' + i + '].minPassageWidth'] = obs.minPassageWidth != null ? String(obs.minPassageWidth) : '';
      patch['items[' + i + '].rampCondition'] = obs.rampCondition || '';
      patch['items[' + i + '].needAssistToOpen'] = obs.needAssistToOpen === true;
      patch['items[' + i + '].doorType'] = obs.doorType || '';
      patch['items[' + i + '].elevatorStatus'] = obs.elevatorStatus || '';
      patch['items[' + i + '].toiletStatus'] = obs.toiletStatus || '';
      patch['items[' + i + '].choice'] = needsManual ? 'unknown' : 'confirmed';
      this.setData(patch);
    }).catch(err => {
      this.setData({
        ['items[' + i + '].loading']: false,
        ['items[' + i + '].error']: err.message || '识别失败，请人工填写',
        ['items[' + i + '].choice']: 'unknown'
      });
    });
  },

  // 逐字段：确认 / 改为未知
  choose(e) {
    const i = e.currentTarget.dataset.i;
    const v = e.currentTarget.dataset.v;
    this.setData({ ['items[' + i + '].choice']: v });
  },
  editField(e) {
    const i = e.currentTarget.dataset.i;
    const f = e.currentTarget.dataset.f;
    this.setData({ ['items[' + i + '].' + f]: e.detail.value, ['items[' + i + '].choice']: 'modified' });
  },
  editOcr(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ ['items[' + i + '].ocrText']: e.detail.value, ['items[' + i + '].choice']: 'modified' });
  },
  editMeta(e) {
    const f = e.currentTarget.dataset.f;
    this.setData({ [f]: e.detail.value });
  },
  onSource(e) { this.setData({ sourceIndex: Number(e.detail.value) }); },
  toggleFlag(e) {
    const i = Number(e.currentTarget.dataset.i);
    const key = e.currentTarget.dataset.k;
    const item = this.data.items[i];
    if (!item) return;
    const flags = item.flags.map(f => f.key === key ? Object.assign({}, f, { on: !f.on }) : f);
    this.setData({
      ['items[' + i + '].flags']: flags,
      ['items[' + i + '].detected']: aiSchema.labelsFromFlags(flags),
      ['items[' + i + '].choice']: 'modified'
    });
  },

  simulateFail() {
    this.setData({ aiFailed: true });
    this.data.items.forEach((it, i) => this.recognize(i, { forceFail: true, delay: 300 }));
  },
  retryAi() {
    this.setData({ aiFailed: false });
    this.data.items.forEach((it, i) => this.recognize(i, {}));
  },

  submit() {
    if (this.data.submitting) return;
    if (this.data.items.some(it => it.loading)) {
      wx.showToast({ title: '请等待识别完成', icon: 'none' });
      return;
    }
    if (!this.data.placeId) {
      wx.showToast({ title: '缺少勘察地点，请返回重选', icon: 'none' });
      return;
    }
    if (!this.data.hasExistingEntrance && !this.data.entranceName.trim()) {
      wx.showToast({ title: '请填写新入口名称', icon: 'none' });
      return;
    }
    const badStep = this.data.items.find(it => {
      if (it.key !== 'step' || it.stepCount === '' || it.stepCount == null) return false;
      const n = Number(it.stepCount);
      return !isFinite(n) || n < 0 || n > 30 || Math.round(n) !== n;
    });
    if (badStep) {
      wx.showToast({ title: '台阶数请填 0-30 的整数', icon: 'none' });
      return;
    }
    const ranges = [
      ['thresholdHeight', 0, 50, '门槛高度请填 0-50cm'],
      ['doorWidth', 30, 200, '门洞宽度请填 30-200cm'],
      ['minPassageWidth', 30, 500, '通道宽度请填 30-500cm']
    ];
    for (let r = 0; r < ranges.length; r += 1) {
      const rule = ranges[r];
      const bad = this.data.items.find(it => it[rule[0]] !== '' && (!isFinite(Number(it[rule[0]])) || Number(it[rule[0]]) < rule[1] || Number(it[rule[0]]) > rule[2]));
      if (bad) { wx.showToast({ title: rule[3], icon: 'none' }); return; }
    }
    this.setData({ submitting: true });
    try {
      const user = userService.current();
      const inspection = {
        placeId: this.data.placeId,
        placeName: this.data.placeName || '新采集地点',
        submittedBy: user ? user.nickname : '匿名',
        dataStatus: this.data.sourceIndex === 0 ? 'pending' : 'demo',
        entranceMeta: {
          name: this.data.entranceName.trim(),
          direction: this.data.entranceDirection.trim()
        },
        placeMeta: {
          needElevatorToTarget: this.data.needElevatorToTarget,
          needAccessibleToilet: this.data.needAccessibleToilet
        },
        items: this.data.items.map(it => ({
          key: it.key, title: it.title, choice: it.choice,
          photo: it.photo,
          aiDetected: it.detected, ocrText: it.ocrText,
          basis: it.basis, confidence: it.confidence,
          unknownFields: it.unknownFields, suggestRetake: it.suggestRetake,
          stepCount: it.stepCount, thresholdHeight: it.thresholdHeight,
          doorWidth: it.doorWidth, minPassageWidth: it.minPassageWidth,
          rampCondition: it.rampCondition, needAssistToOpen: it.needAssistToOpen,
          doorType: it.doorType,
          elevatorStatus: it.elevatorStatus, toiletStatus: it.toiletStatus
        }))
      };
      inspectionService.submit(inspection);
      storage.remove('lj_capture_draft');
      this.setData({ submitting: false });
      wx.showModal({
        title: '已提交审核',
        content: 'AI 结果与人工修正已记录，等待管理员审核发布。',
        showCancel: false,
        success: () => wx.redirectTo({ url: '/pages/survey/survey' })
      });
    } catch (e) {
      this.setData({ submitting: false });
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    }
  }
});
