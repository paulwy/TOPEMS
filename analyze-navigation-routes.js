const fs = require('fs');
const path = require('path');

// 读取文件
const navRegistryPath = '/Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts';
const routesPath = '/Users/air/TOPEMS/routes_result.json';
const pagesBaseDir = '/Users/air/TOPEMS/apps/web/src/routes';

const navContent = fs.readFileSync(navRegistryPath, 'utf-8');
const routesData = JSON.parse(fs.readFileSync(routesPath, 'utf-8'));

// 从 NavigationRegistry.ts 中提取导航配置
function extractNavPaths(content) {
  const modules = {};
  
  // 匹配每个 register 调用
  const registerRegex = /navigationRegistry\.register\('(\w+)',\s*\{([\s\S]*?)\}\);/g;
  let match;
  
  while ((match = registerRegex.exec(content)) !== null) {
    const moduleCode = match[1];
    const configStr = match[2];
    
    modules[moduleCode] = {
      top_nav: [],
      sidebar_nav: [],
      module_tabs: [],
      module_card: null,
    };
    
    // 提取 top_nav
    const topNavMatch = configStr.match(/top_nav:\s*\[([\s\S]*?)\],/);
    if (topNavMatch) {
      modules[moduleCode].top_nav = extractPathsFromNavItems(topNavMatch[1]);
    }
    
    // 提取 sidebar_nav
    const sidebarMatch = configStr.match(/sidebar_nav:\s*\[([\s\S]*?)\],/);
    if (sidebarMatch) {
      modules[moduleCode].sidebar_nav = extractPathsFromNavItems(sidebarMatch[1]);
    }
    
    // 提取 module_tabs
    const tabsMatch = configStr.match(/module_tabs:\s*\[([\s\S]*?)\],/);
    if (tabsMatch) {
      modules[moduleCode].module_tabs = extractPathsFromNavItems(tabsMatch[1]);
    }
    
    // 提取 module_card
    const cardMatch = configStr.match(/module_card:\s*\{([\s\S]*?)\}/);
    if (cardMatch) {
      const pathMatch = cardMatch[1].match(/path:\s*'([^']+)'/);
      if (pathMatch) {
        modules[moduleCode].module_card = pathMatch[1];
      }
    }
  }
  
  return modules;
}

function extractPathsFromNavItems(str) {
  const paths = [];
  const pathRegex = /path:\s*'([^']+)'/g;
  let match;
  while ((match = pathRegex.exec(str)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

// 获取所有导航路径（去重）
function getAllNavPaths(navModules) {
  const allPaths = new Set();
  for (const moduleCode in navModules) {
    const mod = navModules[moduleCode];
    mod.top_nav.forEach(p => allPaths.add(p));
    mod.sidebar_nav.forEach(p => allPaths.add(p));
    mod.module_tabs.forEach(p => allPaths.add(p));
    if (mod.module_card) allPaths.add(mod.module_card);
  }
  return Array.from(allPaths);
}

// 获取所有路由路径
function getAllRoutePaths(routesData) {
  const allPaths = [];
  const byModule = {};
  
  for (const moduleCode in routesData) {
    byModule[moduleCode] = [];
    routesData[moduleCode].forEach(route => {
      allPaths.push(route.path);
      byModule[moduleCode].push(route.path);
    });
  }
  
  return { allPaths, byModule };
}

// 检查页面组件文件是否存在
function checkComponentFiles(routesData) {
  const missing = [];
  const existing = [];
  
  for (const moduleCode in routesData) {
    routesData[moduleCode].forEach(route => {
      const componentPath = route.componentPath;
      // 转换为绝对路径：相对于 /Users/air/TOPEMS/apps/web/src/routes/
      const absolutePath = path.resolve(pagesBaseDir, componentPath) + '.tsx';
      
      if (fs.existsSync(absolutePath)) {
        existing.push({
          module: moduleCode,
          path: route.path,
          componentPath: componentPath,
          absolutePath: absolutePath
        });
      } else {
        missing.push({
          module: moduleCode,
          path: route.path,
          componentPath: componentPath,
          absolutePath: absolutePath
        });
      }
    });
  }
  
  return { missing, existing };
}

// 路径匹配函数（处理动态路由参数）
function pathMatches(navPath, routePath) {
  // 完全匹配
  if (navPath === routePath) return true;
  
  // 处理动态路由：将 :param 替换为 [^/]+ 进行正则匹配
  const routePattern = routePath.replace(/\/:\w+/g, '/[^/]+');
  const regex = new RegExp(`^${routePattern}$`);
  return regex.test(navPath);
}

// 查找导航中有但路由中没有的路径
function findNavOnlyPaths(navPaths, routePaths) {
  const navOnly = [];
  
  for (const navPath of navPaths) {
    const found = routePaths.some(routePath => pathMatches(navPath, routePath));
    if (!found) {
      navOnly.push(navPath);
    }
  }
  
  return navOnly;
}

// 查找路由中有但导航中没有的路径（只比较静态路径）
function findRouteOnlyPaths(navPaths, routePaths) {
  const routeOnly = [];
  
  for (const routePath of routePaths) {
    // 跳过包含动态参数的路由
    if (routePath.includes(':')) continue;
    
    const found = navPaths.some(navPath => pathMatches(navPath, routePath));
    if (!found) {
      routeOnly.push(routePath);
    }
  }
  
  return routeOnly;
}

// 执行分析
console.log('=== 导航与路由配置分析报告 ===\n');

// 1. 提取导航路径
const navModules = extractNavPaths(navContent);
console.log('【1. 导航路径列表（按模块）】\n');

for (const moduleCode of Object.keys(navModules).sort()) {
  const mod = navModules[moduleCode];
  console.log(`模块: ${moduleCode}`);
  console.log(`  top_nav (${mod.top_nav.length}):`);
  mod.top_nav.forEach(p => console.log(`    - ${p}`));
  console.log(`  sidebar_nav (${mod.sidebar_nav.length}):`);
  mod.sidebar_nav.forEach(p => console.log(`    - ${p}`));
  console.log(`  module_tabs (${mod.module_tabs.length}):`);
  mod.module_tabs.forEach(p => console.log(`    - ${p}`));
  console.log(`  module_card:`);
  console.log(`    - ${mod.module_card || '无'}`);
  console.log();
}

// 2. 路由路径
const { allPaths: allRoutePaths, byModule: routeByModule } = getAllRoutePaths(routesData);
console.log('\n【2. 路由路径列表（按模块）】\n');

for (const moduleCode of Object.keys(routeByModule).sort()) {
  const paths = routeByModule[moduleCode];
  console.log(`模块: ${moduleCode} (${paths.length} 个路由)`);
  paths.forEach(p => console.log(`  - ${p}`));
  console.log();
}

// 3. 对比差异
const allNavPaths = getAllNavPaths(navModules);
const navOnlyPaths = findNavOnlyPaths(allNavPaths, allRoutePaths);
const routeOnlyPaths = findRouteOnlyPaths(allNavPaths, allRoutePaths);

console.log('\n【3. 不一致的路径】\n');
console.log(`3.1 导航中有但路由中没有的路径 (${navOnlyPaths.length} 个):`);
navOnlyPaths.sort().forEach(p => console.log(`  - ${p}`));

console.log(`\n3.2 路由中有但导航中没有的路径 (${routeOnlyPaths.length} 个):`);
routeOnlyPaths.sort().forEach(p => console.log(`  - ${p}`));

// 4. 检查页面组件文件
console.log('\n【4. 页面组件文件检查】\n');
const { missing, existing } = checkComponentFiles(routesData);

console.log(`存在的页面组件: ${existing.length} 个`);
console.log(`不存在的页面组件: ${missing.length} 个\n`);

if (missing.length > 0) {
  console.log('不存在的页面组件列表:');
  missing.forEach(m => {
    console.log(`  [${m.module}] ${m.path}`);
    console.log(`    componentPath: ${m.componentPath}`);
    console.log(`    absolutePath: ${m.absolutePath}`);
  });
}

// 汇总统计
console.log('\n【5. 汇总统计】');
console.log(`  导航模块数量: ${Object.keys(navModules).length}`);
console.log(`  导航路径总数（去重）: ${allNavPaths.length}`);
console.log(`  路由模块数量: ${Object.keys(routeByModule).length}`);
console.log(`  路由路径总数: ${allRoutePaths.length}`);
console.log(`  导航缺失路由: ${navOnlyPaths.length}`);
console.log(`  路由缺失导航: ${routeOnlyPaths.length}`);
console.log(`  页面组件存在: ${existing.length}`);
console.log(`  页面组件缺失: ${missing.length}`);
