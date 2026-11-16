// 模拟多模态识别：返回预置结构化结果，带假延迟；支持失败回退
const ai = require('../data/aiResults');
const aiSchema = require('./aiSchema');
const storage = require('./storage');

function log(entry) {
  const list = storage.get('lj_ai_logs', []);
  list.unshift(Object.assign({ at: Date.now() }, entry));
  storage.set('lj_ai_logs', list.slice(0, 50));
}

function listLogs() {
  return Promise.resolve(storage.get('lj_ai_logs', []));
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
      resolve(r ? aiSchema.normalizeResult(stepKey, r) : aiSchema.fallbackResult(stepKey));
    }, delay);
  });
}

// 普通用户单图快速检查：图片读取为 Base64 后发送给本机服务端。
// API Key 始终只保存在服务端，不能放入小程序包。
function quickAssess(imagePath, opts) {
  opts = opts || {};
  return new Promise((resolve, reject) => {
    if (opts.forceFail || !imagePath) { reject(new Error('请先选择现场照片')); return; }
    wx.getFileSystemManager().readFile({
      filePath: imagePath,
      encoding: 'base64',
      success: file => {
        const imageBase64 = file.data || '';
        const mimeType = imageBase64.indexOf('iVBOR') === 0 ? 'image/png' : 'image/jpeg';
        wx.request({
          url: require('../config/vision').endpoint,
          method: 'POST',
          timeout: 35000,
          header: { 'Content-Type': 'application/json' },
          data: { imageBase64, mimeType },
          success: response => {
            const result = response.data;
            if (response.statusCode !== 200 || !result || result.mode !== 'live' || !Array.isArray(result.observations) || !Array.isArray(result.actions)) {
              log({ stepKey: '快速检查', mode: 'live', ok: false, msg: '服务端识别失败' });
              reject(new Error('识别服务未完成，请检查服务配置'));
              return;
            }
            log({ stepKey: '快速检查', mode: 'live', ok: true, msg: '真实图片识别完成' });
            resolve(result);
          },
          fail: () => reject(new Error('无法连接识别服务，请确认服务已启动'))
        });
      },
      fail: () => reject(new Error('读取照片失败，请重新选择'))
    });
  });
}

module.exports = { recognize, quickAssess, listLogs };
