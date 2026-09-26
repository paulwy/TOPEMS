#!/usr/bin/env node
/**
 * RLS权限校验脚本（CI Gate）
 * 检查：
 * 1. topems_app用户是否存在
 * 2. 关键表是否已授权给topems_app
 * 3. 默认权限是否已设置（新增表自动授权）
 */

const { execSync } = require('child_process');

const DB_URL = process.env.DATABASE_URL || 'postgres://topems:topems_secret@localhost:5432/topems';

function query(sql) {
  try {
    return execSync(`psql "${DB_URL}" -t -c "${sql}"`, { encoding: 'utf-8' }).trim();
  } catch (e) {
    return null;
  }
}

function main() {
  console.log('🔍 RLS权限校验...');

  const errors = [];
  const warnings = [];

  // 1. 检查topems_app角色是否存在
  const roleExists = query(`SELECT 1 FROM pg_roles WHERE rolname = 'topems_app'`) === '1';
  if (!roleExists) {
    errors.push('❌ topems_app角色不存在！请运行 scripts/db/grant-topems-app.sql');
  } else {
    console.log('✅ topems_app角色存在');
  }

  // 2. 检查关键表是否已授权
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
    const hasGrant = query(`
      SELECT 1 FROM information_schema.role_table_grants
      WHERE grantee = 'topems_app'
        AND table_schema = '${schema}'
        AND table_name = '${tableName}'
        AND privilege_type = 'SELECT'
    `) === '1';

    if (!hasGrant) {
      errors.push(`❌ ${table} 未授权给topems_app！`);
    } else {
      console.log(`✅ ${table} 已授权`);
    }
  }

  // 3. 检查默认权限是否设置
  const hasDefaultPrivs = query(`
    SELECT 1 FROM pg_default_acl
    WHERE defaclrole = (SELECT oid FROM pg_roles WHERE rolname = 'topems')
      AND defaclobjtype = 'r'
      AND defaclacl::text LIKE '%topems_app%'
  `) === '1';

  if (!hasDefaultPrivs) {
    warnings.push('⚠️  默认权限未设置：新增表不会自动授权给topems_app');
  } else {
    console.log('✅ 默认权限已设置（新增表自动授权）');
  }

  // 输出结果
  console.log('');
  if (warnings.length > 0) {
    console.log('⚠️  警告：');
    warnings.forEach(w => console.log(`  ${w}`));
  }

  if (errors.length > 0) {
    console.log('❌ 错误：');
    errors.forEach(e => console.log(`  ${e}`));
    console.log('\n💡 修复方法：运行 psql $DATABASE_URL -f scripts/db/grant-topems-app.sql');
    process.exit(1);
  }

  console.log('\n✅ RLS权限校验通过！');
}

main();
