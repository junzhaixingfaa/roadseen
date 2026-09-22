// 地点数据访问层（雏形读本地 mock + 本地变更；后续换云开发只需重写本层）
const base = require('../data/places');
const campus = require('../data/campus');
const util = require('../utils/util');
const storage = require('./storage');

function all() {
  const over = storage.get('lj_places_over', {});
  const added = storage.get('lj_places_added', []);
  const merged = base.map(p => (over[p.id] ? Object.assign({}, p, over[p.id]) : Object.assign({}, p)));
  const addedWithOver = added.map(p => (over[p.id] ? Object.assign({}, p, over[p.id]) : p));
  return addedWithOver.concat(merged);
}

function list() { return Promise.resolve(all()); }

function get(id) { return Promise.resolve(all().find(p => p.id === id) || null); }

// opts: { category, hasElevator, hasToilet }
function search(keyword, opts) {
  opts = opts || {};
  let arr = all();
  const k = (keyword || '').trim();
  if (k) arr = arr.filter(p => ((p.name || '') + (p.category || '') + (p.address || '')).indexOf(k) >= 0);
  if (opts.category) arr = arr.filter(p => p.category === opts.category);
  if (opts.hasElevator) arr = arr.filter(p => p.facilities && p.facilities.elevator && p.facilities.elevator.has);
  if (opts.hasToilet) arr = arr.filter(p => p.facilities && p.facilities.accessibleToilet && p.facilities.accessibleToilet.has);
  return Promise.resolve(arr);
}

function getPendingTasks() {
  const arr = all().filter(p =>
    p.pendingInspection ||
    !p.lastVerifiedAt ||
    (p.entrances || []).length === 0 ||
    util.isExpired(p.lastVerifiedAt, campus.evidenceValidDays)
  );
  return Promise.resolve(arr);
}

function saveOverride(id, patch) {
  const over = storage.get('lj_places_over', {});
  over[id] = Object.assign({}, over[id], patch);
  storage.set('lj_places_over', over);
}

function addPlace(place) {
  const added = storage.get('lj_places_added', []);
  added.push(place);
  storage.set('lj_places_added', added);
}

module.exports = { list, get, search, getPendingTasks, saveOverride, addPlace };
