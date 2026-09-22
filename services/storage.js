// 本地存储封装：优先 wx storage，异常时回退内存，保证雏形不崩
const mem = {};

function get(key, def) {
  try {
    const v = wx.getStorageSync(key);
    if (v === '' || v === null || v === undefined) {
      return key in mem ? mem[key] : def;
    }
    return v;
  } catch (e) {
    return key in mem ? mem[key] : def;
  }
}

function set(key, val) {
  try {
    wx.setStorageSync(key, val);
  } catch (e) {
    mem[key] = val;
  }
}

function remove(key) {
  try {
    wx.removeStorageSync(key);
  } catch (e) {
    delete mem[key];
  }
}

module.exports = { get, set, remove };
