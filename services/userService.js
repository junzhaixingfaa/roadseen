// 用户 / 档案 / 收藏访问层（雏形用本地存储，模拟登录与角色切换）
const base = require('../data/users');
const storage = require('./storage');

const CUR = 'lj_current_uid';

function syncGlobal(user) {
  try {
    const app = (typeof getApp === 'function') ? getApp() : null;
    if (app && app.globalData) app.globalData.currentUser = user;
  } catch (e) { /* ignore */ }
}

function all() {
  const over = storage.get('lj_profile_over', {});
  return base.map(u => (over[u.id] !== undefined ? Object.assign({}, u, { profile: over[u.id] }) : u));
}

function listUsers() { return Promise.resolve(all()); }

function current() { return all().find(u => u.id === storage.get(CUR, null)) || null; }

function ensureCurrent() {
  let u = current();
  if (!u) { u = all()[0]; if (u) storage.set(CUR, u.id); }
  syncGlobal(u);
  return Promise.resolve(u);
}

function setCurrent(uid) {
  storage.set(CUR, uid);
  const u = all().find(x => x.id === uid) || null;
  syncGlobal(u);
  return Promise.resolve(u);
}

function getProfile() { const u = current(); return u ? (u.profile || null) : null; }

function saveProfile(profile) {
  const uid = storage.get(CUR, null);
  const over = storage.get('lj_profile_over', {});
  over[uid] = profile;
  storage.set('lj_profile_over', over);
  syncGlobal(all().find(u => u.id === uid) || null);
  return Promise.resolve(profile);
}

// ---- 收藏 ----
function favorites() { return storage.get('lj_favorites', []); }
function isFavorite(id) { return favorites().indexOf(id) >= 0; }
function toggleFavorite(id) {
  const f = favorites();
  const i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else f.unshift(id);
  storage.set('lj_favorites', f);
  return Promise.resolve({ favorite: i < 0, ids: f });
}

module.exports = {
  listUsers, current, ensureCurrent, setCurrent,
  getProfile, saveProfile,
  favorites, isFavorite, toggleFavorite
};
