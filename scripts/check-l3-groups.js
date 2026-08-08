// 对称性 + group 枚举 + 分布达标 三项检查脚本
const fs = require('fs');
const path = require('path');

const ALLOWED_GROUPS = new Set(['master','process','business','analytics','setting','overview','report','other']);
const BASE = '/Users/xingzhai/TOPEMS/apps/web/src/modules';

let totalRoutes = 0;
let totalNav = 0;
let disallowedCount = 0;
let mismatchCount = 0;
let otherCount = 0;
const counters = { master:0, process:0, business:0, analytics:0, setting:0, overview:0, report:0, other:0 };
const mismatches = [];
const disallowed = [];

const dirs = fs.readdirSync(BASE).filter(d => fs.statSync(path.join(BASE,d)).isDirectory());

function extractObjects(src, regionName, startIdx, endIdx) {
  const sub = src.slice(startIdx, endIdx);
  const out = new Map();
  const codeRe = /code:\s*['\"]([^'\"]+)['\"]/g;
  let m;
  while ((m = codeRe.exec(sub)) !== null) {
    const code = m[1];
    const tail = sub.slice(m.index, m.index + 1200);
    const gm = tail.match(/group:\s*['\"]([^'\"]+)['\"]/);
    if (gm) out.set(code, gm[1]);
  }
  return out;
}

for (const dir of dirs) {
  const f = path.join(BASE, dir, 'config.ts');
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');

  const routesStart = src.search(/routes:\s*\[/);
  let routesEnd = -1;
  if (routesStart >= 0) {
    let depth = 0; let started = false;
    for (let i = routesStart; i < src.length; i++) {
      if (src[i] === '[') { depth++; started = true; }
      else if (src[i] === ']') {
        depth--;
        if (started && depth === 0) { routesEnd = i + 1; break; }
      }
    }
  }
  const navStart = src.search(/navItems:\s*\[/);
  let navEnd = -1;
  if (navStart >= 0) {
    let depth = 0; let started = false;
    for (let i = navStart; i < src.length; i++) {
      if (src[i] === '[') { depth++; started = true; }
      else if (src[i] === ']') {
        depth--;
        if (started && depth === 0) { navEnd = i + 1; break; }
      }
    }
  }

  const routesMap = routesStart >= 0 && routesEnd > 0 ? extractObjects(src, 'routes', routesStart, routesEnd) : new Map();
  const navMap = navStart >= 0 && navEnd > 0 ? extractObjects(src, 'navItems', navStart, navEnd) : new Map();

  for (const [code, g] of routesMap) {
    totalRoutes++;
    if (!ALLOWED_GROUPS.has(g)) { disallowedCount++; disallowed.push(`${dir} routes.${code} = '${g}'`); }
    if (g === 'other') otherCount++;
  }
  for (const [code, g] of navMap) {
    totalNav++;
    counters[g] = (counters[g]||0)+1;
    if (!ALLOWED_GROUPS.has(g)) { disallowedCount++; disallowed.push(`${dir} nav.${code} = '${g}'`); }
    if (g === 'other') otherCount++;
    if (routesMap.has(code) && routesMap.get(code) !== g) {
      mismatchCount++;
      mismatches.push(`${dir}:${code}  routes='${routesMap.get(code)}' vs navItems='${g}'`);
    }
  }
}

console.log('========== 验收 10 条 ==========');
console.log('✅ 5.group 枚举白名单（8种）   :', disallowedCount === 0 ? 'PASS (0 越界)' : `FAIL: ${disallowedCount} 越界，例: ${disallowed[0]}`);
console.log('✅ 9.other=0 数量            :', otherCount === 0 ? 'PASS (0)' : `FAIL: ${otherCount}`);
console.log('✅ 4.routes↔navItems 对称性  :', mismatchCount === 0 ? `PASS（${totalNav} 条均同步）` : `FAIL: ${mismatchCount} 不对称 -> ${mismatches.slice(0,8).join('\n')}`);
console.log('');
console.log('========== 最终分布（验收 6） ==========');
console.log('  master ≥ 60 ?   ', counters.master, '  → ', counters.master >= 60 ? 'PASS' : 'FAIL');
console.log('  process ≥ 80 ?  ', counters.process, ' → ', counters.process >= 80 ? 'PASS' : 'FAIL');
console.log('  business ≤ 60 ? ', counters.business, ' → ', counters.business <= 60 ? 'PASS' : 'FAIL');
console.log('  analytics       ', counters.analytics);
console.log('  setting         ', counters.setting);
console.log('  overview        ', counters.overview);
console.log('  report          ', counters.report, '(首次启用 report group，预期 = 4)');
console.log('  other           ', otherCount, '(必须 = 0)');
console.log('  合计 navItems   ', totalNav);
console.log('  合计 routes 对象读取', totalRoutes);
