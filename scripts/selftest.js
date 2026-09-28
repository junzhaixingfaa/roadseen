// 离线自测：验证规则引擎判断用例与 services 层。不进小程序编译目录。
// 用法：node scripts/selftest.js
const path = require('path');
const fs = require('fs');
const ROOT = process.argv[2] || path.join(__dirname, '..');
const R = p => require(path.join(ROOT, p));

const ruleEngine = R('services/ruleEngine');
const places = R('data/places');
const users = R('data/users');
const evidences = R('data/evidences');
const aiResults = R('data/aiResults');
const placeService = R('services/placeService');
const incidentService = R('services/incidentService');
const inspectionService = R('services/inspectionService');
const evidenceService = R('services/evidenceService');
const aiService = R('services/aiService');
const reviewService = R('services/reviewService');
const userService = R('services/userService');
const util = R('utils/util');

const byId = id => places.find(p => p.id === id);
const prof = id => users.find(u => u.id === id).profile;

let pass = 0, fail = 0;
function check(name, got, want) {
  const ok = got === want;
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + '  =>  ' + got + (ok ? '' : ' (期望 ' + want + ')'));
  ok ? pass++ : fail++;
}

const u1 = prof('user-001'); // 轮椅·陪同·接受协助·必须电梯
const u2 = prof('user-002'); // 电动·独立·不接受协助·必须电梯
const u1_alone = Object.assign({}, u1, { accompanied: false });
const u1_noElev = Object.assign({}, u1, { mustUseElevator: false });
const needToilet = Object.assign({}, byId('p001'), { needAccessibleToilet: true });
const stale = Object.assign({}, byId('p001'), { lastVerifiedAt: '2020-01-01' });

// 事件数组一律现场构造或走 incidentService，
// 避免像旧版那样直接 filter data/incidents 而绕过 expectedEndAt 过期逻辑，导致自测与线上行为脱节。
const inc = (facility, description) => [{ status: 'active', facility, description }];

console.log('== 规则用例：静态资料 ==');
check('p001 图书馆 + u1', ruleEngine.judgeAccess(byId('p001'), u1, []).result, 'pass');
check('p001 图书馆 + u2', ruleEngine.judgeAccess(byId('p001'), u2, []).result, 'pass');
check('p002 老教学楼 + u1 (台阶)', ruleEngine.judgeAccess(byId('p002'), u1, []).result, 'blocked');
check('p003 食堂 + u1 (陪同接受)', ruleEngine.judgeAccess(byId('p003'), u1, []).result, 'assist');
check('p003 食堂 + u2 (独立不接受)', ruleEngine.judgeAccess(byId('p003'), u2, []).result, 'blocked');
check('p003 食堂 + u1 改独立(切换陪同)', ruleEngine.judgeAccess(byId('p003'), u1_alone, []).result, 'blocked');
check('p004 体育馆 无入口', ruleEngine.judgeAccess(byId('p004'), u1, []).result, 'unknown');
check('p005 实验楼 + u1 (静态)', ruleEngine.judgeAccess(byId('p005'), u1, []).result, 'pass');
check('p005 实验楼 + u2 (78cm 设备)', ruleEngine.judgeAccess(byId('p005'), u2, []).result, 'blocked');
check('无档案 p001(通用)', ruleEngine.judgeAccess(byId('p001'), null, []).result, 'pass');
check('资料过期降级待复核', ruleEngine.judgeAccess(stale, u1, []).result, 'unknown');
check('以厕所为关键设施(资料齐备)', ruleEngine.judgeAccess(needToilet, u1, []).result, 'pass');

console.log('== 规则用例：设备宽度 / 门槛 / 厕所未知 ==');
// 宽度是物理硬约束，过不去就不给「协助」兜底；无档案时 deviceWidth 为 null，不参与判断
const w5 = ruleEngine.judgeAccess(byId('p005'), u2, []);
check('宽度阻断给出实测数值', /78/.test(w5.reasons.join('')) && /76/.test(w5.reasons.join('')), true);
check('p005 + u1 (70cm 设备可通过)', ruleEngine.judgeAccess(byId('p005'), u1, []).result, 'pass');
check('无档案不假设设备宽度', ruleEngine.judgeAccess(byId('p005'), null, []).result, 'pass');
const p003_flat = Object.assign({}, byId('p003'), {
  entrances: [Object.assign({}, byId('p003').entrances[0], { rampCondition: '平缓', needAssistToOpen: false })]
});
check('仅门槛一项 → 需协助', ruleEngine.judgeAccess(p003_flat, u1, []).result, 'assist');
check('接受低门槛后放行', ruleEngine.judgeAccess(p003_flat, Object.assign({}, u1, { acceptLowThreshold: true }), []).result, 'pass');
const toiletUnknown = Object.assign({}, byId('p001'), {
  needAccessibleToilet: true,
  facilities: Object.assign({}, byId('p001').facilities, { accessibleToilet: { has: true, status: 'unknown' } })
});
check('厕所状态未知 → 待复核', ruleEngine.judgeAccess(toiletUnknown, u1, []).result, 'unknown');
// 下面两条把「原本在演示数据里不可达」的分支钉住：改动地点数据时若把它们改没了会直接红
check('p002 演示数据可达「需上楼但无电梯」', /需上楼但无可用电梯/.test(ruleEngine.judgeAccess(byId('p002'), u1, []).reasons.join('')), true);
check('p003 演示数据可达「坡道较陡」', /坡道较陡/.test(ruleEngine.judgeAccess(byId('p003'), u1, []).reasons.join('')), true);

console.log('== 规则用例：动态事件 ==');
check('p005 + u1 电梯停运', ruleEngine.judgeAccess(byId('p005'), u1, inc('elevator', '电梯停运')).result, 'blocked');
check('p005 + u2 电梯停运', ruleEngine.judgeAccess(byId('p005'), u2, inc('elevator', '电梯停运')).result, 'blocked');
check('无档案 p005 电梯停运(保守假定需电梯)', ruleEngine.judgeAccess(byId('p005'), null, inc('elevator', '电梯停运')).result, 'blocked');
check('无档案 p005 无事件', ruleEngine.judgeAccess(byId('p005'), null, []).result, 'pass');
check('p005 + 档案无需电梯 + 电梯停运', ruleEngine.judgeAccess(byId('p005'), u1_noElev, inc('elevator', '电梯停运')).result, 'pass');
check('p001 无需乘电梯 + 电梯停运', ruleEngine.judgeAccess(byId('p001'), u1, inc('elevator', '电梯停运')).result, 'pass');
check('p001 通道施工', ruleEngine.judgeAccess(byId('p001'), u1, inc('path', '通道施工')).result, 'blocked');
check('p001 坡道被占', ruleEngine.judgeAccess(byId('p001'), u1, inc('ramp', '坡道被占')).result, 'blocked');
check('厕所停用(非关键设施)不阻断', ruleEngine.judgeAccess(byId('p001'), u1, inc('toilet', '无障碍厕所停用')).result, 'pass');
check('厕所停用(关键设施)阻断', ruleEngine.judgeAccess(needToilet, u1, inc('toilet', '无障碍厕所停用')).result, 'blocked');
check('门故障 + u1 陪同接受协助', ruleEngine.judgeAccess(byId('p001'), u1, inc('door', '自动门故障')).result, 'assist');
check('门故障 + u2 独立不接受协助', ruleEngine.judgeAccess(byId('p001'), u2, inc('door', '自动门故障')).result, 'blocked');
check('开放时间变更 → 待复核', ruleEngine.judgeAccess(byId('p001'), u1, inc('openTime', '开放时间调整')).result, 'unknown');
check('未分类事件 → 待复核', ruleEngine.judgeAccess(byId('p001'), u1, inc('other', '临时堆放杂物')).result, 'unknown');
check('阻断不被开放时间事件降级', ruleEngine.judgeAccess(byId('p002'), u1, inc('openTime', '开放时间调整')).result, 'blocked');

console.log('== 规则用例：输出结构 ==');
const j5 = ruleEngine.judgeAccess(byId('p005'), u1, []);
check('p005 备选入口数量', j5.alternatives.length, 1);
// P3-b：备选入口按门洞净宽过滤——东门次入口 72 cm，电动轮椅(78)过不去、手动轮椅(70)可通行
const j5u2 = ruleEngine.judgeAccess(byId('p005'), u2, []);
check('备选入口门宽不足标注过不去(电动 78cm)', !!(j5u2.alternatives[0] && j5u2.alternatives[0].blockedByWidth), true);
check('备选入口门宽足够不标注(手动 70cm)', !!(j5.alternatives[0] && j5.alternatives[0].blockedByWidth), false);
check('p005 证据 id 透传', j5.evidenceIds.join(','), 'ev005');
check('有档案标记', j5.hasProfile, true);
check('免责声明存在', !!j5.disclaimer, true);
check('无档案标记', ruleEngine.judgeAccess(byId('p001'), null, []).hasProfile, false);
check('地点不存在的兜底', ruleEngine.judgeAccess(null, u1, []).result, 'unknown');
// 早退分支（无入口 / 地点不存在）必须与正常返回同形状，否则前端与自测取字段会拿到 undefined
check('无入口地点仍带免责声明', !!ruleEngine.judgeAccess(byId('p004'), u1, []).disclaimer, true);
check('无入口地点仍带档案标记', ruleEngine.judgeAccess(byId('p004'), u1, []).hasProfile, true);
check('地点不存在仍带免责声明', !!ruleEngine.judgeAccess(null, u1, []).disclaimer, true);
const noEnt = Object.assign({}, byId('p001'), { entrances: [] });
check('无入口变体证据 id 不丢', ruleEngine.judgeAccess(noEnt, u1, []).evidenceIds.join(','), 'ev001,ev002');

console.log('== services：地点 / 事件 ==');
(async () => {
  const list = await placeService.list();
  check('placeService.list 数量', list.length, 5);
  check('placeService 校园配置', placeService.getCampusConfig().center.latitude, 39.992);
  const tasks = await placeService.getPendingTasks();
  const taskIds = tasks.map(p => p.id);
  check('待办含无入口的 p004', taskIds.indexOf('p004') >= 0, true);
  check('待办不含已核实的 p001', taskIds.indexOf('p001') >= 0, false);
  check('搜索命中图书馆', (await placeService.search('图书')).length, 1);

  const active = incidentService.activeByPlace();
  check('incidentService p005 active', (active['p005'] || []).length, 1);
  check('incidentService p001 active', (active['p001'] || []).length, 0);
  check('已恢复事件不计入 active', (active['p003'] || []).length, 0);
  check('listActiveForPlace p005', (await incidentService.listActiveForPlace('p005')).length, 1);

  const reported = await incidentService.report({ placeId: 'p002', facility: 'path', description: '自测：通道施工' });
  check('上报后为 active', reported.status, 'active');
  check('上报计入 activeByPlace', (incidentService.activeByPlace()['p002'] || []).length, 1);
  const expired = await incidentService.report({
    placeId: 'p001', facility: 'other', description: '自测：已过期事件', expectedEndAt: '2020-01-01'
  });
  await incidentService.listAll(); // 触发 expireSweep
  check('过期事件自动降级待复核', incidentService.getById(expired.id).status, 'pending_review');
  check('过期事件不计入 active', (await incidentService.listActiveForPlace('p001')).length, 0);
  const re = await incidentService.reactivate(expired.id);
  check('复核后重新生效', re.status, 'active');
  check('重新生效清空预计结束时间', re.expectedEndAt, '');
  check('重新生效计入 active', (await incidentService.listActiveForPlace('p001')).length, 1);
  const resolved = await incidentService.resolve(reported.id);
  check('确认恢复后为 resolved', resolved.status, 'resolved');
  check('恢复后不再计入 active', (incidentService.activeByPlace()['p002'] || []).length, 0);

  // 到期日边界：上报页是日期选择器，「预计今天结束」应在今天 24:00 前保持有效
  const today = util.formatDate(new Date());
  const yesterday = util.formatDate(new Date(Date.now() - 86400000));
  const endsToday = await incidentService.report({
    placeId: 'p001', facility: 'other', description: '自测：今天结束', expectedEndAt: today
  });
  await incidentService.listAll(); // 触发 expireSweep
  check('预计今天结束仍有效', incidentService.getById(endsToday.id).status, 'active');
  check('预计今天结束计入 active', (await incidentService.listActiveForPlace('p001')).filter(i => i.id === endsToday.id).length, 1);
  const endsYesterday = await incidentService.report({
    placeId: 'p001', facility: 'other', description: '自测：昨天结束', expectedEndAt: yesterday
  });
  await incidentService.listAll();
  check('预计昨天结束自动降级', incidentService.getById(endsYesterday.id).status, 'pending_review');

  const evIds = [].concat.apply([], places.map(p => p.evidenceIds || []));
  check('地点引用的证据 id 全部存在', evIds.every(id => evidences.some(e => e.id === id)), true);

  console.log('== services：AI / 复核 / 账号 ==');
  const ai = await aiService.recognize('entrance', { delay: 0 });
  check('aiService entrance hasRamp', ai.detected.hasRamp, true);
  // 采集步骤定义在页面文件里（Page() 无法被 node require），只能读源码取 key；
  // 少了预置结果的步骤在演示时会直接显示「未能识别」，等于 AI 环节当场翻车。
  const captureSrc = fs.readFileSync(path.join(ROOT, 'pages/capture/capture.js'), 'utf8');
  const stepKeys = [];
  const keyRe = /\{ key: '([a-zA-Z]+)'/g;
  let km;
  while ((km = keyRe.exec(captureSrc))) stepKeys.push(km[1]);
  check('采集步骤数量', stepKeys.length, 8);
  check('每个采集步骤都有 AI 预置结果', stepKeys.filter(k => !aiResults[k]).join(',') || '(无缺失)', '(无缺失)');
  const quickAi = await aiService.quickAssess('mock-photo.jpg', { delay: 0 });
  check('aiService 普通用户快速检查', quickAi.mode, 'demo');
  check('aiService 快速检查给出结论', quickAi.result, 'assist');
  let aiFailed = false;
  await aiService.recognize('entrance', { delay: 0, forceFail: true }).catch(() => { aiFailed = true; });
  check('aiService 失败回退可 reject', aiFailed, true);

  const review = await reviewService.submit({ placeId: 'p001', kind: 'uncertain' });
  check('reviewService 创建复核记录', review.status, 'pending');
  const reviewed = await reviewService.setStatus(review.id, 'accepted', '测试采纳');
  check('reviewService 处理复核记录', reviewed.status, 'accepted');

  const loginUser = await userService.authenticate('demo', '123456');
  check('userService 账号密码登录', loginUser && loginUser.role, 'user');
  check('订阅初始为空', userService.subscriptions().length, 0);
  const subOn = await userService.toggleSubscription('p001');
  check('订阅地点成功', subOn.subscribed, true);
  check('订阅状态可查询', userService.isSubscribed('p001'), true);
  await userService.setCurrent('user-002');
  check('订阅按账号隔离', userService.subscriptions().length, 0);
  await userService.setCurrent(loginUser.id);
  const subOff = await userService.toggleSubscription('p001');
  check('取消订阅成功', subOff.subscribed, false);
  userService.recordRecentPlace('p001');
  userService.recordRecentPlace('p002');
  check('最近浏览按新到旧排序', userService.recentPlaces()[0].id, 'p002');
  check('最近浏览记录数量', userService.recentPlaces().length, 2);
  check('两条消息初始未读', userService.unreadMessageCount(['ap001', 'rp002']), 2);
  userService.markMessagesRead(['ap001']);
  check('单条标为已读后剩一条', userService.unreadMessageCount(['ap001', 'rp002']), 1);
  await userService.setCurrent('user-002');
  check('最近浏览按账号隔离', userService.recentPlaces().length, 0);
  check('消息已读按账号隔离', userService.unreadMessageCount(['ap001']), 1);
  await userService.setCurrent(loginUser.id);
  const badLogin = await userService.authenticate('demo', 'wrong-password');
  check('userService 拒绝错误密码', badLogin, null);
  const registered = await userService.register({ account: 'selftest-user', password: '123456', nickname: '测试用户' });
  check('userService 注册普通用户', registered.role, 'user');
  await userService.logout();
  check('userService 退出登录', userService.current(), null);

  console.log('== services：勘察发布（会改动地点，放在最后）==');
  check('p004 无入口 → 未核实', inspectionService.hasVerifiedEntrance(byId('p004')), false);
  check('p001 有入口且非待采集 → 已核实', inspectionService.hasVerifiedEntrance(byId('p001')), true);

  const insp = inspectionService.submit({
    placeId: 'p001',
    placeName: '图书馆',
    submittedBy: 'selftest',
    items: [
      { key: 'entrance', choice: 'yes', photo: 'mock-entrance.jpg', aiDetected: ['坡道', '自动门'] },
      { key: 'step', choice: 'yes', photo: 'mock-step.jpg', aiDetected: ['台阶'], stepCount: '4' },
      { key: 'door', choice: 'yes', photo: '', aiDetected: ['自动门'], doorType: '自动门' }
    ]
  });
  check('submit 生成待审核记录', insp.status, 'pending');
  check('submit 补齐 id', !!insp.id, true);
  check('submit 标记演示数据', insp.isTestData, true);

  const before = await placeService.get('p001');
  const beforeVerdict = ruleEngine.judgeAccess(before, u1, []).result;
  const evBefore = (await evidenceService.allForPlace('p001')).length;
  const pub = await inspectionService.publish(inspectionService.getById(insp.id));
  const after = await placeService.get('p001');
  const afterVerdict = ruleEngine.judgeAccess(after, u1, []).result;
  check('发布不改变可通行结论', beforeVerdict + '→' + afterVerdict, 'pass→pass');
  check('发布返回变更摘要', pub.changes.length > 0, true);
  check('发布生成修订记录', inspectionService.listRevisions('p001').length, 1);
  check('修订记录记发布人', inspectionService.listRevisions('p001')[0].by, 'selftest');
  check('新证据并入采信集', after.evidenceIds.length, 4);
  const evAll = await evidenceService.allForPlace('p001');
  check('采信集每条都能解析到证据', after.evidenceIds.every(i => evAll.some(e => e.id === i)), true);
  check('发布写入台阶数', after.entrances[0].stepCount, 4);
  check('发布写入有台阶', after.entrances[0].hasSteps, true);
  check('发布不把台阶照当成无坡道', after.entrances[0].hasRamp, true);
  check('发布清除待采集标记', after.pendingInspection, false);
  check('发布更新核实日期', after.lastVerifiedAt, util.formatDate(new Date()));
  check('发布追加带照片的证据', (await evidenceService.allForPlace('p001')).length > evBefore, true);
  const evAfter = await evidenceService.allForPlace('p001');
  check('同批新增证据 id 不重复', new Set(evAfter.map(e => e.id)).size, evAfter.length);

  const nanInsp = inspectionService.submit({
    placeId: 'p001', placeName: '图书馆', submittedBy: 'selftest',
    items: [{ key: 'step', choice: 'yes', photo: '', aiDetected: [], stepCount: '' }]
  });
  await inspectionService.publish(inspectionService.getById(nanInsp.id));
  const afterNan = await placeService.get('p001');
  check('空台阶数不写入 NaN', Number.isNaN(afterNan.entrances[0].stepCount), false);
  check('空台阶数保留原值', afterNan.entrances[0].stepCount, 4);
  check('空台阶数不误改结论', ruleEngine.judgeAccess(afterNan, u1, []).result, 'pass');
  check('再次发布累加修订记录', inspectionService.listRevisions('p001').length, 2);

  const unknown5 = inspectionService.submit({
    placeId: 'p005', placeName: '实验楼', submittedBy: 'selftest',
    items: [
      { key: 'entrance', choice: 'unknown', photo: '', aiDetected: [] },
      { key: 'elevator', choice: 'unknown', photo: '', aiDetected: [] }
    ]
  });
  await inspectionService.publish(inspectionService.getById(unknown5.id));
  const after5 = await placeService.get('p005');
  check('未确认项不覆盖电梯资料', after5.facilities.elevator.has, true);
  check('未确认项不改变 p005 结论', ruleEngine.judgeAccess(after5, u1, []).result, 'pass');

  const unknown2 = inspectionService.submit({
    placeId: 'p002', placeName: '老教学楼', submittedBy: 'selftest',
    items: [{ key: 'step', choice: 'unknown', photo: '', aiDetected: [] }]
  });
  await inspectionService.publish(inspectionService.getById(unknown2.id));
  const after2 = await placeService.get('p002');
  check('p002 仍为有台阶', after2.entrances[0].hasSteps, true);
  check('p002 仍为无坡道', after2.entrances[0].hasRamp, false);
  check('p002 结论仍为阻断', ruleEngine.judgeAccess(after2, u1, []).result, 'blocked');

  const noEnt = inspectionService.submit({
    placeId: 'p004', placeName: '体育馆', submittedBy: 'selftest',
    items: [{ key: 'entrance', choice: 'yes', photo: '', aiDetected: ['坡道'] }]
  });
  const r4 = await inspectionService.publish(inspectionService.getById(noEnt.id));
  check('无入口地点发布不报错且不伪造入口', r4.entranceUpdated, false);
  check('无入口地点结论仍为待复核', ruleEngine.judgeAccess(await placeService.get('p004'), u1, []).result, 'unknown');

  let published = false;
  await inspectionService.publish({ placeId: 'p999', items: [] }).catch(() => { published = true; });
  check('发布到不存在地点会抛错', published, true);

  console.log('\n结果: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
