// ★通行判断规则引擎（作品核心，真实逻辑，非大模型决定）
// 输入：地点 place、用户档案 profile（可为 null）、影响该地点的 active 事件数组
// 输出：{ result, reasons, evidenceIds, alternatives }
const util = require('../utils/util');
const campus = require('../data/campus');

// 无档案时的通用条件
const GENERIC_PROFILE = {
  device: '未设置', deviceWidth: null, accompanied: false,
  mustUseElevator: false, acceptLowThreshold: false, acceptAssist: false
};

function judgeAccess(place, profile, activeIncidents) {
  const res = { result: 'unknown', reasons: [], evidenceIds: [], alternatives: [] };
  if (!place) {
    res.reasons = ['地点信息不存在'];
    return res;
  }
  const prof = profile || GENERIC_PROFILE;
  const hasProfile = !!profile;
  const incidents = activeIncidents || [];
  const reasons = [];
  const evidenceIds = (place.evidenceIds || []).slice();
  let result = null;

  // 1) 入口信息缺失 → 信息不足
  const entrances = place.entrances || [];
  if (entrances.length === 0) {
    return { result: 'unknown', reasons: ['缺少入口信息，无法判断，建议现场勘察'], evidenceIds, alternatives: [] };
  }
  const rec = entrances.find(e => e.isRecommended) || entrances[0];

  // 2) 数据有效期：过期不阻断确定结论，但降级为需复核
  if (place.lastVerifiedAt && util.isExpired(place.lastVerifiedAt, campus.evidenceValidDays)) {
    reasons.push('关键信息采集于 ' + place.lastVerifiedAt + '，已超有效期，需复核');
    result = 'unknown';
  }

  const fac = place.facilities || {};
  const elev = fac.elevator || {};
  const toilet = fac.accessibleToilet || {};
  // 未建档案时按「通用轮椅条件」保守假定需要电梯，与地图页「按通用轮椅条件计算」的文案一致，
  // 否则无档案用户会在电梯停运的楼层型地点看到错误的「可通行」。
  const needElev = !!place.needElevatorToTarget && (hasProfile ? !!prof.mustUseElevator : true);

  // 3) 动态事件（优先级最高的阻断）
  incidents.forEach(inc => {
    const desc = '【动态】' + (inc.description || inc.type || '存在临时障碍');
    if (inc.facility === 'elevator') {
      if (needElev) {
        reasons.push(desc + (hasProfile ? '' : '（未设置档案，按通用轮椅条件假定需乘电梯）'));
        result = 'blocked';
      } else if (place.needElevatorToTarget) {
        reasons.push(desc + '（您的档案为无需乘电梯，本次判断不受影响）');
      } else {
        reasons.push(desc + '（到达该地点目标无需乘电梯）');
      }
    } else if (inc.facility === 'entrance' || inc.facility === 'path' || inc.facility === 'ramp') {
      reasons.push(desc); result = 'blocked';
    } else if (inc.facility === 'toilet') {
      if (place.needAccessibleToilet) { reasons.push(desc); result = 'blocked'; }
      else { reasons.push(desc + '（不影响通行，如厕需另行安排）'); }
    } else if (inc.facility === 'door') {
      if (prof.acceptAssist && prof.accompanied) {
        reasons.push(desc + '（有人陪同，可尝试协助开门）');
        if (!result) result = 'assist';
      } else {
        reasons.push(desc + '，当前条件下无法确认可安全进入');
        result = 'blocked';
      }
    } else if (inc.facility === 'openTime') {
      reasons.push(desc + '，实际开放时间需复核后确认');
      if (result !== 'blocked') result = 'unknown';
    } else {
      // other 及将来新增的未分类事件：影响范围不明时保守降为待复核。
      // 不能维持「可通行」，否则用户上报后地图颜色毫无变化，动态闭环形同虚设。
      reasons.push(desc + '，影响范围不明，需现场确认');
      if (result !== 'blocked') result = 'unknown';
    }
  });

  // 4a) 入口仅有台阶且无坡道
  if (rec.hasSteps && !rec.hasRamp) {
    reasons.push('推荐入口仅有台阶且无坡道/移动坡道');
    result = 'blocked';
  }
  // 4b) 需要电梯但无可用/故障
  if (needElev) {
    if (!elev.has) { reasons.push('需上楼但无可用电梯'); result = 'blocked'; }
    else if (elev.status === 'fault') { reasons.push('电梯故障中'); result = 'blocked'; }
  }
  // 4b2) 设备宽度 vs 路径最窄处净宽：过不去就是过不去，属于硬阻断，不给「协助」兜底
  if (prof.deviceWidth && place.minPassageWidth && prof.deviceWidth > place.minPassageWidth) {
    reasons.push('通往目标的路径最窄处净宽约 ' + place.minPassageWidth + ' cm，' + (prof.device || '轮椅') + '宽 ' + prof.deviceWidth + ' cm 无法通过');
    result = 'blocked';
  }
  // 4c) 无障碍厕所（若该地点以其为关键设施）
  if (place.needAccessibleToilet) {
    if (toilet.has === false) { reasons.push('缺少无障碍厕所'); result = 'blocked'; }
    else if (toilet.status === 'unknown') { reasons.push('无障碍厕所信息未知'); if (!result) result = 'unknown'; }
  }

  // 4d) 需协助环节
  const needsAssist = [];
  if (rec.hasThreshold && rec.thresholdHeight > 0 && !prof.acceptLowThreshold) needsAssist.push('入口门槛约' + rec.thresholdHeight + 'cm');
  if (rec.needAssistToOpen || rec.doorType === '需他人开门') needsAssist.push('需他人开门');
  if (rec.rampCondition === '较陡') needsAssist.push('坡道较陡');

  if (result !== 'blocked') {
    if (needsAssist.length > 0) {
      if (prof.acceptAssist && prof.accompanied) {
        reasons.push('需要协助：' + needsAssist.join('、') + '（有人陪同，可协助完成）');
        if (!result) result = 'assist';
      } else {
        const why = prof.accompanied ? '但您设置了不接受协助方式' : '但您当前独立出行，现场无人协助';
        reasons.push('存在需协助环节（' + needsAssist.join('、') + '），' + why);
        result = 'blocked';
      }
    } else if (!result) {
      result = 'pass';
      reasons.push('主要通行节点均无障碍，数据在有效期内');
    }
  }

  if (!result) result = 'unknown';

  // 备选入口
  const alternatives = entrances.filter(e => e !== rec).map(e => ({ id: e.id, name: e.name, direction: e.direction }));

  return { result, reasons, evidenceIds, alternatives, hasProfile, disclaimer: '仅供出行准备参考' };
}

module.exports = { judgeAccess, GENERIC_PROFILE };
