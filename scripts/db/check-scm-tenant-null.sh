#!/usr/bin/env bash
# SCM 租户归属巡检：逐表统计总行数 / tenant_id 为 NULL 的行数
#
# 用途：W7-B 窗口验收跑一次；也可日常巡检。租户隔离 fail-closed 后，
#   `tenant_id IS NULL` 的行对任何租户都不可见——本脚本保证这类行"一眼可见、有数可查"，
#   不会停在"不可见且无告警"。
#
# 用法：
#   bash scripts/db/check-scm-tenant-null.sh                    # 用 .env 的 MIGRATE_URL
#   bash scripts/db/check-scm-tenant-null.sh "postgres://..."   # 指定 DSN（只读事务）
#
# 权限：必须用 superuser 或带 BYPASSRLS 的角色执行。B-2 的 FORCE RLS 对表属主同样生效，
#   普通角色跑出来的 NULL 计数会被策略过滤成 0，结论不可信。
#
# 退出码：
#   0  全部干净
#   1  存在 tenant_id IS NULL 的行（分表计数见输出）→ 需人工确认归属后回填
#   2  有非豁免表缺 tenant_id 列（B-1 未执行或 schema 漂移）
#   3  连接/查询失败
set -euo pipefail

EXEMPT="schema_defense_ledger" # 系统账本：无租户归属，tenant_id 缺列/NULL 均属预期

DSN="${1:-}"
if [ -z "$DSN" ]; then
  set -a; [ -f .env ] && . ./.env; set +a
  DSN="${MIGRATE_URL:-${DATABASE_URL:-}}"
fi
if [ -z "$DSN" ]; then
  echo "!! 未提供 DSN（参数 / MIGRATE_URL / DATABASE_URL 均为空）" >&2
  exit 3
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

if ! psql "$DSN" -X -q -t -A -F'|' -v ON_ERROR_STOP=1 >"$tmp" 2>&1 <<'SQL'
\pset footer off
BEGIN READ ONLY;

-- 库身份证明（每次运行必打，防止把开发库当生产库）
SELECT 'IDENT|' || current_database()
       || '|' || coalesce(inet_server_addr()::text, 'unix:' || current_setting('unix_socket_directories'))
       || '|ledger_max=' || (SELECT max(version)::text FROM _sqlx_migrations)
       || '|user=' || current_user
       || '|super/bypass=' || (SELECT rolsuper::text || '/' || rolbypassrls::text
                                 FROM pg_roles WHERE rolname = current_user);

-- 有 tenant_id 列的表：逐表计数
SELECT format(
         'SELECT %L, count(*), count(*) FILTER (WHERE tenant_id IS NULL) FROM scm.%I',
         c.relname, c.relname
       )
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'scm'
   AND c.relkind = 'r'
   AND EXISTS (SELECT 1 FROM information_schema.columns col
                WHERE col.table_schema = 'scm'
                  AND col.table_name = c.relname
                  AND col.column_name = 'tenant_id')
 ORDER BY c.relname
\gexec

-- 缺 tenant_id 列的表
SELECT 'MISSING|' || c.relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'scm'
   AND c.relkind = 'r'
   AND NOT EXISTS (SELECT 1 FROM information_schema.columns col
                    WHERE col.table_schema = 'scm'
                      AND col.table_name = c.relname
                      AND col.column_name = 'tenant_id')
 ORDER BY c.relname;

COMMIT;
SQL
then
  echo "!! 查询失败：" >&2
  cat "$tmp" >&2
  exit 3
fi

ident="$(grep '^IDENT|' "$tmp" | head -1 | cut -d'|' -f2-)"
echo "库身份: ${ident:-<未取得>}"
echo
echo "表名                                  总行数      NULL 租户"
echo "------------------------------------------------------------"
awk -F'|' -v exempt="$EXEMPT" '
  $1 == "IDENT" { next }
  $1 == "MISSING" {
    mark = ($2 == exempt) ? "  (豁免: 系统账本，按设计无租户列)" : "  <== 需补列"
    print "  [缺列] " $2 mark
    next
  }
  {
    name = $1; total = $2 + 0; nul = $3 + 0
    mark = ""
    if (name == exempt) mark = "  (豁免: 系统账本)"
    printf "%-36s %10d %12d%s\n", name, total, nul, mark
    checked++
    sum_total += total
    if (name != exempt) sum_null += nul
    if (nul > 0 && name != exempt) bad++
  }
  END {
    printf "------------------------------------------------------------\n"
    printf "受检表 %d 张，合计 %d 行，NULL 租户 %d 行（不含系统账本）\n", checked, sum_total, sum_null
    exit (bad > 0 ? 1 : 0)
  }
' "$tmp" || rc=$?

rc="${rc:-0}"
if [ "$rc" -eq 1 ]; then
  echo "!! 存在 tenant_id 为 NULL 的行 → 按裁决口径：不猜归属，人工确认后回填" >&2
  exit 1
fi

if grep -q '^MISSING|' "$tmp"; then
  if grep -v "^MISSING|${EXEMPT}$" "$tmp" | grep -q '^MISSING|'; then
    echo "!! 存在非豁免表缺 tenant_id 列 → B-1 未执行或 schema 漂移" >&2
    exit 2
  fi
fi

echo "OK：scm 全 schema（系统账本除外）无 NULL 租户行"
