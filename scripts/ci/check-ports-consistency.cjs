#!/usr/bin/env node
/**
 * 端口单一真相源一致性校验
 * 检查 config/ports.env 与 apps/web/src/config/ports.ts 的端口是否一致
 * 不一致时退出码非0，阻断提交/推送
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

// 1. 读取 config/ports.env
function parsePortsEnv() {
  const content = fs.readFileSync(path.join(ROOT, 'config/ports.env'), 'utf-8');
  const ports = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, value] = trimmed.split('=');
    if (!key || !value) continue;
    // 转换 CORE_PORT -> core, ERP_PORT -> erp
    const match = key.match(/^(.+)_PORT$/);
    if (!match) continue;
    const name = match[1].toLowerCase().replace(/_/g, '-');
    ports[name] = parseInt(value, 10);
  }
  return ports;
}

// 2. 读取 apps/web/src/config/ports.ts 里的 BACKEND_PORTS
function parsePortsTs() {
  const content = fs.readFileSync(path.join(ROOT, 'apps/web/src/config/ports.ts'), 'utf-8');
  const ports = {};

  // 提取 BACKEND_PORTS 对象
  const backendMatch = content.match(/export const BACKEND_PORTS[^=]*=\s*\{([^}]+)\}/);
  if (!backendMatch) {
    throw new Error('无法解析 BACKEND_PORTS');
  }

  const lines = backendMatch[1].split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    // 匹配 xxx: 1234, 或 "xxx-yyy": 1234,
    const match = trimmed.match(/['"]?([a-zA-Z0-9_-]+)['"]?\s*:\s*(\d+)/);
    if (!match) continue;
    const name = match[1];
    const port = parseInt(match[2], 10);
    ports[name] = port;
  }
  return ports;
}

function main() {
  console.log('🔍 检查端口一致性...');

  const envPorts = parsePortsEnv();
  const tsPorts = parsePortsTs();

  const errors = [];
  const warnings = [];

  // 检查 env 里有但 ts 里没有的
  for (const [name, port] of Object.entries(envPorts)) {
    if (!(name in tsPorts)) {
      warnings.push(`⚠️  ${name}: ports.env 里有端口 ${port}，但 ports.ts 里没有`);
    } else if (tsPorts[name] !== port) {
      errors.push(`❌ ${name}: ports.env=${port}, ports.ts=${tsPorts[name]}`);
    }
  }

  // 检查 ts 里有但 env 里没有的
  for (const [name, port] of Object.entries(tsPorts)) {
    if (!(name in envPorts)) {
      // 跳过一些特殊情况：core/iam/doc/file/flow 都是同一个端口（虚拟服务）
      const virtualServices = ['core', 'iam', 'doc', 'file', 'flow'];
      if (virtualServices.includes(name)) continue;
      // 跳过基础设施
      const infra = ['web', 'gateway', 'postgres', 'redis', 'ollama'];
      if (infra.includes(name)) continue;
      warnings.push(`⚠️  ${name}: ports.ts 里有端口 ${port}，但 ports.env 里没有`);
    }
  }

  // 输出结果
  console.log(`📊 检查完成：`);
  console.log(`  - ports.env 端口数: ${Object.keys(envPorts).length}`);
  console.log(`  - ports.ts 端口数: ${Object.keys(tsPorts).length}`);

  if (warnings.length > 0) {
    console.log('\n⚠️  警告：');
    warnings.forEach(w => console.log(`  ${w}`));
  }

  if (errors.length > 0) {
    console.log('\n❌ 错误（端口不一致）：');
    errors.forEach(e => console.log(`  ${e}`));
    console.log('\n💡 修复方法：同步修改 config/ports.env 和 apps/web/src/config/ports.ts');
    process.exit(1);
  }

  console.log('\n✅ 端口一致性校验通过！');
}

main();
