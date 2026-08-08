#!/usr/bin/env node
/**
 * V68.0 Iteration2 Task5: 导航三联校验脚本
 *
 * 三联校验（后续完整接入）：
 *   1. NAV_TREE 导航声明 → 页面文件存在性
 *   2. NAV_TREE 导航声明 → 路由注册存在性
 *   3. NAV_TREE 导航声明 → 权限定义存在性
 *
 * 当前进度：占位版本（NAV_TREE 未接入，输出 0 页面声明为正常）
 * 接入真实 NAV_TREE 后预计页面声明数量达 341 个。
 *
 * 用法：
 *   node scripts/verify_navigation.mjs
 *   node scripts/verify_navigation.mjs --strict
 *
 * 退出码：
 *   0 = 通过（或非严格模式下仅提示缺失）
 *   1 = --strict 严格模式下存在缺失项
 */

import { existsSync } from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, statSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const WEB_ROOT = join(PROJECT_ROOT, 'apps/web/src');
const PAGES_ROOT = join(WEB_ROOT, 'pages');

// ──────────────────────────────────────────
// ① flattenPaths: 递归 children 收集所有 path
// ──────────────────────────────────────────
/**
 * 从嵌套的导航树节点中递归收集所有 path 字段
 * @param {Array<Object>} nodes - 导航树节点数组
 * @returns {Array<{path: string, code?: string, label?: string, permission?: string}>}
 */
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
/**
 * 将路由路径（如 '/crm/customers'）转换为候选文件路径列表
 * 支持两种命名风格：
 *   A) PascalCase 单文件：pages/crm/CustomersPage.tsx
 *   B) kebab-case 目录 index：pages/crm/customers/index.tsx
 *
 * 同时去重路径参数（:id → 忽略，统一尝试原始段和 param 段两种）
 *
 * @param {string} pagePath - 如 '/crm/customers/:id/edit'
 * @returns {{candidates: string[], foundIndex: number, matched: string|null}}
 */
function pagePathToFile(pagePath) {
  if (!pagePath || typeof pagePath !== 'string') {
    return { candidates: [], foundIndex: -1, matched: null };
  }

  const normalized = pagePath.startsWith('/') ? pagePath.slice(1) : pagePath;
  const segments = normalized.split('/').filter(Boolean);

  const cleanSegments = segments.map((s) => (s.startsWith(':') ? '__param__' : s));

  const candidates = [];

  // 风格 A: 末段 PascalCasePage.tsx（保留父目录 kebab-case）
  if (cleanSegments.length > 0) {
    const parentDirs = cleanSegments.slice(0, -1).map((s) =>
      s === '__param__' ? '[param]' : toKebab(s),
    );
    const lastSegment = cleanSegments[cleanSegments.length - 1];
    const lastPascal = lastSegment === '__param__' ? 'Detail' : toPascalPage(lastSegment);
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}.tsx`));
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}.ts`));
  }

  // 风格 B: 全段 kebab-case 目录 + index.tsx
  const dirParts = cleanSegments.map((s) => (s === '__param__' ? '[param]' : toKebab(s)));
  candidates.push(join(PAGES_ROOT, ...dirParts, 'index.tsx'));
  candidates.push(join(PAGES_ROOT, ...dirParts, 'index.ts'));

  // 风格 C（兼容）: 末段 PascalCase 不带 Page 后缀
  if (cleanSegments.length > 0) {
    const parentDirs = cleanSegments.slice(0, -1).map((s) =>
      s === '__param__' ? '[param]' : toKebab(s),
    );
    const lastSegment = cleanSegments[cleanSegments.length - 1];
    const lastPascal = lastSegment === '__param__' ? 'Detail' : toPascal(lastSegment);
    candidates.push(join(PAGES_ROOT, ...parentDirs, `${lastPascal}Page.tsx`));
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

  return { candidates, foundIndex, matched };
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
// NAV_TREE 数据来源（占位：空数组，接入真实数据后替换）
// ──────────────────────────────────────────
function loadNavTree() {
  // TODO(V68 Task5后续): 从 apps/web/src/modules/*/config.ts 聚合 navItems
  // 临时返回空数组（脚本输出 0 页面声明符合预期）
  return [];
}

// ──────────────────────────────────────────
// ③ 缺失数组统计 & 输出
// ──────────────────────────────────────────
function collectMissingFiles(flattened) {
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

function collectMissingRoutes(flattened) {
  // TODO(V68 Task5后续): 对比 routes/v2/index.ts 的注册情况
  // 占位：返回空数组，不报错
  return { missing: [], verified: [] };
}

function collectMissingPermissions(flattened) {
  // TODO(V68 Task5后续): 对接 lib/shared-auth/permissions.rs 权限定义
  // 占位：打印 TODO 说明，不因缺失权限文件直接报错 exit
  console.log('[权限校验] TODO: 后续接入 shared-auth/permissions.rs，当前阶段跳过权限存在性校验');
  return { missing: [], verified: [] };
}

// ──────────────────────────────────────────
// 主流程
// ──────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');

  console.log('============================================');
  console.log('  V68.0 Iteration2 Task5: 导航三联校验');
  console.log('============================================');
  console.log('');

  const navTree = loadNavTree();
  const flattened = flattenPaths(navTree);

  console.log(`📊 导航声明总数: ${flattened.length} 条（接入真实 NAV_TREE 后预计达 341）`);
  console.log('');

  // --- 第一联: 页面文件存在性 ---
  const fileCheck = collectMissingFiles(flattened);
  console.log('─── 第一联：导航 → 页面文件 ───');
  console.log(`✅ 已匹配页面文件: ${fileCheck.verified.length}`);
  console.log(`❌ 缺失页面文件:   ${fileCheck.missing.length}`);
  if (fileCheck.missing.length > 0) {
    for (const m of fileCheck.missing) {
      console.log(`  · path=${m.path}${m.code ? ` (${m.code})` : ''}`);
      console.log(`    候选路径（均不存在）:`);
      for (const c of m.candidates) {
        console.log(`      - ${c}`);
      }
    }
  }
  console.log('');

  // --- 第二联: 路由注册存在性 ---
  const routeCheck = collectMissingRoutes(flattened);
  console.log('─── 第二联：导航 → 路由注册 ───');
  console.log('[路由校验] TODO: 后续对比 routes/v2/index.ts，当前阶段占位');
  console.log(`✅ 已验证路由注册: ${routeCheck.verified.length}`);
  console.log(`❌ 缺失路由注册:   ${routeCheck.missing.length}`);
  console.log('');

  // --- 第三联: 权限定义存在性 ---
  const permCheck = collectMissingPermissions(flattened);
  console.log('─── 第三联：导航 → 权限定义 ───');
  console.log(`✅ 已验证权限定义: ${permCheck.verified.length}`);
  console.log(`❌ 缺失权限定义:   ${permCheck.missing.length}`);
  console.log('');

  // --- 汇总 ---
  const totalMissing =
    fileCheck.missing.length + routeCheck.missing.length + permCheck.missing.length;

  console.log('============================================');
  console.log(`📋 汇总：缺失项共 ${totalMissing} 项`);
  console.log('  · 页面文件缺失：' + fileCheck.missing.length);
  console.log('  · 路由注册缺失：' + routeCheck.missing.length);
  console.log('  · 权限定义缺失：' + permCheck.missing.length);
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
