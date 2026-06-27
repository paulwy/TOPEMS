const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = '/Users/xingzhai/TOPEMS/apps/web';
const NAV_FILE = path.join(PROJECT_ROOT, 'src/lib/NavigationRegistry.ts');
const ROUTES_DIR = path.join(PROJECT_ROOT, 'src/routes');

const CORE_MODULES = ['iam', 'crm', 'erp', 'wms', 'mes', 'hrm', 'finance', 'qms', 'oa', 'pm', 'bi', 'scm', 'srm', 'ehs', 'workflow'];

function extractNavPaths(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const navItems = [];
  
  const pathRegex = /path:\s*['"]([^'"]+)['"]/g;
  const labelRegex = /label:\s*['"]([^'"]+)['"]/g;
  const codeRegex = /code:\s*['"]([^'"]+)['"]/g;
  
  const paths = [...content.matchAll(pathRegex)].map(m => m[1]);
  const labels = [...content.matchAll(labelRegex)].map(m => m[1]);
  const codes = [...content.matchAll(codeRegex)].map(m => m[1]);
  
  const sidebarNavMatches = content.match(/sidebar_nav:\s*\[([\s\S]*?)\]/g) || [];
  
  for (const match of sidebarNavMatches) {
    const itemPaths = [...match.matchAll(pathRegex)].map(m => m[1]);
    const itemLabels = [...match.matchAll(labelRegex)].map(m => m[1]);
    const itemCodes = [...match.matchAll(codeRegex)].map(m => m[1]);
    
    for (let i = 0; i < itemPaths.length; i++) {
      const itemPath = itemPaths[i];
      const itemLabel = itemLabels[i] || '';
      const itemCode = itemCodes[i] || '';
      
      const moduleCode = itemCode.split('-')[0];
      
      navItems.push({
        path: itemPath,
        label: itemLabel,
        code: itemCode,
        module: moduleCode,
        level: itemPath.split('/').filter(Boolean).length
      });
    }
    
    const childrenMatches = match.match(/children:\s*\[([\s\S]*?)\]/g) || [];
    for (const childMatch of childrenMatches) {
      const childPaths = [...childMatch.matchAll(pathRegex)].map(m => m[1]);
      const childLabels = [...childMatch.matchAll(labelRegex)].map(m => m[1]);
      const childCodes = [...childMatch.matchAll(codeRegex)].map(m => m[1]);
      
      for (let i = 0; i < childPaths.length; i++) {
        const itemPath = childPaths[i];
        const itemLabel = childLabels[i] || '';
        const itemCode = childCodes[i] || '';
        const moduleCode = itemCode.split('-')[0];
        
        navItems.push({
          path: itemPath,
          label: itemLabel,
          code: itemCode,
          module: moduleCode,
          level: itemPath.split('/').filter(Boolean).length,
          isChild: true
        });
      }
    }
  }
  
  const topNavMatches = content.match(/top_nav:\s*\[([\s\S]*?)\]/g) || [];
  for (const match of topNavMatches) {
    const itemPaths = [...match.matchAll(pathRegex)].map(m => m[1]);
    const itemLabels = [...match.matchAll(labelRegex)].map(m => m[1]);
    const itemCodes = [...match.matchAll(codeRegex)].map(m => m[1]);
    
    for (let i = 0; i < itemPaths.length; i++) {
      const itemPath = itemPaths[i];
      const itemLabel = itemLabels[i] || '';
      const itemCode = itemCodes[i] || '';
      
      if (!navItems.find(n => n.path === itemPath)) {
        navItems.push({
          path: itemPath,
          label: itemLabel,
          code: itemCode,
          module: itemCode,
          level: itemPath.split('/').filter(Boolean).length,
          isTopNav: true
        });
      }
    }
  }
  
  return navItems;
}

function extractRoutes(routesDir) {
  const routes = [];
  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'utils.ts');
  
  for (const file of files) {
    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const moduleName = file.replace('.ts', '');
    
    const routeBlocks = content.match(/\{\s*path:\s*['"]([^'"]+)['"]\s*,\s*element:\s*(\w+)[\s\S]*?module:\s*['"]([^'"]+)['"]/g) || [];
    
    for (const block of routeBlocks) {
      const pathMatch = block.match(/path:\s*['"]([^'"]+)['"]/);
      const elementMatch = block.match(/element:\s*(\w+)/);
      const moduleMatch = block.match(/module:\s*['"]([^'"]+)['"]/);
      
      if (pathMatch && elementMatch) {
        routes.push({
          path: pathMatch[1],
          element: elementMatch[1],
          module: moduleMatch ? moduleMatch[1] : moduleName,
          file: file
        });
      }
    }
  }
  
  return routes;
}

function normalizePath(p) {
  return p.replace(/\/$/, '');
}

function pathMatches(navPath, routePath) {
  const navNorm = normalizePath(navPath);
  const routeNorm = normalizePath(routePath);
  
  if (navNorm === routeNorm) return true;
  
  const navSegs = navNorm.split('/').filter(Boolean);
  const routeSegs = routeNorm.split('/').filter(Boolean);
  
  if (navSegs.length !== routeSegs.length) return false;
  
  for (let i = 0; i < navSegs.length; i++) {
    const navSeg = navSegs[i];
    const routeSeg = routeSegs[i];
    
    if (navSeg.startsWith(':') || routeSeg.startsWith(':')) continue;
    if (navSeg !== routeSeg) return false;
  }
  
  return true;
}

function runAudit() {
  console.log('=== TOPEMS 菜单与路由对应关系审查 ===\n');
  
  const navItems = extractNavPaths(NAV_FILE);
  const routes = extractRoutes(ROUTES_DIR);
  
  const uniqueNavPaths = [...new Set(navItems.map(n => n.path))];
  const uniqueRoutePaths = [...new Set(routes.map(r => r.path))];
  
  console.log(`导航路径总数: ${uniqueNavPaths.length}`);
  console.log(`路由路径总数: ${uniqueRoutePaths.length}`);
  console.log();
  
  const navWithRoute = [];
  const navWithoutRoute = [];
  
  for (const navPath of uniqueNavPaths) {
    const matched = routes.find(r => pathMatches(navPath, r.path));
    if (matched) {
      navWithRoute.push({ navPath, route: matched });
    } else {
      const navItem = navItems.find(n => n.path === navPath);
      navWithoutRoute.push({
        path: navPath,
        label: navItem?.label || '',
        module: navItem?.module || '',
        code: navItem?.code || ''
      });
    }
  }
  
  console.log('=== P0: 菜单有但路由无的路径 (点击菜单会404) ===');
  console.log(`数量: ${navWithoutRoute.length}`);
  for (const item of navWithoutRoute.sort((a, b) => a.path.localeCompare(b.path))) {
    console.log(`  ${item.path} - ${item.label} (${item.module})`);
  }
  console.log();
  
  const routeWithoutNav = [];
  for (const route of routes) {
    const matched = uniqueNavPaths.find(np => pathMatches(np, route.path));
    if (!matched && !route.path.includes(':') && !route.element.includes('Navigate')) {
      routeWithoutNav.push(route);
    }
  }
  
  console.log('=== P1: 路由有但菜单无的路径 (核心列表页应补充) ===');
  console.log(`总数: ${routeWithoutNav.length}`);
  console.log();
  
  const coreRoutesWithoutNav = routeWithoutNav.filter(r => {
    const isListPage = /(list|management|dashboard|overview|index|board|center)$/i.test(r.element) || 
                        /\/(list|management|dashboard|overview|index|board|center)$/i.test(r.path);
    const isCoreModule = CORE_MODULES.includes(r.module);
    return isCoreModule;
  });
  
  console.log('核心模块中的路由 (应考虑补充菜单):');
  const byModule = {};
  for (const r of coreRoutesWithoutNav.sort((a, b) => a.path.localeCompare(b.path))) {
    if (!byModule[r.module]) byModule[r.module] = [];
    byModule[r.module].push(r);
  }
  
  for (const mod of CORE_MODULES) {
    if (byModule[mod]) {
      console.log(`\n  [${mod}]`);
      for (const r of byModule[mod]) {
        console.log(`    ${r.path} -> ${r.element}`);
      }
    }
  }
  console.log();
  
  console.log('=== P1: 同一路径对应多个页面组件 ===');
  const pathToElements = {};
  for (const route of routes) {
    if (!pathToElements[route.path]) {
      pathToElements[route.path] = [];
    }
    pathToElements[route.path].push(route.element);
  }
  
  const duplicatePaths = Object.entries(pathToElements)
    .filter(([path, elements]) => new Set(elements).size > 1);
  
  console.log(`数量: ${duplicatePaths.length}`);
  for (const [path, elements] of duplicatePaths) {
    console.log(`  ${path}: [${elements.join(', ')}]`);
  }
  console.log();
  
  console.log('=== P1: 同一页面组件对应多个路由 ===');
  const elementToPaths = {};
  for (const route of routes) {
    if (!elementToPaths[route.element]) {
      elementToPaths[route.element] = [];
    }
    elementToPaths[route.element].push(route.path);
  }
  
  const duplicateElements = Object.entries(elementToPaths)
    .filter(([element, paths]) => paths.length > 1 && !element.includes('Navigate'));
  
  console.log(`数量: ${duplicateElements.length}`);
  for (const [element, paths] of duplicateElements.sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${element}:`);
    for (const p of paths) {
      console.log(`    - ${p}`);
    }
  }
  console.log();
  
  console.log('=== P2: 路径命名不一致问题 ===');
  const namingIssues = [];
  
  for (const nav of navItems) {
    const route = routes.find(r => pathMatches(nav.path, r.path));
    if (route) {
      const navSegs = nav.path.split('/').filter(Boolean);
      const routeSegs = route.path.split('/').filter(Boolean);
      
      for (let i = 0; i < navSegs.length; i++) {
        if (navSegs[i].startsWith(':') || routeSegs[i].startsWith(':')) continue;
        if (navSegs[i] !== routeSegs[i]) {
          namingIssues.push({
            navPath: nav.path,
            routePath: route.path,
            navSegment: navSegs[i],
            routeSegment: routeSegs[i],
            label: nav.label,
            module: nav.module
          });
          break;
        }
      }
    }
  }
  
  console.log(`数量: ${namingIssues.length}`);
  for (const issue of namingIssues.sort((a, b) => a.navPath.localeCompare(b.navPath))) {
    console.log(`  菜单: ${issue.navPath} (${issue.label})`);
    console.log(`  路由: ${issue.routePath}`);
    console.log(`  差异: "${issue.navSegment}" vs "${issue.routeSegment}"`);
    console.log();
  }
  console.log();
  
  console.log('=== 各模块菜单-路由匹配率统计 ===');
  console.log();
  
  const moduleStats = {};
  for (const mod of CORE_MODULES) {
    const moduleNavItems = navItems.filter(n => n.module === mod);
    const moduleNavPaths = [...new Set(moduleNavItems.map(n => n.path))];
    const moduleRoutes = routes.filter(r => r.module === mod);
    const moduleRoutePaths = [...new Set(moduleRoutes.map(r => r.path))];
    
    const matchedCount = moduleNavPaths.filter(np => 
      moduleRoutes.some(r => pathMatches(np, r.path))
    ).length;
    
    moduleStats[mod] = {
      navCount: moduleNavPaths.length,
      routeCount: moduleRoutePaths.length,
      matchedCount,
      matchRate: moduleNavPaths.length > 0 ? (matchedCount / moduleNavPaths.length * 100).toFixed(1) + '%' : 'N/A'
    };
  }
  
  console.log('| 模块 | 菜单数 | 路由数 | 匹配数 | 匹配率 |');
  console.log('|------|--------|--------|--------|--------|');
  
  let totalNav = 0;
  let totalMatched = 0;
  let totalRoutes = 0;
  
  for (const mod of CORE_MODULES) {
    const stats = moduleStats[mod];
    console.log(`| ${mod.padEnd(6)} | ${String(stats.navCount).padStart(6)} | ${String(stats.routeCount).padStart(6)} | ${String(stats.matchedCount).padStart(6)} | ${stats.matchRate.padStart(6)} |`);
    totalNav += stats.navCount;
    totalMatched += stats.matchedCount;
    totalRoutes += stats.routeCount;
  }
  
  console.log('|--------|--------|--------|--------|--------|');
  const overallMatchRate = totalNav > 0 ? (totalMatched / totalNav * 100).toFixed(1) + '%' : 'N/A';
  console.log(`| 合计   | ${String(totalNav).padStart(6)} | ${String(totalRoutes).padStart(6)} | ${String(totalMatched).padStart(6)} | ${overallMatchRate.padStart(6)} |`);
  
  console.log('\n=== 审查完成 ===');
  
  return {
    navWithoutRoute,
    routeWithoutNav,
    duplicatePaths,
    duplicateElements,
    namingIssues,
    moduleStats
  };
}

runAudit();
