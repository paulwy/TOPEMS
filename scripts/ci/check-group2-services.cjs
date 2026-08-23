#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SERVICE_PORT_RS = path.join(ROOT, 'lib', 'shared-core', 'src', 'service_port.rs');
const CONFIG_SERVICES_YAML = path.join(ROOT, 'config', 'services.yaml');
const SVC_DIR = path.join(ROOT, 'svc');

const ALIAS_EXCEPTIONS = new Set([
  'analytics',
]);

const PLUGIN_MISSING_ALLOWLIST = new Set([
  'monitor',
]);

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { strict: false, verbose: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--strict' || a === '-s') opts.strict = true;
    else if (a === '--verbose' || a === '-v') opts.verbose = true;
    else if (a === '--help' || a === '-h') {
      printUsage();
      process.exit(0);
    }
  }
  return opts;
}

function printUsage() {
  console.log(`Usage: node scripts/ci/check-group2-services.cjs [options]

Options:
  -s, --strict     Exit 1 on any warning-level inconsistency
  -v, --verbose    Print extra debug info (parsed GROUP2 / plugin maps)
  -h, --help       Show this help

Checks (3-point cross-validation):
  ① GROUP2 every (PORT_NAME, slug) maps to an existing pub const *_PORT
  ② For every GROUP2 service, svc/*/plugin.yaml port == constant port value
  ③ Every GROUP2 service has a matching plugin.yaml (except known aliases)
`);
}

function readText(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    return null;
  }
}

function parsePortConstants(rsSrc) {
  const map = new Map();
  const re = /^pub const ([A-Z0-9_]+_PORT): u16 = (\d+);/gm;
  let m;
  while ((m = re.exec(rsSrc)) !== null) {
    map.set(m[1], Number(m[2]));
  }
  return map;
}

function parseGroup2Services(rsSrc) {
  const list = [];
  const marker = rsSrc.indexOf('GROUP2_SERVICES');
  if (marker === -1) {
    throw new Error('Cannot locate GROUP2_SERVICES in service_port.rs');
  }
  const eq = rsSrc.indexOf('=', marker);
  if (eq === -1) throw new Error('GROUP2_SERVICES missing `=`');
  const bracketStart = rsSrc.indexOf('[', eq);
  if (bracketStart === -1) throw new Error('GROUP2_SERVICES missing opening `[`');
  const bracketEnd = findMatchingBracket(rsSrc, bracketStart);
  const arrBody = rsSrc.slice(bracketStart + 1, bracketEnd);
  const re = /\(\s*"([a-z0-9-]+)"\s*,\s*([A-Z0-9_]+_PORT)\s*\)/g;
  let m;
  while ((m = re.exec(arrBody)) !== null) {
    list.push({ slug: m[1], port_name: m[2] });
  }
  return list;
}

function findMatchingBracket(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === '[') depth++;
    else if (s[i] === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error('Unmatched bracket parsing GROUP2_SERVICES');
}

function loadPluginYamls() {
  const byCode = new Map();
  const entries = fs.readdirSync(SVC_DIR, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const plugPath = path.join(SVC_DIR, ent.name, 'plugin.yaml');
    const src = readText(plugPath);
    if (src === null) continue;
    const parsed = parseSimplePluginYaml(src, ent.name);
    if (parsed.code) {
      byCode.set(parsed.code, {
        code: parsed.code,
        port: parsed.port,
        dir: ent.name,
        file: plugPath,
      });
    }
  }
  return byCode;
}

function parseSimplePluginYaml(src, dirHint) {
  const out = { code: null, port: null };
  const lines = src.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.replace(/\s+#.*$/, '');
    if (out.code === null) {
      const codeM = line.match(/^\s*code:\s*["']?([a-z0-9-]+)["']?\s*$/);
      if (codeM) {
        out.code = codeM[1];
        continue;
      }
    }
    if (out.port === null) {
      const portM = line.match(/^\s*port:\s*(\d+)\s*$/);
      if (portM) {
        out.port = Number(portM[1]);
      }
    }
  }
  if (!out.code) {
    out.code = dirHint;
  }
  return out;
}

function main() {
  const opts = parseArgs(process.argv);

  const rsSrc = readText(SERVICE_PORT_RS);
  if (rsSrc === null) {
    console.error(`❌ Cannot read ${path.relative(ROOT, SERVICE_PORT_RS)}`);
    process.exit(2);
  }

  const portConsts = parsePortConstants(rsSrc);
  const group2 = parseGroup2Services(rsSrc);
  const plugins = loadPluginYamls();

  if (opts.verbose) {
    console.log('--- Parsed port constants (first 5): ---');
    [...portConsts.entries()].slice(0, 5).forEach(([k, v]) => console.log(`  ${k} = ${v}`));
    console.log(`  ... total ${portConsts.size} consts`);
    console.log('--- GROUP2_SERVICES: ---');
    group2.forEach(g => console.log(`  (${g.slug}, ${g.port_name})`));
    console.log(`  ... total ${group2.length} entries`);
    console.log('--- svc/*/plugin.yaml loaded by code: ---');
    plugins.forEach((v, k) => console.log(`  ${k}: port=${v.port ?? '?'} dir=${v.dir}`));
    console.log(`  ... total ${plugins.size} plugins`);
  }

  const errors = [];
  const warnings = [];

  for (const g of group2) {
    const value = portConsts.get(g.port_name);
    if (value === undefined) {
      errors.push(`① GROUP2 ("${g.slug}", ${g.port_name}) — ${g.port_name} 常量不存在`);
    } else {
      g.port_value = value;
    }
  }

  for (const g of group2) {
    if (!g.port_value) continue;
    if (ALIAS_EXCEPTIONS.has(g.slug)) continue;
    const plug = plugins.get(g.slug);
    if (!plug) {
      if (PLUGIN_MISSING_ALLOWLIST.has(g.slug)) {
        warnings.push(`③ GROUP2 "${g.slug}" — svc/${g.slug}/plugin.yaml 缺失 (allowlist)`);
      } else {
        errors.push(`③ GROUP2 "${g.slug}" — 无匹配 plugin.yaml (code=${g.slug} 的插件未找到)`);
      }
      continue;
    }
    if (plug.port === null || plug.port === undefined) {
      errors.push(`② GROUP2 "${g.slug}" (${plug.dir}/plugin.yaml) — plugin.yaml 未声明 port，常量端口=${g.port_value}`);
      continue;
    }
    if (plug.port !== g.port_value) {
      errors.push(`② GROUP2 "${g.slug}" — 常量 ${g.port_name}=${g.port_value} vs ${plug.dir}/plugin.yaml port=${plug.port} 不一致`);
    }
  }

  const knownCodes = new Set(group2.map(g => g.slug));
  for (const [code, plug] of plugins.entries()) {
    if (!knownCodes.has(code)) {
      warnings.push(`插件 ${plug.dir}/plugin.yaml code="${code}" 不在 GROUP2_SERVICES (非独立端口服务，可能正常)`);
    }
  }

  console.log('');
  console.log('=== GROUP2 Services 3-Way Validation ===');
  console.log(`  service_port.rs GROUP2 条目 : ${group2.length}`);
  console.log(`  pub const *_PORT 常量数     : ${portConsts.size}`);
  console.log(`  svc/*/plugin.yaml 已加载    : ${plugins.size}`);
  console.log('');

  if (warnings.length) {
    console.log(`⚠️  Warnings (${warnings.length}):`);
    for (const w of warnings) console.log(`   - ${w}`);
    console.log('');
  }

  if (errors.length) {
    console.log(`❌ Errors (${errors.length}):`);
    for (const e of errors) console.log(`   - ${e}`);
    console.log('');
    console.log('❌ GROUP2_SERVICES validation FAILED');
    process.exit(1);
  }

  if (opts.strict && warnings.length) {
    console.log(`⚠️  --strict mode: ${warnings.length} warnings → exit 1`);
    process.exit(1);
  }

  console.log(`✅ All checks passed (errors=0${warnings.length ? `, warnings=${warnings.length}` : ''})`);
  process.exit(0);
}

main();
