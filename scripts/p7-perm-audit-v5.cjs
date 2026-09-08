#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// ===== CLI 解析 =====
function parseArgs(argv) {
  const opts = { help: false, apply: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--apply') opts.apply = true;
    else if (a === '--out' && argv[i + 1]) opts.out = argv[++i];
    else if (a.startsWith('--')) {
      process.stderr.write(`[p7-perm-audit-v5] ⚠️  未知参数 ${a}\n`);
      opts.help = true;
    }
  }
  return opts;
}
const USAGE = `
p7-perm-audit-v5.cjs — P7 权限编码 LEGAL vs USED 差异审计（v5 全量扫描版本）

USAGE:
  node scripts/p7-perm-audit-v5.cjs [OPTIONS]

OPTIONS:
  -h, --help            显示帮助并退出
      --apply           真正写 3 个 artifact 文件到输出目录；不传为 DRY-RUN（零副作用，只打印统计 + would-write 路径）
      --out <dir>       指定输出目录；默认 scripts/tmp-output

EXAMPLES:
  node scripts/p7-perm-audit-v5.cjs
  node scripts/p7-perm-audit-v5.cjs --apply
  node scripts/p7-perm-audit-v5.cjs --apply --out /tmp/p7-artifacts
`;
const OPTS = parseArgs(process.argv.slice(2));
if (OPTS.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}

const APPS = path.join(ROOT, 'apps/web/src');
function readFile(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

const baseOutDir = OPTS.out
  ? path.isAbsolute(OPTS.out)
    ? OPTS.out
    : path.resolve(ROOT, OPTS.out)
  : path.join(ROOT, 'scripts', 'tmp-output');
const outDir = baseOutDir;
if (OPTS.apply && !fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

process.stderr.write(
  `[p7-perm-audit-v5] ${OPTS.apply ? 'APPLY 写磁盘' : 'DRY-RUN（加 --apply 才写 artifact）'}\n` +
    `[p7-perm-audit-v5] 输出目录: ${outDir}\n\n`
);

/* ============ A：从 permissions.ts 提取 LEGAL ============ */
const permSrc = readFile(path.join(APPS, 'config/permissions.ts'));
const LEGAL = new Set();

function extractObjectBlock(text, startKeyword) {
  const ki = text.indexOf(startKeyword);
  if (ki < 0) return '';
  const ob = text.indexOf('{', ki);
  if (ob < 0) return '';
  let i = ob + 1,
    depth = 1,
    inStr = 0,
    q = '';
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (!inStr && (ch === '"' || ch === "'" || ch === '`')) {
      inStr = 1;
      q = ch;
    } else if (inStr && ch === q && text[i - 1] !== '\\') {
      inStr = 0;
      q = '';
    } else if (!inStr) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return text.slice(ob, i + 1);
      }
    }
    i++;
  }
  return '';
}

// 分别处理不同的权限定义块：
// - PERMISSION_DEFS / PERMISSIONS / MODULE_PERMISSIONS / ROLE_PERMISSIONS：提取所有引号内的字符串
// - PERMISSION_CODES_BY_MODULE：只提取数组内的字符串，不提取 key（避免裸模块名如 'admin' 被误识别为权限码）
const blockKeywords = [
  'export const PERMISSION_DEFS',
  'export const PERMISSIONS',
  'export const MODULE_PERMISSIONS',
  'export const ROLE_PERMISSIONS',
];
for (const kw of blockKeywords) {
  const blk = extractObjectBlock(permSrc, kw);
  for (const m of blk.matchAll(/'([A-Za-z0-9_:-]{3,90})'/g)) LEGAL.add(m[1]);
}
// PERMISSION_CODES_BY_MODULE 单独处理：仅提取数组元素，跳过 key
const codesByModBlock = extractObjectBlock(permSrc, 'export const PERMISSION_CODES_BY_MODULE');
if (codesByModBlock) {
  // 匹配双引号数组元素，如 "admin:account:read"
  for (const m of codesByModBlock.matchAll(/"([A-Za-z0-9_:-]{3,90})"/g)) LEGAL.add(m[1]);
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

// ── 阶段 A2：并入 @topems/app-shell 真源（permissions.ts 为 re-export，模块级模板码在 app-shell）──
// permissions.ts 的 PERMISSIONS 来自 import，脚本此前只扫文件内字面量导致 LEGAL 严重低估（假阳性 NOT_LEGAL）。
// 将 packages/app-shell/src/permissions-types.ts 的 PERMISSIONS 块并入 LEGAL。
const SHELL_SRC = path.join(ROOT, 'packages/app-shell/src/permissions-types.ts');
if (fs.existsSync(SHELL_SRC)) {
  const shellText = readFile(SHELL_SRC);
  for (const kw of ['export const PERMISSIONS', 'export const PERMISSION_DEFS', 'export const ROLE_PERMISSIONS']) {
    const blk = extractObjectBlock(shellText, kw);
    for (const m of blk.matchAll(/'([A-Za-z0-9_:-]{3,90})'/g)) LEGAL.add(m[1]);
  }
}

console.log(`[P7 v5] LEGAL（合法权限码，含 app-shell 真源） = ${LEGAL.size} 条`);
console.log(`[P7 v5] PERM_INFO（带元数据） = ${PERM_INFO.size} 条`);

/* ============ B：扫描所有 config.ts 提取 USED + MISMATCH ============ */
function parseBlocks(src, kw) {
  const ki = src.indexOf(kw);
  if (ki < 0) return [];
  const brk = src.indexOf('[', ki);
  if (brk < 0) return [];
  let i = brk + 1,
    depth = 1,
    start = -1,
    inStr = 0,
    q = '';
  const out = [];
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (!inStr && (ch === '"' || ch === "'" || ch === '`')) {
      inStr = 1;
      q = ch;
    } else if (inStr && ch === q && src[i - 1] !== '\\') {
      inStr = 0;
      q = '';
    } else if (!inStr) {
      if (ch === '{') {
        if (depth === 1) start = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 1 && start >= 0) {
          out.push(src.slice(start, i + 1));
          start = -1;
        }
      } else if (ch === ']' && depth === 1) {
        depth = 0;
        break;
      }
    }
    i++;
  }
  return out;
}

const MOD_ROOT = path.join(APPS, 'modules');
const cfgs = fs
  .readdirSync(MOD_ROOT)
  .map((d) => path.join(MOD_ROOT, d, 'config.ts'))
  .filter((p) => fs.existsSync(p));
const USED = new Map(); // code → [usage1, usage2, ...]
const MISMATCH = [];
let tNav = 0,
  tRoute = 0,
  navP = 0,
  routeP = 0;

for (const cfg of cfgs) {
  const mod = path.basename(path.dirname(cfg));
  const src = readFile(cfg);
  const navBs = parseBlocks(src, 'navItems:');
  const routeBs = parseBlocks(src, 'routes:');
  const navMap = new Map();

  // 扫描模块配置顶层的 permission 字段（RouteModuleConfig.permission）
  // 例如: export const xxxModuleConfig: RouteModuleConfig = { ..., permission: 'xxx:module:read', ... }
  // 这些权限码控制整个模块的访问，应视为 USED
  const modPermRe = /permission\s*:\s*['"]([A-Za-z0-9_:-]{3,90})['"]/g;
  let mpm;
  while ((mpm = modPermRe.exec(src)) !== null) {
    const p = mpm[1];
    (USED.get(p) || USED.set(p, []).get(p)).push(mod + '/config/module-permission');
  }

  for (const b of navBs) {
    const code = (b.match(/code\s*:\s*['"]([^'"]+)['"]/) || [])[1];
    if (!code) continue;
    tNav++;
    const p = (b.match(/permission\s*:\s*['"]([^'"]+)['"]/) || [])[1] || '';
    if (p) {
      navP++;
      (USED.get(p) || USED.set(p, []).get(p)).push(mod + '/nav/' + code);
    }
    navMap.set(code, p);
  }
  for (const b of routeBs) {
    const code = (b.match(/code\s*:\s*['"]([^'"]+)['"]/) || [])[1];
    if (!code) continue;
    tRoute++;
    const perms = [...((b.match(/requiredPermissions\s*:\s*\[([^\]]*)\]/) || [])[1]?.matchAll(/'([^']+)'/g) || [])].map(
      (x) => x[1]
    );
    for (const p of perms) {
      routeP++;
      (USED.get(p) || USED.set(p, []).get(p)).push(mod + '/route/' + code);
    }
    const navP2 = navMap.get(code) || '';
    if (navP2 && perms.length && !perms.includes(navP2)) MISMATCH.push({ mod, code, nav: navP2, route: perms });
  }
}

// ── 阶段 B2：扫描 permissions.ts 中 ROLE_PERMISSIONS 对 PERMISSIONS 表的引用 ──
// 识别模式：
//   1. Object.values(PERMISSIONS.xxx)         → 引用该模块全部 5 个 action code
//   2. PERMISSIONS.xxx.read / .write / ...    → 引用单个 action code
//   3. 直接字符串 'all' / 'admin' 等           → 引用裸码
// 注意：PERMISSIONS 表的 key 是 MODULES.XXX 的值（小写字符串如 'hrm'），
// 属性访问用小写：PERMISSIONS.hrm，而非 PERMISSIONS.HRM。
const permSrcFull = readFile(path.join(APPS, 'config/permissions.ts'));

// 构建 MODULES 常量名 → 实际字符串值 的映射（如 HRM → 'hrm'）
const MODULES_MAP = {};
const modConstBlock = extractObjectBlock(permSrcFull, 'export const MODULES');
if (modConstBlock) {
  for (const m of modConstBlock.matchAll(/([A-Z_]+)\s*:\s*['"]([^'"]+)['"]/g)) {
    MODULES_MAP[m[1]] = m[2]; // HRM → 'hrm'
  }
}

// 构建 PERMISSIONS 表的 lowercase-key → {action: code} 映射
const PERMS_TABLE = {};
const permBlock = extractObjectBlock(permSrcFull, 'export const PERMISSIONS');
if (permBlock) {
  // 匹配 [MODULES.XXX]: { read: 'code', write: 'code', ... }
  const modRe = /\[MODULES\.([A-Z_]+)\]\s*:\s*\{([^}]*)\}/g;
  let pm;
  while ((pm = modRe.exec(permBlock)) !== null) {
    const modConst = pm[1]; // HRM
    const modKey = MODULES_MAP[modConst] || modConst.toLowerCase(); // 'hrm'
    const body = pm[2];
    const actions = {};
    for (const am of body.matchAll(/(\w+)\s*:\s*['"]([^'"]+)['"]/g)) {
      actions[am[1]] = am[2];
    }
    PERMS_TABLE[modKey] = actions; // 用小写 key 'hrm' 存储
  }
}

// 扫描 ROLE_PERMISSIONS 块中的引用
const roleBlock = extractObjectBlock(permSrcFull, 'export const ROLE_PERMISSIONS');
if (roleBlock) {
  // 模式 1: Object.values(PERMISSIONS.xxx) — xxx 是小写属性 key
  const spreadRe = /Object\.values\s*\(\s*PERMISSIONS\.([A-Za-z_]+)\s*\)/g;
  let sm;
  while ((sm = spreadRe.exec(roleBlock)) !== null) {
    const modKey = sm[1];
    const actions = PERMS_TABLE[modKey] || {};
    for (const [action, code] of Object.entries(actions)) {
      (USED.get(code) || USED.set(code, []).get(code)).push(
        `permissions.ts/ROLE_PERMISSIONS/Object.values(PERMISSIONS.${modKey}).${action}`
      );
    }
  }
  // 模式 2: PERMISSIONS.xxx.action
  const directRe = /PERMISSIONS\.([A-Za-z_]+)\.(\w+)/g;
  let dm;
  while ((dm = directRe.exec(roleBlock)) !== null) {
    const modKey = dm[1];
    const action = dm[2];
    const code = PERMS_TABLE[modKey]?.[action];
    if (code)
      (USED.get(code) || USED.set(code, []).get(code)).push(
        `permissions.ts/ROLE_PERMISSIONS/PERMISSIONS.${modKey}.${action}`
      );
  }
  // 模式 3: 裸字符串 'all' / 'admin' 等
  const bareRe = /['"]([a-z_]+)['"]/g;
  let bm;
  while ((bm = bareRe.exec(roleBlock)) !== null) {
    const code = bm[1];
    // 仅当该裸码在 LEGAL 集合中时才记录（避免误判普通字符串）
    if (LEGAL.has(code)) {
      (USED.get(code) || USED.set(code, []).get(code)).push('permissions.ts/ROLE_PERMISSIONS/bare');
    }
  }
}

// ── 阶段 B3：将 PERMISSIONS 表中定义的模块级权限码自动视为 USED ──
// 这些权限码是模块级权限模板（Record<ModuleCode, Record<PermissionAction, string>>），
// 类型要求每个模块必须定义全部 5 个动作（read/write/delete/approve/admin），
// 但实际业务中通常只用部分动作（如 dashboard 只需 read）。
// 未使用的动作不应被判定为 DEAD，因为它们是权限模板的完整性约束，并非真正废弃。
let permsTableUsedCount = 0;
for (const actions of Object.values(PERMS_TABLE)) {
  for (const code of Object.values(actions)) {
    if (LEGAL.has(code)) {
      (USED.get(code) || USED.set(code, []).get(code)).push('permissions.ts/PERMISSIONS_TABLE/module-template');
      permsTableUsedCount++;
    }
  }
}
if (permsTableUsedCount > 0) {
  console.log(`[P7 v5] PERMISSIONS 表模块级权限模板自动标记为 USED：${permsTableUsedCount} 条`);
}

const USED_CODES = [...USED.keys()];
console.log(
  `[P7 v5] Nav=${tNav}  Route=${tRoute}  nav.perm=${navP}  route.perm.entries=${routeP}  Used distinct=${USED_CODES.length}`
);

const NOT_LEGAL = USED_CODES.filter((c) => !LEGAL.has(c));
const DEAD = [...LEGAL].filter((c) => !USED.has(c));

/* ============ C：分类统计 ============ */
const nLegalByMod = {};
for (const c of NOT_LEGAL) {
  const p = c.split(':')[0];
  (nLegalByMod[p] = nLegalByMod[p] || []).push(c);
}

const deadByMod = {};
const deadByAction = { read: 0, write: 0, delete: 0, approve: 0, admin: 0, other: 0 };
const deadByReason = { DASHBOARD_TEMPLATE: 0, MODULE_TOP_LEVEL: 0, NEVER_NAV_OR_ROUTE: 0, ADVANCED_ACTION: 0 };

for (const c of DEAD) {
  const p = c.split(':')[0];
  (deadByMod[p] = deadByMod[p] || []).push(c);
  const info = PERM_INFO.get(c);
  if (info?.action) deadByAction[info.action] = (deadByAction[info.action] || 0) + 1;
  else deadByAction.other++;

  // 原因分类
  if (/dashboard:/.test(c)) deadByReason.DASHBOARD_TEMPLATE++;
  else if (/^(hrm|mes|scm|wms|rs|im):(read|write|delete|approve|admin)$/.test(c)) deadByReason.MODULE_TOP_LEVEL++;
  else if (/(delete|approve|admin)$/.test(c)) deadByReason.ADVANCED_ACTION++;
  else deadByReason.NEVER_NAV_OR_ROUTE++;
}

/* ============ D：输出报告 ============ */
const lines = [];
function P(s) {
  console.log(s);
  lines.push(s);
}

P(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
P(`║                        🔍 P7 RBAC 权限码双向审计报告 v5                         ║`);
P(`╚══════════════════════════════════════════════════════════════════════════════╝`);
P(``);
P(`📊 基础统计`);
P(`  • permissions.ts 声明的合法权限码总数：${String(LEGAL.size).padStart(5)} 条`);
P(`  • config.ts (Nav+Route) 实际使用的权限码：${String(USED_CODES.length).padStart(5)} 条`);
P(`  • 覆盖度（使用码中已声明比例，恒≤100%）：${((USED_CODES.filter((c) => LEGAL.has(c)).length / Math.max(1, USED_CODES.length)) * 100).toFixed(1)}%`);
P(``);

P(`🟡 NOT_LEGAL：config.ts 使用但 ∉ permissions.ts/app-shell 声明的权限码 → ${NOT_LEGAL.length} 条`);
P(`   判定 = ${NOT_LEGAL.length > 0 ? '🟡 声明缺口（前端运行时判定基于后端下发码列表 permissions.includes，静态声明缺 ≠ 菜单隐藏；仅 UI 元数据不完整，需与后端动态签发码集人工核对）' : '✅ PASS 级：0 违规'}`);
if (NOT_LEGAL.length) {
  for (const [m, arr] of Object.entries(nLegalByMod).sort((a, b) => b[1].length - a[1].length)) {
    P(`\n   模块 [${m}] 共 ${arr.length} 条：`);
    for (const c of arr) {
      P(`     ❌ ${c.padEnd(48)}  使用场景: ${(USED.get(c) || []).slice(0, 3).join(' | ')}`);
    }
  }
}
P(``);

P(`🟡 MISMATCH：Nav.permission ⊄ Route.requiredPermissions → ${MISMATCH.length} 条`);
P(`   严重度 = ${MISMATCH.length > 0 ? '🟡 WARN 级：中风险（菜单可见但点击403）' : '✅ PASS 级：0 违规'}`);
for (const x of MISMATCH.slice(0, 20)) P(`    ⚠️  ${x.mod}/${x.code}  nav=${x.nav}  route=[${x.route.join(' / ')}]`);
P(``);

P(`🟠 DEAD：permissions.ts 声明但前端 0 引用（可清理/预留） → ${DEAD.length} 条`);
P(`   严重度 = 🟠 INFO 级（非阻断，但后续可清理缩减权限矩阵体积）`);
P(``);
P(`  ── 按原因分类（为什么未使用？）──`);
for (const [k, cnt] of Object.entries(deadByReason)) {
  const bar = '█'.repeat(Math.round((cnt / Math.max(1, DEAD.length)) * 30));
  P(
    `     ${k.padEnd(24)} ${String(cnt).padStart(4)}条  ${bar}  ${((cnt / Math.max(1, DEAD.length)) * 100).toFixed(0)}%`
  );
}
P(``);
P(`  ── 按 Action 分类 ──`);
for (const [k, cnt] of Object.entries(deadByAction)) {
  if (cnt > 0) P(`     ${k.padEnd(10)} ${String(cnt).padStart(4)}条`);
}
P(``);
P(`  ── 按模块前缀 TOP 20 ──`);
for (const [m, arr] of Object.entries(deadByMod)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 20)) {
  const first6 = arr.slice(0, 4).join('  ');
  P(
    `     ${m.padEnd(16)} ${String(arr.length).padStart(4)}条   eg. ${first6}${arr.length > 4 ? '  …+' + (arr.length - 4) : ''}`
  );
}
P(``);

P(`📝 详细清单输出位置：`);
const p7NotLegal = path.join(outDir, 'p7-not-legal.txt');
const p7Dead = path.join(outDir, 'p7-dead.txt');
const p7Report = path.join(outDir, 'p7-audit-report.json');
if (OPTS.apply) {
  fs.writeFileSync(p7NotLegal, NOT_LEGAL.map((c) => c + '\t# ' + (USED.get(c) || []).join(' | ')).join('\n'));
  fs.writeFileSync(
    p7Dead,
    DEAD.map((c) => {
      const info = PERM_INFO.get(c);
      return `${c}\t# module=${info?.module || '-'}  action=${info?.action || '-'}  name=${info?.name || '-'}  group=${info?.group || '-'}`;
    }).join('\n')
  );
}
const summary = {
  LEGAL_count: LEGAL.size,
  USED_count: USED_CODES.length,
  NOT_LEGAL_count: NOT_LEGAL.length,
  MISMATCH_count: MISMATCH.length,
  DEAD_count: DEAD.length,
  deadByReason,
  deadByAction,
  // 覆盖度 = 使用码中被声明覆盖的比例（LEGAL∩USED / USED），恒 ≤100%——
  // 旧口径 USED/LEGAL 在 LEGAL 集不完整时会 >100%（如 375/101=371.3%），指标失真
  coverage: +((USED_CODES.filter((c) => LEGAL.has(c)).length / Math.max(1, USED_CODES.length)) * 100).toFixed(1),
  NOT_LEGAL: NOT_LEGAL.map((c) => ({ code: c, usages: USED.get(c) || [] })),
  DEAD: DEAD.map((c) => ({ code: c, info: PERM_INFO.get(c) || null })),
  MISMATCH,
};
if (OPTS.apply) {
  fs.writeFileSync(p7Report, JSON.stringify(summary, null, 2));
}
const label = OPTS.apply ? '→' : 'would write→';
P(`  • ${p7NotLegal}${OPTS.apply ? '' : '  (未写，加 --apply)'}（${NOT_LEGAL.length} 条 NOT_LEGAL）`);
P(`  • ${p7Dead}${OPTS.apply ? '' : '  (未写，加 --apply)'}（${DEAD.length} 条 DEAD，带元数据）`);
P(`  • ${p7Report}${OPTS.apply ? '' : '  (未写，加 --apply)'}（结构化 JSON 报告）`);
P(``);
P(
  `✅ RBAC 合规判定：${NOT_LEGAL.length === 0 && MISMATCH.length === 0 ? 'PASS（NOT_LEGAL=0, MISMATCH=0）' : '🟡 声明缺口（NOT_LEGAL>0：前端权限码未在 permissions.ts/app-shell 声明，运行时判定基于后端动态签发不受影响；需人工核对后端签发码集并补 UI 元数据）'}`
);
if (!OPTS.apply) {
  process.stderr.write(`\n[p7-perm-audit-v5] 💡 当前为 DRY-RUN，加 --apply 才会写 3 个 artifact 文件。\n`);
}
