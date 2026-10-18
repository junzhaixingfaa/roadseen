// 动态事件访问层：上报 / 查询 active / 确认 / 恢复 / 自动过期
const base = require('../data/incidents');
const util = require('../utils/util');
const { nextId } = require('../utils/id');
const storage = require('./storage');

function current() {
  const over = storage.get('lj_incidents_over', {});
  const added = storage.get('lj_incidents_added', []);
  const apply = list => list.map(i => (over[i.id] ? Object.assign({}, i, over[i.id]) : i));
  return apply(base).concat(apply(added));
}

// 预计结束时间是否已过。上报页用日期选择器（YYYY-MM-DD），
// 纯日期按「当天结束」理解：次日零点才过期，否则「预计今天结束」的事件
// 在当天 00:00 就被降级为待复核，与上报页允许选今天的校验自相矛盾。
function isEndAtPassed(expectedEndAt) {
  const d = util.parseDate(expectedEndAt);
  if (!d) return false;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(expectedEndAt).trim());
  return d.getTime() + (dateOnly ? 86400000 : 0) <= Date.now();
}

function isActive(i) {
  if (i.status !== 'active') return false;
  if (i.expectedEndAt && isEndAtPassed(i.expectedEndAt)) return false;
  return true;
}

function expireSweep() {
  const over = storage.get('lj_incidents_over', {});
  let changed = false;
  current().forEach(i => {
    if (i.status === 'active' && i.expectedEndAt && isEndAtPassed(i.expectedEndAt)) {
      over[i.id] = Object.assign({}, over[i.id], { status: 'pending_review' });
      changed = true;
    }
  });
  if (changed) storage.set('lj_incidents_over', over);
}

function getById(id) { return current().find(i => i.id === id) || null; }

function listAll() { expireSweep(); return Promise.resolve(current()); }

function listActiveForPlace(placeId) {
  expireSweep();
  return Promise.resolve(current().filter(i => i.placeId === placeId && isActive(i)));
}

function listResolvedForPlace(placeId) {
  return Promise.resolve(current().filter(i => i.placeId === placeId && i.status === 'resolved'));
}

function activeByPlace() {
  expireSweep();
  const m = {};
  current().filter(isActive).forEach(i => { (m[i.placeId] = m[i.placeId] || []).push(i); });
  return m;
}

function report(p) {
  const added = storage.get('lj_incidents_added', []);
  const item = Object.assign(
    { id: nextId('in'), status: 'active', confirmCount: 1, isTestData: true, occurredAt: util.formatDate(new Date()) },
    p
  );
  added.push(item);
  storage.set('lj_incidents_added', added);
  return Promise.resolve(item);
}

function setStatus(id, status, extra) {
  const over = storage.get('lj_incidents_over', {});
  over[id] = Object.assign({}, over[id], { status }, extra || {});
  storage.set('lj_incidents_over', over);
  return Promise.resolve(getById(id));
}

function resolve(id) { return setStatus(id, 'resolved', { resolvedAt: util.formatDate(new Date()) }); }

// 到期事件经管理员确认「仍在进行中」后重新生效；
// 必须清掉 expectedEndAt，否则下一次 expireSweep 会立刻把它再次降级。
function reactivate(id) {
  return setStatus(id, 'active', { expectedEndAt: '', reactivatedAt: util.formatDate(new Date()) });
}

function confirm(id) {
  const cur = getById(id) || {};
  const over = storage.get('lj_incidents_over', {});
  const cc = (over[id] && over[id].confirmCount) || cur.confirmCount || 0;
  over[id] = Object.assign({}, over[id], { confirmCount: cc + 1 });
  storage.set('lj_incidents_over', over);
  return Promise.resolve(getById(id));
}

module.exports = { listAll, listActiveForPlace, listResolvedForPlace, activeByPlace, report, resolve, reactivate, confirm, setStatus, getById };
