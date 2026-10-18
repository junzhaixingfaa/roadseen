// 勘察提交与审核发布：把「AI 预填 + 人工确认」的结果落到地点资料。
// 放在 service 层而非页面里，scripts/selftest.js 才能离线验证发布逻辑。
const storage = require('./storage');
const placeService = require('./placeService');
const evidenceService = require('./evidenceService');
const aiSchema = require('./aiSchema');
const util = require('../utils/util');
const { nextId } = require('../utils/id');

const KEY = 'lj_inspections';
const REV_KEY = 'lj_place_revisions';

function list() { return storage.get(KEY, []); }

function getById(id) { return list().find(x => x.id === id) || null; }

function submit(inspection) {
  const list = storage.get(KEY, []);
  const item = Object.assign({
    id: nextId('insp'),
    status: 'pending',
    submittedAt: Date.now(),
    isTestData: true
  }, inspection);
  list.unshift(item);
  storage.set(KEY, list);
  return item;
}

function setStatus(id, status, extra) {
  const list = storage.get(KEY, []);
  const it = list.find(x => x.id === id);
  if (!it) return null;
  Object.assign(it, extra || {}, { status, reviewedAt: Date.now() });
  storage.set(KEY, list);
  return it;
}

function hasLabel(item, label) {
  return !!item && (item.aiDetected || []).indexOf(label) >= 0;
}

function toNumber(v, field) {
  if (v === '' || v == null) return NaN;
  const n = Number(v);
  const rule = aiSchema.MEASUREMENTS[field];
  if (Number.isNaN(n) || !rule || n < rule.min || n > rule.max) return NaN;
  return rule.integer ? Math.round(n) : Math.round(n * 10) / 10;
}

// 该地点是否已有核实过的入口数据；为真时发布会覆盖它，页面需二次确认
function hasVerifiedEntrance(place) {
  return !!place && !place.pendingInspection && (place.entrances || []).length > 0;
}

function fmtVal(v) {
  if (v === false) return '否';
  if (v === true) return '是';
  if (v === '' || v == null) return '未填';
  return String(v);
}

const ENTRANCE_LABELS = {
  hasSteps: '有台阶', hasRamp: '有坡道', stepCount: '台阶数',
  thresholdHeight: '门槛高', doorType: '门型', rampCondition: '坡道状况'
};

function diffEntrance(before, after) {
  if (!before || !after) return [];
  return Object.keys(ENTRANCE_LABELS)
    .filter(k => before[k] !== after[k])
    .map(k => ENTRANCE_LABELS[k] + '：' + fmtVal(before[k]) + ' → ' + fmtVal(after[k]));
}

function diffFacilities(before, after) {
  const out = [];
  const b = before || {}, a = after || {};
  [['elevator', '电梯'], ['accessibleToilet', '无障碍厕所']].forEach(pair => {
    const x = b[pair[0]] || {}, y = a[pair[0]] || {};
    if (x.has !== y.has || x.status !== y.status) {
      out.push(pair[1] + '：' + fmtVal(x.has) + '/' + fmtVal(x.status) + ' → ' + fmtVal(y.has) + '/' + fmtVal(y.status));
    }
  });
  return out;
}

function listRevisions(placeId) {
  const all = storage.get(REV_KEY, []);
  return placeId ? all.filter(r => r.placeId === placeId) : all;
}

function addRevision(rev) {
  const all = storage.get(REV_KEY, []);
  const item = Object.assign({
    id: nextId('rev'),
    at: util.formatDate(new Date()),
    changes: []
  }, rev);
  all.unshift(item);
  storage.set(REV_KEY, all.slice(0, 200));
  return item;
}

// 依据已确认的采集项更新入口与设施。只写有依据的字段，
// 本次未覆盖的字段保持原值，避免用演示识别结果抹掉已核实数据。
async function publish(inspection) {
  const place = await placeService.get(inspection.placeId);
  if (!place) throw new Error('关联地点不存在');

  const usable = (inspection.items || []).filter(i => i.choice !== 'unknown');
  const byKey = key => usable.find(i => i.key === key);

  const entrances = (place.entrances || []).map(e => Object.assign({}, e));
  const rec = entrances.find(e => e.isRecommended) || entrances[0];
  const entrance = byKey('entrance');
  const step = byKey('step');
  const door = byKey('door');
  if (rec) {
    // 坡道有无只认「入口全景」：台阶照片通常拍不到坡道，
    // 用它覆盖 hasRamp 会把可通行地点误判成「仅有台阶且无坡道」。
    if (entrance) rec.hasRamp = hasLabel(entrance, '坡道');
    if (step) {
      const sc = toNumber(step.stepCount, 'stepCount');
      rec.hasSteps = hasLabel(step, '台阶') || (!Number.isNaN(sc) && sc > 0);
      if (!Number.isNaN(sc)) rec.stepCount = sc;
    }
    if (door && door.doorType) rec.doorType = String(door.doorType).trim().slice(0, 30);
  }

  const facilities = Object.assign({}, place.facilities);
  const elevator = byKey('elevator');
  if (elevator) {
    facilities.elevator = Object.assign({}, facilities.elevator, {
      has: hasLabel(elevator, '电梯'),
      status: aiSchema.elevatorStatus(elevator.elevatorStatus) || 'unknown'
    });
  }
  const toilet = byKey('toilet');
  if (toilet) {
    const toiletStatus = aiSchema.toiletStatus(toilet.toiletStatus);
    facilities.accessibleToilet = Object.assign({}, facilities.accessibleToilet, {
      has: hasLabel(toilet, '厕所标识'),
      status: toiletStatus || (hasLabel(toilet, '厕所标识') ? 'open' : 'unknown')
    });
  }

  const collectedAt = util.formatDate(new Date());
  const newIds = usable.filter(i => i.photo).map(i => evidenceService.addEvidence({
    placeId: place.id,
    entranceId: rec ? rec.id : '',
    type: i.key,
    imageUrl: i.photo,
    collectedAt: collectedAt,
    source: 'volunteer',
    aiTags: i.aiDetected || [],
    confirmStatus: 'confirmed',
    isTestData: true
  }).id);

  // evidenceIds 是「当前被采信的证据集」，地点页按它过滤证据区；
  // 不把新照片写进来，刚发布的证据就会在地点页被藏掉。
  const evidenceIds = (place.evidenceIds || []).slice();
  newIds.forEach(id => { if (evidenceIds.indexOf(id) < 0) evidenceIds.push(id); });

  placeService.saveOverride(place.id, {
    entrances,
    facilities,
    evidenceIds,
    lastVerifiedAt: collectedAt,
    collectedBy: inspection.submittedBy,
    pendingInspection: false
  });

  const beforeRec = (place.entrances || []).find(e => e.isRecommended) || (place.entrances || [])[0] || null;
  const changes = diffEntrance(beforeRec, rec).concat(diffFacilities(place.facilities, facilities));
  const revision = addRevision({
    placeId: place.id,
    inspectionId: inspection.id,
    by: inspection.submittedBy,
    changes: changes
  });

  return { placeId: place.id, entranceUpdated: !!rec, evidenceAdded: newIds.length, changes: changes, revisionId: revision.id };
}

module.exports = { list, getById, submit, setStatus, publish, hasVerifiedEntrance, listRevisions };
