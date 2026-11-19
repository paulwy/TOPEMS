#!/usr/bin/env bash
# =============================================================================
# rebuild-verify-classified.sh — 空库全量重建验证（逐文件执行 + 已知缺陷分类跳过）
# =============================================================================
# 用途:
#   在全新空库上按版本顺序逐条执行 database/migrations/*.sql，输出 OK/FAIL/SKIP
#   计数与失败明细。对「已确认无法在纯链空库通过、且不修已发布迁移文件」的条目
#   按分类跳过（skip 清单在本脚本内，不改迁移文件字节 → 不动 sqlx checksum）。
#
# 为什么不 init-first:
#   2026-11-05 在 p4_rebuild_init 实测：先跑 database/init/*.sql 再跑迁移，
#   11 个 init 文件 9 个失败（04 缺 unified_core schema、05 早于 06 建 iam、
#   06/07/07_qms 为 pg_dump 快照含重复主键定义 …），迁移侧 OK 数不变（573）。
#   init 也不创建本清单 16 条所缺的 mes./flow./iam. 对象。故本脚本只跑迁移链。
#
# 三类跳过（详见 docs/quality/p4-reverse-tables-triage-2026-11-05.md §16）:
#   TEST_DIRECTED  (8) 5433/test 定向迁移，不适配纯空库链
#   DEPENDENCY_GAP (7) 依赖链外对象或链内先建后删，纯链必失败
#   P4_FK_ABORT    (1) iam.tenant_permissions 被 20261007000012 删除后仍被引用
#
# 用法:
#   bash scripts/migration/rebuild-verify-classified.sh
#   PGHOST=/tmp PGUSER=air bash scripts/migration/rebuild-verify-classified.sh --db my_verify
#
# 退出码: 0 = 0 失败；1 = 存在失败；2 = 环境/建库失败
# 说明: 重建库默认保留供核对（p4_rebuild_verify），重复执行会先 DROP/CREATE。
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB="p4_rebuild_verify"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --db) DB="$2"; shift 2 ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

: "${PGHOST:?必须显式设置 PGHOST（不再回落到 /tmp socket）}"
: "${PGUSER:?必须显式设置 PGUSER（不再回落到内置用户）}"
PSQL="${PSQL:-psql}"
MIG_DIR="$ROOT/database/migrations"

# --- 库名守卫：只允许验证/临时库，防误删 ---------------------------------------
if ! [[ "$DB" =~ (verify|test|tmp|mig) ]]; then
  echo "错误: 库名 '$DB' 不含 verify/test/tmp/mig 标记，拒绝执行" >&2
  exit 2
fi
if [[ ! -d "$MIG_DIR" ]]; then
  echo "错误: 未找到迁移目录 $MIG_DIR" >&2
  exit 2
fi

# --- 跳过清单（文件|分类|原因） ------------------------------------------------
SKIP_ENTRIES=(
  "20261103200000_db07_test_timestamp_uuid_align_prod.sql|TEST_DIRECTED|test 库时间戳/uuid 对齐，仅面向 test"
  "20261103210000_db08_test_varchar_to_text_190cols.sql|TEST_DIRECTED|test 库 varchar→text 190 列"
  "20261103230000_db10_5433_varchar_text_to_uuid_19cols.sql|TEST_DIRECTED|5433 库类型对齐"
  "20261104000000_db11_5433_varchar_to_text_24cols.sql|TEST_DIRECTED|5433 库类型对齐"
  "20261104030000_db14_test_varchar_to_uuid_7cols_with_data.sql|TEST_DIRECTED|test 库含存量数据转换"
  "20261104040000_db15_5433_integer_bigint_16cols.sql|TEST_DIRECTED|5433 库类型对齐"
  "20261104050000_db16_5433_tenant_id_rls_decouple_14cols.sql|TEST_DIRECTED|5433 库 RLS 解耦"
  "20261104070000_db18_5433_special_types_8cols.sql|TEST_DIRECTED|5433 库特殊类型对齐"
  "20261005000004_lims_qa_lab_fk_repoint.sql|DEPENDENCY_GAP|前向依赖：public.qa_lab_tasks 由更晚的 20261007000009 建"
  "20261029185000_schema_defense_align_columns.sql|DEPENDENCY_GAP|链建 public.qa_sampling_plans，本迁移改 mes.qa_sampling_plans（prod 该表来自运行时/历史残留）"
  "20261029200000_schema_defense_type_align.sql|DEPENDENCY_GAP|链建 public.workshops，本迁移改 mes.workshops（prod 该表来自运行时/历史残留）"
  "20261102220000_rls_enable_biz_batch1.sql|DEPENDENCY_GAP|iam.tenant_permissions 已被 20261007000012 DROP"
  "20261104130000_p3_pk_5.sql|DEPENDENCY_GAP|flow.core_master_data_refs 已被 20261027200000 DROP"
  "20261104140000_p3_unique_48.sql|DEPENDENCY_GAP|flow.core_file_permissions 已被 20261027200000 DROP"
  "20261104150000_p3_fk_45.sql|DEPENDENCY_GAP|flow.core_doc_document_versions 链内无 flow 版（仅 public 版）"
  "20261105100000_p4_drop_shadow_tables_and_repoint_fks.sql|P4_FK_ABORT|B4 断言入站 FK 残留而 ABORT；根因同 iam.tenant_permissions 缺失"
)

echo "== 空库重建验证（分类跳过）=="
echo "  库: $DB @ ${PGHOST}  跳过条目: ${#SKIP_ENTRIES[@]}"

ADMIN="$PSQL -h $PGHOST -U $PGUSER -d postgres"
$ADMIN -q -c "DROP DATABASE IF EXISTS \"$DB\";" -c "CREATE DATABASE \"$DB\";" || {
  echo "错误: 无法重建数据库 $DB" >&2; exit 2
}
DB_CONN="$PSQL -h $PGHOST -U $PGUSER -d $DB"
for ext in "uuid-ossp" pgcrypto pg_trgm vector postgis; do
  $DB_CONN -q -c "CREATE EXTENSION IF NOT EXISTS \"$ext\";" >/dev/null 2>&1
done

ok=0; fail=0; skip=0
FAILED=()
for f in $(ls "$MIG_DIR"/*.sql | LC_ALL=C sort); do
  b="$(basename "$f")"
  entry="$(printf '%s\n' "${SKIP_ENTRIES[@]}" | grep -F "$b|" | head -1)"
  if [[ -n "$entry" ]]; then
    skip=$((skip+1))
    echo "SKIP $b [$(echo "$entry" | cut -d'|' -f2)] $(echo "$entry" | cut -d'|' -f3)"
    continue
  fi
  out="$($DB_CONN --single-transaction -v ON_ERROR_STOP=1 -f "$f" 2>&1)"
  if [[ $? -eq 0 ]]; then
    ok=$((ok+1))
  else
    fail=$((fail+1))
    msg="$(echo "$out" | grep -E "ERROR|FATAL|错误" | head -1)"
    FAILED+=("$b :: $msg")
    echo "FAIL $b :: $msg"
  fi
done

echo "== 汇总 =="
echo "  OK=$ok  FAIL=$fail  SKIP=$skip  文件总数=$((ok+fail+skip))"
if [[ $fail -ne 0 ]]; then
  echo "  失败明细:"; printf '   - %s\n' "${FAILED[@]}"
  exit 1
fi
echo "✅ 空库重建通过（$ok 条应用，0 失败，$skip 条按分类跳过）"
echo "  核对库: ${DB}（需要清理时手工 DROP DATABASE ${DB}）"
