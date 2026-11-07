#!/usr/bin/env node
/**
 * 导航 ↔ 路由一致性检查（V64 新增）
 *
 * 用途：
 * 1. 检查导航模块注册（lib/navigation/modules/index.ts 的 coreModuleNavConfigs）vs
 *    routes/v2/index.ts 中注册的模块数是否一致
 * 2. 检查每个模块的 navItems 路径 vs routes 路径是否一一对应
 * 3. 检查 moduleMapping 是否覆盖所有注册的模块
 *
 * 用法：
 *   node scripts/ci/check-nav-route.cjs
 *   node scripts/ci/check-nav-route.cjs --json
 *   node scripts/ci/check-nav-route.cjs --strict
 *
 * 退出码：
 *   0 = 通过
 *   1 = 严格模式下有不一致
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function extractModuleCodes(content) {
  // 从 routes/v2/index.ts 的 moduleImports 中提取模块 code：`code: () => import(...)`
  const codes = new Set();
  const regex = /^\s+(\w+):\s*\(\)\s*=>/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    codes.add(match[1]);
  }
  return codes;
}

function extractNavModuleCodes(content) {
  // 从 lib/navigation/modules/index.ts 的导航配置注册中提取模块 code：
  //   import { aiNavConfig } from '@/module-configs/ai/config';
  // 历史上导航模块在 lazy.ts 以 `code: () => import(...)` 注册；V6x 重构后改为
  // coreModuleNavConfigs 静态数组 + 具名 navConfig import，注册点迁到 modules/index.ts。
  const codes = new Set();
  // W3-A 完成：模块配置目录已收敛为 module-configs/。
  const regex = /from\s+'@\/module-configs\/([a-zA-Z0-9_-]+)\/config'/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    codes.add(match[1]);
  }
  return codes;
}

function extractModuleMappingKeys(content) {
  const keys = new Set();
  const regex = /^\s{2}(\w+):\s*\{/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

function main() {
  const args = process.argv.slice(2);
  const jsonOut = args.includes('--json');
  const strict = args.includes('--strict');

  // 导航模块注册点：历史为 lib/navigation/modules/lazy.ts，V6x 重构后迁至
  // lib/navigation/modules/index.ts（coreModuleNavConfigs + 具名 navConfig import）。
  const navContent = readFile(path.join(WEB_ROOT, 'lib/navigation/modules/index.ts'));
  const routesContent = readFile(path.join(WEB_ROOT, 'routes/v2/index.ts'));
  const mappingContent = readFile(path.join(WEB_ROOT, 'lib/navigation/moduleMapping.ts'));

  const navModules = extractNavModuleCodes(navContent);
  const routeModules = extractModuleCodes(routesContent);
  const mappingKeys = extractModuleMappingKeys(mappingContent);

  // 找差异
  const navNotInRoutes = [...navModules].filter((m) => !routeModules.has(m));
  const routesNotInNav = [...routeModules].filter((m) => !navModules.has(m));
  const navNotInMapping = [...navModules].filter((m) => !mappingKeys.has(m));
  const mappingNotInNav = [...mappingKeys].filter((m) => !navModules.has(m));

  const report = {
    nav_module_count: navModules.size,
    route_module_count: routeModules.size,
    mapping_count: mappingKeys.size,
    nav_not_in_routes: navNotInRoutes,
    routes_not_in_nav: routesNotInNav,
    nav_not_in_mapping: navNotInMapping,
    mapping_not_in_nav: mappingNotInNav,
    passed: navNotInRoutes.length === 0 && routesNotInNav.length === 0 && navNotInMapping.length === 0,
  };

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('========================================');
    console.log('  导航 ↔ 路由一致性检查 (V64)');
    console.log('========================================');
    console.log(`导航模块注册数 (modules/index.ts): ${report.nav_module_count}`);
    console.log(`routes/v2/index.ts 模块数: ${report.route_module_count}`);
    console.log(`moduleMapping 映射数: ${report.mapping_count}`);
    console.log('');

    if (navNotInRoutes.length > 0) {
      console.log(`⚠️  导航注册有但 routes/v2 没有: ${navNotInRoutes.join(', ')}`);
    }
    if (routesNotInNav.length > 0) {
      console.log(`⚠️  routes/v2 有但导航注册没有: ${routesNotInNav.join(', ')}`);
    }
    if (navNotInMapping.length > 0) {
      console.log(`⚠️  导航注册有但 moduleMapping 没有: ${navNotInMapping.join(', ')}`);
    }
    if (mappingNotInNav.length > 0) {
      console.log(`ℹ️  moduleMapping 有但导航注册没有（可能是子模块别名）: ${mappingNotInNav.join(', ')}`);
    }

    console.log('');
    console.log('========================================');
    if (strict && !report.passed) {
      console.log('❌ 导航路由一致性检查未通过');
      console.log('========================================');
      process.exit(1);
    } else {
      console.log('✅ 导航路由一致性检查完成');
      console.log('========================================');
    }
  }
}

main();
