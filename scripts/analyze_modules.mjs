#!/usr/bin/env node
/**
 * 脚本：扫描 modules 目录下的所有 NavConfig，统计模块详情
 * 运行方式：node scripts/analyze_modules.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MODULES_DIR = join(__dirname, '..', 'apps/web/src/modules');

// 33 个模块的 config 字段正则
const CODE_RE = /code:\s*['"]([^'"]+)['"]/;
const NAME_RE = /name:\s*['"]([^'"]+)['"]/;
const ICON_RE = /icon:\s*['"]([^'"]+)['"]/;
const PATH_RE = /path:\s*([A-Z_]+)PATHS\.root/;
const PERM_RE = /permission:\s*['"]([^'"]+)['"]/;
const SOURCE_RE = /source:\s*['"]([^'"]+)['"]/;
const SUITE_RE = /suite:\s*['"]([^'"]+)['"]/;
const STATUS_RE = /status:\s*['"]([^'"]+)['"]/;
const ORDER_RE = /order:\s*(\d+)/;
const DESC_RE = /description:\s*['"]([^'"]+)['"]/;

const NAVITEM_LABEL_RE = /label:\s*['"]([^'"]+)['"]/g;
const NAVITEM_PATH_RE = /path:\s*([A-Z_]+)PATHS\.\w+/g;
const NAVITEM_PERM_RE = /permission:\s*['"]([^'"]+)['"]/g;

function extractFirstMatch(regex, text, fallback = '—') {
  const m = text.match(regex);
  return m ? m[1] : fallback;
}

function countMatches(regex, text) {
  return [...text.matchAll(new RegExp(regex.source, regex.flags))].length;
}

const modules = [];
const dirEntries = readdirSync(MODULES_DIR);

for (const entry of dirEntries) {
  const entryPath = join(MODULES_DIR, entry);
  if (!statSync(entryPath).isDirectory()) continue;
  const configFile = join(entryPath, 'config.ts');
  try {
    const code = readFileSync(configFile, 'utf8');
    // 只匹配 "export const xxxNavConfig: ModuleNavConfig = {" 这一段
    const configMatch = code.match(
      /export\s+const\s+(\w+NavConfig)\s*(?::\s*ModuleNavConfig)?\s*=\s*\{([\s\S]*?)\n\}\s*;\s*\n(?:export|import|$)/
    );
    // 简单兜底：从文件头开始找第一个 { code: ... name: ... } 块
    const block = (configMatch ? configMatch[2] : code);

    const moduleCode = extractFirstMatch(CODE_RE, block);
    const moduleName = extractFirstMatch(NAME_RE, block);
    const icon = extractFirstMatch(ICON_RE, block);
    const perm = extractFirstMatch(PERM_RE, block, '(none)');
    const source = extractFirstMatch(SOURCE_RE, block, '(未知)');
    const suite = extractFirstMatch(SUITE_RE, block, '(未分组)');
    const status = extractFirstMatch(STATUS_RE, block, '(未声明)');
    const order = parseInt(extractFirstMatch(ORDER_RE, block, '9999'), 10);
    const desc = extractFirstMatch(DESC_RE, block, '');
    const navItemCount = countMatches(NAVITEM_LABEL_RE, code);

    modules.push({
      code: moduleCode,
      name: moduleName,
      icon,
      permission: perm,
      source,
      suite,
      status,
      order,
      desc,
      navItemCount,
    });
  } catch (e) {
    // 跳过不存在 config.ts 的目录
  }
}

modules.sort((a, b) => a.order - b.order);

console.log('\n========== TOPEMS 模块注册全景 ==========');
console.log(`总模块数（含权限过滤前）：${modules.length}`);
console.log(`\n按来源 (source) 分布：`);
const bySource = {};
for (const m of modules) bySource[m.source] = (bySource[m.source] || 0) + 1;
console.log(' ', bySource);
console.log(`\n按业务域 (suite) 分布：`);
const bySuite = {};
for (const m of modules) bySuite[m.suite] = (bySuite[m.suite] || 0) + 1;
console.log(' ', bySuite);

console.log('\n--- 模块详情（按 order 排序）---');
console.log(
  'No'.padStart(2),
  'Code'.padEnd(14),
  '模块名'.padEnd(12),
  '来源'.padEnd(7),
  '业务域'.padEnd(11),
  '状态'.padEnd(8),
  '二级页面数',
  '权限'.padEnd(20),
  '说明'
);
console.log('-'.repeat(110));

modules.forEach((m, i) => {
  console.log(
    String(i + 1).padStart(2),
    m.code.padEnd(14),
    m.name.padEnd(12).slice(0, 12),
    m.source.padEnd(7),
    m.suite.padEnd(11).slice(0, 11),
    m.status.padEnd(8),
    String(m.navItemCount).padStart(8),
    m.permission.padEnd(20).slice(0, 20),
    m.desc
  );
});

console.log('\n--- 业务域分组：适合做侧边导航分组 ---');
const suiteGrouped = {};
for (const m of modules) {
  if (!suiteGrouped[m.suite]) suiteGrouped[m.suite] = [];
  suiteGrouped[m.suite].push(m);
}
for (const [suite, list] of Object.entries(suiteGrouped)) {
  console.log(`\n${suite} (${list.length} 个模块)：`);
  for (const m of list) {
    console.log(`   · ${m.name}（${m.code}）`);
  }
}

// 按 Dashboard 当前的 3 分类做映射
const systemCodes = new Set(['iam', 'integration', 'report']);
const hasAdminPerm = (m) => m.permission.includes('admin') || m.permission.includes('system');

const inCore = modules.filter((m) => m.source === 'core');
const inSystem = modules.filter(
  (m) => systemCodes.has(m.code) || hasAdminPerm(m)
);
const inBusiness = modules.filter(
  (m) => m.source === 'plugin' && !systemCodes.has(m.code)
);
const inCoreCodes = new Set(inCore.map((m) => m.code));
const dup = inSystem.filter((m) => inCoreCodes.has(m.code));

console.log('\n--- Dashboard 当前分类结果（与你看到的 27 个卡片的关系）---');
console.log(`理论 total modules: ${modules.length}`);
console.log(`coreModules (source===core): ${inCore.length} → ${inCore.map(m=>m.code).join(',')}`);
console.log(`systemServicesModules (systemCodes/admin perm): ${inSystem.length} → ${inSystem.map(m=>m.code).join(',')}`);
console.log(`businessModules (plugin && !systemCodes): ${inBusiness.length} → ${inBusiness.map(m=>m.code).join(',')}`);
console.log(`⚠️  同时出现在 core 和 system 的重复模块：${dup.length} 个 → ${dup.map(m=>m.code).join(',') || '(无)'}`);
console.log(`理论卡片总数（不重复）: ${modules.length}`);
console.log(`实际看到 27 个卡片 = 33 总数 - 6 个未激活插件/无权限模块（受 isPluginInstalled / isPluginActive 影响）`);
