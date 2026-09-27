#!/usr/bin/env node
/**
 * P0-3 配置单一真相源统一校验（check-config-sources）
 * ====================================================
 * 权威源：config/services.yaml（服务清单 + 端口 + 虚拟服务 + 特殊端口）
 * 校验 5 个下游方向的一致性：
 *   A. config/services.yaml ↔ config/ports.env         （env_var=port 值级 + 多余条目）
 *   B. config/services.yaml ↔ Cargo.toml workspace     （svc/ 目录双向一致）
 *   C. config/services.yaml ↔ apps/web/src/config/ports.ts（BACKEND_PORTS 值级 + 死条目）
 *   D. config/services.yaml ↔ apps/web/vite.config.ts  （SERVICES 名/端口/virtual + 死条目）
 *   E. 端口冲突（同一端口被多个服务占用）
 *
 * 纯 Node 零依赖（fs + 正则，缩进感知解析 YAML 子集），本机与 CI（ubuntu node 22）均可运行。
 *
 * 命名别名（ports.ts / vite.config.ts → services.yaml）：
 *   core      → unified-core（虚拟统一入口 8000，yaml 以 iam 名义出现）
 *   analytics → bi（service_dir: analytics）
 *   feedback  → ticket（已合并，兼容路由保留）
 *   web       → frontend（special_ports）
 *   gateway   → api_gateway（special_ports）
 *   postgres/redis/ollama → 同名 special_ports
 *
 * 用法:
 *   node scripts/ci/check-config-sources.cjs --check   # CI 门禁模式，不一致 exit 1
 *   node scripts/ci/check-config-sources.cjs           # 校验并报告（exit 0 仅报告差异）
 *   node scripts/ci/check-config-sources.cjs --quiet   # 仅输出问题行
 *
 * 退出码: 0 = 全部一致；1 = --check 下存在不一致
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const CHECK_ONLY = process.argv.includes('--check');
const QUIET = process.argv.includes('--quiet');

const SERVICES_YAML = path.join(ROOT, 'config', 'services.yaml');
const PORTS_ENV = path.join(ROOT, 'config', 'ports.env');
const CARGO_TOML = path.join(ROOT, 'Cargo.toml');
const PORTS_TS = path.join(ROOT, 'apps/web/src/config/ports.ts');
const VITE_CONFIG = path.join(ROOT, 'apps/web/vite.config.ts');

// 命名别名：下游名字 → services.yaml 名字（services.yaml 注释声明，非漂移）
const ALIAS = {
  core: 'unified-core',   // 虚拟统一入口 8000
  'unified-core': 'iam',  // yaml 中 iam 以独立条目出现（service_dir: unified-core）
  analytics: 'bi',        // bi 服务目录名
  feedback: 'ticket',     // 已合并至 ticket，兼容路由保留
  web: 'frontend',        // special_ports
  gateway: 'api_gateway', // special_ports
  postgres: 'postgres',
  redis: 'redis',
  ollama: 'ollama',
  'master-data': 'master-data',
  'plugin-registry': 'plugin-registry',
};

// 已知例外（非漂移，且无 services.yaml 对应条目）：
//  - server: 模块化单体统一入口（svc/server，docs/architecture/modular-monolith-design.md）
const KNOWN_EXCEPTIONS = new Set(['server']);

// ----------------------------------------------------------------------------
// 1. 解析 config/services.yaml（缩进感知，零依赖）
//    产出: { name -> { port, env_var, service_dir, virtual, group } }
// ----------------------------------------------------------------------------
function parseServicesYaml(content) {
  const services = {};
  let section = null; // 'service_groups' | 'virtual_services' | 'special_ports' | null
  let current = null;
  const lines = content.split('\n');
  for (const raw of lines) {
    const t = raw.trim();
    if (!t || t.startsWith('#')) continue;
    const indent = raw.length - raw.replace(/^\s*/, '').length;

    // 顶层段标题（0 缩进）——任何顶格 xxx: 都是段边界
    if (indent === 0) {
      const top = t.match(/^([a-z_]+):\s*$/);
      if (top) {
        if (current && current.name) services[current.name] = current; // flush 段尾 item
        section = ['service_groups', 'virtual_services', 'special_ports'].includes(top[1])
          ? top[1]
          : null; // 非校验段（module_groups 等）→ 退出解析
        current = null;
        continue;
      }
    }

    // item：`- name: xxx`（service_groups / virtual_services）
    const itemMatch = t.match(/^-\s*name:\s*([\w-]+)/);
    if (itemMatch && (section === 'service_groups' || section === 'virtual_services')) {
      if (current && current.name) services[current.name] = current;
      current = { name: itemMatch[1], virtual: section === 'virtual_services' };
      continue;
    }

    // special_ports：`key:`（4 空格缩进）
    if (section === 'special_ports') {
      const spMatch = t.match(/^([\w-]+):\s*$/);
      if (spMatch) {
        if (current && current.name) services[current.name] = current;
        current = { name: spMatch[1], group: 'special_ports', virtual: false };
        continue;
      }
    }

    if (current) {
      const pm = t.match(/^port:\s*(\d+)/);
      if (pm) current.port = parseInt(pm[1], 10);
      const em = t.match(/^env_var:\s*([\w-]+)/);
      if (em) current.env_var = em[1];
      const dm = t.match(/^service_dir:\s*([\w-]+)/);
      if (dm) current.service_dir = dm[1];
    }
  }
  if (current && current.name) services[current.name] = current;
  for (const s of Object.values(services)) if (!s.service_dir) s.service_dir = s.name;
  return services;
}

// ----------------------------------------------------------------------------
// 2. 解析 config/ports.env
// ----------------------------------------------------------------------------
function parsePortsEnv(content) {
  const ports = {};
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(/^([A-Z_]+)=\s*(\d+)/);
    if (m) ports[m[1]] = parseInt(m[2], 10);
  }
  return ports;
}

// ----------------------------------------------------------------------------
// 3. 解析 Cargo.toml workspace members 中的 svc/ 目录
// ----------------------------------------------------------------------------
function parseCargoSvcDirs(content) {
  const dirs = new Set();
  const re = /"svc\/([^"/]+)"/g;
  let m;
  while ((m = re.exec(content)) !== null) dirs.add(m[1]);
  return dirs;
}

// ----------------------------------------------------------------------------
// 4. 解析 apps/web/src/config/ports.ts 的 BACKEND_PORTS
//    注意 core/iam/doc/file/flow 用变量 _corePort（默认 8000），portal 用 _portalPort（默认 8063）
// ----------------------------------------------------------------------------
function parsePortsTs(content) {
  const ports = {};
  const vars = {}; // _corePort / _portalPort 等内部变量（非端口条目）
  const varRe = /const\s+_(\w+)Port\s*=\s*_envPort\('(\w+)',\s*(\d+)\)/g;
  let m;
  while ((m = varRe.exec(content)) !== null) vars['_' + m[1] + 'Port'] = parseInt(m[3], 10);
  const blockMatch = content.match(/export const BACKEND_PORTS[^=]*=\s*\{([\s\S]*?)\n\}/);
  if (!blockMatch) throw new Error('无法解析 BACKEND_PORTS');
  for (const line of blockMatch[1].split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('//') || t.startsWith('*')) continue;
    const m2 = t.match(/['"]?([a-zA-Z0-9_-]+)['"]?\s*:\s*(_?\w+Port|\d+)/);
    if (!m2) continue;
    const name = m2[1];
    const val = m2[2];
    ports[name] = /^\d+$/.test(val) ? parseInt(val, 10) : (vars[val] ?? null);
  }
  return ports;
}

// ----------------------------------------------------------------------------
// 5. 解析 apps/web/vite.config.ts 的 SERVICES 数组
//    产出: { name -> { port_expr, isVirtual, apiPrefix } }
// ----------------------------------------------------------------------------
function parseViteServices(content) {
  const services = {};
  const blockMatch = content.match(/const SERVICES:\s*ServiceConfig\[\]\s*=\s*\[([\s\S]*?)\n\];/);
  if (!blockMatch) throw new Error('无法解析 SERVICES 数组');
  const items = blockMatch[1].split(/\n\s*\{/).filter((s) => s.includes('name:'));
  for (const item of items) {
    const nameMatch = item.match(/name:\s*'([\w-]+)'/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const portMatch = item.match(/port:\s*([A-Za-z0-9_'[\].-]+)/);
    services[name] = {
      port_expr: portMatch ? portMatch[1] : null,
      isVirtual: /isVirtual:\s*true/.test(item),
      apiPrefix: (item.match(/apiPrefix:\s*'([^']+)'/) || [])[1] || null,
    };
  }
  return services;
}

// ----------------------------------------------------------------------------
// 工具：解析端口表达式为具体值
// ----------------------------------------------------------------------------
function resolvePortExpr(expr, portsTs, corePortDefault = 8000) {
  if (expr === null || expr === undefined) return null;
  if (/^\d+$/.test(expr)) return parseInt(expr, 10);
  if (expr === 'CORE_PORT') return corePortDefault;
  const m = expr.match(/^BACKEND_PORTS\.([\w-]+)$/);
  if (m) return portsTs[m[1]] ?? null;
  const m2 = expr.match(/^BACKEND_PORTS\['([\w-]+)'\]$/);
  if (m2) return portsTs[m2[1]] ?? null;
  return null;
}

function resolveName(name, servicesYaml) {
  if (name in servicesYaml) return name;
  // 别名链（如 core → unified-core → iam），最多 2 跳
  let cur = name;
  for (let i = 0; i < 3; i++) {
    const a = ALIAS[cur];
    if (!a) return null;
    if (a in servicesYaml) return a;
    cur = a;
  }
  return null;
}

// ----------------------------------------------------------------------------
// 主流程
// ----------------------------------------------------------------------------
function main() {
  const problems = [];

  const servicesYaml = parseServicesYaml(fs.readFileSync(SERVICES_YAML, 'utf-8'));
  const portsEnv = parsePortsEnv(fs.readFileSync(PORTS_ENV, 'utf-8'));
  const cargoDirs = parseCargoSvcDirs(fs.readFileSync(CARGO_TOML, 'utf-8'));
  const portsTs = parsePortsTs(fs.readFileSync(PORTS_TS, 'utf-8'));
  const viteServices = parseViteServices(fs.readFileSync(VITE_CONFIG, 'utf-8'));

  // ── A. services.yaml ↔ ports.env ────────────────────────────────────────
  for (const s of Object.values(servicesYaml)) {
    if (!s.env_var || s.port === undefined) continue;
    if (!(s.env_var in portsEnv)) {
      problems.push(`A: services.yaml 声明 ${s.env_var}=${s.port}（${s.name}），ports.env 缺失`);
    } else if (portsEnv[s.env_var] !== s.port) {
      problems.push(`A: ${s.env_var} 不一致 services.yaml=${s.port} ports.env=${portsEnv[s.env_var]}（${s.name}）`);
    }
  }
  for (const [envVar, port] of Object.entries(portsEnv)) {
    if (!envVar.endsWith('_PORT')) continue;
    const declared = Object.values(servicesYaml).some((s) => s.env_var === envVar);
    if (!declared) {
      problems.push(`A: ports.env 多余条目 ${envVar}=${port}（services.yaml 未声明；停用兼容变量请删除或加注释）`);
    }
  }

  // ── B. services.yaml ↔ Cargo.toml workspace（仅独立服务；虚拟/特殊端口非 svc 目录）──
  const yamlRealDirs = new Set(
    Object.values(servicesYaml)
      .filter((s) => !s.virtual && s.group !== 'special_ports')
      .map((s) => s.service_dir)
  );
  for (const d of yamlRealDirs) {
    if (!cargoDirs.has(d)) problems.push(`B: services.yaml 服务目录 svc/${d} 不在 Cargo.toml workspace（应归档或加回）`);
  }
  for (const d of cargoDirs) {
    if (!yamlRealDirs.has(d) && !KNOWN_EXCEPTIONS.has(d)) {
      problems.push(`B: Cargo.toml 构建 svc/${d} 但 services.yaml 无此服务（应补条目或移出 members）`);
    }
  }

  // ── C. services.yaml ↔ ports.ts BACKEND_PORTS ───────────────────────────
  for (const [name, port] of Object.entries(portsTs)) {
    if (port === null) continue;
    const yamlName = resolveName(name, servicesYaml);
    if (yamlName) {
      if (port !== servicesYaml[yamlName].port) {
        problems.push(`C: ports.ts ${name}=${port} 与 services.yaml ${yamlName}=${servicesYaml[yamlName].port} 不一致`);
      }
    } else if (!KNOWN_EXCEPTIONS.has(name)) {
      problems.push(`C: ports.ts 死条目 ${name}=${port}（services.yaml 无此服务且无别名；请删除或补 alias）`);
    }
  }

  // ── D. services.yaml ↔ vite.config.ts SERVICES ──────────────────────────
  for (const [name, v] of Object.entries(viteServices)) {
    const yamlName = resolveName(name, servicesYaml);
    if (!yamlName) {
      if (!KNOWN_EXCEPTIONS.has(name)) {
        problems.push(`D: vite.config.ts 死服务 ${name}（services.yaml 无此服务且无别名；请删除或补 alias）`);
      }
      continue;
    }
    const svc = servicesYaml[yamlName];
    // unified-core/iam 在 vite 中是虚拟子服务代理（yaml 以独立条目名义出现），跳过 virtual 一致性
    if (name !== 'unified-core' && name !== 'iam') {
      const yamlVirtual = svc.virtual === true;
      if (yamlVirtual !== v.isVirtual) {
        problems.push(`D: vite.config.ts ${name} isVirtual=${v.isVirtual} 与 services.yaml ${yamlVirtual ? '虚拟服务' : '独立服务'} 不一致`);
      }
    }
    const port = resolvePortExpr(v.port_expr, portsTs);
    if (port !== null && port !== svc.port) {
      problems.push(`D: vite.config.ts ${name} 端口 ${v.port_expr} → ${port} 与 services.yaml ${svc.port} 不一致`);
    }
  }
  // services.yaml 独立服务（非虚拟、非 special）应在 vite SERVICES 中（门户消费方）
  for (const s of Object.values(servicesYaml)) {
    if (s.virtual || s.group === 'special_ports') continue;
    if (!(s.name in viteServices)) {
      // iam 以 unified-core 名义出现在 vite，跳过
      if (s.name === 'iam' && 'unified-core' in viteServices) continue;
      problems.push(`D: services.yaml 服务 ${s.name}（端口 ${s.port}）不在 vite.config.ts SERVICES（缺代理）`);
    }
  }

  // ── E. 端口冲突（虚拟服务共用核心端口 8000 为设计预期，跳过）──────────
  const portOwner = {};
  for (const s of Object.values(servicesYaml)) {
    if (s.port === undefined || s.virtual) continue;
    if (portOwner[s.port] && portOwner[s.port] !== s.name) {
      problems.push(`E: 端口冲突 ${s.port} 被 ${portOwner[s.port]} 与 ${s.name} 同时占用`);
    } else {
      portOwner[s.port] = s.name;
    }
  }

  // ── 输出 ─────────────────────────────────────────────────────────────────
  const stats = {
    yaml: Object.keys(servicesYaml).length,
    env: Object.keys(portsEnv).length,
    cargo: cargoDirs.size,
    ts: Object.keys(portsTs).length,
    vite: Object.keys(viteServices).length,
  };
  if (!QUIET) {
    console.log('🔍 配置单一真相源校验 (source: config/services.yaml)');
    console.log(`   服务 ${stats.yaml} · ports.env ${stats.env} · Cargo svc ${stats.cargo} · ports.ts ${stats.ts} · vite SERVICES ${stats.vite}`);
    console.log('');
  }
  if (problems.length === 0) {
    if (!QUIET) console.log('✅ 全部一致');
    process.exit(0);
  }
  if (!QUIET) console.log(`❌ ${problems.length} 处不一致：`);
  for (const p of problems) console.log(`  ${p}`);
  if (CHECK_ONLY) {
    if (!QUIET) console.log('\n💡 以 config/services.yaml 为权威修正下游（ports.env / Cargo.toml / ports.ts / vite.config.ts）');
    process.exit(1);
  }
  process.exit(0);
}

main();
