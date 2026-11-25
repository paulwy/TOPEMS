#!/usr/bin/env bash
# =============================================================================
# 基线重建：恢复 schema 快照 + 载入账本锚点 + 前向应用（version > anchor）
#
# 流程：
#   1) DROP/CREATE 目标 scratch 库
#   2) gunzip -c <基线> | psql  （dump 内含 CREATE EXTENSION，勿额外预建扩展）
#   3) 载入 prod_ledger_<anchor>.sql（仅 success=true 的已应用记录）
#   4) 恢复参考数据基线（baseline_<anchor>_data.sql.gz，默认开启；--no-data 跳过）
#   5) 断言：表数 = meta.table_count、账本条数 = ledger_rows、max(version)=anchor
#   6) scripts/migration/apply-forward.sh --anchor <anchor>
#   7) 终态断言：旧下线表不存在、参考数据行数与元数据一致
#
# 用法：
#   bash scripts/migration/rebuild-from-baseline.sh --db p4_baseline_verify
#   bash scripts/migration/rebuild-from-baseline.sh --baseline database/baseline/baseline_<v>.json --db x
#   bash scripts/migration/rebuild-from-baseline.sh --db x --no-data
#
# 退出码：0 成功；1 校验失败；2 环境/参数错误
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB="p4_baseline_verify"
META=""
WITH_DATA=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db) DB="$2"; shift 2 ;;
    --baseline) META="$2"; shift 2 ;;
    --no-data) WITH_DATA=0; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

[[ "$DB" =~ (verify|test|tmp|mig|baseline) ]] || { echo "拒绝：目标库名需含 verify/test/tmp/mig/baseline" >&2; exit 2; }

if [[ -z "$META" ]]; then
  LATEST=0
  for f in "$ROOT"/database/baseline/baseline_*.json; do
    [[ -e "$f" ]] || continue
    # 仅结构基线元数据（排除 baseline_<anchor>_data.json）
    [[ "$(basename "$f")" =~ ^baseline_[0-9]{14}\.json$ ]] || continue
    v="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["anchor_version"])' "$f")"
    [[ "$v" =~ ^[0-9]{14}$ ]] || continue
    if (( 10#$v > LATEST )); then LATEST=$((10#$v)); META="$f"; fi
  done
fi
[[ -f "$META" ]] || { echo "找不到基线元数据（先跑 gen-baseline.sh）" >&2; exit 2; }

meta() { python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]])' "$META" "$1"; }
ANCHOR="$(meta 'anchor_version')"
TABLES="$(meta 'table_count')"
LEDGER_ROWS="$(meta 'ledger_rows')"
SCHEMA_FILE="$(meta 'schema_file')"
LEDGER_FILE="$(meta 'ledger_file')"
BASE_DIR="$(dirname "$META")"
DATA_META="$BASE_DIR/baseline_${ANCHOR}_data.json"

: "${PGHOST:?必须显式设置 PGHOST（不再回落到 /tmp socket）}"
: "${PGUSER:?必须显式设置 PGUSER（不再回落到内置用户）}"
PSQL=(psql -h "$PGHOST" -U "$PGUSER")
export PGHOST PGUSER

echo "== 基线与锚点"
echo "   anchor=$ANCHOR tables=$TABLES ledger=$LEDGER_ROWS"
echo "   schema=$SCHEMA_FILE"

if (( WITH_DATA == 1 )); then
  [[ -f "$DATA_META" ]] || { echo "找不到参考数据元数据：${DATA_META}（如确不需参考数据，请加 --no-data）" >&2; exit 2; }
  DATA_FILE="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["data_file"])' "$DATA_META")"
  [[ -f "$BASE_DIR/$DATA_FILE" ]] || { echo "找不到参考数据资产：${BASE_DIR}/${DATA_FILE}" >&2; exit 2; }
fi

"${PSQL[@]}" -d postgres -q -c "DROP DATABASE IF EXISTS \"$DB\";" -c "CREATE DATABASE \"$DB\";"

# 迁移中的 GRANT 依赖运行期应用角色；全新 PG 实例不会自带该角色。
APP_ROLE="${APP_ROLE:-topems_app}"
if ! "${PSQL[@]}" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='${APP_ROLE}'" | grep -q 1; then
  echo "== 创建应用角色 ${APP_ROLE}（NOLOGIN，仅用于迁移 GRANT）"
  "${PSQL[@]}" -d postgres -q -c "CREATE ROLE \"${APP_ROLE}\" NOLOGIN"
fi
if ! "${PSQL[@]}" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='topems_owner'" | grep -q 1; then
  echo "== 创建迁移角色 topems_owner（NOLOGIN，schema 属主）"
  "${PSQL[@]}" -d postgres -q -c "CREATE ROLE topems_owner NOLOGIN"
fi

echo "== 预置 schema（基线 dump 不含插件 schema，且 CREATE SCHEMA 非幂等）"
psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -q -v ON_ERROR_STOP=1 -f "$ROOT/database/scripts/bootstrap_schemas.sql"

echo "== 恢复 schema 快照"
gunzip -c "$BASE_DIR/$SCHEMA_FILE" | grep -Ev '^(CREATE SCHEMA |COMMENT ON EXTENSION |SET transaction_timeout = )' | psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -q -v ON_ERROR_STOP=1

echo "== 载入账本锚点"
psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -q -v ON_ERROR_STOP=1 -f "$BASE_DIR/$LEDGER_FILE"

if (( WITH_DATA == 1 )); then
  echo "== 恢复参考数据基线（${DATA_FILE}）"
  gunzip -c "$BASE_DIR/$DATA_FILE" | grep -Ev '^(COMMENT ON EXTENSION |SET transaction_timeout = )' | psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -q -v ON_ERROR_STOP=1
fi

ACT_TABLES="$(psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -tA -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')")"
ACT_LEDGER="$(psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -tA -c "SELECT count(*) FROM _sqlx_migrations WHERE success")"
ACT_ANCHOR="$(psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -tA -c "SELECT max(version) FROM _sqlx_migrations WHERE success")"

echo "== 对齐断言"
[[ "$ACT_TABLES" = "$TABLES" ]] || { echo "FAIL: 表数 $ACT_TABLES != $TABLES" >&2; exit 1; }
[[ "$ACT_LEDGER" = "$LEDGER_ROWS" ]] || { echo "FAIL: 账本 $ACT_LEDGER != $LEDGER_ROWS" >&2; exit 1; }
[[ "$ACT_ANCHOR" = "$ANCHOR" ]] || { echo "FAIL: 锚点 $ACT_ANCHOR != $ANCHOR" >&2; exit 1; }
echo "   OK: tables=$ACT_TABLES ledger=$ACT_LEDGER anchor=$ACT_ANCHOR"

if (( WITH_DATA == 1 )); then
  echo "== 参考数据行数校验"
  while IFS='|' read -r t expected; do
    [[ -z "$t" ]] && continue
    actual="$(psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -tA -c "SELECT count(*) FROM $t")"
    actual="${actual//[^0-9]/}"
    [[ "$actual" = "$expected" ]] || { echo "FAIL: 参考数据行数不符：${t} 实际 ${actual} != 期望 ${expected}" >&2; exit 1; }
  done < <(python3 -c 'import json,sys;m=json.load(open(sys.argv[1]));[print(t+"|"+str(m["row_counts"][t])) for t in m["tables"]]' "$DATA_META")
  echo "   OK: 参考数据行数与元数据一致"
fi

echo "== 前向迁移"
bash "$ROOT/scripts/migration/apply-forward.sh" --db "$DB" --anchor "$ANCHOR" --drill-gate-guc-auto

echo "== 终态断言"
LEFT="$(psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -tA -c "SELECT string_agg(t,',') FROM unnest(ARRAY['mes.erp_dictionaries','public.erp_dictionaries']) t WHERE to_regclass(t) IS NOT NULL")"
[[ -z "$LEFT" ]] || { echo "FAIL: 仍存在 $LEFT" >&2; exit 1; }
echo "   OK: erp_dictionaries 不存在"

echo "== 完成：基线恢复成功，前向迁移全部通过"
