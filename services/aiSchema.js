// AI 输出契约：字段、枚举与数值范围集中在这里。
// 真实模型返回的数据必须先经过本模块清洗，页面与发布逻辑不得直接信任模型 JSON。
const STEPS = [
  { key: 'entrance', title: '入口全景', facilityType: 'entrance' },
  { key: 'path', title: '道路到入口的连续通道', facilityType: 'path' },
  { key: 'step', title: '台阶 / 坡道 / 门槛', facilityType: 'steps' },
  { key: 'door', title: '门与开门方式', facilityType: 'door' },
  { key: 'elevator', title: '电梯入口与通知', facilityType: 'elevator' },
  { key: 'toilet', title: '无障碍厕所及指示牌', facilityType: 'accessibleToilet' },
  { key: 'notice', title: '现场文字通知', facilityType: 'notice' },
  { key: 'other', title: '其他障碍', facilityType: 'other' }
];

const STEP_KEYS = STEPS.map(s => s.key);
const STEP_MAP = {};
STEPS.forEach(s => { STEP_MAP[s.key] = s; });

// 布尔设施特征。这里的中文 label 同时是人工确认表单和审核发布共用的稳定值。
const DETECT_FIELDS = [
  { key: 'hasSteps', label: '台阶' },
  { key: 'hasRamp', label: '坡道' },
  { key: 'hasElevator', label: '电梯' },
  { key: 'hasDoor', label: '门' },
  { key: 'hasToiletSign', label: '厕所标识' },
  { key: 'hasAccessibleSign', label: '无障碍标志' }
];

const DETECT_KEYS = DETECT_FIELDS.map(f => f.key);
const CONFIDENCE_VALUES = ['high', 'medium', 'low'];
const ELEVATOR_STATUS_VALUES = ['normal', 'fault', 'unknown'];

const MEASUREMENTS = {
  stepCount: { min: 0, max: 30, integer: true },
  thresholdHeight: { min: 0, max: 50, integer: false },
  doorWidth: { min: 30, max: 200, integer: false }
};

function text(value, maxLength) {
  if (value == null || (typeof value !== 'string' && typeof value !== 'number')) return '';
  return String(value).trim().slice(0, maxLength);
}

function textList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];
  return value
    .map(v => text(v, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function measurement(value, rule) {
  if (value === '' || value == null) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const n = Number(value);
  if (!isFinite(n) || n < rule.min || n > rule.max) return null;
  return rule.integer ? Math.round(n) : Math.round(n * 10) / 10;
}

function confidence(value) {
  const s = text(value, 20).toLowerCase();
  if (s === 'high' || s === '高') return 'high';
  if (s === 'medium' || s === '中') return 'medium';
  if (s === 'low' || s === '低') return 'low';
  return 'low';
}

// 允许人工输入中文，但写入地点资料前统一成枚举值。
function elevatorStatus(value) {
  const s = text(value, 20).toLowerCase();
  if (ELEVATOR_STATUS_VALUES.indexOf(s) >= 0) return s;
  if (/故障|停运|fault|broken/.test(s)) return 'fault';
  if (/正常|运行|normal|ok/.test(s)) return 'normal';
  if (/未知|unknown|不确定/.test(s)) return 'unknown';
  return '';
}

function toiletStatus(value) {
  const s = text(value, 20).toLowerCase();
  if (s === 'open' || s === 'closed' || s === 'unknown') return s;
  if (/开放|可用|正常|open/.test(s)) return 'open';
  if (/关闭|停用|closed/.test(s)) return 'closed';
  if (/未知|不确定|unknown/.test(s)) return 'unknown';
  return '';
}

function normalizeResult(stepKey, raw) {
  const step = STEP_MAP[stepKey] || null;
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const detectedSrc = src.detected && typeof src.detected === 'object' && !Array.isArray(src.detected) ? src.detected : {};
  const observableSrc = src.observable && typeof src.observable === 'object' && !Array.isArray(src.observable) ? src.observable : {};
  const detected = {};
  DETECT_KEYS.forEach(key => { detected[key] = detectedSrc[key] === true; });

  const observable = {};
  Object.keys(MEASUREMENTS).forEach(key => {
    const n = measurement(observableSrc[key], MEASUREMENTS[key]);
    if (n != null) observable[key] = n;
  });
  const status = elevatorStatus(observableSrc.elevatorStatus);
  if (status) observable.elevatorStatus = status;
  const doorType = text(observableSrc.doorType, 30);
  if (doorType) observable.doorType = doorType;
  const surface = text(observableSrc.surface, 80);
  if (surface) observable.surface = surface;
  const toilet = toiletStatus(observableSrc.toiletStatus);
  if (toilet) observable.toiletStatus = toilet;

  return {
    facilityType: step ? step.facilityType : text(src.facilityType, 30) || stepKey,
    detected,
    observable,
    ocrText: text(src.ocrText, 500),
    basis: text(src.basis, 300),
    confidence: confidence(src.confidence),
    unknownFields: textList(src.unknownFields, 12, 40),
    suggestRetake: textList(src.suggestRetake, 5, 120)
  };
}

function fallbackResult(stepKey) {
  return normalizeResult(stepKey, {
    detected: {},
    observable: {},
    ocrText: '',
    basis: '未能识别到明确信息，请人工核对',
    confidence: 'low',
    unknownFields: ['all'],
    suggestRetake: ['建议补拍更清晰画面']
  });
}

function detectedLabels(detected) {
  const d = detected || {};
  return DETECT_FIELDS.filter(f => d[f.key] === true).map(f => f.label);
}

function flagsFromLabels(labels) {
  const list = labels || [];
  return DETECT_FIELDS.map(f => ({ key: f.key, label: f.label, on: list.indexOf(f.label) >= 0 }));
}

function labelsFromFlags(flags) {
  return (flags || []).filter(f => f && f.on).map(f => f.label);
}

// 自测与真实模型接入前都可用它检查基础契约，避免缺字段或枚举漂移。
function validateResult(stepKey, raw) {
  const errors = [];
  if (!STEP_MAP[stepKey]) errors.push('未知采集步骤: ' + stepKey);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) errors.push('结果不是对象');
  if (errors.length) return { ok: false, errors };

  ['facilityType', 'detected', 'observable', 'ocrText', 'basis', 'confidence', 'unknownFields', 'suggestRetake']
    .forEach(key => { if (!(key in raw)) errors.push('缺少字段: ' + key); });
  if (raw.detected && DETECT_KEYS.some(key => typeof raw.detected[key] !== 'boolean')) {
    errors.push('detected 必须包含全部布尔字段');
  }
  if (CONFIDENCE_VALUES.indexOf(raw.confidence) < 0) errors.push('confidence 枚举非法');
  if (raw.unknownFields && !Array.isArray(raw.unknownFields)) errors.push('unknownFields 必须是数组');
  if (raw.suggestRetake && !Array.isArray(raw.suggestRetake)) errors.push('suggestRetake 必须是数组');
  return { ok: errors.length === 0, errors };
}

module.exports = {
  STEPS,
  STEP_KEYS,
  STEP_MAP,
  DETECT_FIELDS,
  DETECT_KEYS,
  CONFIDENCE_VALUES,
  ELEVATOR_STATUS_VALUES,
  MEASUREMENTS,
  normalizeResult,
  fallbackResult,
  detectedLabels,
  flagsFromLabels,
  labelsFromFlags,
  elevatorStatus,
  toiletStatus,
  validateResult
};
