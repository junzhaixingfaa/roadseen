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

console.log('== services ==');
(async () => {
  const list = await placeService.list();
  check('placeService.list 数量', list.length, 5);
  const act = incidentService.activeByPlace();
  check('incidentService p005 active', (act['p005'] || []).length, 1);
  check('incidentService p001 active', (act['p001'] || []).length, 0);
  const ai = await aiService.recognize('entrance', { delay: 0 });
  check('aiService entrance hasRamp', ai.detected.hasRamp, true);
  let aiFailed = false;
  await aiService.recognize('entrance', { delay: 0, forceFail: true }).catch(() => { aiFailed = true; });
  check('aiService 失败回退可 reject', aiFailed, true);

  console.log('\n结果: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
