// 验证 L1 剩余 single 项的真实引用（全仓代码 import/使用）
const fs = require('fs'), path = require('path');
const r = JSON.parse(fs.readFileSync('./scripts/audit/ts-unused-exports-report.json', 'utf8'));
const l1 = r.L1;
const targets = l1.filter(x => x.defFiles.length === 1 && (/index\.ts$/.test(x.defFiles[0]) || /_archive|generated/.test(x.defFiles[0])));
// 扫描文件集（src/tests/e2e，排除目标文件自身与 node_modules/dist）
const roots = ['apps/web/src', 'apps/web/tests', 'apps/web/e2e', 'packages'];
const skipDirs = /node_modules|\.next|dist|coverage/;
const files = [];
for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!skipDirs.test(p)) walk(p); }
      else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) files.push(p);
    }
  };
  walk(root);
}
const content = new Map(files.map(f => [f, fs.readFileSync(f, 'utf8')]));
const results = [];
for (const t of targets) {
  const name = t.name;
  let refs = [];
  for (const [f, c] of content) {
    if (f === t.defFiles[0]) continue;
    const re = new RegExp(`\\b${name}\\b`);
    if (re.test(c)) refs.push(f);
  }
  results.push({ name, def: t.defFiles[0], refs: refs.slice(0, 4), count: refs.length });
}
console.log(JSON.stringify(results, null, 1));
