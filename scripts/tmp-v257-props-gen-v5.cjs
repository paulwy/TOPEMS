#!/usr/bin/env node
/**
 * tmp-v257-props-gen-v5.cjs
 *
 * V257 P0-1 收尾 6 模块专用脚本（erp / bi / rd / oa / ai / workflow）：
 * 针对「export const xxxModuleConfig: RouteModuleConfig = { routes: [内联对象... ] }」
 * 的「内联模式」模块，将每条路由抽成独立命名 const + 绑定 Props 泛型。
 *
 * 输入：--module=<erp|bi|rd|oa|ai|workflow> [--dry-run（默认 true）] [--apply]
 * 输出：stdout 打印生成的「Props 接口块 + 每条路由独立命名变量 + 模块 routes 替换效果」
 *       --apply 模式直接回写原文件。
 *
 * 兼容特点：
 *  1) 保留原文件所有非 routes 非 XX_PATHS 的字段原样（icon/code/description/permission/tier...）
 *  2) 保留原 template 字段；新增 V257 标准字段 templateType = template 双写
 *  3) Props 接口命名严格从 lazyWithRetry 的 displayName 推断，对齐已完成 9 模式
 *  4) 从 XX_PATHS.<key> 解析动态段，生成对应的路径参数字段
 *  5) 模板映射：dashboard/stats → {}（空 props）；list → page?/pageSize?/filters?；form → mode?/initialValues?；detail → id?/entityType?；wizard → step?/workflowId?/applicantId?
 */
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2).reduce((acc, a) => {
  const [k, v] = a.startsWith('--') ? a.slice(2).split('=') : [null, a];
  if (k) acc[k] = v === undefined ? true : v;
  return acc;
}, {});

const MODULE_NAME = argv.module || argv.m;
const DRY_RUN = !argv.apply;
if (!MODULE_NAME) {
  console.error('❌ 请传入 --module=<erp|bi|rd|oa|ai|workflow>');
  process.exit(1);
}
const WEB_ROOT = path.resolve(__dirname, '..', 'apps', 'web', 'src');
function findConfig(m) {
  const direct = path.join(WEB_ROOT, 'modules', m, 'config.ts');
  if (fs.existsSync(direct)) return direct;
  const alts = fs.readdirSync(path.join(WEB_ROOT, 'modules')).filter(d => d.toLowerCase().includes(m.toLowerCase()));
  for (const a of alts) {
    const c = path.join(WEB_ROOT, 'modules', a, 'config.ts');
    if (fs.existsSync(c)) return c;
  }
  return null;
}
const CONFIG_PATH = findConfig(MODULE_NAME);
if (!CONFIG_PATH) {
  console.error(`❌ 找不到 ${MODULE_NAME} 的 config.ts`);
  process.exit(2);
}
const MODULE_DIR = path.dirname(CONFIG_PATH);
const MODULE_SLUG = path.basename(MODULE_DIR); // 真实目录名（可能与传入 m 不同）
const SRC = fs.readFileSync(CONFIG_PATH, 'utf8');
const LINES = SRC.split(/\r?\n/);

console.log(`\n========== [V5 转换] 模块 ${MODULE_NAME} :: ${CONFIG_PATH} ==========`);

// ========= 1) 解析 XX_PATHS 常量：找 "export const XXX_PATHS = { ... } as const;" 的整段 =========
const PATHS_MATCH = SRC.match(/export const ([A-Z][A-Z0-9_]*_PATHS)\s*=\s*\{([\s\S]*?)\}\s+as\s+const\s*;/);
if (!PATHS_MATCH) {
  console.error('❌ 未匹配到 export const XX_PATHS = {...} as const;');
  process.exit(3);
}
const PATHS_NAME = PATHS_MATCH[1];
const PATHS_BODY = PATHS_MATCH[2];
const PATH_MAP = {}; // key -> path string
const PATH_LINE_RE = /^\s*([A-Za-z0-9_]+)\s*:\s*(['"`])((?:\\.|(?!\2).)+)\2\s*,?\s*$/gm;
let m;
while ((m = PATH_LINE_RE.exec(PATHS_BODY)) !== null) {
  PATH_MAP[m[1]] = m[3];
}
console.log(`✅ 解析到 ${PATHS_NAME} = ${Object.keys(PATH_MAP).length} 个路径`);

// 解析动态段工具
function parseDyn(pathStr) {
  const segs = [];
  const r = /:([A-Za-z_][A-Za-z0-9_]*)/g;
  let mm;
  while ((mm = r.exec(pathStr)) !== null) segs.push(mm[1]);
  return segs;
}

// ========= 2) 解析 routes 数组的每个内联对象 =========
// routes: [ 开始行号，结束行号（找到 ]）
let routesStartLine = -1;
for (let i = 0; i < LINES.length; i++) {
  if (/^\s*routes\s*:\s*\[\s*$/.test(LINES[i])) { routesStartLine = i; break; }
}
if (routesStartLine < 0) {
  // 可能 routes: 跟 [ 不在同一行
  for (let i = 0; i < LINES.length; i++) {
    if (/^\s*routes\s*:/.test(LINES[i])) {
      // 找下一行开始 [
      for (let j = i; j < i + 3 && j < LINES.length; j++) {
        if (LINES[j].includes('[')) { routesStartLine = j; break; }
      }
      break;
    }
  }
}
if (routesStartLine < 0) {
  console.error('❌ 未找到 routes: [ 起点');
  process.exit(4);
}
// 找 routes 数组结束位置：基于 {} 计数
let depth = 0;
let inArray = false;
let routesEndLine = -1;
for (let i = routesStartLine; i < LINES.length; i++) {
  const line = LINES[i];
  for (let c = 0; c < line.length; c++) {
    const ch = line[c];
    if (ch === '[') { if (!inArray) inArray = true; depth++; continue; }
    if (ch === ']') { depth--; if (depth === 0 && inArray) { routesEndLine = i; break; } continue; }
    // 跳过字符串字面量 / 注释（简化：只跳过 '...' 和 "..." 和 `...`）
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      c++;
      while (c < line.length && line[c] !== quote) {
        if (line[c] === '\\') c++;
        c++;
      }
    }
  }
  if (routesEndLine > 0) break;
}
if (routesEndLine < 0) {
  console.error(`❌ 无法找到 routes 数组结束 ]（从 L${routesStartLine + 1} 开始）`);
  process.exit(5);
}
console.log(`✅ 定位 routes 数组：L${routesStartLine + 1}~L${routesEndLine + 1}（含 ${routesEndLine - routesStartLine - 1} 行内容）`);

// 从 routes 数组范围文本里，拆出每个独立的对象块（找最外 {} 对）
const ROUTES_BODY_TEXT = LINES.slice(routesStartLine + 1, routesEndLine).join('\n');
function splitTopLevelObjects(text) {
  const blocks = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    // 跳过空字符与逗号
    while (i < n && /\s|,/.test(text[i])) i++;
    if (i >= n) break;
    if (text[i] !== '{') {
      // 可能是注释；跳过 1 行
      const nl = text.indexOf('\n', i);
      i = nl < 0 ? n : nl + 1;
      continue;
    }
    let depth = 0;
    let start = i;
    while (i < n) {
      const ch = text[i];
      if (ch === '{' || ch === '[' || ch === '(') depth++;
      else if (ch === '}' || ch === ']' || ch === ')') depth--;
      else if (ch === "'" || ch === '"' || ch === '`') {
        const q = ch; i++;
        while (i < n && text[i] !== q) { if (text[i] === '\\') i++; i++; }
      }
      else if (ch === '/' && text[i+1] === '/') {
        const nl = text.indexOf('\n', i);
        if (nl < 0) { i = n; break; }
        i = nl;
      }
      i++;
      if (depth === 0) break;
    }
    blocks.push(text.slice(start, i));
  }
  return blocks;
}
const ROUTE_BLOCKS = splitTopLevelObjects(ROUTES_BODY_TEXT);
console.log(`✅ 拆出 ${ROUTE_BLOCKS.length} 个独立路由对象块`);

// ========= 3) 解析每个路由对象块：抽 displayName / template / path key =========
function analyze(block) {
  // 提取 displayName：lazyWithRetry( ()=> import('...'), 'DisplayName' )
  const dnMatch = block.match(/lazyWithRetry\s*\(\s*(?:[^,]*),\s*['"`]([A-Za-z0-9_]+)['"`]\s*\)/);
  const displayName = dnMatch ? dnMatch[1] : null;
  // 提取 template 字段值
  const tplMatch = block.match(/template\s*:\s*['"`]([A-Za-z0-9_-]+)['"`]/);
  const template = tplMatch ? tplMatch[1] : null;
  // 提取 path 字段右侧：XX_PATHS.xxxKey
  const pkMatch = block.match(new RegExp(`path\\s*:\\s*${PATHS_NAME}\\.([A-Za-z0-9_]+)`));
  const pathKey = pkMatch ? pkMatch[1] : null;
  return { displayName, template, pathKey, block };
}

const PARSED = ROUTE_BLOCKS.map(analyze);
// 简单 displayName 重复检查（同 mes ProductionDashboardPage）
const dnCounts = {};
for (const p of PARSED) if (p.displayName) dnCounts[p.displayName] = (dnCounts[p.displayName] || 0) + 1;
for (const p of PARSED) {
  if (p.displayName && dnCounts[p.displayName] > 1) {
    // 给重复显示名加 pathKey 后缀消歧
    p._displayNameDup = dnCounts[p.displayName];
  }
}

// ========= 4) 生成 Props 接口 & 独立命名路由 =========
const INTERFACE_BLOCKS = [];
const STANDALONE_ROUTE_STMTS = [];
const ROUTE_VAR_NAMES = [];

// 辅助：首字母大写
const up = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const down = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
// camelCase 转 PascalCase
const pascal = s => s.replace(/(^|[_-])([a-z0-9])/g, (_m, _s, c) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, '');

// Props 模板驱动字段
function tplFields(template, pathKey) {
  const pathStr = pathKey ? PATH_MAP[pathKey] : '';
  const dyn = parseDyn(pathStr || '');
  const std = [];
  // wizard 模板？
  if (template === 'wizard') {
    std.push(['step?', 'number']);
    std.push(['workflowId?', 'string']);
    std.push(['applicantId?', 'string']);
  } else if (template === 'list') {
    std.push(['page?', 'number']);
    std.push(['pageSize?', 'number']);
    std.push(['filters?', 'Record<string, unknown>']);
  } else if (template === 'detail') {
    std.push(['id?', 'string']);
    std.push(['entityType?', 'string']);
  } else if (template === 'form') {
    std.push(['mode?', "'create' | 'edit' | 'view'"]);
    std.push(['initialValues?', 'Record<string, unknown>']);
  }
  // 动态段字段（已 detail 的 id? 如已存在避免重复）
  const seen = new Set(std.map(x => x[0].replace(/\?$/, '')));
  for (const d of dyn) {
    if (!seen.has(d)) {
      std.push([`${d}?`, 'string']);
      seen.add(d);
    }
  }
  return std;
}

// Props 命名规则：优先 displayName 加 PageProps；若 displayName 重复 → 加 pathKey 后缀
function buildNames(parsed, idx) {
  let propsName, routeVarName;
  const dn = parsed.displayName;
  if (dn) {
    const base = dn.endsWith('Page') ? dn.slice(0, -4) : dn;
    if (parsed._displayNameDup) {
      const dis = parsed.pathKey ? up(parsed.pathKey) : `V${idx + 1}`;
      propsName = `${base}${dis}PageProps`;
      routeVarName = `${down(base)}${dis}Route`;
    } else {
      propsName = `${base}PageProps`;
      routeVarName = `${down(base)}Route`;
    }
  } else {
    const dis = parsed.pathKey ? pascal(parsed.pathKey) : `Index${idx + 1}`;
    propsName = `${pascal(MODULE_SLUG)}${dis}PageProps`;
    routeVarName = `${down(MODULE_SLUG)}${dis}Route`;
  }
  return { propsName, routeVarName };
}

PARSED.forEach((p, idx) => {
  const { propsName, routeVarName } = buildNames(p, idx);
  ROUTE_VAR_NAMES.push(routeVarName);

  const fields = tplFields(p.template, p.pathKey);
  // 构造 interface 字符串
  let intf = `export interface ${propsName}`;
  if (fields.length === 0) {
    intf += ' {}\n';
  } else {
    intf += ' {\n';
    for (const [f, t] of fields) intf += `  ${f}: ${t};\n`;
    intf += '}\n';
  }
  INTERFACE_BLOCKS.push(intf);

  // 构造独立路由对象：原对象文本 + 若没有 templateType 就补 templateType = template 字段
  let block = p.block.trim();
  if (!/templateType\s*:/.test(block) && p.template) {
    // 在 template: xxx 行后插入一行 templateType
    block = block.replace(
      /(template\s*:\s*['"`][A-Za-z0-9_-]+['"`]\s*,?)/,
      (_m, m) => `${m}\n      templateType: ${JSON.stringify(p.template)},`
    );
  }
  const stmt =
    `\nconst ${routeVarName}: RouteConfigV2<${propsName}> = ${block};\n`;
  STANDALONE_ROUTE_STMTS.push(stmt);
});

// ========= 5) 组装新文件 =========
// 头部插入 import RouteConfigV2（如不存在），然后在 XX_PATHS 之后、moduleConfig 之前
// 插入 Props interfaces + 独立路由 consts + 最后改写 moduleConfig.routes = [ varNames ]

const HEADER = SRC.slice(0, PATHS_MATCH.index + PATHS_MATCH[0].length);
const AFTER_PATHS = SRC.slice(PATHS_MATCH.index + PATHS_MATCH[0].length);
// 在 moduleConfig 定义之前插入 Props & 独立路由
const MODULE_CONFIG_START_RE = /export const [A-Za-z0-9_]*ModuleConfig\s*:\s*RouteModuleConfig\s*=/;
const mcMatch = AFTER_PATHS.match(MODULE_CONFIG_START_RE);
if (!mcMatch) {
  console.error('❌ 未匹配到 export const xxxModuleConfig: RouteModuleConfig = ');
  process.exit(6);
}
const BEFORE_MODULE = AFTER_PATHS.slice(0, mcMatch.index);
const MODULE_CONFIG_AND_AFTER = AFTER_PATHS.slice(mcMatch.index);

// 构造插入体
const importLineNeeds = !/import\s+type\s*\{[^}]*RouteConfigV2[^}]*\}\s*from/.test(SRC) ||
  !/RouteConfigV2\s*,/.test(SRC.match(/import\s+type\s*\{[^}]*\}\s*from\s*['"`][^'"`]+['"`]/m)?.[0] || '') ||
  !/^import.*RouteConfigV2/m.test(SRC);
// 简化：总是在 import 行补 RouteConfigV2（若 import type { RouteModuleConfig } 已有就加逗号）
function ensureRouteConfigV2Import(src) {
  const re = /(import\s+type\s*\{)([^}]*\bRouteModuleConfig\b[^}]*)(\}\s*from\s*['"`][^'"`]+routes\/v2\/types[^'"`]*['"`]\s*;)/m;
  const mm = src.match(re);
  if (!mm) return src; // 不匹配就不管（可能不是标准 import）
  let inner = mm[2];
  if (/\bRouteConfigV2\b/.test(inner)) return src;
  // 在 RouteModuleConfig 前后加
  inner = inner.replace(/(\bRouteModuleConfig\b)/, 'RouteConfigV2, $1');
  return src.replace(re, (_m, p1, _p2, p3) => `${p1}${inner}${p3}`);
}

let newSrc = ensureRouteConfigV2Import(SRC.slice(0, PATHS_MATCH.index));
// 加一个换行（保留原 XX_PATHS 后换行）
newSrc += `
${INTERFACE_BLOCKS.join('\n')}
${STANDALONE_ROUTE_STMTS.join('')}
`;
// 处理 MODULE_CONFIG：修改 routes: [原来很长的数组] → routes: [ 引用变量 ]
function replaceRoutesArray(text) {
  // 找 routes: [
  let i = 0;
  const n = text.length;
  while (i < n) {
    const r = /routes\s*:\s*\[/g;
    r.lastIndex = i;
    const rm = r.exec(text);
    if (!rm) break;
    let start = rm.index;
    let p = rm.index + rm[0].length;
    // 跳过空格换行
    while (p < n && /\s/.test(text[p])) p++;
    // 找配对 ]（基于 {} / [] 深度）
    let depth = 1; // 已进入 [
    while (p < n && depth > 0) {
      const ch = text[p];
      if (ch === '[' || ch === '{' || ch === '(') depth++;
      else if (ch === ']' || ch === '}' || ch === ')') {
        depth--;
        if (depth === 0) break;
      } else if (ch === "'" || ch === '"' || ch === '`') {
        const q = ch; p++;
        while (p < n && text[p] !== q) { if (text[p] === '\\') p++; p++; }
      } else if (ch === '/' && text[p+1] === '/') {
        const nl = text.indexOf('\n', p);
        if (nl < 0) { p = n; break; }
        p = nl;
      }
      p++;
    }
    const replacement = 'routes: [\n    ' + ROUTE_VAR_NAMES.map(v => v).join(',\n    ') + ',\n  ]';
    return text.slice(0, start) + replacement + text.slice(p);
  }
  return text;
}

newSrc += BEFORE_MODULE;
newSrc += replaceRoutesArray(MODULE_CONFIG_AND_AFTER);

// ========= 6) 输出 & 应用 =========
console.log(`\n========== 生成统计 ==========`);
console.log(`· Props 接口数  : ${INTERFACE_BLOCKS.length}（${INTERFACE_BLOCKS.reduce((s,x)=>s+(x.split('\n').length-2),0)} 总字段）`);
console.log(`· 独立路由变量数: ${STANDALONE_ROUTE_STMTS.length}（1:1 绑定）`);
console.log(`· 动态段总数    : ${Object.values(PATH_MAP).reduce((s,p)=>s+parseDyn(p).length,0)}（分布在 ${Object.values(PATH_MAP).filter(p=>parseDyn(p).length).length} 条路径）`);
console.log(`· 模板分布      : ${(()=>{const r={};PARSED.forEach(p=>{const t=p.template||'(none)';r[t]=(r[t]||0)+1;});return Object.entries(r).map(([k,v])=>`${k}=${v}`).join(' ');})()}`);
console.log('');

// 统计 Props 接口数（再次自检）
const interfaceCount = (newSrc.match(/^export interface [A-Z][A-Za-z0-9]*Props\b/gm) || []).length;
const boundCount = (newSrc.match(/RouteConfigV2\s*<\s*[A-Z][A-Za-z0-9]*Props\s*>/g) || []).length;
console.log(`✅ 自检：Props 接口数=${interfaceCount} / RouteConfigV2<Props> 绑定数=${boundCount} / 路由块数=${ROUTE_BLOCKS.length}${interfaceCount === boundCount && boundCount === ROUTE_BLOCKS.length ? ' 全部相等 ✅' : ' ⚠️ 不相等！'}`);

console.log('\n========== 预览：前 130 行生成文件（不含整段）==========\n');
console.log(newSrc.split(/\r?\n/).slice(0, 130).join('\n'));
console.log('\n================ 预览结束 ================\n');

if (DRY_RUN) {
  console.log('[DRY-RUN] 未写入文件。确认无误后加 --apply 回写。');
} else {
  fs.writeFileSync(CONFIG_PATH, newSrc, 'utf8');
  console.log(`✅ 已写回：${CONFIG_PATH}`);
}
