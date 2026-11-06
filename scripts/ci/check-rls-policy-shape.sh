#!/usr/bin/env bash
# P0 · RLS 策略形态门禁
#
# 目的：防止未来任何新增迁移 / 生成器把租户策略退回 fail-open 形态。
#
# 检查范围（只查 P0 之后的产物，历史迁移不可改、不在此列）：
#   1) database/migrations/** 与 database/migrations_deferred/** 中版本号 >= 20261106120000 的 .sql
#   2) lib/shared-db/src/rls.rs（策略生成器）
#
# 禁止形态：
#   - `OR <租户列> IS NULL`            → 未设租户时放行 NULL 行，等于部分关闭隔离
#   - `current_setting(...) = ''`      → 空串被当作"全量/豁免"
#   - 策略谓词里硬编码租户 0001        → 非 0001 租户全 0 行
#   - 生成器缺少 FORCE ROW LEVEL SECURITY
#
# 用法：
#   scripts/ci/check-rls-policy-shape.sh
#   RLS_CHECK_DB=topems_test scripts/ci/check-rls-policy-shape.sh   # 额外对活库断言
#
# 退出码：0 = 通过；1 = 发现违规。

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CUTOVER="20261106120000"
FAIL=0
HITS=()

report() {
  FAIL=1
  HITS+=("$1")
}

# ---------- 1) 迁移文件静态检查 ----------
# 兼容 macOS 自带 bash 3.2（无 mapfile）
FILES=()
while IFS= read -r f; do
  [[ -n "$f" ]] && FILES+=("$f")
done < <(
  {
    find "$ROOT/database/migrations" "$ROOT/database/migrations_deferred" -maxdepth 1 -type f -name '*.sql' 2>/dev/null || true
  } | while read -r f; do
    base="$(basename "$f")"
    ver="${base%%_*}"
    [[ "$ver" =~ ^[0-9]{14}$ ]] || continue
    (( 10#$ver >= 10#$CUTOVER )) && echo "$f"
  done | sort
)

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "迁移静态检查：无 P0 之后的迁移文件（跳过）"
else
  echo "迁移静态检查：${#FILES[@]} 个文件"
  for f in "${FILES[@]}"; do
    rel="${f#"$ROOT"/}"
    # 未设即豁免：OR <tenant 列> IS NULL
    if grep -nEiq "OR[[:space:]]+([a-z_]*tenant[a-z_]*)[[:space:]]+IS[[:space:]]+NULL" "$f"; then
      report "$rel: 含 'OR <tenant 列> IS NULL' 豁免分支"
    fi
    # 空串即豁免
    if grep -nEiq "current_setting\\('app\\.tenant_id'[^)]*\\)[[:space:]]*=[[:space:]]*''" "$f"; then
      report "$rel: 含 \"current_setting(...) = ''\" 豁免分支"
    fi
    if grep -nEiq "NULLIF\\(current_setting\\('app\\.tenant_id'[^)]*\\),[[:space:]]*''\\)[[:space:]]+IS[[:space:]]+NULL" "$f"; then
      report "$rel: 含 'NULLIF(current_setting(...), '''') IS NULL' 豁免分支"
    fi
    # 策略谓词内硬编码租户 0001（仅当同一行出现策略关键字，避免误伤数据回填）
    if grep -nEi "00000000-0000-0000-0000-000000000001" "$f" | grep -Eiq "current_setting|CREATE POLICY|ALTER POLICY|USING|WITH CHECK"; then
      report "$rel: 策略谓词内硬编码租户 0001"
    fi
  done
fi

# ---------- 2) 生成器检查 ----------
RLS_RS="$ROOT/lib/shared-db/src/rls.rs"
if [[ -f "$RLS_RS" ]]; then
  echo "生成器检查：lib/shared-db/src/rls.rs"
  if grep -nEq "OR[[:space:]]+tenant_id[[:space:]]+IS[[:space:]]+NULL" "$RLS_RS"; then
    report "lib/shared-db/src/rls.rs: 生成器仍含 'tenant_id IS NULL' 豁免分支"
  fi
  if grep -nEq "NULLIF\\(current_setting\\('app\\.tenant_id'\\),[[:space:]]*''\\)" "$RLS_RS"; then
    report "lib/shared-db/src/rls.rs: 生成器仍含空串豁免形态"
  fi
  if ! grep -q "FORCE ROW LEVEL SECURITY" "$RLS_RS"; then
    report "lib/shared-db/src/rls.rs: 生成器缺少 FORCE ROW LEVEL SECURITY"
  fi
fi

# ---------- 3) 活库断言（可选） ----------
if [[ -n "${RLS_CHECK_DB:-}" ]]; then
  echo "活库断言：$RLS_CHECK_DB"
  BAD=$(psql -X -A -t -d "$RLS_CHECK_DB" -c "
    SELECT count(*) FROM pg_policy
    WHERE pg_get_expr(polqual, polrelid) LIKE '%current_setting%'
      AND (
        pg_get_expr(polqual, polrelid) LIKE '% IS NULL%'
        OR pg_get_expr(polqual, polrelid) LIKE '%00000000-0000-0000-0000-000000000001%'
      );")
  if [[ "${BAD//[[:space:]]/}" != "0" ]]; then
    report "$RLS_CHECK_DB: $BAD 条策略仍含豁免分支/硬编码 0001"
  fi
  BADFORCE=$(psql -X -A -t -d "$RLS_CHECK_DB" -c "
    SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relrowsecurity AND NOT c.relforcerowsecurity
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND EXISTS (SELECT 1 FROM information_schema.columns col
                  WHERE col.table_schema = n.nspname AND col.table_name = c.relname
                    AND col.column_name IN ('tenant_id', 'tenant_uid'));")
  if [[ "${BADFORCE//[[:space:]]/}" != "0" ]]; then
    report "$RLS_CHECK_DB: $BADFORCE 张有租户列的 RLS 表未 FORCE"
  fi
fi

# ---------- 结果 ----------
if [[ $FAIL -ne 0 ]]; then
  echo
  echo "❌ RLS 策略形态检查失败："
  for h in "${HITS[@]}"; do echo "  - $h"; done
  exit 1
fi

echo
echo "✅ RLS 策略形态检查通过（无 fail-open 退回）"
