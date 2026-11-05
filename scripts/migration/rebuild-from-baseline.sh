#!/usr/bin/env bash
# =============================================================================
# 基线重建：恢复 schema 快照 + 载入账本锚点 + 前向应用（version > anchor）
#
# 流程：
#   1) DROP/CREATE 目标 scratch 库
#   2) gunzip -c <基线> | psql  （dump 内含 CREATE EXTENSION，勿额外预建扩展）
#   3) 载入 prod_ledger_<anchor>.sql（仅 success=true 的已应用记录）
#   4) 断言：表数 = meta.table_count、账本条数 = ledger_rows、max(version)=anchor
#   5) scripts/migration/apply-forward.sh --anchor <anchor>（当前应为 0 条）
#   6) 终态断言：旧下线表不存在
#
# 用法：
#   bash scripts/migration/rebuild-from-baseline.sh --db p4_baseline_verify
#   bash scripts/migration/rebuild-from-baseline.sh --baseline database/baseline/baseline_<v>.json --db x
#
# 退出码：0 成功；1 校验失败；2 环境/参数错误
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB="p4_baseline_verify"
META=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db) DB="$2"; shift 2 ;;
    --baseline) META="$2"; shift 2 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

[[ "$DB" =~ (verify|test|tmp|mig|baseline) ]] || { echo "拒绝：目标库名需含 verify/test/tmp/mig/baseline" >&2; exit 2; }

if [[ -z "$META" ]]; then
  META="$(ls "$ROOT"/database/baseline/baseline_*.json 2>/dev/null | LC_ALL=C sort | tail -1)"
fi
[[ -f "$META" ]] || { echo "找不到基线元数据（先跑 gen-baseline.sh）" >&2; exit 2; }

meta() { python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]])' "$META" "$1"; }
ANCHOR="$(meta 'anchor_version')"
TABLES="$(meta 'table_count')"
LEDGER_ROWS="$(meta 'ledger_rows')"
SCHEMA_FILE="$(meta 'schema_file')"
LEDGER_FILE="$(meta 'ledger_file')"
BASE_DIR="$(dirname "$META")"

PGHOST="${PGHOST:-/tmp}"
PGUSER="${PGUSER:-air}"
PSQL=(psql -h "$PGHOST" -U "$PGUSER")
export PGHOST PGUSER

echo "== 基线与锚点"
echo "   anchor=$ANCHOR tables=$TABLES ledger=$LEDGER_ROWS"
echo "   schema=$SCHEMA_FILE"

"${PSQL[@]}" -d postgres -q -c "DROP DATABASE IF EXISTS \"$DB\";" -c "CREATE DATABASE \"$DB\";"

echo "== 恢复 schema 快照"
gunzip -c "$BASE_DIR/$SCHEMA_FILE" | psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -q -v ON_ERROR_STOP=1

echo "== 载入账本锚点"
psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -q -v ON_ERROR_STOP=1 -f "$BASE_DIR/$LEDGER_FILE"

ACT_TABLES="$(psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -tA -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')")"
ACT_LEDGER="$(psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -tA -c "SELECT count(*) FROM _sqlx_migrations WHERE success")"
ACT_ANCHOR="$(psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -tA -c "SELECT max(version) FROM _sqlx_migrations WHERE success")"

echo "== 对齐断言"
[[ "$ACT_TABLES" = "$TABLES" ]] || { echo "FAIL: 表数 $ACT_TABLES != $TABLES" >&2; exit 1; }
[[ "$ACT_LEDGER" = "$LEDGER_ROWS" ]] || { echo "FAIL: 账本 $ACT_LEDGER != $LEDGER_ROWS" >&2; exit 1; }
[[ "$ACT_ANCHOR" = "$ANCHOR" ]] || { echo "FAIL: 锚点 $ACT_ANCHOR != $ANCHOR" >&2; exit 1; }
echo "   OK: tables=$ACT_TABLES ledger=$ACT_LEDGER anchor=$ACT_ANCHOR"

echo "== 前向迁移"
bash "$ROOT/scripts/migration/apply-forward.sh" --db "$DB" --anchor "$ANCHOR"

echo "== 终态断言"
LEFT="$(psql -h "$PGHOST" -U "$PGUSER" -d "$DB" -tA -c "SELECT string_agg(t,',') FROM unnest(ARRAY['mes.erp_dictionaries','public.erp_dictionaries']) t WHERE to_regclass(t) IS NOT NULL")"
[[ -z "$LEFT" ]] || { echo "FAIL: 仍存在 $LEFT" >&2; exit 1; }
echo "   OK: erp_dictionaries 不存在"

echo "== 完成：成功 1(restore) + 前向 0/0，失败 0，跳过 0"
