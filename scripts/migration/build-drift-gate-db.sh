#!/usr/bin/env bash
# =============================================================================
# 重建 ledger-ddl-drift 门禁夹具库（默认库名 topems_gate）
#
# 目的：给 pre-push `ledger-ddl-drift` 提供“迁移链完整 + 只读最小授权”的稳定目标库，
#       避免每次临时 export MIGRATION_DRIFT_DB_URL / PGPASSFILE。
#
# 夹具锚点：
#   - 基线快照锚点：仓库 database/baseline/ 最新快照（当前 20261117235500）
#   - 夹具有效锚点：前向重放迁移链至 20261122160000（账本 max(version)，断言执行范围）
#   预期读数（2026-11-23 实测 topems_gate）：tables=1373 ledger=787 max(version)=20261122160000；
#   ledger-ddl-drift：PASS 断言 14 项 / 记账校验 11 项 / NOTE 3 项（legacy 训练计划行，按设计移除）
#
# 流程（固定顺序，可重复执行）：
#   1) DROP/CREATE 夹具库（TEMPLATE template0，保证空库）
#   2) 恢复 schema 快照 database/baseline/prod_schema_<anchor>.sql.gz
#      （扩展由 dump 内的 CREATE EXTENSION 建立；过滤 COMMENT ON EXTENSION 噪声）
#   3) 临时关闭 FORCE RLS → 恢复账本 prod_ledger_<anchor>.sql 与基线数据
#      baseline_<anchor>_data.sql.gz → 恢复原 FORCE RLS 集合
#   4) 断言：表数 / 账本条数 / max(version) 与 baseline_<anchor>.json 一致
#   5) 重放幂等修复迁移（列漂移：mes.production_orders.quantity/completed_quantity、
#      mobile.documents.file_size）；已对齐时为零 ALTER
#   6) 前向重放锚点之后的迁移链至 20261122160000
#      （scripts/migration/apply-forward.sh --drill-gate-guc-auto，逐版本事务并写账本），
#      让新迁移的漂移断言真正参与门禁，而不是被 NOTE 跳过
#   7) 只读授权给门禁角色：按库内实际存在的 schema 批量授予 USAGE + SELECT
#      （排除 pg_catalog / information_schema / pg_toast 与 pg_* 信息模式），
#      不再写死 schema 清单；后续新增 schema 无需改脚本
#
# 幂等：每次运行都先 DROP 再按固定步骤重建，终态一致；重复执行结果相同。
# 重跑：bash scripts/migration/build-drift-gate-db.sh
#       指定库/锚点：--db topems_gate --anchor 20261117235500
#
# 要求：以本机具备 CREATE DATABASE / CREATE EXTENSION / GRANT 权限的角色运行
#       （默认 libpq 连接参数，通常即当前 OS 用户）。仅动本地夹具库，不读写 topems_prod。
# 退出码：0 成功；1 基线/前向断言失败（账本与 schema 不一致）；2 参数/环境错误
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB="topems_gate"
ANCHOR=""
GATE_ROLE="topems_gate"
BASE_DIR="$ROOT/database/baseline"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db) DB="${2:-}"; shift 2 ;;
    --anchor) ANCHOR="${2:-}"; shift 2 ;;
    -h|--help) awk 'NR==1{next} /^# =+$/{c++; if(c>=2) exit} {print}' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

[[ "$DB" =~ ^topems_(gate|drift) ]] || {
  echo "拒绝：目标库名必须形如 topems_gate / topems_drift（防止误删其他库）" >&2
  exit 2
}

if [[ -z "$ANCHOR" ]]; then
  META="$(find "$BASE_DIR" -maxdepth 1 -name 'baseline_*.json' ! -name '*_data.json' | LC_ALL=C sort | tail -n 1)"
else
  META="$BASE_DIR/baseline_${ANCHOR}.json"
fi
[[ -f "$META" ]] || { echo "找不到基线元数据: $META" >&2; exit 2; }

meta() { python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]])' "$META" "$1"; }
ANCHOR="$(meta anchor_version)"
TABLES="$(meta table_count)"
LEDGER_ROWS="$(meta ledger_rows)"
SCHEMA_GZ="$BASE_DIR/$(meta schema_file)"
LEDGER_SQL="$BASE_DIR/$(meta ledger_file)"
DATA_GZ="$BASE_DIR/baseline_${ANCHOR}_data.sql.gz"

for f in "$SCHEMA_GZ" "$LEDGER_SQL" "$DATA_GZ"; do
  [[ -f "$f" ]] || { echo "缺少基线产物: $f" >&2; exit 2; }
done

if ! psql -X -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$GATE_ROLE'" | grep -qx 1; then
  echo "缺少门禁角色 ${GATE_ROLE}（不由本脚本创建，避免改共享授权策略）" >&2
  exit 2
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "== 基线"
echo "   anchor=$ANCHOR tables=$TABLES ledger=$LEDGER_ROWS"
echo "   schema=$SCHEMA_GZ"

dropdb --if-exists --force "$DB"
createdb --template=template0 "$DB"
echo "== [1] created $DB"

gunzip -dc "$SCHEMA_GZ" | grep -v '^COMMENT ON EXTENSION ' \
  | psql -X -d "$DB" -q -v ON_ERROR_STOP=1 >/dev/null
echo "== [2] schema restored"

# 恢复数据前临时关闭 FORCE RLS，避免 DDL owner 受策略限制；结束后按原集合恢复。
psql -X -d "$DB" -Atq -v ON_ERROR_STOP=1 -c "
  SELECT format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY;', n.nspname, c.relname)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity ORDER BY 1" > "$TMP_DIR/force_rls.sql"

psql -X -d "$DB" -q -v ON_ERROR_STOP=1 -c "
  DO \$\$ DECLARE r record; BEGIN
    FOR r IN SELECT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity LOOP
      EXECUTE format('ALTER TABLE %I.%I NO FORCE ROW LEVEL SECURITY', r.nspname, r.relname);
    END LOOP;
  END \$\$;"

psql -X -d "$DB" -q -v ON_ERROR_STOP=1 -f "$LEDGER_SQL" >/dev/null
gunzip -dc "$DATA_GZ" | psql -X -d "$DB" -q -v ON_ERROR_STOP=1 >/dev/null
psql -X -d "$DB" -q -v ON_ERROR_STOP=1 -f "$TMP_DIR/force_rls.sql" >/dev/null
echo "== [3] ledger + data restored"

ACT_TABLES="$(psql -X -d "$DB" -Atq -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')")"
ACT_LEDGER="$(psql -X -d "$DB" -Atq -c "SELECT count(*) FROM _sqlx_migrations WHERE success")"
ACT_ANCHOR="$(psql -X -d "$DB" -Atq -c "SELECT max(version) FROM _sqlx_migrations WHERE success")"

echo "== [4] 对齐断言"
if [[ "$ACT_TABLES" != "$TABLES" || "$ACT_LEDGER" != "$LEDGER_ROWS" || "$ACT_ANCHOR" != "$ANCHOR" ]]; then
  {
    echo "FAIL: 账本与 schema 快照不一致"
    echo "  tables: actual=$ACT_TABLES expected=$TABLES"
    echo "  ledger: actual=$ACT_LEDGER expected=$LEDGER_ROWS"
    echo "  anchor: actual=$ACT_ANCHOR expected=$ANCHOR"
  } >&2
  exit 1
fi
echo "   OK: tables=$ACT_TABLES ledger=$ACT_LEDGER anchor=$ACT_ANCHOR"

# 幂等列漂移修复：已对齐时零 ALTER；有漂移时按迁移内守卫与终态断言修正。
# 只放“仅列类型对齐”的迁移，避免整表/整库级脚本改变夹具结构。
REPAIR_PREFIX=20261107000017
REPAIR_SQL="$(find "$ROOT/database/migrations" -maxdepth 1 -name "${REPAIR_PREFIX}_*.sql" | LC_ALL=C sort | head -n 1)"
[[ -n "$REPAIR_SQL" ]] || { echo "缺少修复迁移 ${REPAIR_PREFIX}_*.sql" >&2; exit 2; }
psql -X -d "$DB" -q -v ON_ERROR_STOP=1 -f "$REPAIR_SQL" >/dev/null
echo "== [5] 幂等列对齐迁移已重放"

# 前向重放：把基线快照锚点之后的迁移链应用到夹具，让新迁移的漂移断言真正参与门禁。
# apply-forward 逐版本单事务执行并写 _sqlx_migrations；--drill-gate-guc-auto 仅用于隔离夹具库。
FORWARD_TO=20261122160000
echo "== [6] 前向重放迁移链至 $FORWARD_TO"
if ! bash "$ROOT/scripts/migration/apply-forward.sh" \
      --dsn "postgresql:///$DB" --anchor "$ANCHOR" --drill-gate-guc-auto \
      > "$TMP_DIR/forward.log" 2>&1; then
  echo "FAIL: 前向重放失败（anchor=${ANCHOR}，目标 ${FORWARD_TO}）" >&2
  tail -n 40 "$TMP_DIR/forward.log" >&2
  exit 1
fi

FWD_TABLES="$(psql -X -d "$DB" -Atq -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')")"
FWD_LEDGER="$(psql -X -d "$DB" -Atq -c "SELECT count(*) FROM _sqlx_migrations WHERE success")"
FWD_MAX="$(psql -X -d "$DB" -Atq -c "SELECT max(version) FROM _sqlx_migrations WHERE success")"
if (( FWD_MAX < FORWARD_TO )); then
  echo "FAIL: 前向重放后账本 max(version)=${FWD_MAX}，低于目标 ${FORWARD_TO}" >&2
  echo "  tables=${FWD_TABLES} ledger=${FWD_LEDGER}" >&2
  exit 1
fi
echo "   OK: tables=$FWD_TABLES ledger=$FWD_LEDGER max(version)=$FWD_MAX"

# 授权按库内实际 schema 推导（不写死清单），且放在前向重放之后，保证新迁移新建的表也有 SELECT。
# 后续迁移新增 schema 时重跑本脚本即可，不会因为漏配 schema 导致 `permission denied for schema`。
# 只授只读权限，排除系统 schema 与 pg_* 信息模式（pg_catalog / information_schema / pg_toast 等）。
psql -X -d "$DB" -q -v ON_ERROR_STOP=1 -c "
  DO \$\$ DECLARE s record; BEGIN
    FOR s IN
      SELECT nspname FROM pg_namespace
      WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND nspname NOT LIKE 'pg\_%'
      ORDER BY nspname
    LOOP
      EXECUTE format('GRANT USAGE ON SCHEMA %I TO $GATE_ROLE', s.nspname);
      EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO $GATE_ROLE', s.nspname);
    END LOOP;
  END \$\$;"
echo "== [7] 只读授权完成（按实际 schema 推导，未写死清单）"

echo "== 完成：默认 MIGRATION_DRIFT_DB_URL 指向 postgres://$GATE_ROLE@127.0.0.1:5432/$DB 即可，无需临时 export"
