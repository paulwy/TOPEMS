#!/usr/bin/env node
/**
 * RLS 权限校验（CI Gate）
 *
 * 口径：校验「实际运行角色」，不再写死 topems_app。
 * 角色解析：统一委托 scripts/ci/lib/db-target.mjs（profile=rls-permissions）。
 *   顺序：RLS_PERMISSIONS_DB_URL（env→.env）→ MIGRATE_URL → DATABASE_URL（env→.env）。
 *   不回落 TEST_DATABASE_URL：本门禁校验「实际运行角色」，用测试身份替代会让断言失去意义。
 * 解析不到角色、或数据库不可达时直接失败并以非 0 退出，不再静默通过。
 * 任何来源命中生产库特征（库名 *prod* / production）时直接拒绝执行，绝不对生产库跑门禁。
 *
 * 口令解析（不打印、不入库）：由统一解析器完成——环境变量 PGPASSWORD → 目标连接串内嵌口令
 * → 本地 .env 中「同角色」的口令（TEST_DATABASE_URL 优先）。都取不到时先尝试无口令连接
 * （~/.pgpass / peer），认证失败则输出可操作的中文配置指引，而不是裸的 fe_sendauth 报错。
 * 完整口径见 docs/quality/environment-provisioning.md §12.1。
 *
 * 检查项：
 *   1. 目标角色是否存在
 *   2. 关键表是否已授予该角色 SELECT
 *   3. 默认权限是否覆盖该角色（新增表自动授权）
 *
 * 特权连接拒绝（fail-closed）：
 *   连接成功后先查 current_user 的 rolsuper / rolbypassrls，再查目标角色的同名属性；
 *   任一为 true 即 FAILED —— superuser / BYPASSRLS 会绕过行级安全，权限与默认权限断言
 *   恒真（2026-11-19 假绿事故）。仅本地演练可用
 *   RLS_PERMISSIONS_ALLOW_SUPERUSER=1 显式豁免（CI 不得设置），启用时打印 WARN，
 *   结论不可用于发布判定。
 */

const { execSync } = require('child_process');
const path = require('path');
const { pathToFileURL } = require('url');

const ALLOW_PRIVILEGED = /^(1|true|yes|on)$/i.test(
  String(process.env.RLS_PERMISSIONS_ALLOW_SUPERUSER ?? '').trim(),
);

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

function printAuthHint(targetRole) {
  console.error(`   👉 请为角色 ${targetRole} 配置数据库口令（口令不会被打印或写入仓库）：`);
  console.error("      1) 当前 shell：export PGPASSWORD='<口令>'");
  console.error(`      2) 仓库根 .env 的 DATABASE_URL / TEST_DATABASE_URL 带上该角色的口令`);
  console.error('         （即连接串中的「用户名:口令@主机」段；角色必须与目标一致）');
  console.error('         .env 已被 .gitignore 忽略，门禁只在本地读取，不会入库。');
}

async function resolveTargetOrExit() {
  const { resolveDbTarget } = await import(
    pathToFileURL(path.join(__dirname, 'lib', 'db-target.mjs')).href
  );
  const target = resolveDbTarget({ hook: 'rls-permissions' });
  if (!target.ok || !target.role) {
    console.error('❌ 无法从 RLS_PERMISSIONS_DB_URL / MIGRATE_URL / DATABASE_URL / .env 推导出实际运行角色。');
    console.error('   请设置 DATABASE_URL 或 MIGRATE_URL（形如 postgres://<role>@host:5432/db），口令走 PGPASSWORD；');
    console.error('   或在仓库根 .env 中配置 DATABASE_URL（可含口令，角色需与目标一致）。');
    console.error('   诊断：node scripts/ci/lib/db-target.mjs --hook rls-permissions --explain');
    console.error('   门禁不会在角色未知时静默通过。');
    process.exit(1);
  }
  return {
    role: target.role,
    url: target.urlWithPassword || target.url,
    source: target.source,
    password: target.password,
    passwordSource: target.passwordSource,
    passwordNotes: target.passwordNotes,
  };
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

async function main() {
  const { role, url, source, password, passwordSource, passwordNotes } = await resolveTargetOrExit();
  if (isProductionUrl(url)) {
    console.error(`❌ 拒绝执行：${source} 命中生产库特征，RLS 门禁不会对生产库运行。`);
    console.error(`   连接串：${maskUrl(url)}`);
    console.error('   请显式设置 DATABASE_URL 指向本地/测试库；生产窗口期不得把生产 DSN 常驻在 .env。');
    process.exit(1);
  }
  if (password) {
    process.env.PGPASSWORD = password;
    console.log(`🔐 凭据来源：${passwordSource}（口令不输出）`);
  } else {
    if (passwordNotes.length > 0) {
      console.log(`ℹ️  .env 中的口令角色与目标角色 ${role} 不一致，未复用：${passwordNotes.join('、')}`);
    }
    console.log('ℹ️  未找到可用口令，先尝试无口令连接（~/.pgpass / peer）；失败时会提示配置方式。');
  }
  const roleSql = sqlLiteral(role);

  // 0. 连接身份：superuser / BYPASSRLS 会让权限断言恒真，默认拒绝
  const identity = psql(
    url,
    "SELECT current_user || '|' || r.rolsuper::text || '|' || r.rolbypassrls::text FROM pg_roles r WHERE r.rolname = current_user",
  );
  if (!identity.ok) {
    console.error(`❌ 无法连接数据库或查询连接身份失败：${identity.err || '未知错误'}`);
    if (/no password supplied|password authentication failed|fe_sendauth/i.test(identity.err || '')) {
      printAuthHint(role);
    }
    console.error('   校验不会在数据库不可达时静默通过。');
    process.exit(1);
  }
  const [connUser, connSuper, connBypass] = identity.out.split('|');
  if (connSuper === 'true' || connBypass === 'true') {
    if (!ALLOW_PRIVILEGED) {
      console.error('❌ FAILED：该连接会 BYPASSRLS，校验恒真 —— 拒绝在特权角色上执行 RLS 权限校验');
      console.error(`   连接来源：${source}`);
      console.error(`   连接身份：current_user=${connUser} rolsuper=${connSuper} rolbypassrls=${connBypass}`);
      console.error('   为什么拒绝：superuser / BYPASSRLS 绕过行级安全，has_table_privilege 与默认权限断言会恒真（假绿）。');
      console.error('   怎么改：改用非特权角色连接（形如 postgres://<role>@host:5432/db，口令走 PGPASSWORD），');
      console.error('           例如 topems_app（应用身份）或 topems_test_runner（测试身份）。');
      console.error('   仅本地演练可显式豁免：RLS_PERMISSIONS_ALLOW_SUPERUSER=1（CI 不得设置，结论不可用于发布判定）。');
      process.exit(1);
    }
    console.warn(
      `⚠️  WARN：特权连接已显式豁免（RLS_PERMISSIONS_ALLOW_SUPERUSER=1）：current_user=${connUser} rolsuper=${connSuper} rolbypassrls=${connBypass}；结论不可用于发布判定`,
    );
  }
  console.log(`[conn] 来源 ${source}；身份 current_user=${connUser}（rolsuper=${connSuper}，rolbypassrls=${connBypass}）`);
  console.log(`🔍 RLS权限校验（目标角色：${role}）`);

  const errors = [];
  const warnings = [];

  // 1. 角色存在性 + 目标角色特权检查（目标与连接身份不一致时同样会让断言恒真）
  const roleCheck = psql(
    url,
    `SELECT rolname || '|' || rolsuper::text || '|' || rolbypassrls::text FROM pg_roles WHERE rolname = '${roleSql}'`,
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
    const [, roleSuper, roleBypass] = roleCheck.out.split('|');
    console.log(`✅ 角色 ${role} 存在`);
    if (roleSuper === 'true' || roleBypass === 'true') {
      if (!ALLOW_PRIVILEGED) {
        console.error('❌ FAILED：目标角色会 BYPASSRLS，校验恒真 —— 拒绝对该角色执行 RLS 权限校验');
        console.error(`   连接来源：${source}`);
        console.error(`   目标角色：${role} rolsuper=${roleSuper} rolbypassrls=${roleBypass}`);
        console.error('   为什么拒绝：对该角色调用 has_table_privilege 会因 superuser / BYPASSRLS 恒为 true。');
        console.error('   怎么改：目标角色改用非特权角色（如 topems_app / topems_test_runner）。');
        console.error('   仅本地演练可显式豁免：RLS_PERMISSIONS_ALLOW_SUPERUSER=1（CI 不得设置，结论不可用于发布判定）。');
        process.exit(1);
      }
      console.warn(
        `⚠️  WARN：目标角色特权已显式豁免（RLS_PERMISSIONS_ALLOW_SUPERUSER=1）：${role} rolsuper=${roleSuper} rolbypassrls=${roleBypass}；结论不可用于发布判定`,
      );
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

main().catch((err) => {
  console.error(`❌ ${err && err.message ? err.message : err}`);
  process.exit(1);
});
