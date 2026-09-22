// 现场证据访问层
const base = require('../data/evidences');
const storage = require('./storage');

function allForPlace(placeId) {
  const added = storage.get('lj_evidences_added', []);
  const list = base.filter(e => e.placeId === placeId).concat(added.filter(e => e.placeId === placeId));
  return Promise.resolve(list);
}

function addEvidence(ev) {
  const added = storage.get('lj_evidences_added', []);
  ev.id = ev.id || ('ev' + Date.now());
  added.push(ev);
  storage.set('lj_evidences_added', added);
  return ev;
}

module.exports = { allForPlace, addEvidence };
