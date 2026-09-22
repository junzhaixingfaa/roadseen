// 模拟多模态识别：返回预置结构化结果，带假延迟；支持失败回退
const ai = require('../data/aiResults');

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
        reject(new Error('AI 服务暂时不可用，请人工填写后继续'));
        return;
      }
      const r = ai[stepKey];
      resolve(r ? JSON.parse(JSON.stringify(r)) : fallback(stepKey));
    }, delay);
  });
}

module.exports = { recognize };
