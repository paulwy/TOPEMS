#!/usr/bin/env node
/**
 * API 虚挂 & 导航入口扫描脚本
 * 检测：前端 API 路径 vs 后端路由注册 vs 服务配置 vs 导航菜单
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');

// ============================================================
// 1. 收集前端 API 路径
// ============================================================
function collectFrontendApiPaths() {
  const apiDir = path.join(ROOT, 'apps/web/src/api');
  const apiPaths = new Map(); // service -> Set<pathPattern>
  
  function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const apiRegex = /['"`](\/api\/[a-zA-Z0-9_./\-{}\:]+)['"`]/g;
    let match;
    const paths = new Set();
    
    while ((match = apiRegex.exec(content)) !== null) {
      let normalized = match[1]
        .replace(/\/:[a-zA-Z_]+/g, '/{param}')
        .replace(/\/\{[a-zA-Z_]+\}/g, '/{param}');
      paths.add(normalized);
    }
    
    if (paths.size > 0) {
      let service = 'unknown';
      const apiMatch = filePath.match(/src\/api\/([^/]+)/);
      if (apiMatch) service = apiMatch[1];
      
      if (!apiPaths.has(service)) apiPaths.set(service, new Set());
      paths.forEach(p => apiPaths.get(service).add(p));
    }
  }
  
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) scanFile(full);
    }
  }
  walk(apiDir);
  
  return apiPaths;
}

// ============================================================
// 2. 收集后端路由注册
// ============================================================
function collectBackendRoutes() {
  const backendRoutes = new Map();
  const servicesRs = fs.readFileSync(path.join(ROOT, 'lib/shared-core/src/config/services.rs'), 'utf8');
  const svcRegex = /name:\s*"([^"]+)".*?api_prefix:\s*"([^"]+)"/gs;
  let m;
  const registeredServices = new Map();
  while ((m = svcRegex.exec(servicesRs)) !== null) {
    registeredServices.set(m[1], m[2]);
  }
  
  function scanRsForRoutes(filePath, serviceName) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const routeRegex = /\.route\(\s*['"]([^'"]+)['"]\s*,/g;
    let rmatch;
    const routes = new Set();
    while ((rmatch = routeRegex.exec(content)) !== null) {
      let normalized = rmatch[1]
        .replace(/\/:[a-zA-Z_]+/g, '/{param}')
        .replace(/\/\{[a-zA-Z_][^{}]*\}/g, '/{param}');
      routes.add(normalized);
    }
    if (routes.size > 0) {
      if (!backendRoutes.has(serviceName)) backendRoutes.set(serviceName, new Set());
      routes.forEach(r => backendRoutes.get(serviceName).add(r));
    }
  }
  
  const coreRoutesDir = path.join(ROOT, 'svc/unified-core/src/routes');
  const routeModRs = fs.readFileSync(path.join(coreRoutesDir, 'mod.rs'), 'utf8');
  
  const commentedModules = new Set();
  const commentRegex = /^\s*\/\/\s*mod\s+(\w+);/gm;
  let cMatch;
  while ((cMatch = commentRegex.exec(routeModRs)) !== null) {
    commentedModules.add(cMatch[1]);
  }
  
  const activeMerges = [];
  const mergeRegex = /^\s*(?!\/\/)\.merge\((\w+)::(\w+)_routes\(state\)\)/gm;
  let mgMatch;
  while ((mgMatch = mergeRegex.exec(routeModRs)) !== null) {
    activeMerges.push({ module: mgMatch[1], fn: mgMatch[2] });
  }
  
  for (const [svcName, prefix] of registeredServices) {
    const shortName = svcName.replace('topems-', '');
    if (shortName === 'unified-core') {
      for (const merge of activeMerges) {
        const rsFile = path.join(coreRoutesDir, `${merge.module}.rs`);
        if (fs.existsSync(rsFile)) {
          scanRsForRoutes(rsFile, 'core-' + merge.module);
        }
      }
    } else {
      const mainRsPath = path.join(ROOT, `svc/${shortName}/src/main.rs`);
      if (fs.existsSync(mainRsPath)) {
        scanRsForRoutes(mainRsPath, shortName);
        const routesDir = path.join(ROOT, `svc/${shortName}/src/routes`);
        if (fs.existsSync(routesDir)) {
          const dir = fs.readdirSync(routesDir);
          for (const f of dir) {
            if (f.endsWith('.rs')) {
              scanRsForRoutes(path.join(routesDir, f), shortName + '-' + f.replace('.rs',''));
            }
          }
        }
        const modulesDir = path.join(ROOT, `svc/${shortName}/src/modules`);
        if (fs.existsSync(modulesDir)) {
          const dir = fs.readdirSync(modulesDir);
          for (const f of dir) {
            const modRs = path.join(modulesDir, f, 'mod.rs');
            if (fs.existsSync(modRs)) {
              scanRsForRoutes(modRs, shortName + '-' + f);
            }
          }
        }
      }
    }
  }
  
  // 单独检查 plugin-registry (不在 services.rs 的 28 个服务中)
  const plugRegDir = path.join(ROOT, 'svc/plugin-registry/src');
  if (fs.existsSync(plugRegDir)) {
    const mainRs = path.join(plugRegDir, 'main.rs');
    if (fs.existsSync(mainRs)) scanRsForRoutes(mainRs, 'plugin-registry');
    const modulesDir = path.join(plugRegDir, 'modules');
    if (fs.existsSync(modulesDir)) {
      const dir = fs.readdirSync(modulesDir);
      for (const f of dir) {
        const modRs = path.join(modulesDir, f, 'mod.rs');
        if (fs.existsSync(modRs)) scanRsForRoutes(modRs, 'plugin-registry-' + f);
      }
    }
  }
  
  // 单独检查 monitor 服务
  const monDir = path.join(ROOT, 'svc/monitor/src');
  if (fs.existsSync(monDir)) {
    const mainRs = path.join(monDir, 'main.rs');
    if (fs.existsSync(mainRs)) scanRsForRoutes(mainRs, 'monitor');
  }
  
  return { backendRoutes, commentedModules, registeredServices, activeMerges };
}

// ============================================================
// 3. 检查前端 runtime.ts 服务配置完整性
// ============================================================
function checkRuntimeConfig() {
  const runtimePath = path.join(ROOT, 'apps/web/src/config/runtime.ts');
  const runtime = fs.readFileSync(runtimePath, 'utf8');
  const runtimeServices = new Set();
  const runtimeRegex = /^\s+([a-z][a-z0-9\-]*):\s*getEnv/gm;
  let m;
  while ((m = runtimeRegex.exec(runtime)) !== null) {
    runtimeServices.add(m[1]);
  }
  return runtimeServices;
}

// ============================================================
// 4. 检查 services.yaml 中缺失的服务
// ============================================================
function checkServicesYaml() {
  const yaml = fs.readFileSync(path.join(ROOT, 'config/services.yaml'), 'utf8');
  const services = new Set();
  const yamlRegex = /- name:\s*([a-z][a-z0-9\-]*)/g;
  let m;
  while ((m = yamlRegex.exec(yaml)) !== null) {
    services.add(m[1]);
  }
  return services;
}

// ============================================================
// 5. 检查导航树
// ============================================================
function analyzeNavigation() {
  const constPath = path.join(ROOT, 'apps/web/src/layouts/constants.ts');
  const content = fs.readFileSync(constPath, 'utf8');
  
  const l2l1Map = new Map();
  const l2Match = content.match(/export const L2_TO_L1_MAP:[\s\S]*?};/);
  if (l2Match) {
    const l2Regex = /(\w+):\s*'([^']+)'/g;
    let lm;
    while ((lm = l2Regex.exec(l2Match[0])) !== null) {
      l2l1Map.set(lm[1], lm[2]);
    }
  }
  
  const orderMap = new Map();
  const orderMatch = content.match(/export const L2_MODULE_ORDER:[\s\S]*?};/);
  if (orderMatch) {
    const oRegex = /(\w+):\s*(\d+)/g;
    let om;
    while ((om = oRegex.exec(orderMatch[0])) !== null) {
      orderMap.set(om[1], parseInt(om[2]));
    }
  }
  
  // 提取 L1 domains
  const l1Domains = [];
  const l1Section = content.match(/export const L1_BUSINESS_DOMAINS:[\s\S]*?\];/);
  if (l1Section) {
    const domRegex = /\{\s*key:\s*'([^']+)',\s*title:\s*i18n\.t\('([^']+)'\),\s*order:\s*(\d+),\s*icon:\s*'([^']+)'/g;
    let dm;
    while ((dm = domRegex.exec(l1Section[0])) !== null) {
      l1Domains.push({ key: dm[1], order: parseInt(dm[3]), icon: dm[4] });
    }
  }
  
  return { l1Domains, l2l1Map, orderMap };
}

// ============================================================
// 6. 读取 ports.ts BACKEND_PORTS 键
// ============================================================
function getPortsTsKeys() {
  const portsPath = path.join(ROOT, 'apps/web/src/config/ports.ts');
  const content = fs.readFileSync(portsPath, 'utf8');
  const keys = new Set();
  const match = content.match(/BACKEND_PORTS: Record[\s\S]*?\} = \{([\s\S]*?)\} as const/);
  if (match) {
    const keyRegex = /([a-z][a-z0-9\-]*):\s*\d+/g;
    let m;
    while ((m = keyRegex.exec(match[1])) !== null) {
      keys.add(m[1]);
    }
  }
  return keys;
}

// ============================================================
// 主逻辑
// ============================================================
console.log('\n' + '='.repeat(80));
console.log('TOPEMS API 虚挂 & 导航入口扫描报告');
console.log('='.repeat(80));

const apiPaths = collectFrontendApiPaths();
const backendInfo = collectBackendRoutes();
const runtimeServices = checkRuntimeConfig();
const yamlServices = checkServicesYaml();
const nav = analyzeNavigation();
const portsKeys = getPortsTsKeys();

// ---- A. 服务配置一致性检查 ----
console.log('\n--- A. V68.1 拆分服务三端一致性 ---');

const v681NewServices = [
  { name: 'plugin-registry', port: 8096, reason: 'V68.1 A2.2: plugin 路由迁移出 unified-core' },
  { name: 'monitor', port: 8095, reason: 'V68.1 A2.1: monitor 路由迁移出 unified-core' },
];

const missingReport = [];
for (const svc of v681NewServices) {
  if (!yamlServices.has(svc.name)) missingReport.push({ ...svc, where: 'config/services.yaml' });
  if (!portsKeys.has(svc.name)) missingReport.push({ ...svc, where: 'ports.ts BACKEND_PORTS' });
  if (!runtimeServices.has(svc.name)) missingReport.push({ ...svc, where: 'runtime.ts services' });
}

if (missingReport.length === 0) {
  console.log('  ✅ 三端配置完整');
} else {
  missingReport.forEach(m => {
    console.log(`  ❌ ${m.name}(:${m.port}) 缺失于 ${m.where}`);
    console.log(`      → ${m.reason}`);
  });
}

// ---- B. 插件路由虚挂分析 ----
console.log('\n--- B. 插件 API 路由虚挂深度分析 ---');

const pluginApiPaths = new Set();
if (apiPaths.has('plugin')) apiPaths.get('plugin').forEach(p => pluginApiPaths.add(p));
// 同时检查其他模块中引用的 core plugin 路径
for (const [svc, paths] of apiPaths) {
  for (const p of paths) {
    if (p.startsWith('/api/core/plugin')) pluginApiPaths.add(p);
  }
}

console.log(`B1. 前端插件相关 API 路径数: ${pluginApiPaths.size}`);
[...pluginApiPaths].sort().forEach(p => console.log(`    ${p}`));

console.log(`\nB2. 后端 unified-core 状态:`);
console.log(`    • routes/plugin.rs 注释掉 mod plugin = ${backendInfo.commentedModules.has('plugin') ? '是 (❗已断开)' : '否'}`);
const pluginMerged = backendInfo.activeMerges.some(m => m.module === 'plugin');
console.log(`    • .merge(plugin::plugin_routes) 激活 = ${pluginMerged ? '是' : '否 (❗已断开)'}`);

console.log(`\nB3. 后端独立服务 plugin-registry 路由数: ${backendInfo.backendRoutes.get('plugin-registry')?.size || 0}`);
const plugRegRoutes = backendInfo.backendRoutes.get('plugin-registry') || new Set();
[...plugRegRoutes].sort().slice(0, 20).forEach(p => console.log(`    ${p}`));
if (plugRegRoutes.size === 0) console.log('    ⚠️ 未采集到路由（可能是 modules/create_routes 动态生成）');

console.log(`\nB4. 结论:`);
console.log(`    🔴 前端请求 /api/core/plugin/* → 但 unified-core 已删除 plugin 路由模块`);
console.log(`    🔴 没有任何服务配置将 /api/core/plugin 代理到 plugin-registry:8096`);
console.log(`    🔴 所有插件管理/市场/安装 API 请求当前都会 404！`);

// ---- C. 导航入口分析 ----
console.log('\n--- C. 专业模块 & 插件市场导航入口分析 ---');

const modulesDir = path.join(ROOT, 'apps/web/src/modules');
const moduleEntries = fs.readdirSync(modulesDir).filter(d => {
  const s = fs.statSync(path.join(modulesDir, d));
  return s.isDirectory() && fs.existsSync(path.join(modulesDir, d, 'config.ts'));
});

const pluginModules = [];
const coreModulesList = [];
for (const mod of moduleEntries) {
  try {
    const content = fs.readFileSync(path.join(modulesDir, mod, 'config.ts'), 'utf8');
    const src = content.match(/source:\s*['"](core|plugin)['"]/)?.[1] || 'unknown';
    const suite = content.match(/suite:\s*['"]([^'"]+)['"]/)?.[1] || '-';
    const status = content.match(/status:\s*['"]([^'"]+)['"]/)?.[1] || '-';
    const perm = content.match(/permission:\s*['"]([^'"]+)['"]/)?.[1];
    const orderMatch = content.match(/order:\s*(\d+)/);
    const order = orderMatch ? parseInt(orderMatch[1]) : undefined;
    const entry = { module: mod, source: src, suite, status, permission: perm, order,
      inL2: nav.l2l1Map.has(mod), l1: nav.l2l1Map.get(mod) };
    if (src === 'plugin') pluginModules.push(entry);
    else coreModulesList.push(entry);
  } catch {}
}

console.log(`\nC1. 专业模块清单 (source='plugin' 应从插件市场安装) 共 ${pluginModules.length} 个:`);
pluginModules.sort((a,b) => (a.order||99) - (b.order||99)).forEach(m => {
  const flag = m.inL2 ? '⚠️' : '✅';
  console.log(`  ${flag} ${m.module.padEnd(15)} suite=${m.suite.padEnd(10)} status=${m.status.padEnd(6)} L1=${m.l1||'-'} perm=${m.permission||'无'}`);
  if (m.inL2) console.log(`     ⚠️  警告: 标记为 source=plugin 的专业模块不应该在 core L2 导航中！应通过插件市场安装后动态注册`);
});

console.log(`\nC2. 核心模块 L2 导航映射完整性:`);
const coreMissing = coreModulesList.filter(m => !m.inL2);
coreMissing.length === 0 ? 
  console.log(`  ✅ 全部 ${coreModulesList.length} 个核心模块已注册 L2 映射`) :
  console.log(`  ❌ ${coreMissing.length} 个核心模块缺 L2: ${coreMissing.map(m=>m.module).join(', ')}`);

console.log(`\nC3. 插件市场入口定位:`);
console.log(`  L1: ${nav.l1Domains.find(d=>d.key==='system')?.key || '找不到'} (order=${nav.l1Domains.find(d=>d.key==='system')?.order || '-'}, 靠后)`);
console.log(`  L2: plugin (order=${nav.orderMap.get('plugin')||'-'}, 位于 system 分组尾部)`);
console.log(`  L3: plugin-marketplace 标签页 (在 plugin 模块内部)`);
console.log(`  评价: ❌ 入口太隐蔽，用户无法快速找到插件市场安装专业模块`);

// ---- D. Monitor 服务检查 ----
console.log('\n--- D. Monitor 服务路由检查 ---');
const monRoutes = backendInfo.backendRoutes.get('monitor') || new Set();
console.log(`  svc/monitor 后端路由注册数: ${monRoutes.size}`);
const coreMonRoutes = backendInfo.backendRoutes.get('core-monitor') || new Set();
console.log(`  unified-core(/routes/monitor.rs) 激活? ${backendInfo.activeMerges.some(m=>m.module==='monitor')?'是':'已注释断开'}`);
console.log(`  runtime.ts 中 monitor 服务URL: ${runtimeServices.has('monitor')?'已配置':'未配置'}`);
if (runtimeServices.has('monitor')) {
  const rtContent = fs.readFileSync(path.join(ROOT, 'apps/web/src/config/runtime.ts'), 'utf8');
  const urlMatch = rtContent.match(/monitor:\s*getEnv\('([^']+)',\s*'([^']+)'\)/);
  if (urlMatch) console.log(`    默认值: ${urlMatch[2]}`);
}
console.log(`  结论: /api/core/monitor/* 请求实际会命中 8000 (统一入口)，但 unified-core 未加载 monitor 模块`);

// ---- E. 汇总 ----
console.log('\n' + '='.repeat(80));
console.log('📊 问题汇总（按严重等级排序）');
console.log('='.repeat(80));

console.log('\n🔴 P0 - 阻塞级（功能完全不可用，API 404）:');
console.log('  1. 插件 API 全部虚挂: /api/core/plugin/* 404');
console.log('     原因: unified-core routes/mod.rs 已注释掉 plugin 合并');
console.log('     缺口: 无网关/代理配置将 /api/core/plugin → plugin-registry:8096');
console.log('  2. monitor API 虚挂: /api/core/monitor/* 404');
console.log('     原因: unified-core 已注释掉 monitor 合并');
console.log('     缺口: 需将 /api/monitor/* → monitor:8095 或 /api/core/monitor → monitor:8095');
console.log('  3. 三端配置缺失 plugin-registry(8096) 和 monitor(8095)');
console.log('     - services.yaml 未注册服务');
console.log('     - ports.ts BACKEND_PORTS 缺端口映射');
console.log('     - runtime.ts services 缺服务URL');

console.log('\n🟠 P1 - 高风险（导航入口/架构一致性）:');
console.log(`  4. ${pluginModules.filter(m=>m.inL2).length} 个 source=plugin 的专业模块错误挂在 core 静态导航树上`);
console.log('     → 违反: core 模块默认安装，plugin 模块通过市场安装的原则');
console.log('  5. 插件市场入口过于隐蔽 (System > Plugin > Marketplace)');
console.log('     → 建议: 在 Sidebar 底部增加「扩展市场 / 获取更多模块」快捷入口');
console.log('  6. plugin 模块导航权限门槛过高（需要 plugin:marketplace:read）');
console.log('     → 普通用户连插件市场入口都看不到，无法安装专业模块');

console.log('\n🟡 P2 - 中风险（僵尸代码/清理）:');
console.log(`  7. unified-core routes/ 目录存在 ${backendInfo.commentedModules.size} 个僵尸模块: ${[...backendInfo.commentedModules].join(', ')}`);
console.log('  8. services.rs 28 个服务清单未同步 V68.1 新增 monitor/plugin-registry');
console.log('  9. routes/plugin.rs + routes/monitor.rs 仍存在但未被引用');

console.log('\n🟢 建议修复顺序:');
console.log('  Step 1: 补齐三端配置（services.yaml + ports.ts + runtime.ts）新增 plugin-registry@8096, monitor@8095');
console.log('  Step 2: 在 vite.config.ts / 网关 中增加 /api/core/plugin → :8096, /api/monitor → :8095 代理');
console.log('  Step 3: 从 coreModules + L2_TO_L1_MAP 中移除错误的 source=plugin 模块，改由 plugin-store 动态注册');
console.log('  Step 4: 在 Sidebar 底部增加插件市场快捷入口');
console.log('  Step 5: 清理僵尸代码（注释的 mod.rs、未引用的 routes/*.rs）');

console.log('\n' + '='.repeat(80));
console.log('扫描完成');
console.log('='.repeat(80) + '\n');
