#!/usr/bin/env node
/**
 * 生产配置一致性门禁（2026-11-24 引入）
 *
 * 背景：审计发现三套“生产真相”互相矛盾——
 *   1. .env.production 用 owner 直连 5432，绕过 PgBouncer；
 *   2. compose 又给 PgBouncer 传 PGBOUNCER_* 环境变量，与挂载的 pgbouncer.ini 数值不同；
 *   3. Postgres 容器 max_connections 默认 100，而 PgBouncer 的 max_db_connections 是 150（永远拿不满）。
 *
 * 这个脚本把上述约定变成可断言检查，任何一条回退即 FAIL。
 * 用法：node scripts/ci/check-prod-config.mjs
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const errors = [];
const warn = (m) => console.warn(`  ! ${m}`);
const fail = (check, msg) => errors.push(`[${check}] ${msg}`);

const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const has = (p) => existsSync(resolve(ROOT, p));

// ---------------------------------------------------------------- 1. env 模板
const tpl = read('config/env/.env.production.template');

if (!/^MIGRATE_URL=/m.test(tpl)) {
  fail('env-template', '缺少 MIGRATE_URL（迁移必须用 owner 角色独立连接，不能复用应用池）');
}
const corsLine = tpl.match(/^CORS_ALLOWED_ORIGINS=(.*)$/m)?.[1] ?? '';
if (/your-domain\.com|localhost|\*/.test(corsLine) || corsLine.trim() === '') {
  fail('env-template', `CORS_ALLOWED_ORIGINS 仍是占位/通配：${corsLine}`);
}
if (!/topmap\.net/.test(corsLine)) {
  fail('env-template', `CORS_ALLOWED_ORIGINS 未包含真实入口域名 topmap.net：${corsLine}`);
}
const tplDsn = tpl.match(/^DATABASE_URL=(.*)$/m)?.[1] ?? '';
if (/@localhost:5432/.test(tplDsn)) {
  fail('env-template', `DATABASE_URL 直连 5432 会绕过 PgBouncer：${tplDsn}`);
}
// 池大小键名必须是被代码真正读取的 DB_MAX_CONNECTIONS；
// DATABASE_MAX_CONNECTIONS 没有任何代码读取（2026-11-24 生产机实测反馈）。
if (/^DATABASE_MAX_CONNECTIONS=/m.test(tpl)) {
  fail('env-template', '模板仍在使用无人读取的 DATABASE_MAX_CONNECTIONS，应改为 DB_MAX_CONNECTIONS');
}
const tplPool = Number(tpl.match(/^DB_MAX_CONNECTIONS=(\d+)$/m)?.[1] ?? 0);
if (!tplPool || tplPool > 50) {
  fail('env-template', `DB_MAX_CONNECTIONS 未设置或过大（>50 会撑爆默认 max_connections=100）：${tplPool}`);
}

// 这些键在 Rust 侧没有对应读取逻辑，写进模板只会让运维改一份“假配置”。
for (const ghost of ['STORAGE_PATH', 'PLUGIN_STORAGE_PATH', 'DATABASE_MAX_CONNECTIONS']) {
  if (new RegExp(`^${ghost}=`, 'm').test(tpl)) {
    fail('env-template', `${ghost} 无代码读取，模板中不得以生效形式出现（注释说明可以保留）`);
  }
}

// ------------------------------------------------------------ 2. compose 编排
const compose = read('deploy/docker/docker-compose.yml');

for (const key of ['PGBOUNCER_MAX_CLIENT_CONN', 'PGBOUNCER_DEFAULT_POOL_SIZE', 'PGBOUNCER_MAX_DB_CONNECTIONS']) {
  if (compose.includes(key)) {
    fail('compose', `${key} 与挂载的 pgbouncer.ini 形成双源；连接池参数只保留 ini 一处`);
  }
}

// 应用角色 DSN 必须经 PgBouncer；owner 只允许出现在 MIGRATE_URL
const appDsns = [...compose.matchAll(/DATABASE_URL=(postgres:\/\/topems_app:.*)$/gm)].map((m) => m[1].trim());
if (appDsns.length === 0) fail('compose', '未找到任何 topems_app 的应用 DSN，疑似回退成 owner 直连');
for (const dsn of appDsns) {
  if (!/@pgbouncer:6432\//.test(dsn)) {
    fail('compose', `应用 DSN 未经 PgBouncer：${dsn.replace(/:[^:@/]+@/, ':***@')}`);
  }
}

// 只看真正传给 postgres 的 -c 参数，别被注释里的“默认 100”误导
const pgMax = Number(compose.match(/"-c", "max_connections=(\d+)"/)?.[1] ?? 0);
const ini = read('deploy/docker/pgbouncer/pgbouncer.ini');
const maxDb = Number(ini.match(/^max_db_connections\s*=\s*(\d+)/m)?.[1] ?? 0);
const poolSize = Number(ini.match(/^default_pool_size\s*=\s*(\d+)/m)?.[1] ?? 0);

if (!pgMax || pgMax < maxDb + 20) {
  fail('compose', `Postgres max_connections(${pgMax || '未设置'}) 必须 ≥ pgbouncer.max_db_connections(${maxDb}) + 20 余量`);
}
if (!compose.includes('./pgbouncer/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini:ro')) {
  fail('compose', 'pgbouncer 未挂载 pgbouncer.ini，连接池参数失去唯一事实源');
}

// ------------------------------------------------------------ 3. pgbouncer
if (/^auth_type\s*=\s*md5/m.test(ini)) {
  fail('pgbouncer', 'auth_type=md5 已被 PG 上游弃用（PG18 新角色默认 scram-sha-256），无法认证新角色');
}
if (poolSize > maxDb) {
  fail('pgbouncer', `default_pool_size(${poolSize}) 不应大于 max_db_connections(${maxDb})`);
}

// ------------------------------------------------------------ 4. 密钥不落库
let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n');
} catch {
  warn('git ls-files 不可用，跳过“密钥是否入库”检查');
}
for (const forbidden of ['.env.production', 'deploy/docker/pgbouncer/userlist.txt']) {
  if (tracked.includes(forbidden)) fail('secrets', `${forbidden} 被 git 跟踪，必须 gitignore`);
}
if (!has('deploy/docker/pgbouncer/render-userlist.sh')) {
  fail('secrets', '缺少 render-userlist.sh：userlist 无法在部署时按真实口令生成');
}

const k8sFiles = ['deploy/k8s/base/postgres.yaml', 'deploy/k8s/base/redis.yaml', 'deploy/k8s/base/rabbitmq.yaml'];
for (const f of k8sFiles) {
  if (/password|pass/i.test(read(f)) && /value:\s*"topems_secret"/.test(read(f))) {
    fail('k8s', `${f} 仍把明文口令写在清单里，应改用 secretKeyRef`);
  }
}

// ------------------------------------------------------------ 5. 本机实配（存在才查）
if (has('.env.production')) {
  const live = read('.env.production');
  const mode = statSync(resolve(ROOT, '.env.production')).mode & 0o777;
  if (mode !== 0o600) fail('env-live', `.env.production 权限应为 600，实际 ${mode.toString(8)}`);
  if (/^CORS_ALLOWED_ORIGINS=.*your-domain\.com/m.test(live)) {
    fail('env-live', '.env.production 的 CORS 仍是 your-domain.com 占位');
  }
  // 只看生效的 key=value 行，注释里出现旧路径不算
  const liveKeys = live.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
  if (/\/opt\/topems/.test(liveKeys)) {
    fail('env-live', '.env.production 仍指向 /opt/topems（macOS 生产机上不存在该路径）');
  }
  if (/^DATABASE_URL=.*@localhost:5432/m.test(liveKeys)) {
    fail('env-live', '.env.production 仍用 owner 直连 localhost:5432');
  }
  for (const ghost of ['STORAGE_PATH', 'PLUGIN_STORAGE_PATH', 'DATABASE_MAX_CONNECTIONS']) {
    if (new RegExp(`^${ghost}=`, 'm').test(liveKeys)) {
      fail('env-live', `.env.production 含无代码读取的键 ${ghost}，应改为注释`);
    }
  }
}

// ------------------------------------------------------------ 6. 示例配置文件漂移
const prodYaml = read('config/production.yaml.example');
if (/^\s{2}level:\s*error/m.test(prodYaml)) {
  fail('config', 'production.yaml.example 的 logging.level=error 与 .env 的 info 漂移（生产留 info 便于排障）');
}
if (/^\s{2}port:\s*8013/m.test(prodYaml)) {
  fail('config', 'production.yaml.example 端口仍是 8013，生产入口是 BFF 8099');
}

// ------------------------------------------------------------ 输出
if (errors.length) {
  console.error('❌ 生产配置一致性检查失败：');
  for (const e of errors) console.error(`   ${e}`);
  process.exit(1);
}
console.log('✅ 生产配置一致性检查通过（env/compose/pgbouncer/k8s 无已知冲突）');
