#!/usr/bin/env node
/**
 * V68.0 Iteration2 Task5: 导航三联校验脚本
 *
 * 三联校验（完整接入）：
 *   1. NAV_TREE 导航声明 → 页面文件存在性
 *   2. NAV_TREE 导航声明 → 路由注册存在性
 *   3. NAV_TREE 导航声明 → 权限定义存在性
 *
 * 用法：
 *   node scripts/verify_navigation.mjs
 *   node scripts/verify_navigation.mjs --strict
 *
 * 退出码：
 *   0 = 通过（或非严格模式下仅提示缺失）
 *   1 = --strict 严格模式下存在缺失项
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, relative, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, statSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const WEB_ROOT = join(PROJECT_ROOT, 'apps/web/src');
const MODULES_ROOT = join(WEB_ROOT, 'modules');
const PAGES_ROOT = join(WEB_ROOT, 'pages');
const ROUTES_V2_INDEX = join(WEB_ROOT, 'routes/v2/index.ts');
const PERMISSIONS_CONFIG = join(WEB_ROOT, 'config/permissions.ts');

const MODULE_CODES = [
  'iam', 'admin', 'automation', 'workflow', 'notification', 'doc', 'report',
  'monitor', 'integration', 'ai', 'mobile', 'hrm', 'finance', 'crm', 'mes',
  'qms', 'lims', 'ehs', 'scm', 'erp', 'wms', 'pm', 'pdm', 'srm', 'rd',
  'plugin', 'im', 'bi', 'gis', 'asset', 'lowcode', 'oa', 'ticket',
];

const VALID_ACTIONS = new Set(['read', 'write', 'delete', 'approve', 'admin', 'update', 'create']);

function walkDir(dir, callback, excludeDirs = new Set(['node_modules', '.git', '__tests__', 'components', 'hooks'])) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (!excludeDirs.has(entry)) {
        walkDir(fullPath, callback, excludeDirs);
      }
    } else if (stat.isFile()) {
      callback(fullPath);
    }
  }
}

// ──────────────────────────────────────────
// ① flattenPaths: 递归 children 收集所有 path
// ──────────────────────────────────────────
function flattenPaths(nodes) {
  const result = [];

  function walk(list) {
    if (!Array.isArray(list)) return;
    for (const node of list) {
      if (node && typeof node === 'object') {
        if (node.path) {
          result.push({
            path: node.path,
            code: node.code,
            label: node.label,
            permission: node.permission,
          });
        }
        if (node.children && Array.isArray(node.children)) {
          walk(node.children);
        }
        if (node.navItems && Array.isArray(node.navItems)) {
          walk(node.navItems);
        }
      }
    }
  }

  walk(nodes);
  return result;
}

// ──────────────────────────────────────────
// ② pagePathToFile: 路由路径 → 候选页面文件路径
// ──────────────────────────────────────────
const _pageFileCache = { built: false, files: [], byName: new Map(), byDir: new Map() };

function buildPageFileCache() {
  if (_pageFileCache.built) return;
  
  const files = [];
  const byName = new Map();
  const byDir = new Map();

  walkDir(PAGES_ROOT, (filePath) => {
    const relPath = relative(PAGES_ROOT, filePath);
    const basename = filePath.split('/').pop();
    const dirParts = relative(PAGES_ROOT, filePath).split('/').slice(0, -1);
    const parentDir = dirParts.length > 0 ? dirParts[0] : '';
    
    files.push({
      fullPath: filePath,
      relPath,
      basename,
      nameNoExt: basename.replace(/\.(tsx|ts)$/i, ''),
      parentDir,
      dirParts,
    });

    const key = basename.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(filePath);

    if (parentDir) {
      if (!byDir.has(parentDir)) byDir.set(parentDir, []);
      byDir.get(parentDir).push(filePath);
    }
  }, new Set(['node_modules', '.git', '__tests__', 'components', 'hooks']));

  _pageFileCache.files = files;
  _pageFileCache.byName = byName;
  _pageFileCache.byDir = byDir;
  _pageFileCache.built = true;
}

// V182 缩写词典：覆盖 statistics→Stats 这类无法机械推导的缩写变体
const ABBREV_DICT = {
  statistics: 'Stats',
  notifications: 'Notification',
  configs: 'Config',
  settings: 'Setting',
};

function pagePathToFile(pagePath) {
  if (!pagePath || typeof pagePath !== 'string') {
    return { candidates: [], foundIndex: -1, matched: null };
  }

  buildPageFileCache();

  const normalized = pagePath.startsWith('/') ? pagePath.slice(1) : pagePath;
  const segments = normalized.split('/').filter(Boolean);

  const cleanSegments = segments.map((s) => (s.startsWith(':') ? '__param__' : s));
  const moduleDir = cleanSegments.length > 0 ? toKebab(cleanSegments[0]) : '';
  const lastSegment = cleanSegments.length > 0 ? cleanSegments[cleanSegments.length - 1] : '';
  const lastPascal = lastSegment === '__param__' ? 'Detail' : toPascal(lastSegment);
  const lastKebab = lastSegment === '__param__' ? 'detail' : toKebab(lastSegment);

  // V182: 单数变体（复数末段去 s，-ies → y）
  const isPlural = lastSegment.endsWith('s') && lastSegment.length > 1 && lastSegment !== '__param__';
  function toSingular(s) {
    if (s.endsWith('ies') && s.length > 3) return s.slice(0, -3) + 'y';
    if (s.endsWith('ses') && s.length > 3) return s.slice(0, -2);
    if (s.endsWith('s') && !s.endsWith('ss')) return s.slice(0, -1);
    return s;
  }
  const singularSegment = isPlural ? toSingular(lastSegment) : lastSegment;
  const singularPascal = lastSegment === '__param__' ? 'Detail' : toPascal(singularSegment);
  const singularKebab = lastSegment === '__param__' ? 'detail' : toKebab(singularSegment);

  // V182: 路径缩略 - 去掉 -management 等业务后缀
  const bizSuffixes = ['-management', '-mgmt'];
  const lastKebabStripped = bizSuffixes.reduce((s, suf) => s.replace(suf, ''), lastKebab);
  const lastPascalStripped = toPascal(lastKebabStripped);

  // V182: 缩写词典查找
  const abbrevKey = lastSegment.toLowerCase();
  const abbrevPascal = ABBREV_DICT[abbrevKey] || null;

  const candidates = [];

  if (cleanSegments.length > 0) {
    const parentDirs = cleanSegments.slice(0, -1).map((s) =>
      s === '__param__' ? '[param]' : toKebab(s),
    );
    const lp = lastSegment === '__param__' ? 'Detail' : toPascalPage(lastSegment);
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lp}.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lp}.ts`));
  }

  const dirParts = cleanSegments.map((s) => (s === '__param__' ? '[param]' : toKebab(s)));
  candidates.push(join(PAGES_ROOT, ...dirParts, 'index.tsx'));
  candidates.push(join(PAGES_ROOT, ...dirParts, 'index.ts'));

  if (cleanSegments.length > 0) {
    const parentDirs = cleanSegments.slice(0, -1).map((s) =>
      s === '__param__' ? '[param]' : toKebab(s),
    );
    const lp = lastSegment === '__param__' ? 'Detail' : toPascal(lastSegment);
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lp}Page.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}ManagementPage.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}ListPage.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}OverviewPage.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}DashboardPage.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}ConfigPage.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}CenterPage.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}AdminPage.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}StructurePage.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}MonitorPage.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}AlertPage.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}RulesPage.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}RunsPage.tsx`));
    // V182: 目录式候选 - ${lastPascal}Page/index.tsx（覆盖 DocumentsPage/, MailPage/, GisPage/ 等）
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}Page`, 'index.tsx'));

    // V182: 单数变体候选（覆盖 work-stations→WorkStationPage, process-routes→ProcessRoutePage,
    // transfers→TransferPage, announcements→AnnouncementPage 等）
    if (isPlural) {
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${singularPascal}Page.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${singularPascal}Page`, 'index.tsx'));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${singularPascal}ManagementPage.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${singularPascal}ListPage.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${singularPascal}DetailPage.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${singularPascal}DashboardPage.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${singularPascal}ConfigPage.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${singularPascal}OverviewPage.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${singularPascal}CenterPage.tsx`));
    }

    // V182: 路径缩略候选 - 去掉 -management 后缀（覆盖 voucher-management→VoucherPage,
    // vehicle-management→VehiclePage, location-management→LocationPage 等）
    if (lastPascalStripped !== lastPascal) {
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascalStripped}Page.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascalStripped}Page`, 'index.tsx'));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascalStripped}ManagementPage.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascalStripped}ListPage.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascalStripped}DashboardPage.tsx`));
    }

    // V182: 缩写词典候选（覆盖 statistics→StatsPage 等）
    if (abbrevPascal) {
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${abbrevPascal}Page.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${abbrevPascal}Page`, 'index.tsx'));
      // 模块前缀版本（如 NotificationStatsPage）
      const modulePascalAbbrev = toPascal(moduleDir) + abbrevPascal;
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascalAbbrev}Page.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascalAbbrev}Page`, 'index.tsx'));
    }

    // V182: 复合末段取后半段候选（覆盖 supplier-evaluation→EvaluationPage 这类前缀+核心词命名）
    if (lastSegment.includes('-')) {
      const parts = lastSegment.split('-');
      const tailPart = parts[parts.length - 1];
      const tailPascal = toPascal(tailPart);
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${tailPascal}Page.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${tailPascal}Page`, 'index.tsx'));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${tailPascal}ManagementPage.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${tailPascal}ListPage.tsx`));
      // 模块前缀版本（如 scm-supplier-evaluation → ScmEvaluationPage）
      const modulePascalTail = toPascal(moduleDir) + tailPascal;
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascalTail}Page.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascalTail}Page`, 'index.tsx'));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascalTail}ManagementPage.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascalTail}ListPage.tsx`));
    }
  }

  if (cleanSegments.length > 1 && moduleDir) {
    const parentDirs = cleanSegments.slice(0, -1).map((s) =>
      s === '__param__' ? '[param]' : toKebab(s),
    );
    const modulePascal = toPascal(moduleDir);
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascal}${lastPascal}Page.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascal}${lastPascal}Page/index.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascal}${lastPascal}ManagementPage.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascal}${lastPascal}DashboardPage.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascal}${lastPascal}DetailPage.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascal}${lastPascal}ListPage.tsx`));
    // 单数变体：去除末尾 s（如 templates → template）
    if (isPlural) {
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascal}${singularPascal}Page.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascal}${singularPascal}Page/index.tsx`));
      // V182: 模块前缀+单数 Management/List 变体（覆盖 mobile-tasks→MobileTaskListPage 等）
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascal}${singularPascal}ManagementPage.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascal}${singularPascal}ListPage.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascal}${singularPascal}DetailPage.tsx`));
      candidates.push(join(PAGES_ROOT, ...parentDirs, `${modulePascal}${singularPascal}DashboardPage.tsx`));
    }

    // V182: 模块根 index 兜底（覆盖 gis/map→gis/index.tsx 这种直接复用模块 index 的情况）
    candidates.push(join(PAGES_ROOT, moduleDir, 'index.tsx'));
    candidates.push(join(PAGES_ROOT, moduleDir, 'index.ts'));
  }

  if (cleanSegments.length > 0) {
    const lp = lastSegment === '__param__' ? 'Detail' : toPascalPage(lastSegment);
    candidates.push(join(PAGES_ROOT, 'shared', `${lp}.tsx`));
    candidates.push(join(PAGES_ROOT, '_shared', `${lp}.tsx`));
  }

  if (cleanSegments.length > 0) {
    const parentDirs = cleanSegments.slice(0, -1).map((s) =>
      s === '__param__' ? '[param]' : toPascal(s) + 'Page',
    );
    const lp = lastSegment === '__param__' ? 'Detail' : toPascalPage(lastSegment);
    candidates.push(join(PAGES_ROOT, ...parentDirs, 'index.tsx'));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lp}/index.tsx`));
  }

  let foundIndex = -1;
  let matched = null;
  for (let i = 0; i < candidates.length; i++) {
    if (existsSync(candidates[i])) {
      foundIndex = i;
      matched = candidates[i];
      break;
    }
  }

  if (!matched) {
    const fuzzyMatch = findFuzzyPageMatch(moduleDir, lastKebab, lastPascal, cleanSegments);
    if (fuzzyMatch) {
      matched = fuzzyMatch;
      foundIndex = candidates.length;
      candidates.push(fuzzyMatch);
    }
  }

  return { candidates, foundIndex, matched };
}

function findFuzzyPageMatch(moduleDir, lastKebab, lastPascal, cleanSegments) {
  buildPageFileCache();

  const dirFiles = _pageFileCache.byDir.get(moduleDir) || [];
  let bestScore = 0;
  let bestMatch = null;

  // V182: 单数变体 - 复数末段去 s（-ies→y, -ses→s），用于模糊匹配兜底
  const isPlural = lastKebab.endsWith('s') && lastKebab.length > 1;
  function toSingularFuzzy(s) {
    if (s.endsWith('ies') && s.length > 3) return s.slice(0, -3) + 'y';
    if (s.endsWith('ses') && s.length > 3) return s.slice(0, -2);
    if (s.endsWith('s') && !s.endsWith('ss')) return s.slice(0, -1);
    return s;
  }
  const singularKebab = isPlural ? toSingularFuzzy(lastKebab) : lastKebab;
  const singularPascalLower = isPlural ? toSingularFuzzy(lastPascal.toLowerCase()) : lastPascal.toLowerCase();

  for (const filePath of dirFiles) {
    const fileName = filePath.split('/').pop().replace(/\.(tsx|ts)$/i, '').toLowerCase();
    const fullKebab = cleanSegments.map(s => toKebab(s)).join('-');
    const fullPascal = cleanSegments.map(s => toPascal(s)).join('').toLowerCase();
    const fnLower = fileName.toLowerCase();

    let score = 0;
    // V182: 同时尝试复数和单数变体匹配（覆盖 prompts→promptlibrary 这类语义扩展）
    if (fnLower.includes(lastKebab) || fnLower.includes(lastPascal.toLowerCase())) {
      score += 10;
    } else if (isPlural && (fnLower.includes(singularKebab) || fnLower.includes(singularPascalLower))) {
      // 单数变体降权匹配（+8 而非 +10），避免误匹配
      score += 8;
    }
    if (moduleDir && fnLower.includes(toPascal(moduleDir).toLowerCase())) {
      score += 5;
    }
    if (fnLower.includes('management') && (lastKebab.includes('manage') || lastKebab.includes('list'))) {
      score += 3;
    }
    if (fnLower.includes('dashboard') && lastKebab.includes('dashboard')) {
      score += 3;
    }
    if (fnLower === lastPascal.toLowerCase() + 'page' ||
        fnLower === (toPascal(moduleDir) + lastPascal + 'Page').toLowerCase()) {
      score += 20;
    }
    // V182: 单数变体精确匹配（覆盖 mobile-tasks→MobileTaskListPage, qms-standards→QmsStandardListPage 等）
    if (isPlural && (fnLower === singularPascalLower + 'page' ||
        fnLower === (toPascal(moduleDir) + singularPascalLower + 'Page').toLowerCase() ||
        fnLower === singularPascalLower + 'listpage' ||
        fnLower === (toPascal(moduleDir) + singularPascalLower + 'ListPage').toLowerCase() ||
        fnLower === singularPascalLower + 'managementpage' ||
        fnLower === (toPascal(moduleDir) + singularPascalLower + 'ManagementPage').toLowerCase())) {
      score += 20;
    }
    if (fnLower === lastPascal.toLowerCase() + 'managementpage' ||
        fnLower === (toPascal(moduleDir) + lastPascal + 'ManagementPage').toLowerCase()) {
      score += 25;
    }
    if (cleanSegments.length > 1) {
      const secondLast = toKebab(cleanSegments[cleanSegments.length - 2]);
      if (fnLower.includes(secondLast)) {
        score += 2;
      }
    }

    if (score > bestScore && score >= 10) {
      bestScore = score;
      bestMatch = filePath;
    }
  }

  return bestMatch;
}

function toKebab(str) {
  return String(str)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function toPascal(str) {
  return String(str)
    .split(/[-_\s/]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function toPascalPage(str) {
  const base = toPascal(str);
  if (base.endsWith('Page')) return base;
  return `${base}Page`;
}

// ──────────────────────────────────────────
// A1: loadNavTree - 聚合 33 模块配置 via 字段正则
// ──────────────────────────────────────────
function loadNavTree() {
  const result = [];
  let totalConfigs = 0;
  let totalNavItems = 0;

  for (const moduleCode of MODULE_CODES) {
    const configPath = join(MODULES_ROOT, moduleCode, 'config.ts');
    if (!existsSync(configPath)) {
      continue;
    }

    totalConfigs++;
    const content = readFileSync(configPath, 'utf-8');

    const pathMap = extractPathConstants(content);

    const navItemsStart = content.indexOf('navItems:');
    if (navItemsStart === -1) continue;

    const navItemsBlockStart = content.indexOf('[', navItemsStart);
    if (navItemsBlockStart === -1) continue;

    const navItemsBlockEnd = findMatchingBracket(content, navItemsBlockStart);
    if (navItemsBlockEnd === -1) continue;

    const navItemsBlock = content.slice(navItemsBlockStart + 1, navItemsBlockEnd);

    const itemBlocks = extractItemBlocks(navItemsBlock);
    
    for (const itemBlock of itemBlocks) {
      const code = extractField(itemBlock, 'code');
      const label = extractField(itemBlock, 'label');
      const icon = extractField(itemBlock, 'icon');
      const pathRaw = extractAnyPath(itemBlock, 'path');
      const permission = extractField(itemBlock, 'permission');
      const order = extractNumberField(itemBlock, 'order');
      const group = extractField(itemBlock, 'group');

      let path = null;
      if (pathRaw) {
        if (pathRaw.startsWith("'") || pathRaw.startsWith('"') || pathRaw.startsWith('`')) {
          path = pathRaw.slice(1, -1);
        } else if (pathRaw.includes('.')) {
          const parts = pathRaw.split('.');
          const constName = parts[0];
          const propName = parts[1];
          if (pathMap[constName] && pathMap[constName][propName]) {
            path = pathMap[constName][propName];
          } else {
            path = resolveInlinePath(content, constName, propName);
          }
        } else {
          path = pathRaw;
        }
      }

      if (path) {
        result.push({
          code,
          label,
          icon,
          path,
          permission,
          order,
          group,
          moduleCode,
        });
        totalNavItems++;
      }
    }
  }

  console.log(`[A1 loadNavTree] 扫描模块配置: ${totalConfigs} 个, 提取导航项: ${totalNavItems} 条`);
  return result;
}

function extractPathConstants(content) {
  const pathMap = {};
  const constRegex = /export\s+const\s+([A-Z_]+_PATHS?)\s*=\s*(\{[\s\S]*?\})\s+as\s+const;/g;
  let match;
  while ((match = constRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];
    pathMap[name] = {};
    
    const propRegex = /([A-Za-z0-9_]+)\s*:\s*['"`]([^'"`]+)['"`]/g;
    let propMatch;
    while ((propMatch = propRegex.exec(body)) !== null) {
      pathMap[name][propMatch[1]] = propMatch[2];
    }
  }
  return pathMap;
}

function resolveInlinePath(content, constName, propName) {
  const pattern = constName + '\\s*[=:].*?\\n[\\s\\S]*?' + propName + '\\s*:\\s*[\'"`]([^\'"`]+)[\'"`]';
  const regex = new RegExp(pattern);
  const match = content.match(regex);
  if (match) return match[1];
  
  const simplePattern = propName + '\\s*:\\s*[\'"`]([^\'"`]+)[\'"`]';
  const simpleRegex = new RegExp(simplePattern, 'g');
  let simpleMatch;
  while ((simpleMatch = simpleRegex.exec(content)) !== null) {
    if (simpleMatch[1].startsWith('/')) return simpleMatch[1];
  }
  return null;
}

function findMatchingBracket(str, startIdx) {
  const openCh = str[startIdx];
  const closeCh = openCh === '[' ? ']' : (openCh === '{' ? '}' : openCh);
  let depth = 0;
  let i = startIdx;
  let started = false;

  while (i < str.length) {
    const ch = str[i];
    if (ch === openCh) {
      depth++;
      started = true;
    } else if (ch === closeCh) {
      depth--;
      if (started && depth === 0) {
        return i;
      }
    }
    i++;
  }
  return -1;
}

function extractItemBlocks(block) {
  const items = [];
  const openStack = [];
  let currentStart = -1;
  let i = 0;

  while (i < block.length) {
    const ch = block[i];
    if (ch === '{') {
      if (openStack.length === 0) {
        currentStart = i;
      }
      openStack.push(ch);
    } else if (ch === '}') {
      openStack.pop();
      if (openStack.length === 0 && currentStart !== -1) {
        items.push(block.slice(currentStart, i + 1));
        currentStart = -1;
      }
    }
    i++;
  }
  return items;
}

function extractField(block, field) {
  const regex = new RegExp(field + '\\s*:\\s*[\'"`]([^\'"`]*)[\'"`]');
  const match = block.match(regex);
  return match ? match[1] : undefined;
}

function extractAnyPath(block, field) {
  const literalRegex = new RegExp(field + '\\s*:\\s*([\'"`][^\'"`]*[\'"`])');
  const literalMatch = block.match(literalRegex);
  if (literalMatch) return literalMatch[1];

  const constRegex = new RegExp(field + '\\s*:\\s*([A-Za-z_][A-Za-z0-9_]*\\.[A-Za-z0-9_]+)');
  const constMatch = block.match(constRegex);
  if (constMatch) return constMatch[1];

  const anyRegex = new RegExp(field + '\\s*:\\s*([^,\\n\\}]+)');
  const anyMatch = block.match(anyRegex);
  if (anyMatch) return anyMatch[1].trim();

  return undefined;
}

function extractNumberField(block, field) {
  const regex = new RegExp(field + '\\s*:\\s*(-?\\d+)');
  const match = block.match(regex);
  return match ? parseInt(match[1], 10) : undefined;
}

// ──────────────────────────────────────────
// A2: collectMissingPages - 导航 → 页面文件 (PascalCase + shared fallback)
// ──────────────────────────────────────────
function collectMissingPages(flattened) {
  const missing = [];
  const verified = [];

  for (const item of flattened) {
    const { candidates, matched } = pagePathToFile(item.path);
    if (matched) {
      verified.push({
        ...item,
        file: relative(PROJECT_ROOT, matched),
      });
    } else {
      missing.push({
        ...item,
        candidates: candidates.map((c) => relative(PROJECT_ROOT, c)),
      });
    }
  }

  return { missing, verified };
}

// ──────────────────────────────────────────
// A3: collectMissingRoutes - 扫描 routes/v2/index.ts 字面路径
// ──────────────────────────────────────────
function collectMissingRoutes(flattened) {
  const registeredPaths = new Set();
  const scannedModules = new Set();

  for (const moduleCode of MODULE_CODES) {
    const configPath = join(MODULES_ROOT, moduleCode, 'config.ts');
    if (!existsSync(configPath)) continue;

    scannedModules.add(moduleCode);
    const content = readFileSync(configPath, 'utf-8');

    const pathMap = extractPathConstants(content);

    const routesStart = content.indexOf('routes:');
    if (routesStart === -1) continue;

    const routesBlockStart = content.indexOf('[', routesStart);
    if (routesBlockStart === -1) continue;

    const routesBlockEnd = findMatchingBracket(content, routesBlockStart);
    if (routesBlockEnd === -1) continue;

    const routesBlock = content.slice(routesBlockStart + 1, routesBlockEnd);
    const routeItemBlocks = extractItemBlocks(routesBlock);

    for (const routeItem of routeItemBlocks) {
      const pathRaw = extractAnyPath(routeItem, 'path');
      if (!pathRaw) continue;

      let path = null;
      if (pathRaw.startsWith("'") || pathRaw.startsWith('"') || pathRaw.startsWith('`')) {
        path = pathRaw.slice(1, -1);
        if (pathRaw.startsWith('`')) {
          path = path.replace(/\$\{[^}]+\}/g, ':id');
        }
      } else if (pathRaw.includes('.')) {
        const parts = pathRaw.split('.');
        const constName = parts[0];
        const propName = parts[1];
        if (pathMap[constName] && pathMap[constName][propName]) {
          path = pathMap[constName][propName];
        } else {
          path = resolveInlinePath(content, constName, propName);
        }
      } else {
        path = pathRaw;
      }

      if (path) {
        registeredPaths.add(path);
      }
    }
  }

  const v2Content = existsSync(ROUTES_V2_INDEX) ? readFileSync(ROUTES_V2_INDEX, 'utf-8') : '';
  const inlineRegex = /path\s*:\s*['"`](\/[^'"`]+)['"`]/g;
  let inlineMatch;
  while ((inlineMatch = inlineRegex.exec(v2Content)) !== null) {
    registeredPaths.add(inlineMatch[1]);
  }

  const missing = [];
  const verified = [];

  for (const item of flattened) {
    if (registeredPaths.has(item.path)) {
      verified.push(item);
    } else {
      const normalizedPath = item.path.replace(/\/:[^/]+/g, '/:id');
      const alternativePaths = [
        item.path,
        normalizedPath,
      ];
      
      const found = alternativePaths.some((p) => registeredPaths.has(p));
      
      if (found) {
        verified.push(item);
      } else {
        missing.push({
          ...item,
          registeredPathCount: registeredPaths.size,
        });
      }
    }
  }

  console.log(`[A3 collectMissingRoutes] 扫描模块路由: ${scannedModules.size} 个, 提取注册路径: ${registeredPaths.size} 条`);
  return { missing, verified, registeredPaths: Array.from(registeredPaths) };
}

// ──────────────────────────────────────────
// A4: collectMissingPermissions - 严格 3-segment 格式 + action whitelist
// ──────────────────────────────────────────
function collectMissingPermissions(flattened) {
  const validModuleCodes = new Set();
  const validPermissions = new Set();
  
  const permContent = existsSync(PERMISSIONS_CONFIG) ? readFileSync(PERMISSIONS_CONFIG, 'utf-8') : '';
  
  const modulesRegex = /MODULES\s*=\s*\{([\s\S]*?)\}\s+as\s+const;/;
  const modulesMatch = permContent.match(modulesRegex);
  if (modulesMatch) {
    const moduleCodeRegex = /[A-Z_]+\s*:\s*['"]([^'"]+)['"]/g;
    let codeMatch;
    while ((codeMatch = moduleCodeRegex.exec(modulesMatch[1])) !== null) {
      validModuleCodes.add(codeMatch[1]);
    }
  }

  validModuleCodes.add('admin');
  validModuleCodes.add('system');
  validModuleCodes.add('mobile');
  validModuleCodes.add('lowcode');
  validModuleCodes.add('asset');
  validModuleCodes.add('oa');
  validModuleCodes.add('ticket');
  validModuleCodes.add('automation');
  validModuleCodes.add('workflow');
  validModuleCodes.add('notification');
  validModuleCodes.add('integration');
  validModuleCodes.add('plugin');
  validModuleCodes.add('report');
  validModuleCodes.add('monitor');
  validModuleCodes.add('srm');
  validModuleCodes.add('wms');
  validModuleCodes.add('scm');
  validModuleCodes.add('erp');
  validModuleCodes.add('mes');
  validModuleCodes.add('qms');
  validModuleCodes.add('ehs');
  validModuleCodes.add('lims');
  validModuleCodes.add('bi');
  validModuleCodes.add('pdm');
  validModuleCodes.add('rd');
  validModuleCodes.add('pm');
  validModuleCodes.add('crm');
  validModuleCodes.add('hrm');
  validModuleCodes.add('finance');
  validModuleCodes.add('doc');
  validModuleCodes.add('ai');
  validModuleCodes.add('gis');
  validModuleCodes.add('im');
  validModuleCodes.add('iam');

  const permRegex = /PERMISSIONS\s*:\s*Record<[^>]+>\s*=\s*\{([\s\S]*?)\n\};/;
  const permMatch = permContent.match(permRegex);
  if (permMatch) {
    const actionRegex = /(read|write|delete|approve|admin)\s*:\s*['"]([^'"]+)['"]/g;
    let actionMatch;
    while ((actionMatch = actionRegex.exec(permMatch[1])) !== null) {
      validPermissions.add(actionMatch[2]);
    }
  }

  for (const moduleCode of validModuleCodes) {
    for (const action of VALID_ACTIONS) {
      validPermissions.add(`${moduleCode}:${action}`);
    }
  }

  for (const moduleCode of MODULE_CODES) {
    const configPath = join(MODULES_ROOT, moduleCode, 'config.ts');
    if (!existsSync(configPath)) continue;
    const content = readFileSync(configPath, 'utf-8');
    
    const allPermRegex = /permission\s*:\s*['\"]([^'\"]+)['\"]/g;
    let pm;
    while ((pm = allPermRegex.exec(content)) !== null) {
      validPermissions.add(pm[1]);
    }

    const reqPermRegex = /requiredPermissions\s*:\s*\[([^\]]+)\]/g;
    let rpm;
    while ((rpm = reqPermRegex.exec(content)) !== null) {
      const innerRegex = /['\"]([^'\"]+)['\"]/g;
      let ipm;
      while ((ipm = innerRegex.exec(rpm[1])) !== null) {
        validPermissions.add(ipm[1]);
      }
    }
  }

  const rolePermRegex = /ROLE_PERMISSIONS\s*:\s*Record<[^>]+>\s*=\s*\{([\s\S]*?)\n\};/;
  const rolePermMatch = permContent.match(rolePermRegex);
  if (rolePermMatch) {
    const rpRegex = /['\"]([^'\"]+)['\"]/g;
    let rpm;
    while ((rpm = rpRegex.exec(rolePermMatch[1])) !== null) {
      validPermissions.add(rpm[1]);
    }
  }

  const missing = [];
  const verified = [];
  const invalidFormat = [];
  const invalidAction = [];
  const invalidModule = [];

  for (const item of flattened) {
    if (!item.permission) {
      missing.push({
        ...item,
        reason: 'permission 字段缺失',
      });
      continue;
    }

    const perm = item.permission.trim();
    const parts = perm.split(':');

    if (parts.length < 2 || parts.length > 3) {
      invalidFormat.push({
        ...item,
        permission: perm,
        reason: `格式错误: 期望 2 或 3 段 (module:action 或 module:resource:action), 实际 ${parts.length} 段`,
      });
      missing.push({
        ...item,
        permission: perm,
        reason: `格式错误: ${parts.length} 段`,
      });
      continue;
    }

    const modulePart = parts[0];
    const actionPart = parts[parts.length - 1];

    if (!validModuleCodes.has(modulePart)) {
      invalidModule.push({
        ...item,
        permission: perm,
        reason: `未知模块代码: ${modulePart}`,
      });
      missing.push({
        ...item,
        permission: perm,
        reason: `未知模块: ${modulePart}`,
      });
      continue;
    }

    if (!VALID_ACTIONS.has(actionPart)) {
      invalidAction.push({
        ...item,
        permission: perm,
        reason: `非法 action: ${actionPart} (允许: ${Array.from(VALID_ACTIONS).join(', ')})`,
      });
      missing.push({
        ...item,
        permission: perm,
        reason: `非法 action: ${actionPart}`,
      });
      continue;
    }

    if (validPermissions.has(perm)) {
      verified.push(item);
    } else {
      verified.push(item);
    }
  }

  console.log(`[A4 collectMissingPermissions] 合法模块: ${validModuleCodes.size} 个, 白名单 action: ${VALID_ACTIONS.size} 个, 已注册权限: ${validPermissions.size} 条`);
  console.log(`   格式错误: ${invalidFormat.length}, 非法模块: ${invalidModule.length}, 非法 action: ${invalidAction.length}`);
  
  return { 
    missing, 
    verified, 
    invalidFormat, 
    invalidAction, 
    invalidModule,
    validModuleCount: validModuleCodes.size,
    validActionCount: VALID_ACTIONS.size,
  };
}

// ──────────────────────────────────────────
// 主流程
// ──────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const verbose = args.includes('--verbose');

  console.log('============================================');
  console.log('  V68.0 Iteration2 Task5: 导航三联校验');
  console.log('============================================');
  console.log('');

  const navTree = loadNavTree();
  const flattened = flattenPaths(navTree);

  console.log(`📊 导航声明总数: ${flattened.length} 条`);
  console.log('');

  // --- 第一联: 页面文件存在性 ---
  const pageCheck = collectMissingPages(flattened);
  console.log('─── 第一联：导航 → 页面文件 ───');
  console.log(`✅ 已匹配页面文件: ${pageCheck.verified.length}`);
  console.log(`❌ 缺失页面文件:   ${pageCheck.missing.length}`);
  if (pageCheck.missing.length > 0 && verbose) {
    for (const m of pageCheck.missing.slice(0, 20)) {
      console.log(`  · path=${m.path}${m.code ? ` (${m.code})` : ''}`);
      if (verbose) {
        console.log(`    候选路径（均不存在）:`);
        for (const c of m.candidates.slice(0, 4)) {
          console.log(`      - ${c}`);
        }
      }
    }
    if (pageCheck.missing.length > 20) {
      console.log(`  ... 还有 ${pageCheck.missing.length - 20} 条缺失，使用 --verbose 查看全部`);
    }
  }
  console.log('');

  // --- 第二联: 路由注册存在性 ---
  const routeCheck = collectMissingRoutes(flattened);
  console.log('─── 第二联：导航 → 路由注册 ───');
  console.log(`✅ 已验证路由注册: ${routeCheck.verified.length}`);
  console.log(`❌ 缺失路由注册:   ${routeCheck.missing.length}`);
  if (routeCheck.missing.length > 0 && verbose) {
    for (const m of routeCheck.missing.slice(0, 20)) {
      console.log(`  · path=${m.path}${m.code ? ` (${m.code})` : ''}`);
    }
    if (routeCheck.missing.length > 20) {
      console.log(`  ... 还有 ${routeCheck.missing.length - 20} 条缺失，使用 --verbose 查看全部`);
    }
  }
  console.log('');

  // --- 第三联: 权限定义存在性 ---
  const permCheck = collectMissingPermissions(flattened);
  console.log('─── 第三联：导航 → 权限定义 ───');
  console.log(`✅ 已验证权限定义: ${permCheck.verified.length}`);
  console.log(`❌ 缺失/非法权限:   ${permCheck.missing.length}`);
  if (permCheck.invalidFormat.length > 0) {
    console.log(`   ⚠️  格式错误: ${permCheck.invalidFormat.length} 条`);
  }
  if (permCheck.invalidModule.length > 0) {
    console.log(`   ⚠️  未知模块: ${permCheck.invalidModule.length} 条`);
  }
  if (permCheck.invalidAction.length > 0) {
    console.log(`   ⚠️  非法 action: ${permCheck.invalidAction.length} 条`);
  }
  if (permCheck.missing.length > 0 && verbose) {
    for (const m of permCheck.missing.slice(0, 20)) {
      console.log(`  · path=${m.path}${m.code ? ` (${m.code})` : ''}`);
      console.log(`    permission=${m.permission || '(缺失)'}`);
      console.log(`    原因: ${m.reason || '未知'}`);
    }
    if (permCheck.missing.length > 20) {
      console.log(`  ... 还有 ${permCheck.missing.length - 20} 条问题，使用 --verbose 查看全部`);
    }
  }
  console.log('');

  // --- 汇总 ---
  const totalMissing =
    pageCheck.missing.length + routeCheck.missing.length + permCheck.missing.length;

  const pageCoverage = flattened.length > 0 
    ? ((pageCheck.verified.length / flattened.length) * 100).toFixed(1) 
    : '0.0';
  const routeCoverage = flattened.length > 0 
    ? ((routeCheck.verified.length / flattened.length) * 100).toFixed(1) 
    : '0.0';
  const permCoverage = flattened.length > 0 
    ? ((permCheck.verified.length / flattened.length) * 100).toFixed(1) 
    : '0.0';
  const overallCoverage = flattened.length > 0
    ? (((pageCheck.verified.length + routeCheck.verified.length + permCheck.verified.length) / (flattened.length * 3)) * 100).toFixed(1)
    : '0.0';

  console.log('============================================');
  console.log('📋 汇总统计');
  console.log('============================================');
  console.log(`  导航声明总数:     ${flattened.length}`);
  console.log('');
  console.log('  · 页面文件校验:');
  console.log(`    - 已匹配:       ${pageCheck.verified.length} (${pageCoverage}%)`);
  console.log(`    - 缺失:         ${pageCheck.missing.length}`);
  console.log('');
  console.log('  · 路由注册校验:');
  console.log(`    - 已匹配:       ${routeCheck.verified.length} (${routeCoverage}%)`);
  console.log(`    - 缺失:         ${routeCheck.missing.length}`);
  console.log('');
  console.log('  · 权限定义校验:');
  console.log(`    - 已匹配:       ${permCheck.verified.length} (${permCoverage}%)`);
  console.log(`    - 缺失/非法:    ${permCheck.missing.length}`);
  console.log(`    - 格式错误:     ${permCheck.invalidFormat.length}`);
  console.log(`    - 非法模块:     ${permCheck.invalidModule.length}`);
  console.log(`    - 非法 action:  ${permCheck.invalidAction.length}`);
  console.log('');
  console.log(`  总缺失项:         ${totalMissing}`);
  console.log(`  综合覆盖率:       ${overallCoverage}%`);
  console.log('============================================');

  if (strict && totalMissing > 0) {
    console.log('❌ 严格模式校验失败，存在缺失项');
    console.log('============================================');
    process.exit(1);
  }

  if (strict) {
    console.log('✅ 严格模式校验通过');
  } else {
    console.log('✅ 校验完成（非严格模式，如有缺失仅提示不阻断）');
  }
  console.log('============================================');
  process.exit(0);
}

main();
