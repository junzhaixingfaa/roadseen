// 勘察提交与审核发布：把「AI 预填 + 人工确认」的结果落到地点资料。
// 放在 service 层而非页面里，scripts/selftest.js 才能离线验证发布逻辑。
const storage = require('./storage');
const placeService = require('./placeService');
const evidenceService = require('./evidenceService');
const util = require('../utils/util');

const KEY = 'lj_inspections';

function list() { return storage.get(KEY, []); }

function getById(id) { return list().find(x => x.id === id) || null; }

function submit(inspection) {
  const list = storage.get(KEY, []);
  const item = Object.assign({
    id: 'insp' + Date.now(),
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

function toNumber(v) {
  if (v === '' || v == null) return NaN;
  const n = Number(v);
  return Number.isNaN(n) ? NaN : n;
}

// 该地点是否已有核实过的入口数据；为真时发布会覆盖它，页面需二次确认
function hasVerifiedEntrance(place) {
  return !!place && !place.pendingInspection && (place.entrances || []).length > 0;
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
      const sc = toNumber(step.stepCount);
      rec.hasSteps = hasLabel(step, '台阶') || (!Number.isNaN(sc) && sc > 0);
      if (!Number.isNaN(sc)) rec.stepCount = sc;
    }
    if (door && door.doorType) rec.doorType = door.doorType;
  }

  const facilities = Object.assign({}, place.facilities);
  const elevator = byKey('elevator');
  if (elevator) {
    facilities.elevator = Object.assign({}, facilities.elevator, {
      has: hasLabel(elevator, '电梯'),
      status: elevator.elevatorStatus || 'unknown'
    });
  }
  const toilet = byKey('toilet');
  if (toilet) {
    facilities.accessibleToilet = Object.assign({}, facilities.accessibleToilet, {
      has: hasLabel(toilet, '厕所标识'),
      status: hasLabel(toilet, '厕所标识') ? 'open' : 'unknown'
    });
  }

  placeService.saveOverride(place.id, {
    entrances,
    facilities,
    lastVerifiedAt: util.formatDate(new Date()),
    collectedBy: inspection.submittedBy,
    pendingInspection: false
  });

  const collectedAt = util.formatDate(new Date());
  usable.filter(i => i.photo).forEach(i => evidenceService.addEvidence({
    placeId: place.id,
    entranceId: rec ? rec.id : '',
    type: i.key,
    imageUrl: i.photo,
    collectedAt: collectedAt,
    source: 'volunteer',
    aiTags: i.aiDetected || [],
    confirmStatus: 'confirmed',
    isTestData: true
  }));

  return { placeId: place.id, entranceUpdated: !!rec };
}

module.exports = { list, getById, submit, setStatus, publish, hasVerifiedEntrance };
