// 离线自测：验证规则引擎判断用例与 services 层。不进小程序编译目录。
// 用法：node scripts/selftest.js
const path = require('path');
const ROOT = process.argv[2] || path.join(__dirname, '..');
const R = p => require(path.join(ROOT, p));

const ruleEngine = R('services/ruleEngine');
const places = R('data/places');
const users = R('data/users');
const incidents = R('data/incidents');
const placeService = R('services/placeService');
const incidentService = R('services/incidentService');
const aiService = R('services/aiService');
const reviewService = R('services/reviewService');
const userService = R('services/userService');

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

const incP005 = incidents.filter(i => i.placeId === 'p005' && i.status === 'active');

console.log('== 规则用例 ==');
check('p001 图书馆 + u1', ruleEngine.judgeAccess(byId('p001'), u1, []).result, 'pass');
check('p001 图书馆 + u2', ruleEngine.judgeAccess(byId('p001'), u2, []).result, 'pass');
check('p002 老教学楼 + u1 (台阶)', ruleEngine.judgeAccess(byId('p002'), u1, []).result, 'blocked');
check('p003 食堂 + u1 (陪同接受)', ruleEngine.judgeAccess(byId('p003'), u1, []).result, 'assist');
check('p003 食堂 + u2 (独立不接受)', ruleEngine.judgeAccess(byId('p003'), u2, []).result, 'blocked');
check('p003 食堂 + u1 改独立(切换陪同)', ruleEngine.judgeAccess(byId('p003'), u1_alone, []).result, 'blocked');
check('p004 体育馆 无入口', ruleEngine.judgeAccess(byId('p004'), u1, []).result, 'unknown');
check('p005 实验楼 + u1 无事件(静态)', ruleEngine.judgeAccess(byId('p005'), u1, []).result, 'pass');
check('p005 实验楼 + u1 + 电梯停运', ruleEngine.judgeAccess(byId('p005'), u1, incP005).result, 'blocked');
check('p005 实验楼 + u2 无事件', ruleEngine.judgeAccess(byId('p005'), u2, []).result, 'pass');
check('无档案 p001(通用)', ruleEngine.judgeAccess(byId('p001'), null, []).result, 'pass');
const doorIncident = [{ status: 'active', facility: 'door', description: '自动门故障' }];
check('门故障 + u1 陪同接受协助', ruleEngine.judgeAccess(byId('p001'), u1, doorIncident).result, 'assist');
check('门故障 + u2 独立不接受协助', ruleEngine.judgeAccess(byId('p001'), u2, doorIncident).result, 'blocked');

console.log('== services ==');
(async () => {
  const list = await placeService.list();
  check('placeService.list 数量', list.length, 5);
  check('placeService 校园配置', placeService.getCampusConfig().center.latitude, 39.992);
  const act = incidentService.activeByPlace();
  check('incidentService p005 active', (act['p005'] || []).length, 1);
  check('incidentService p001 active', (act['p001'] || []).length, 0);
  const ai = await aiService.recognize('entrance', { delay: 0 });
  check('aiService entrance hasRamp', ai.detected.hasRamp, true);
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
  const badLogin = await userService.authenticate('demo', 'wrong-password');
  check('userService 拒绝错误密码', badLogin, null);
  const registered = await userService.register({ account: 'selftest-user', password: '123456', nickname: '测试用户' });
  check('userService 注册普通用户', registered.role, 'user');
  await userService.logout();
  check('userService 退出登录', userService.current(), null);

  console.log('\n结果: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
