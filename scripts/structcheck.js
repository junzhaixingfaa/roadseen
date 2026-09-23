// 结构校验：WXML 事件绑定是否都有对应方法、页面跳转目标是否在 app.json 中注册。
// 小程序编译器不检查这两项，绑定名打错只会在点击时静默失败。
// 用法：node scripts/structcheck.js
const fs = require('fs');
const path = require('path');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
let bad = 0, total = 0;
app.pages.forEach(p => {
  const wxml = fs.readFileSync(p + '.wxml', 'utf8');
  const js = fs.readFileSync(p + '.js', 'utf8');
  const handlers = new Set();
  const re = /(?:bind|catch)[a-z:]*=["']([A-Za-z0-9_]+)["']/g;
  let m;
  while ((m = re.exec(wxml))) handlers.add(m[1]);
  handlers.forEach(h => {
    total++;
    const defined = new RegExp('(?:^|[\\s,{])' + h + '\\s*(?:\\(|:)').test(js);
    if (!defined) { console.log('未定义处理器:', p, h); bad++; }
  });
});
console.log('事件绑定 ' + total + ' 个，缺失 ' + bad + ' 个');

// 页面跳转目标必须存在于 app.json
let navBad = 0;
const pageSet = new Set(app.pages.map(x => '/' + x));
const files = [];
(function walk(d) {
  fs.readdirSync(d).forEach(f => {
    const fp = path.join(d, f);
    if (fs.statSync(fp).isDirectory()) { if (f !== 'node_modules' && f !== '初始思考' && f !== '.git') walk(fp); }
    else if (/\.js$/.test(f)) files.push(fp);
  });
})('.');
files.forEach(f => {
  const src = fs.readFileSync(f, 'utf8');
  const re = /url:\s*['"](\/pages\/[^'"?]+)/g;
  let m;
  while ((m = re.exec(src))) {
    if (!pageSet.has(m[1])) { console.log('跳转目标不存在:', f, m[1]); navBad++; }
  }
});
console.log('页面跳转目标检查，缺失 ' + navBad + ' 个');
process.exit(bad || navBad ? 1 : 0);
