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
  const added = storage.get('lj_users_added', []);
  return base.concat(added).map(u => (over[u.id] !== undefined ? Object.assign({}, u, { profile: over[u.id] }) : Object.assign({}, u)));
}

function listUsers() {
  return Promise.resolve(all().map(u => ({ id: u.id, account: u.account, nickname: u.nickname, role: u.role, profile: u.profile })));
}

function current() { return all().find(u => u.id === storage.get(CUR, null)) || null; }

function ensureCurrent() {
  const u = current();
  syncGlobal(u);
  return Promise.resolve(u);
}

function authenticate(account, password) {
  const a = String(account || '').trim().toLowerCase();
  const u = all().find(item => String(item.account || '').toLowerCase() === a && item.password === password) || null;
  if (u) {
    storage.set(CUR, u.id);
    syncGlobal(u);
  }
  return Promise.resolve(u);
}

function register(data) {
  const account = String(data.account || '').trim().toLowerCase();
  if (all().some(u => String(u.account || '').toLowerCase() === account)) {
    return Promise.reject(new Error('该账号已经存在'));
  }
  const added = storage.get('lj_users_added', []);
  const user = {
    id: 'user-local-' + Date.now(),
    account,
    password: data.password,
    nickname: String(data.nickname || '').trim() || account,
    role: 'user',
    profile: null,
    isLocalDemo: true
  };
  added.push(user);
  storage.set('lj_users_added', added);
  storage.set(CUR, user.id);
  syncGlobal(user);
  return Promise.resolve(user);
}

function logout() {
  storage.remove(CUR);
  syncGlobal(null);
  return Promise.resolve();
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

// ---- 地点状态订阅 ----
// 按用户分别保存，避免切换演示账号后看到其他账号的订阅。
function subscriptionStore() { return storage.get('lj_subscriptions', {}); }
function subscriptions() {
  const uid = storage.get(CUR, null);
  if (!uid) return [];
  return subscriptionStore()[uid] || [];
}
function isSubscribed(id) { return subscriptions().indexOf(id) >= 0; }
function toggleSubscription(id) {
  const uid = storage.get(CUR, null);
  if (!uid) return Promise.resolve({ subscribed: false, ids: [] });
  const allSubs = subscriptionStore();
  const ids = (allSubs[uid] || []).slice();
  const i = ids.indexOf(id);
  if (i >= 0) ids.splice(i, 1); else ids.unshift(id);
  allSubs[uid] = ids;
  storage.set('lj_subscriptions', allSubs);
  return Promise.resolve({ subscribed: i < 0, ids });
}

module.exports = {
  listUsers, current, ensureCurrent, setCurrent,
  authenticate, register, logout,
  getProfile, saveProfile,
  favorites, isFavorite, toggleFavorite,
  subscriptions, isSubscribed, toggleSubscription
};
