#!/usr/bin/env node
/**
 * RLS 权限校验（CI Gate）
 *
 * 口径：校验「实际运行角色」，不再写死 topems_app。
 * 角色解析优先级：
 *   1) 环境变量 MIGRATE_URL 的连接串用户名（部署/迁移同源身份）
 *   2) 环境变量 DATABASE_URL 的连接串用户名（应用运行身份）
 *   3) 仓库根 .env 中的 MIGRATE_URL → DATABASE_URL
 * 解析不到角色、或数据库不可达时直接失败并以非 0 退出，不再静默通过。
 * 任何来源命中生产库特征（库名 *prod* / production）时直接拒绝执行，绝不对生产库跑门禁。
 *
 * 口令解析（不打印、不入库）：环境变量 PGPASSWORD → 目标连接串内嵌口令 →
 * 本地 .env 的 TEST_DATABASE_URL → .env 的 DATABASE_URL / MIGRATE_URL。
 * 仅复用与目标角色一致的口令；都取不到时先尝试无口令连接（~/.pgpass / peer），
 * 认证失败则输出可操作的中文配置指引，而不是裸的 fe_sendauth 报错。
 *
 * 检查项：
 *   1. 目标角色是否存在
 *   2. 关键表是否已授予该角色 SELECT
 *   3. 默认权限是否覆盖该角色（新增表自动授权）
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function readEnvFile() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const result = {};
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[m[1]] = value;
  }
  return result;
}

function roleFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const role = decodeURIComponent(parsed.username || '');
    return role || null;
  } catch {
    return null;
  }
}

function isProductionUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const db = decodeURIComponent((parsed.pathname || '').replace(/^\//, ''));
    const host = parsed.hostname || '';
    return /(^|_)prod($|_)/i.test(db) || /production/i.test(db) || /(^|\.)prod(\.|$)/i.test(host);
  } catch {
    return false;
  }
}

function maskUrl(url) {
  return String(url).replace(/(:\/\/[^:@/]+:)[^@]*@/, '$1***@');
}

function passwordFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const password = decodeURIComponent(parsed.password || '');
    return password || null;
  } catch {
    return null;
  }
}

/**
 * 解析数据库口令（只用于设置进程内 PGPASSWORD，不输出、不落盘）：
 *   1) 环境变量 PGPASSWORD（CI/显式导出优先）
 *   2) 目标连接串内嵌口令
 *   3) 本地 .env 的 TEST_DATABASE_URL（测试库凭据统一来源）
 *   4) 本地 .env 的 DATABASE_URL / MIGRATE_URL 内嵌口令
 * 只复用与目标角色一致的口令：口令按角色存储，拿 A 角色的口令连 B 角色必然认证失败。
 * 都取不到时返回 { credential: null, mismatched }；调用方仍会尝试连接
 * （~/.pgpass、peer 等），真失败时再给出可操作的中文提示。
 */
function resolveDbPassword(envFile, targetUrl, targetRole) {
  if (process.env.PGPASSWORD) {
    return { credential: { password: process.env.PGPASSWORD, source: '环境变量 PGPASSWORD' }, mismatched: [] };
  }
  const fromTarget = passwordFromUrl(targetUrl);
  if (fromTarget) {
    return { credential: { password: fromTarget, source: '目标连接串内嵌口令' }, mismatched: [] };
  }
  const mismatched = [];
  const candidates = [
    ['.env TEST_DATABASE_URL', envFile.TEST_DATABASE_URL],
    ['.env DATABASE_URL', envFile.DATABASE_URL],
    ['.env MIGRATE_URL', envFile.MIGRATE_URL],
  ];
  for (const [source, url] of candidates) {
    const password = passwordFromUrl(url);
    if (!password) continue;
    const role = roleFromUrl(url);
    if (role && targetRole && role !== targetRole) {
      mismatched.push(`${source}（角色 ${role}）`);
      continue;
    }
    return { credential: { password, source }, mismatched };
  }
  return { credential: null, mismatched };
}

function printAuthHint(targetRole) {
  console.error(`   👉 请为角色 ${targetRole} 配置数据库口令（口令不会被打印或写入仓库）：`);
  console.error("      1) 当前 shell：export PGPASSWORD='<口令>'");
  console.error(`      2) 仓库根 .env 的 DATABASE_URL / TEST_DATABASE_URL 带上该角色的口令`);
  console.error('         （即连接串中的「用户名:口令@主机」段；角色必须与目标一致）');
  console.error('         .env 已被 .gitignore 忽略，门禁只在本地读取，不会入库。');
}

function resolveTarget() {
  const envFile = readEnvFile();
  const candidates = [
    ['环境变量 MIGRATE_URL', process.env.MIGRATE_URL],
    ['环境变量 DATABASE_URL', process.env.DATABASE_URL],
    ['.env MIGRATE_URL', envFile.MIGRATE_URL],
    ['.env DATABASE_URL', envFile.DATABASE_URL],
  ];
  for (const [source, url] of candidates) {
    const role = roleFromUrl(url);
    if (role) return { role, url, source };
  }
  console.error('❌ 无法从 DATABASE_URL / MIGRATE_URL / .env 推导出实际运行角色。');
  console.error('   请设置 DATABASE_URL 或 MIGRATE_URL（形如 postgres://<role>@host:5432/db），口令走 PGPASSWORD；')
  console.error('   或在仓库根 .env 中配置 DATABASE_URL / TEST_DATABASE_URL（可含口令，角色需与目标一致）。')
  console.error('   门禁不会在角色未知时静默通过。');
  process.exit(1);
}

function sqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function psql(url, sql) {
  try {
    const out = execSync(`psql "${url}" -t -A -c ${JSON.stringify(sql)}`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, out: out.trim() };
  } catch (e) {
    const err = (e.stderr || e.message || '').toString().trim();
    return { ok: false, err };
  }
}

function main() {
  const { role, url, source } = resolveTarget();
  if (isProductionUrl(url)) {
    console.error(`❌ 拒绝执行：${source} 命中生产库特征，RLS 门禁不会对生产库运行。`);
    console.error(`   连接串：${maskUrl(url)}`);
    console.error('   请显式设置 DATABASE_URL 指向本地/测试库；生产窗口期不得把生产 DSN 常驻在 .env。');
    process.exit(1);
  }
  const envFile = readEnvFile();
  const { credential, mismatched } = resolveDbPassword(envFile, url, role);
  if (credential) {
    process.env.PGPASSWORD = credential.password;
    console.log(`🔐 凭据来源：${credential.source}（口令不输出）`);
  } else {
    if (mismatched.length > 0) {
      console.log(`ℹ️  .env 中的口令角色与目标角色 ${role} 不一致，未复用：${mismatched.join('、')}`);
    }
    console.log('ℹ️  未找到可用口令，先尝试无口令连接（~/.pgpass / peer）；失败时会提示配置方式。');
  }
  const roleSql = sqlLiteral(role);
  console.log(`🔍 RLS权限校验（目标角色：${role}）`);

  const errors = [];
  const warnings = [];

  // 1. 角色存在性 + 超级用户提示
  const roleCheck = psql(
    url,
    `SELECT rolname || '|' || rolsuper::text FROM pg_roles WHERE rolname = '${roleSql}'`,
  );
  if (!roleCheck.ok) {
    console.error(`❌ 无法连接数据库或查询角色失败：${roleCheck.err || '未知错误'}`);
    if (/no password supplied|password authentication failed|fe_sendauth/i.test(roleCheck.err || '')) {
      printAuthHint(role);
    }
    console.error('   校验不会在数据库不可达时静默通过。');
    process.exit(1);
  }
  if (roleCheck.out === '') {
    errors.push(`❌ 角色 ${role} 不存在！请为其创建角色并授予最小权限`);
  } else {
    console.log(`✅ 角色 ${role} 存在`);
    if (roleCheck.out.endsWith('|true')) {
      warnings.push(`⚠️  角色 ${role} 是超级用户，权限校验恒真，门禁不具备约束力`);
    }
  }

  // 2. 关键表 SELECT 权限
  const criticalTables = [
    'iam.users',
    'iam.roles',
    'mes.work_orders',
    'wms.inventory',
    'crm.customers',
    'erp.sales_orders',
  ];

  for (const table of criticalTables) {
    const [schema, tableName] = table.split('.');
    // 用 has_table_privilege 判定：role_table_grants 不显示表 owner 的隐式权限
    const grant = psql(
      url,
      `SELECT has_table_privilege('${roleSql}', '${schema}.${tableName}', 'SELECT')::int`,
    );
    if (!grant.ok) {
      errors.push(`❌ 无法校验 ${table} 对 ${role} 的权限：${grant.err || '未知错误'}`);
    } else if (grant.out !== '1') {
      errors.push(`❌ ${table} 未授予 ${role} SELECT 权限！`);
    } else {
      console.log(`✅ ${table} 已授权 ${role}`);
    }
  }

  // 3. 默认权限（新增表自动授权）
  const defAcl = psql(
    url,
    `SELECT 1 FROM pg_default_acl d, aclexplode(d.defaclacl) a JOIN pg_roles r ON r.oid = a.grantee WHERE d.defaclobjtype = 'r' AND r.rolname = '${roleSql}' LIMIT 1`,
  );
  if (!defAcl.ok) {
    errors.push(`❌ 无法校验默认权限：${defAcl.err || '未知错误'}`);
  } else if (defAcl.out !== '1') {
    warnings.push(`⚠️  默认权限未覆盖 ${role}：新增表不会自动授权`);
  } else {
    console.log('✅ 默认权限已覆盖（新增表自动授权）');
  }

  console.log('');
  if (warnings.length > 0) {
    console.log('⚠️  警告：');
    warnings.forEach((w) => console.log(`  ${w}`));
  }

  if (errors.length > 0) {
    console.log('❌ 错误：');
    errors.forEach((e) => console.log(`  ${e}`));
    console.log('\n💡 修复方法：用 MIGRATE_URL 指向的 owner 身份为上述角色补齐 GRANT');
    process.exit(1);
  }

  console.log('\n✅ RLS权限校验通过！');
}

main();
