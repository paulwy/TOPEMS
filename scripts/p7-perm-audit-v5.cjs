const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const APPS = path.join(ROOT, 'apps/web/src');
function readFile(p){try{return fs.readFileSync(p,'utf8');}catch{return '';}}
const outDir = path.join(ROOT, 'scripts', 'tmp-output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

/* ============ A：从 permissions.ts 提取 LEGAL ============ */
const permSrc = readFile(path.join(APPS, 'config/permissions.ts'));
const LEGAL = new Set();

function extractObjectBlock(text, startKeyword) {
  const ki = text.indexOf(startKeyword); if (ki<0) return '';
  const ob = text.indexOf('{', ki); if (ob<0) return '';
  let i = ob+1, depth=1, inStr=0, q='';
  while (i<text.length && depth>0) {
    const ch = text[i];
    if (!inStr && (ch === '"' || ch === "'" || ch === '`')) { inStr=1; q=ch; }
    else if (inStr && ch === q && text[i-1] !== '\\') { inStr=0; q=''; }
    else if (!inStr) {
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth===0) return text.slice(ob, i+1); }
    }
    i++;
  }
  return '';
}

for (const kw of [
  'export const PERMISSION_DEFS',
  'export const PERMISSIONS',
  'export const MODULE_PERMISSIONS',
  'export const ROLE_PERMISSIONS',
  'export const PERMISSION_CODES_BY_MODULE',
]) {
  const blk = extractObjectBlock(permSrc, kw);
  for (const m of blk.matchAll(/'([A-Za-z0-9_:-]{3,90})'/g)) LEGAL.add(m[1]);
}
const arrBlk = permSrc.match(/export\s+const\s+ALL_3PART_PERM_CODES\s*:\s*string\[\]\s*=\s*\[([\s\S]*?)\];/);
if (arrBlk) for (const m of arrBlk[1].matchAll(/'([A-Za-z0-9_:-]{3,90})'/g)) LEGAL.add(m[1]);

// 提取 PERMISSION_DEFS 的分组信息（name/description/group）用于报告
const PERM_INFO = new Map();
const defsBlock = extractObjectBlock(permSrc, 'export const PERMISSION_DEFS');
if (defsBlock) {
  // 逐行解析：code: { module, action, name, description, group? }
  const entryRe = /['"]([A-Za-z0-9_:-]{3,90})['"]\s*:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let em;
  while ((em = entryRe.exec(defsBlock)) !== null) {
    const code = em[1];
    const body = em[2];
    const name = (body.match(/name\s*:\s*(?:i18n\.t\()?['"]([^'"]+)['"]/) || [])[1] || '';
    const group = (body.match(/group\s*:\s*['"]([^'"]+)['"]/) || [])[1] || '';
    const module_ = (body.match(/module\s*:\s*['"]([^'"]+)['"]/) || [])[1] || code.split(':')[0];
    const action = (body.match(/action\s*:\s*['"]([^'"]+)['"]/) || [])[1] || '';
    PERM_INFO.set(code, { name, group, module: module_, action });
  }
}

console.log(`[P7 v5] LEGAL（合法权限码） = ${LEGAL.size} 条`);
console.log(`[P7 v5] PERM_INFO（带元数据） = ${PERM_INFO.size} 条`);

/* ============ B：扫描所有 config.ts 提取 USED + MISMATCH ============ */
function parseBlocks(src, kw) {
  const ki = src.indexOf(kw); if (ki<0) return [];
  const brk = src.indexOf('[', ki); if (brk<0) return [];
  let i = brk+1, depth = 1, start = -1, inStr=0, q=''; const out=[];
  while (i<src.length && depth>0) {
    const ch = src[i];
    if (!inStr && (ch === '"' || ch === "'" || ch === '`')) { inStr = 1; q = ch; }
    else if (inStr && ch === q && src[i-1] !== '\\') { inStr = 0; q=''; }
    else if (!inStr) {
      if (ch === '{') { if (depth===1) start=i; depth++; }
      else if (ch === '}') { depth--; if (depth===1 && start>=0) { out.push(src.slice(start,i+1)); start=-1; } }
      else if (ch === ']' && depth===1) { depth=0; break; }
    }
    i++;
  }
  return out;
}

const MOD_ROOT = path.join(APPS,'modules');
const cfgs = fs.readdirSync(MOD_ROOT).map(d => path.join(MOD_ROOT, d, 'config.ts')).filter(p => fs.existsSync(p));
const USED = new Map(); // code → [usage1, usage2, ...]
const MISMATCH = [];
let tNav=0, tRoute=0, navP=0, routeP=0;

for (const cfg of cfgs) {
  const mod = path.basename(path.dirname(cfg));
  const src = readFile(cfg);
  const navBs = parseBlocks(src, 'navItems:');
  const routeBs = parseBlocks(src, 'routes:');
  const navMap = new Map();
  for (const b of navBs) {
    const code = (b.match(/code\s*:\s*['"]([^'"]+)['"]/)||[])[1]; if (!code) continue;
    tNav++;
    const p = (b.match(/permission\s*:\s*['"]([^'"]+)['"]/)||[])[1] || '';
    if (p) { navP++; (USED.get(p) || USED.set(p,[]).get(p)).push(mod+'/nav/'+code); }
    navMap.set(code, p);
  }
  for (const b of routeBs) {
    const code = (b.match(/code\s*:\s*['"]([^'"]+)['"]/)||[])[1]; if (!code) continue;
    tRoute++;
    const perms = [...(b.match(/requiredPermissions\s*:\s*\[([^\]]*)\]/) || [])[1]?.matchAll(/'([^']+)'/g) || []].map(x=>x[1]);
    for (const p of perms) { routeP++; (USED.get(p) || USED.set(p,[]).get(p)).push(mod+'/route/'+code); }
    const navP2 = navMap.get(code)||'';
    if (navP2 && perms.length && !perms.includes(navP2)) MISMATCH.push({mod,code,nav:navP2,route:perms});
  }
}

const USED_CODES = [...USED.keys()];
console.log(`[P7 v5] Nav=${tNav}  Route=${tRoute}  nav.perm=${navP}  route.perm.entries=${routeP}  Used distinct=${USED_CODES.length}`);

const NOT_LEGAL = USED_CODES.filter(c => !LEGAL.has(c));
const DEAD = [...LEGAL].filter(c => !USED.has(c));

/* ============ C：分类统计 ============ */
const nLegalByMod = {};
for (const c of NOT_LEGAL) {
  const p = c.split(':')[0];
  (nLegalByMod[p] = nLegalByMod[p] || []).push(c);
}

const deadByMod = {};
const deadByAction = { read:0, write:0, delete:0, approve:0, admin:0, other:0 };
const deadByReason = { DASHBOARD_TEMPLATE: 0, MODULE_TOP_LEVEL: 0, NEVER_NAV_OR_ROUTE: 0, ADVANCED_ACTION: 0 };

for (const c of DEAD) {
  const p = c.split(':')[0];
  (deadByMod[p] = deadByMod[p] || []).push(c);
  const info = PERM_INFO.get(c);
  if (info?.action) deadByAction[info.action] = (deadByAction[info.action]||0) + 1;
  else deadByAction.other++;

  // 原因分类
  if (/dashboard:/.test(c)) deadByReason.DASHBOARD_TEMPLATE++;
  else if (/^(hrm|mes|scm|wms|rs|im):(read|write|delete|approve|admin)$/.test(c)) deadByReason.MODULE_TOP_LEVEL++;
  else if (/(delete|approve|admin)$/.test(c)) deadByReason.ADVANCED_ACTION++;
  else deadByReason.NEVER_NAV_OR_ROUTE++;
}

/* ============ D：输出报告 ============ */
const lines = [];
function P(s){console.log(s); lines.push(s);}

P(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
P(`║                        🔍 P7 RBAC 权限码双向审计报告 v5                         ║`);
P(`╚══════════════════════════════════════════════════════════════════════════════╝`);
P(``);
P(`📊 基础统计`);
P(`  • permissions.ts 声明的合法权限码总数：${String(LEGAL.size).padStart(5)} 条`);
P(`  • config.ts (Nav+Route) 实际使用的权限码：${String(USED_CODES.length).padStart(5)} 条`);
P(`  • 覆盖度：${((USED_CODES.length/Math.max(1,LEGAL.size))*100).toFixed(1)}%`);
P(``);

P(`🔴 NOT_LEGAL：config.ts 使用但 ∉ permissions.ts 的权限码 → ${NOT_LEGAL.length} 条`);
P(`   严重度 = ${NOT_LEGAL.length>0 ? '🔴 FAIL 级：高风险（菜单永远隐藏/路由永远403）' : '✅ PASS 级：0 违规'}`);
if (NOT_LEGAL.length) {
  for (const [m, arr] of Object.entries(nLegalByMod).sort((a,b)=>b[1].length-a[1].length)) {
    P(`\n   模块 [${m}] 共 ${arr.length} 条：`);
    for (const c of arr) {
      P(`     ❌ ${c.padEnd(48)}  使用场景: ${(USED.get(c)||[]).slice(0,3).join(' | ')}`);
    }
  }
}
P(``);

P(`🟡 MISMATCH：Nav.permission ⊄ Route.requiredPermissions → ${MISMATCH.length} 条`);
P(`   严重度 = ${MISMATCH.length>0 ? '🟡 WARN 级：中风险（菜单可见但点击403）' : '✅ PASS 级：0 违规'}`);
for (const x of MISMATCH.slice(0,20)) P(`    ⚠️  ${x.mod}/${x.code}  nav=${x.nav}  route=[${x.route.join(' / ')}]`);
P(``);

P(`🟠 DEAD：permissions.ts 声明但前端 0 引用（可清理/预留） → ${DEAD.length} 条`);
P(`   严重度 = 🟠 INFO 级（非阻断，但后续可清理缩减权限矩阵体积）`);
P(``);
P(`  ── 按原因分类（为什么未使用？）──`);
for (const [k,cnt] of Object.entries(deadByReason)) {
  const bar = '█'.repeat(Math.round(cnt/Math.max(1,DEAD.length)*30));
  P(`     ${k.padEnd(24)} ${String(cnt).padStart(4)}条  ${bar}  ${((cnt/Math.max(1,DEAD.length))*100).toFixed(0)}%`);
}
P(``);
P(`  ── 按 Action 分类 ──`);
for (const [k,cnt] of Object.entries(deadByAction)) {
  if (cnt>0) P(`     ${k.padEnd(10)} ${String(cnt).padStart(4)}条`);
}
P(``);
P(`  ── 按模块前缀 TOP 20 ──`);
for (const [m,arr] of Object.entries(deadByMod).sort((a,b)=>b[1].length-a[1].length).slice(0,20)) {
  const first6 = arr.slice(0,4).join('  ');
  P(`     ${m.padEnd(16)} ${String(arr.length).padStart(4)}条   eg. ${first6}${arr.length>4?'  …+'+(arr.length-4):''}`);
}
P(``);

P(`📝 详细清单输出位置：`);
fs.writeFileSync(path.join(outDir, 'p7-not-legal.txt'), NOT_LEGAL.map(c => c+'\t# '+(USED.get(c)||[]).join(' | ')).join('\n'));
fs.writeFileSync(path.join(outDir, 'p7-dead.txt'), DEAD.map(c => {
  const info = PERM_INFO.get(c);
  return `${c}\t# module=${info?.module||'-'}  action=${info?.action||'-'}  name=${info?.name||'-'}  group=${info?.group||'-'}`;
}).join('\n'));
const summary = {
  LEGAL_count: LEGAL.size,
  USED_count: USED_CODES.length,
  NOT_LEGAL_count: NOT_LEGAL.length,
  MISMATCH_count: MISMATCH.length,
  DEAD_count: DEAD.length,
  deadByReason, deadByAction,
  coverage: +(USED_CODES.length/Math.max(1,LEGAL.size)*100).toFixed(1),
  NOT_LEGAL: NOT_LEGAL.map(c => ({ code: c, usages: USED.get(c)||[] })),
  DEAD: DEAD.map(c => ({ code: c, info: PERM_INFO.get(c) || null })),
  MISMATCH,
};
fs.writeFileSync(path.join(outDir, 'p7-audit-report.json'), JSON.stringify(summary, null, 2));
P(`  • ${path.join(outDir, 'p7-not-legal.txt')}（${NOT_LEGAL.length} 条 NOT_LEGAL）`);
P(`  • ${path.join(outDir, 'p7-dead.txt')}（${DEAD.length} 条 DEAD，带元数据）`);
P(`  • ${path.join(outDir, 'p7-audit-report.json')}（结构化 JSON 报告）`);
P(``);
P(`✅ RBAC 合规判定：${NOT_LEGAL.length===0 && MISMATCH.length===0 ? 'PASS（NOT_LEGAL=0, MISMATCH=0）' : 'FAIL（需修复）'}`);
