// 现场证据访问层
const base = require('../data/evidences');
const storage = require('./storage');

function allForPlace(placeId) {
  const added = storage.get('lj_evidences_added', []);
  const list = base.filter(e => e.placeId === placeId).concat(added.filter(e => e.placeId === placeId));
  return Promise.resolve(list);
}

let seq = 0;

function addEvidence(ev) {
  const added = storage.get('lj_evidences_added', []);
  // 一次发布往往同时写入多张照片，Date.now() 会撞出重复 id，补一个自增序号
  ev.id = ev.id || ('ev' + Date.now() + '-' + (++seq));
  added.push(ev);
  storage.set('lj_evidences_added', added);
  return ev;
}

module.exports = { allForPlace, addEvidence };
