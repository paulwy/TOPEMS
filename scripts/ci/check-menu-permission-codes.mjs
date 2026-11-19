#!/usr/bin/env node
/**
 * 菜单权限码完整性门禁（[Gate MENU-PERM]）
 *
 * 背景：W1-2c 的三条 CRM 菜单权限码别名（crm:scoring:read 等）在库里没有对应
 *       权限行，静态 menu-health-gate 只看代码侧 Route×NavItem，发现不了此类
 *       “数据层菜单引用了不存在的权限码”的漂移。
 *
 * 判定：core_menus.permissions->>'permission' 的每个非空值，必须在
 *       core_permissions.code 中存在；缺失即 FAIL（无 WARN 降级）。
 *
 * 用法：
 *   node scripts/ci/check-menu-permission-codes.mjs --dsn 'postgresql:///topems?host=/tmp'
 *   node scripts/ci/check-menu-permission-codes.mjs --summary
 *
 * 连接解析顺序：--dsn > RLS_POLICY_DB_URL > MIGRATION_DRIFT_DB_URL > DATABASE_URL > .env MIGRATE_URL。
 */
import { execFileSync } from "node:child_process";
import { resolveDbUrl, dbLabel } from "./lib/rls-policy-snapshot.mjs";

const TAG = "[Gate MENU-PERM]";

function parseArgs(argv) {
  const out = { dsn: null, summary: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dsn") out.dsn = argv[++i];
    else if (arg === "--summary") out.summary = true;
    else if (arg === "--help" || arg === "-h") {
      console.log("用法: node scripts/ci/check-menu-permission-codes.mjs [--dsn <url>] [--summary]");
      process.exit(0);
    } else {
      console.error(`${TAG} 未知参数: ${arg}`);
      process.exit(2);
    }
  }
  return out;
}

function psql(url, sql) {
  return execFileSync(
    "psql",
    [url, "-v", "ON_ERROR_STOP=1", "-Atc", sql],
    { encoding: "utf8", timeout: 15000 },
  ).trim();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { url, source } = resolveDbUrl(args.dsn);
  if (!url) {
    console.error(`${TAG} FAIL: 未找到数据库连接（--dsn / RLS_POLICY_DB_URL / DATABASE_URL / .env MIGRATE_URL）`);
    process.exit(1);
  }

  try {
    const menuTable = psql(
      url,
      "select coalesce(to_regclass('public.core_menus')::text, to_regclass('iam.core_menus')::text)",
    );
    const permTable = psql(
      url,
      "select coalesce(to_regclass('public.core_permissions')::text, to_regclass('iam.core_permissions')::text)",
    );
    if (!menuTable || !permTable) {
      console.error(`${TAG} FAIL: 缺少 core_menus 或 core_permissions（db=${dbLabel(url)}）`);
      process.exit(1);
    }

    const missingSql = `
      select string_agg(code, E'\\n' order by code)
      from (
        select distinct m.permissions->>'permission' as code
        from ${menuTable} m
        where jsonb_typeof(m.permissions) = 'object'
          and nullif(m.permissions->>'permission', '') is not null
          and not exists (
            select 1 from ${permTable} p
            where p.code = m.permissions->>'permission'
          )
      ) x`;
    const missing = psql(url, missingSql);
    const total = Number(
      psql(
        url,
        `select count(distinct permissions->>'permission') from ${menuTable}
         where jsonb_typeof(permissions) = 'object'
           and nullif(permissions->>'permission', '') is not null`,
      ) || "0",
    );

    if (args.summary) {
      console.log(`${TAG} db=${dbLabel(url)}（${source}）菜单权限码 ${total} 个，缺失 ${missing ? missing.split("\n").length : 0} 个`);
    }
    if (missing) {
      const codes = missing.split("\n");
      console.error(`${TAG} FAIL: ${codes.length} 个菜单权限码在 core_permissions 中不存在：`);
      for (const code of codes.slice(0, 50)) console.error(`  - ${code}`);
      if (codes.length > 50) console.error(`  ... 其余 ${codes.length - 50} 个省略`);
      process.exit(1);
    }
    console.log(`${TAG} PASS: ${total} 个菜单权限码均存在于 core_permissions`);
  } catch (err) {
    console.error(`${TAG} FAIL: 查询失败（db=${dbLabel(url)}）：${err.message}`);
    process.exit(1);
  }
}

main();
