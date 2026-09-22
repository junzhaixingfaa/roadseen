// 四色通行状态 ↔ 文案 ↔ 颜色 映射（全局唯一来源）
const STATUS = {
  pass:    { code: 'pass',    text: '可独立通过',   color: '#2BA245', tag: 'green',  cls: 'pass' },
  assist:  { code: 'assist',  text: '需要协助',     color: '#E6A23C', tag: 'yellow', cls: 'assist' },
  blocked: { code: 'blocked', text: '暂时不可通过', color: '#D93026', tag: 'red',    cls: 'blocked' },
  unknown: { code: 'unknown', text: '信息不足',     color: '#909399', tag: 'gray',   cls: 'unknown' }
};

function getStatus(code) {
  return STATUS[code] || STATUS.unknown;
}

module.exports = { STATUS, getStatus };
