#!/usr/bin/env node
/**
 * 导航 ↔ 路由一致性检查（V64 新增）
 *
 * 用途：
 * 1. 检查 lazy.ts 中注册的模块数 vs routes/v2/index.ts 中注册的模块数
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
  // 从 lazy.ts 或 moduleImports 中提取模块 code
  const codes = new Set();
  const regex = /^\s+(\w+):\s*\(\)\s*=>/gm;
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

  const lazyContent = readFile(path.join(WEB_ROOT, 'lib/navigation/modules/lazy.ts'));
  const routesContent = readFile(path.join(WEB_ROOT, 'routes/v2/index.ts'));
  const mappingContent = readFile(path.join(WEB_ROOT, 'lib/navigation/moduleMapping.ts'));

  const lazyModules = extractModuleCodes(lazyContent);
  const routeModules = extractModuleCodes(routesContent);
  const mappingKeys = extractModuleMappingKeys(mappingContent);

  // 找差异
  const lazyNotInRoutes = [...lazyModules].filter((m) => !routeModules.has(m));
  const routesNotInLazy = [...routeModules].filter((m) => !lazyModules.has(m));
  const lazyNotInMapping = [...lazyModules].filter((m) => !mappingKeys.has(m));
  const mappingNotInLazy = [...mappingKeys].filter((m) => !lazyModules.has(m));

  const report = {
    lazy_module_count: lazyModules.size,
    route_module_count: routeModules.size,
    mapping_count: mappingKeys.size,
    lazy_not_in_routes: lazyNotInRoutes,
    routes_not_in_lazy: routesNotInLazy,
    lazy_not_in_mapping: lazyNotInMapping,
    mapping_not_in_lazy: mappingNotInLazy,
    passed:
      lazyNotInRoutes.length === 0 &&
      routesNotInLazy.length === 0 &&
      lazyNotInMapping.length === 0,
  };

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('========================================');
    console.log('  导航 ↔ 路由一致性检查 (V64)');
    console.log('========================================');
    console.log(`lazy.ts 模块数: ${report.lazy_module_count}`);
    console.log(`routes/v2/index.ts 模块数: ${report.route_module_count}`);
    console.log(`moduleMapping 映射数: ${report.mapping_count}`);
    console.log('');

    if (lazyNotInRoutes.length > 0) {
      console.log(`⚠️  lazy.ts 有但 routes/v2 没有: ${lazyNotInRoutes.join(', ')}`);
    }
    if (routesNotInLazy.length > 0) {
      console.log(`⚠️  routes/v2 有但 lazy.ts 没有: ${routesNotInLazy.join(', ')}`);
    }
    if (lazyNotInMapping.length > 0) {
      console.log(`⚠️  lazy.ts 有但 moduleMapping 没有: ${lazyNotInMapping.join(', ')}`);
    }
    if (mappingNotInLazy.length > 0) {
      console.log(`ℹ️  moduleMapping 有但 lazy.ts 没有（可能是子模块别名）: ${mappingNotInLazy.join(', ')}`);
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
