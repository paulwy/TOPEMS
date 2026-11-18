#!/usr/bin/env bash
# ============================================================
# RLS 六档基线重建（fail-closed）
#
# 用途：
#   1) 从生产库只读导出结构 + 目标表数据，重建一个隔离库；
#   2) 在隔离库上用非超级用户跑「未设置 / 空串 / 全零 / 租户A / 租户B / 租户A+系统通道」六档读数；
#   3) 结果存档到 artifacts/rls-baseline/<目标库>/。
#
# 表清单唯一来源：docs/database/loose-rls-prod-inventory-2026-11-18.md
#   机器可读段由 <!-- rls-baseline:begin --> / <!-- rls-baseline:end --> 包裹。
#
# 红线：生产库只执行 SELECT 与 pg_dump --schema-only/--data-only 只读导出，
#       任何写操作只发生在目标隔离库。
#
# 用法：
#   scripts/dev/rls-baseline-rebuild.sh [--doc <path>] [--prod-db <db>] [--target-db <db>]
#                                       [--probe-role <role>] [--expected <n>] [--recreate]
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DOC="$REPO_ROOT/docs/database/loose-rls-prod-inventory-2026-11-18.md"
PROD_DB="${PROD_DB:-topems_prod}"
TARGET_DB="${TARGET_DB:-}"
PROBE_ROLE="${PROBE_ROLE:-rls_test_user}"
EXPECTED_TABLES="${EXPECTED_TABLES:-111}"
RECREATE=0

usage() {
  sed -n '2,25p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --doc) DOC="$2"; shift 2 ;;
    --prod-db) PROD_DB="$2"; shift 2 ;;
    --target-db) TARGET_DB="$2"; shift 2 ;;
    --probe-role) PROBE_ROLE="$2"; shift 2 ;;
    --expected) EXPECTED_TABLES="$2"; shift 2 ;;
    --recreate) RECREATE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "FAIL: 未知参数 $1" >&2; exit 1 ;;
  esac
done

die() { echo "FAIL: $*" >&2; exit 1; }
step() { echo "==> $*"; }

if [[ -z "$TARGET_DB" ]]; then
  TARGET_DB="topems_rls_baseline_$(date +%Y%m%d)"
fi

# ---------- 1. 前置检查（任一不满足即退出，不降级继续） ----------
step "前置检查"
for c in psql pg_dump createdb dropdb; do
  command -v "$c" >/dev/null 2>&1 || die "缺少命令：$c"
done

[[ -f "$DOC" ]] || die "表清单文档不存在：$DOC"

psql -d "$PROD_DB" -Atqc 'select 1' >/dev/null 2>&1 \
  || die "生产库不可达：${PROD_DB}（只读连接失败）"

psql -d postgres -Atqc "select 1 from pg_database where datname = '$PROD_DB'" | grep -qx 1 \
  || die "目标生产库不存在：$PROD_DB"

[[ "$TARGET_DB" != "$PROD_DB" ]] || die "目标库不能与生产库同名：$TARGET_DB"

probe_meta="$(psql -d postgres -Atqc "select rolsuper::int || '|' || rolbypassrls::int from pg_roles where rolname = '$PROBE_ROLE'")"
[[ -n "$probe_meta" ]] || die "探针角色不存在：$PROBE_ROLE"
[[ "$probe_meta" == "0|0" ]] || die "探针角色必须是 NOSUPERUSER + NOBYPASSRLS，实际：$probe_meta"

# ---------- 2. 从盘点文档解析表清单 ----------
step "解析表清单：$DOC"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

awk '
  /<!-- rls-baseline:begin -->/ { in_block = 1; next }
  /<!-- rls-baseline:end -->/   { in_block = 0; next }
  in_block && /^[a-z_]+\.[a-z0-9_]+$/ { print }
' "$DOC" > "$TMP_DIR/targets.txt"

TABLES=()
while IFS= read -r line; do
  [[ -n "$line" ]] && TABLES+=("$line")
done < "$TMP_DIR/targets.txt"
[[ "${#TABLES[@]}" -gt 0 ]] || die "文档中未解析到任何表（检查 rls-baseline 标记段）"
[[ "${#TABLES[@]}" -eq "$EXPECTED_TABLES" ]] \
  || die "表清单数量 ${#TABLES[@]} 与期望 $EXPECTED_TABLES 不一致（清单缺表或多表）"

dups="$(sort "$TMP_DIR/targets.txt" | uniq -d)"
[[ -z "$dups" ]] || die "表清单存在重复项：$(echo "$dups" | tr '\n' ' ')"

missing="$(psql -d "$PROD_DB" -Atq <<SQL
create temp table _rls_targets(tbl text primary key);
\copy _rls_targets from '$TMP_DIR/targets.txt'
select coalesce(string_agg(tbl, ', ' order by tbl), '') from _rls_targets where to_regclass(tbl) is null;
SQL
)"
missing="$(echo "$missing" | tail -n 1)"
[[ -z "$missing" ]] || die "清单中的表在生产库不存在：$missing"

# ---------- 3. 目标库状态（已存在则要求显式 --recreate） ----------
step "目标库：$TARGET_DB"
existing="$(psql -d postgres -Atqc "select 1 from pg_database where datname = '$TARGET_DB'")"
if [[ "$existing" == "1" ]]; then
  [[ "$RECREATE" == "1" ]] || die "目标库已存在：${TARGET_DB}（确认可覆盖后加 --recreate）"
  step "删除已存在的目标库"
  dropdb "$TARGET_DB" || die "删除目标库失败：$TARGET_DB"
fi

WORK_DIR="$REPO_ROOT/artifacts/rls-baseline/$TARGET_DB"
mkdir -p "$WORK_DIR"
OUT_TSV="$WORK_DIR/matrix.tsv"

step "创建目标库"
createdb "$TARGET_DB" || die "创建目标库失败：$TARGET_DB"

# ---------- 4. 结构与数据（生产只读） ----------
step "导出生产结构（--schema-only）"
pg_dump -d "$PROD_DB" --schema-only --no-owner --no-privileges -f "$TMP_DIR/schema.sql" \
  || die "pg_dump 结构导出失败"

step "导入结构"
psql -d "$TARGET_DB" -v ON_ERROR_STOP=1 -f "$TMP_DIR/schema.sql" > "$WORK_DIR/restore_schema.log" 2>&1 \
  || die "结构导入失败，见 $WORK_DIR/restore_schema.log"

src_tables="$(psql -d "$PROD_DB" -Atqc "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind = 'r' and n.nspname not in ('pg_catalog','information_schema')")"
dst_tables="$(psql -d "$TARGET_DB" -Atqc "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind = 'r' and n.nspname not in ('pg_catalog','information_schema')")"
[[ "$src_tables" == "$dst_tables" ]] \
  || die "结构导入后表数不一致：生产 $src_tables / 隔离库 $dst_tables"

step "导出目标表数据（--data-only，${#TABLES[@]} 张）"
dump_args=()
for t in "${TABLES[@]}"; do
  dump_args+=(-t "$t")
done
pg_dump -d "$PROD_DB" --data-only --no-owner --no-privileges "${dump_args[@]}" -f "$TMP_DIR/data.sql" \
  || die "pg_dump 数据导出失败"

step "导入目标表数据"
psql -d "$TARGET_DB" -v ON_ERROR_STOP=1 -f "$TMP_DIR/data.sql" > "$WORK_DIR/restore_data.log" 2>&1 \
  || die "数据导入失败，见 $WORK_DIR/restore_data.log"

for t in "${TABLES[@]}"; do
  p="$(psql -d "$PROD_DB" -Atqc "select count(*) from $t")"
  q="$(psql -d "$TARGET_DB" -Atqc "select count(*) from $t")"
  [[ "$p" == "$q" ]] || die "行数不一致：$t 生产=$p 隔离库=$q"
done

# ---------- 5. 六档矩阵 ----------
step "生成六档探针脚本"
cat > "$TMP_DIR/matrix.sql" <<SQL
\\set ON_ERROR_STOP on
SET client_min_messages = warning;

DROP SCHEMA IF EXISTS _rlsprobe CASCADE;
CREATE SCHEMA _rlsprobe;
CREATE TABLE _rlsprobe.targets (tbl text PRIMARY KEY);
\\copy _rlsprobe.targets from '$TMP_DIR/targets.txt'
CREATE TABLE _rlsprobe.results (
  tbl text, rls_on boolean, policies int, tier text,
  visible bigint, total bigint, rejected bigint, err text
);

-- 仅在本隔离库内授权给非超级用户探针角色
DO \$g\$
DECLARE t text; s text;
BEGIN
  FOR s IN SELECT DISTINCT split_part(tbl, '.', 1) FROM _rlsprobe.targets LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', s, '$PROBE_ROLE');
  END LOOP;
  FOR t IN SELECT tbl FROM _rlsprobe.targets LOOP
    EXECUTE format('GRANT SELECT ON %s TO %I', t, '$PROBE_ROLE');
  END LOOP;
END \$g\$;

DO \$m\$
DECLARE
  tiers text[] := ARRAY['unset','empty','zero','tenantA','tenantB','tenantA_system'];
  t text; tier text; n bigint; tot bigint; err text; on_rls boolean; npol int; i int;
BEGIN
  FOR t IN SELECT tbl FROM _rlsprobe.targets ORDER BY tbl LOOP
    EXECUTE format('SELECT count(*) FROM %s', t) INTO tot;
    SELECT c.relrowsecurity, (SELECT count(*) FROM pg_policies p
      WHERE p.schemaname = split_part(t, '.', 1) AND p.tablename = split_part(t, '.', 2))
      INTO on_rls, npol
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = split_part(t, '.', 1) AND c.relname = split_part(t, '.', 2);

    FOR i IN 1..array_length(tiers, 1) LOOP
      tier := tiers[i];
      RESET ROLE;
      EXECUTE 'RESET app.tenant_id';
      EXECUTE 'RESET app.rls_system';
      IF tier = 'empty' THEN
        PERFORM set_config('app.tenant_id', '', true);
      ELSIF tier = 'zero' THEN
        PERFORM set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', true);
      ELSIF tier = 'tenantA' THEN
        PERFORM set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', true);
      ELSIF tier = 'tenantB' THEN
        PERFORM set_config('app.tenant_id', '00000000-0000-0000-0000-000000000002', true);
      ELSIF tier = 'tenantA_system' THEN
        PERFORM set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', true);
        PERFORM set_config('app.rls_system', 'on', true);
      END IF;

      SET LOCAL ROLE $PROBE_ROLE;
      n := NULL; err := NULL;
      BEGIN
        EXECUTE format('SELECT count(*) FROM %s', t) INTO n;
      EXCEPTION WHEN OTHERS THEN
        n := NULL; err := SQLSTATE;
      END;
      RESET ROLE;

      INSERT INTO _rlsprobe.results VALUES
        (t, on_rls, npol, tier, n, tot, CASE WHEN n IS NULL THEN NULL ELSE tot - n END, err);
    END LOOP;
  END LOOP;
END \$m\$;
SQL

step "执行六档探针"
psql -d "$TARGET_DB" -v ON_ERROR_STOP=1 -f "$TMP_DIR/matrix.sql" > "$WORK_DIR/matrix_run.log" 2>&1 \
  || die "六档探针执行失败，见 $WORK_DIR/matrix_run.log"

psql -d "$TARGET_DB" -v ON_ERROR_STOP=1 -c "\copy (
  SELECT tbl,
         rls_on,
         policies,
         max(total) AS total_rows,
         max(visible) FILTER (WHERE tier = 'unset')          AS t_unset,
         max(visible) FILTER (WHERE tier = 'empty')          AS t_empty,
         max(visible) FILTER (WHERE tier = 'zero')           AS t_zero,
         max(visible) FILTER (WHERE tier = 'tenantA')        AS t_tenant_a,
         max(visible) FILTER (WHERE tier = 'tenantB')        AS t_tenant_b,
         max(visible) FILTER (WHERE tier = 'tenantA_system') AS t_tenant_a_system,
         count(DISTINCT visible) AS distinct_readings,
         max(err) AS err,
         CASE
           WHEN max(total) = 0 THEN 'EMPTY'
           WHEN NOT bool_or(rls_on) THEN 'RLS_OFF'
           WHEN count(DISTINCT visible) = 1 THEN 'NO_ISOLATION'
           ELSE 'ISOLATED'
         END AS note
  FROM _rlsprobe.results
  GROUP BY tbl, rls_on, policies
  ORDER BY note DESC, tbl
) TO '$OUT_TSV' WITH (FORMAT csv, DELIMITER E'\t', HEADER true)" > /dev/null \
  || die "导出矩阵结果失败"

# ---------- 6. 存档摘要 ----------
step "生成摘要"
{
  echo "# RLS 六档基线（${TARGET_DB}）"
  echo
  echo "- 生成时间：$(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "- 生产库（只读）：$PROD_DB"
  echo "- 隔离库：$TARGET_DB"
  echo "- 表清单来源：$DOC"
  echo "- 覆盖表数：${#TABLES[@]}"
  echo "- 生产 _sqlx_migrations 最高版本：$(psql -d "$PROD_DB" -Atqc 'select max(version) from _sqlx_migrations')"
  echo
  echo "## 分类计数"
  echo
  echo '```'
  awk -F'\t' 'NR > 1 { c[$13]++ } END { for (k in c) printf "%s\t%d\n", k, c[k] }' "$OUT_TSV" | sort
  echo '```'
  echo
  echo "说明：EMPTY=空表等值、无可观测证据；RLS_OFF=未启用 RLS（结构上全放行）；NO_ISOLATION=六档读数完全相同；ISOLATED=六档读数有差异。"
  echo
  echo "明细见 \`matrix.tsv\`。"
} > "$WORK_DIR/summary.md"

step "完成"
echo "隔离库：$TARGET_DB"
echo "结果目录：$WORK_DIR"
awk -F'\t' 'NR > 1 { c[$13]++ } END { for (k in c) printf "  %s=%d\n", k, c[k] }' "$OUT_TSV" | sort
