#!/usr/bin/env node
/**
 * RLS 权限校验（CI Gate）
 *
 * 口径：校验「实际运行角色」，不再写死 topems_app。
 * 角色解析优先级：
 *   1) 环境变量 MIGRATE_URL 的连接串用户名（部署/迁移同源身份，lefthook 即从此派生）
 *   2) 环境变量 DATABASE_URL 的连接串用户名（应用运行身份）
 *   3) 仓库根 .env 中的 MIGRATE_URL → DATABASE_URL
 * 解析不到角色、或数据库不可达时直接失败并以非 0 退出，不再静默通过。
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
    if (role) return { role, url };
  }
  console.error('❌ 无法从 DATABASE_URL / MIGRATE_URL / .env 推导出实际运行角色。');
  console.error('   请设置 DATABASE_URL 或 MIGRATE_URL（形如 postgres://<role>@host:5432/db，密码走 PGPASSWORD），');
  console.error('   或在仓库根 .env 中配置其一后重试。门禁不会在角色未知时静默通过。');
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
  const { role, url } = resolveTarget();
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
