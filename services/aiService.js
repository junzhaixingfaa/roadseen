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

// 普通用户的单图快速检查。当前为明确标注的本地演示适配器；
// 正式版应由云函数上传图片并返回相同结构，密钥不得放在小程序端。
function quickAssess(imagePath, opts) {
  opts = opts || {};
  const delay = opts.delay == null ? 900 : opts.delay;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (opts.forceFail) {
        log({ stepKey: '快速检查', scene: 'quick-check', ok: false, msg: '快速识别失败' });
        reject(new Error('识别服务暂时不可用'));
        return;
      }
      const result = {
        mode: 'demo',
        result: 'assist',
        title: '可能需要协助',
        summary: '画面演示结果：入口通道基本连续，但门体与坡度仍需现场确认。',
        confidence: 'medium',
        observations: ['检测到入口及连续通道', '未发现明显连续台阶', '门体开启方式无法可靠判断'],
        risks: ['仅凭单张照片无法测量实际坡度与通道宽度'],
        actions: ['建议从正面补拍入口全景', '如现场无坡道，请选择“上报问题”'],
        disclaimer: '当前使用本地演示识别，接入服务端视觉模型后才会分析你拍摄的真实画面。'
      };
      log({ stepKey: '快速检查', scene: 'quick-check', imagePath: !!imagePath, ok: true, msg: '完成本地演示识别' });
      resolve(result);
    }, delay);
  });
}

module.exports = { recognize, quickAssess, listLogs };
