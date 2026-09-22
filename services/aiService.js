// 模拟多模态识别：返回预置结构化结果，带假延迟；支持失败回退
const ai = require('../data/aiResults');
const storage = require('./storage');

function log(entry) {
  const list = storage.get('lj_ai_logs', []);
  list.unshift(Object.assign({ at: Date.now() }, entry));
  storage.set('lj_ai_logs', list.slice(0, 50));
}

function listLogs() {
  return Promise.resolve(storage.get('lj_ai_logs', []));
}

function fallback(stepKey) {
  return {
    facilityType: stepKey,
    detected: {},
    observable: {},
    ocrText: '',
    basis: '未能识别到明确信息，请人工核对',
    confidence: 'low',
    unknownFields: ['all'],
    suggestRetake: ['建议补拍更清晰画面']
  };
}

// opts: { delay, forceFail }
function recognize(stepKey, opts) {
  opts = opts || {};
  const delay = opts.delay == null ? 800 : opts.delay;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (opts.forceFail) {
        log({ stepKey, ok: false, msg: 'AI 服务暂时不可用，请人工填写后继续' });
        reject(new Error('AI 服务暂时不可用，请人工填写后继续'));
        return;
      }
      const r = ai[stepKey];
      log({ stepKey, ok: true, msg: r ? '命中预置识别结果' : '无匹配，返回空结果待人工' });
      resolve(r ? JSON.parse(JSON.stringify(r)) : fallback(stepKey));
    }, delay);
  });
}

module.exports = { recognize, listLogs };
