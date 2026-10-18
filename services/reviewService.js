// 地点纠错与复核记录：本地雏形实现，后续可替换为云数据库集合。
const storage = require('./storage');
const { nextId } = require('../utils/id');

const KEY = 'lj_reviews';

function listAll() {
  return Promise.resolve(storage.get(KEY, []));
}

function submit(data) {
  const list = storage.get(KEY, []);
  const item = Object.assign({
    id: nextId('rv'),
    status: 'pending',
    createdAt: Date.now(),
    isTestData: true
  }, data || {});
  list.unshift(item);
  storage.set(KEY, list);
  return Promise.resolve(item);
}

function setStatus(id, status, note) {
  const list = storage.get(KEY, []);
  const item = list.find(r => r.id === id);
  if (!item) return Promise.resolve(null);
  item.status = status;
  item.reviewNote = note || '';
  item.reviewedAt = Date.now();
  storage.set(KEY, list);
  return Promise.resolve(item);
}

module.exports = { listAll, submit, setStatus };
