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

const RESULT_SCORE = { pass: 4, assist: 3, unknown: 2, blocked: 1 };
const RESULT_TEXT = { pass: '可独立通过', assist: '需要协助', unknown: '信息不足', blocked: '暂时不可通过' };

// 合并入口结论与地点级结论时取风险更高的一项。
function mergeResult(a, b) {
  const risk = { pass: 1, assist: 2, unknown: 3, blocked: 4 };
  if (!a) return b;
  if (!b) return a;
  return risk[a] >= risk[b] ? a : b;
}

function evaluateEntrance(entrance, prof) {
  const reasons = [];
  let result = 'pass';

  if (entrance.hasSteps && !entrance.hasRamp) {
    reasons.push('仅有台阶且无坡道/移动坡道');
    result = 'blocked';
  }
  if (prof.deviceWidth && entrance.doorWidth && prof.deviceWidth > entrance.doorWidth) {
    reasons.push('门洞净宽约 ' + entrance.doorWidth + ' cm，' + (prof.device || '轮椅') + '宽 ' + prof.deviceWidth + ' cm 无法通过');
    result = 'blocked';
  }

  const needsAssist = [];
  if (entrance.hasThreshold && entrance.thresholdHeight > 0 && !prof.acceptLowThreshold) {
    needsAssist.push('入口门槛约' + entrance.thresholdHeight + 'cm');
  }
  if (entrance.needAssistToOpen || entrance.doorType === '需他人开门') needsAssist.push('需他人开门');
  if (entrance.rampCondition === '较陡') needsAssist.push('坡道较陡');

  if (result !== 'blocked' && needsAssist.length) {
    if (prof.acceptAssist && prof.accompanied) {
      reasons.push('需要协助：' + needsAssist.join('、') + '（有人陪同，可协助完成）');
      result = 'assist';
    } else {
      const why = prof.accompanied ? '但您设置了不接受协助方式' : '但您当前独立出行，现场无人协助';
      reasons.push('存在需协助环节（' + needsAssist.join('、') + '），' + why);
      result = 'blocked';
    }
  }
  if (!reasons.length) reasons.push('入口主要通行节点无明显障碍');
  return { result, reasons };
}

function judgeAccess(place, profile, activeIncidents) {
  const hasProfile = !!profile;
  const base = { result: 'unknown', reasons: [], evidenceIds: [], alternatives: [], hasProfile, disclaimer: '仅供出行准备参考', recommendedEntranceId: '' };
  if (!place) { base.reasons = ['地点信息不存在']; return base; }

  const prof = profile || GENERIC_PROFILE;
  const incidents = activeIncidents || [];
  const globalReasons = [];
  const evidenceIds = (place.evidenceIds || []).slice();
  base.evidenceIds = evidenceIds;
  let globalResult = null;
  const entrances = place.entrances || [];
  if (!entrances.length) { base.reasons = ['缺少入口信息，无法判断，建议现场勘察']; return base; }

  if (!place.lastVerifiedAt) {
    globalReasons.push('缺少最近核验日期，需现场复核'); globalResult = 'unknown';
  } else if (util.isExpired(place.lastVerifiedAt, campus.evidenceValidDays)) {
    globalReasons.push('关键信息采集于 ' + place.lastVerifiedAt + '，已超有效期，需复核'); globalResult = 'unknown';
  }

  const fac = place.facilities || {};
  const elev = fac.elevator || {};
  const toilet = fac.accessibleToilet || {};
  const needElev = !!place.needElevatorToTarget && (hasProfile ? !!prof.mustUseElevator : true);

  incidents.forEach(inc => {
    const desc = '【动态】' + (inc.description || inc.type || '存在临时障碍');
    if (inc.facility === 'elevator') {
      if (needElev) { globalReasons.push(desc + (hasProfile ? '' : '（未设置档案，按通用轮椅条件假定需乘电梯）')); globalResult = 'blocked'; }
      else if (place.needElevatorToTarget) globalReasons.push(desc + '（您的档案为无需乘电梯，本次判断不受影响）');
      else globalReasons.push(desc + '（到达该地点目标无需乘电梯）');
    } else if (inc.facility === 'entrance' || inc.facility === 'path' || inc.facility === 'ramp') {
      globalReasons.push(desc); globalResult = 'blocked';
    } else if (inc.facility === 'toilet') {
      if (place.needAccessibleToilet) { globalReasons.push(desc); globalResult = 'blocked'; }
      else globalReasons.push(desc + '（不影响通行，如厕需另行安排）');
    } else if (inc.facility === 'door') {
      if (prof.acceptAssist && prof.accompanied) { globalReasons.push(desc + '（有人陪同，可尝试协助开门）'); globalResult = mergeResult(globalResult, 'assist'); }
      else { globalReasons.push(desc + '，当前条件下无法确认可安全进入'); globalResult = 'blocked'; }
    } else if (inc.facility === 'openTime') {
      globalReasons.push(desc + '，实际开放时间需复核后确认'); if (globalResult !== 'blocked') globalResult = 'unknown';
    } else {
      globalReasons.push(desc + '，影响范围不明，需现场确认'); if (globalResult !== 'blocked') globalResult = 'unknown';
    }
  });

  if (needElev) {
    if (!elev.has) { globalReasons.push('需上楼但无可用电梯'); globalResult = 'blocked'; }
    else if (elev.status === 'fault') { globalReasons.push('电梯故障中'); globalResult = 'blocked'; }
  }
  if (prof.deviceWidth && place.minPassageWidth && prof.deviceWidth > place.minPassageWidth) {
    globalReasons.push('通往目标的路径最窄处净宽约 ' + place.minPassageWidth + ' cm，' + (prof.device || '轮椅') + '宽 ' + prof.deviceWidth + ' cm 无法通过');
    globalResult = 'blocked';
  }
  if (place.needAccessibleToilet) {
    if (toilet.has === false) { globalReasons.push('缺少无障碍厕所'); globalResult = 'blocked'; }
    else if (toilet.status === 'unknown') { globalReasons.push('无障碍厕所信息未知'); globalResult = mergeResult(globalResult, 'unknown'); }
  }

  // 推荐入口只作为同分时的优先项；所有入口都计算后，按用户档案自动选择最优入口。
  const ordered = entrances.slice().sort((a, b) => Number(!!b.isRecommended) - Number(!!a.isRecommended));
  const evaluated = ordered.map(entrance => {
    const local = evaluateEntrance(entrance, prof);
    return { entrance, result: mergeResult(globalResult, local.result), reasons: local.reasons };
  });
  evaluated.sort((a, b) => RESULT_SCORE[b.result] - RESULT_SCORE[a.result]);
  const chosen = evaluated[0];
  const reasons = globalReasons.concat(chosen.reasons);
  if (!globalReasons.length && chosen.result === 'pass') reasons.push('数据在有效期内');

  const alternatives = evaluated.slice(1).map(item => ({
    id: item.entrance.id, name: item.entrance.name, direction: item.entrance.direction,
    result: item.result, resultText: RESULT_TEXT[item.result], reasons: item.reasons,
    blockedByWidth: item.reasons.some(r => r.indexOf('门洞净宽') >= 0),
    blockReason: item.reasons.find(r => r.indexOf('门洞净宽') >= 0) || ''
  }));

  return {
    result: chosen.result, reasons, evidenceIds, alternatives, hasProfile,
    disclaimer: '仅供出行准备参考', recommendedEntranceId: chosen.entrance.id
  };
}

module.exports = { judgeAccess, GENERIC_PROFILE, evaluateEntrance };
