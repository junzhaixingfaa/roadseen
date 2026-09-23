const aiService = require('../../services/aiService');
const placeService = require('../../services/placeService');
const userService = require('../../services/userService');
const inspectionService = require('../../services/inspectionService');
const storage = require('../../services/storage');

const STEP_TITLES = {
  entrance: '入口全景', path: '通道', step: '台阶/坡道/门槛',
  elevator: '电梯', toilet: '无障碍厕所', notice: '文字通知', door: '门', other: '其他'
};
const DETECT_LABEL = {
  hasSteps: '台阶', hasRamp: '坡道', hasElevator: '电梯', hasDoor: '门',
  hasToiletSign: '厕所标识', hasAccessibleSign: '无障碍标志'
};

function detectedLabels(detected) {
  return Object.keys(DETECT_LABEL).filter(k => detected && detected[k]).map(k => DETECT_LABEL[k]);
}

Page({
  data: {
    placeId: '',
    placeName: '',
    items: [],
    aiFailed: false,
    submitting: false
  },

  async onLoad(options) {
    const placeId = options.id || '';
    let placeName = '';
    if (placeId) { const p = await placeService.get(placeId); placeName = p ? p.name : ''; }
    const draft = storage.get('lj_capture_draft', {});
    const photos = draft.placeId === placeId ? (draft.photos || {}) : {};
    const keys = Object.keys(photos).filter(k => photos[k]);
    const items = (keys.length ? keys : ['entrance']).map(k => ({
      key: k, title: STEP_TITLES[k] || k, photo: photos[k] || '',
      loading: true, error: '', detected: [], ocrText: '', basis: '',
      confidence: '', unknownFields: [], suggestRetake: [],
      stepCount: '', doorType: '', elevatorStatus: '',
      choice: 'confirmed' // confirmed / modified / unknown
    }));
    this.setData({ placeId, placeName, items });
    items.forEach((it, i) => this.recognize(i, {}));
  },

  recognize(i, opts) {
    const key = this.data.items[i].key;
    aiService.recognize(key, Object.assign({ delay: 500 }, opts)).then(r => {
      const obs = r.observable || {};
      const patch = {};
      patch['items[' + i + '].loading'] = false;
      patch['items[' + i + '].error'] = '';
      patch['items[' + i + '].detected'] = detectedLabels(r.detected);
      patch['items[' + i + '].ocrText'] = r.ocrText || '';
      patch['items[' + i + '].basis'] = r.basis || '';
      patch['items[' + i + '].confidence'] = r.confidence || '';
      patch['items[' + i + '].unknownFields'] = r.unknownFields || [];
      patch['items[' + i + '].suggestRetake'] = r.suggestRetake || [];
      patch['items[' + i + '].stepCount'] = obs.stepCount != null ? String(obs.stepCount) : '';
      patch['items[' + i + '].doorType'] = obs.doorType || '';
      patch['items[' + i + '].elevatorStatus'] = obs.elevatorStatus || '';
      this.setData(patch);
    }).catch(err => {
      this.setData({
        ['items[' + i + '].loading']: false,
        ['items[' + i + '].error']: err.message || '识别失败，请人工填写'
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
    this.setData({ submitting: true });
    const user = userService.current();
    const inspection = {
      placeId: this.data.placeId,
      placeName: this.data.placeName || '新采集地点',
      submittedBy: user ? user.nickname : '匿名',
      items: this.data.items.map(it => ({
        key: it.key, title: it.title, choice: it.choice,
        photo: it.photo,
        aiDetected: it.detected, ocrText: it.ocrText,
        basis: it.basis, confidence: it.confidence,
        unknownFields: it.unknownFields, suggestRetake: it.suggestRetake,
        stepCount: it.stepCount, doorType: it.doorType, elevatorStatus: it.elevatorStatus
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
  }
});
