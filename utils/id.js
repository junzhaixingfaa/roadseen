// 本地原型 ID：同一进程内单调递增，避免连续操作落在同一毫秒时互相覆盖。
let seq = 0;

function nextId(prefix) {
  seq += 1;
  return String(prefix || '') + Date.now() + '-' + seq;
}

module.exports = { nextId };
