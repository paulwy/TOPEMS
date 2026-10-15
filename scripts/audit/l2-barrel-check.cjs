// L2 barrel-only 可删性判定：剥离注释/字符串后查 sampleRefs 实际引用
const fs = require('fs'), path = require('path');
const r = JSON.parse(fs.readFileSync('./scripts/audit/ts-unused-exports-report.json', 'utf8'));
const l2 = r.L2;
const val = l2.filter(x => x.anyValueExport && !x.anyTypeExport);
const bo = val.filter(x => {
  const s = JSON.stringify(x.sampleRefs || []);
  return /index\.ts/.test(s) && !/test|spec|__tests__|story|stories/.test(s);
});
// 剥离注释（//、/* */、字符串）取实际代码
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:[^'\\]|\\.)*'/g, ' ')
    .replace(/"(?:[^"\\]|\\.)*"/g, ' ')
    .replace(/`(?:[^`\\]|\\.)*`/g, ' ');
}
const results = [];
for (const x of bo) {
  const name = x.name;
  const realRefs = [];
  for (const rf of (x.sampleRefs || [])) {
    if (x.defFiles.includes(rf)) continue;
    const full = path.join(process.cwd(), rf);
    if (!fs.existsSync(full)) continue;
    const code = stripComments(fs.readFileSync(full, 'utf8'));
    const re = new RegExp(`\\b${name}\\b`);
    if (re.test(code)) realRefs.push(rf);
  }
  if (realRefs.length === 0) results.push({ name, defFiles: x.defFiles, pseudoRef: true });
  else results.push({ name, defFiles: x.defFiles, realRefs: realRefs.slice(0, 3) });
}
const pseudo = results.filter(x => x.pseudoRef);
console.log('══ barrel-only L2 判定 ══');
console.log('伪引用（注释/字符串，可删候选）:', pseudo.length, '/', bo.length);
for (const x of pseudo.slice(0, 15)) console.log('  ', x.name, '@', x.defFiles.join('|'));
console.log('══ 真实引用前 8 ══');
for (const x of results.filter(x => !x.pseudoRef).slice(0, 8)) console.log('  ', x.name, '→', x.realRefs.join('|'));
