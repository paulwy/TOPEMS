#!/usr/bin/env bash
# =============================================================================
# run-migration-drill.sh — 迁移真实演练（两档，互不替代）
# =============================================================================
# drill:anchor（正式闸门，fail-closed）
#   从生产基线快照（schema + _sqlx_migrations 账本 + 参考数据）恢复隔离库，
#   再按 apply-forward.sh 只应用 version > anchor 的前向迁移，随后跑迁移静态
#   校验与权限码审计。这是「新环境/灾备重建」的真实路径。
#   - 快照默认取 database/baseline/anchors.json 中最新的 anchor；
#     可用 --anchor <14 位版本> 指定（必须有对应 prod_schema_<anchor>.sql.gz）。
#   - sec：快照 sha256 与 anchors.json 不一致 → 非 0。
#
# drill:zero（空库全链，已知缺陷 MIG-001，预期失败）
#   从真正的空库跑全量迁移链。当前在 20261005000004 处必然失败：
#   public.qa_lab_tasks 直到 20261007000009 才创建，而前者早于后者应用。
#   影响面：新建环境从零部署、灾备重建；现网（演进库）不受影响。
#   仅当失败签名命中 MIG-001 时按「预期失败」返回 0；其它任何失败仍非 0。
#   ⚠ 不进 pre-push、不进 verify:full。
#
# fail-closed：缺 psql/createdb/dropdb/sqlx、连不上 PG、建库失败、任一步失败
#             均非 0；库名强制 topems_migration_drill_<pid>，绝不触碰生产库。
#
# 用法：
#   bash scripts/dev/run-migration-drill.sh anchor [--anchor 20261115130000]
#   bash scripts/dev/run-migration-drill.sh zero
#   bash scripts/dev/run-migration-drill.sh anchor --svc svc/erp/migrations
# =============================================================================
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then echo "FAIL: 不在 git 仓库内" >&2; exit 1; fi
cd "$ROOT"

MODE="${1:-}"
[[ "$MODE" == "anchor" || "$MODE" == "zero" ]] || {
    echo "用法: $0 anchor [--anchor <14位>] [--svc <dir>] | $0 zero" >&2
    exit 2
}
shift

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-$(id -un)}"
DB="topems_migration_drill_$$"
DSN="postgresql://${PGUSER}@${PGHOST}:${PGPORT}/${DB}"

ANCHOR=""
SVC_DIRS=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --anchor) ANCHOR="$2"; shift 2 ;;
        --svc) SVC_DIRS+=("$2"); shift 2 ;;
        *) echo "未知参数: $1" >&2; exit 2 ;;
    esac
done

for bin in psql createdb dropdb; do
    command -v "$bin" >/dev/null 2>&1 || { echo "FAIL: 缺少 ${bin}" >&2; exit 1; }
done
SQLX="$(command -v sqlx || true)"
[[ -n "$SQLX" && -x "$SQLX" ]] || { echo "FAIL: 未找到 sqlx-cli（cargo install sqlx-cli --no-default-features --features postgres,rustls）" >&2; exit 1; }

if ! psql "postgresql://${PGUSER}@${PGHOST}:${PGPORT}/postgres" -tAc "SELECT 1" >/dev/null 2>&1; then
    echo "FAIL: 连不上本地 PG（${PGHOST}:${PGPORT}，用户 ${PGUSER}）" >&2
    exit 1
fi

cleanup() {
    dropdb --if-exists -h "$PGHOST" -p "$PGPORT" "$DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT

phase() { PHASE_START=$(date +%s); }
phase_end() { echo "  ↳ $1 耗时 $(( $(date +%s) - PHASE_START ))s"; }

TOTAL_START=$(date +%s)
echo "== 迁移演练 / ${MODE}（隔离库 ${DB}）=="

createdb -h "$PGHOST" -p "$PGPORT" "$DB" || { echo "FAIL: createdb 失败" >&2; exit 1; }

if [[ "$MODE" == "zero" ]]; then
    # ---------------- drill:zero：空库全链（已知缺陷） ----------------
    echo "[1/1] 空库全链（ensure-empty-db-prereqs.sh）"
    phase
    set +e
    MIGRATE_URL="$DSN" bash scripts/ensure-empty-db-prereqs.sh > /tmp/topems-drill-zero-$$.log 2>&1
    RC=$?
    set -e
    phase_end "空库全链"
    if [[ $RC -eq 0 ]]; then
        echo "PASS: 空库全链通过（总耗时 $(( $(date +%s) - TOTAL_START ))s）"
        exit 0
    fi
    if grep -q 'public\.qa_lab_tasks" does not exist' /tmp/topems-drill-zero-$$.log \
       && grep -q '20261005000004' /tmp/topems-drill-zero-$$.log; then
        echo "EXPECTED-FAIL [MIG-001]: 空库全链在 20261005000004 处因 public.qa_lab_tasks 尚未创建而失败。"
        echo "  缺陷编号: MIG-001（迁移排序缺陷：建表 20261007000009 晚于引用 20261005000004）"
        echo "  影响面: 新建环境从零部署、灾备重建；现网（演进库）不受影响，因该表在生产历史中早已存在。"
        echo "  正确修法: 把生产锚点做成新基线、归档历史迁移（P1 立项），不改已应用迁移。"
        echo "  总耗时 $(( $(date +%s) - TOTAL_START ))s"
        rm -f /tmp/topems-drill-zero-$$.log
        exit 0
    fi
    echo "FAIL: 空库全链失败，且不是已知缺陷 MIG-001（详见 /tmp/topems-drill-zero-$$.log）" >&2
    tail -20 /tmp/topems-drill-zero-$$.log >&2
    exit 1
fi

# ---------------- drill:anchor：基线快照 + 前向迁移 ----------------
BASE_DIR="database/baseline"
ANCHORS_JSON="$BASE_DIR/anchors.json"
[[ -f "$ANCHORS_JSON" ]] || { echo "FAIL: 缺少 ${ANCHORS_JSON}" >&2; exit 1; }

if [[ -z "$ANCHOR" ]]; then
    ANCHOR="$(python3 - "$ANCHORS_JSON" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
print(max(a["anchor_version"] for a in d["anchors"]))
PY
)"
fi

SHA_SCHEMA="$(python3 - "$ANCHORS_JSON" "$ANCHOR" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
for a in d["anchors"]:
    if str(a["anchor_version"])==sys.argv[2]:
        print(a["schema_sha256"]); break
PY
)"
SCHEMA_GZ="$BASE_DIR/prod_schema_${ANCHOR}.sql.gz"
LEDGER_SQL="$BASE_DIR/prod_ledger_${ANCHOR}.sql"
DATA_GZ="$BASE_DIR/baseline_${ANCHOR}_data.sql.gz"
for f in "$SCHEMA_GZ" "$LEDGER_SQL" "$DATA_GZ"; do
    [[ -f "$f" ]] || {
        echo "FAIL: 锚点 ${ANCHOR} 缺基线资产 ${f}" >&2
        echo "  现有锚点: $(python3 -c 'import json;print([a["anchor_version"] for a in json.load(open("database/baseline/anchors.json"))["anchors"]])')" >&2
        echo "  需先按 docs/quality/environment-provisioning.md 生成新基线（P1 立项），不得用旧快照冒充新锚点。" >&2
        exit 1
    }
done
if [[ -n "$SHA_SCHEMA" ]]; then
    ACTUAL="$(shasum -a 256 "$SCHEMA_GZ" | awk '{print $1}')"
    [[ "$ACTUAL" == "$SHA_SCHEMA" ]] || { echo "FAIL: ${SCHEMA_GZ} sha256 不匹配（期望 ${SHA_SCHEMA}，实际 ${ACTUAL}）" >&2; exit 1; }
fi

echo "[1/4] 恢复基线快照（anchor=${ANCHOR}）"
phase
gzip -dc "$SCHEMA_GZ" | psql "$DSN" -v ON_ERROR_STOP=1 -q >/dev/null || { echo "FAIL: schema 快照恢复失败" >&2; exit 1; }
psql "$DSN" -v ON_ERROR_STOP=1 -q -f "$LEDGER_SQL" >/dev/null || { echo "FAIL: 账本恢复失败" >&2; exit 1; }
gzip -dc "$DATA_GZ" | psql "$DSN" -v ON_ERROR_STOP=1 -q >/dev/null || { echo "FAIL: 参考数据恢复失败" >&2; exit 1; }
LEDGER_MAX="$(psql "$DSN" -tAc "SELECT max(version) FROM _sqlx_migrations WHERE success")"
[[ "$LEDGER_MAX" == "$ANCHOR" ]] || { echo "FAIL: 账本 max(version)=${LEDGER_MAX}，与锚点 ${ANCHOR} 不一致" >&2; exit 1; }
phase_end "恢复基线"

echo "[2/4] 前向迁移（apply-forward.sh，只应用 version > ${ANCHOR}）"
phase
bash scripts/migration/apply-forward.sh --dsn "$DSN" || { echo "FAIL: 前向迁移失败" >&2; exit 1; }
phase_end "前向迁移"

echo "[3/4] 迁移静态校验 + 权限码审计"
phase
DATABASE_URL="$DSN" bash scripts/migration/validate.sh || { echo "FAIL: validate.sh 失败" >&2; exit 1; }
python3 scripts/audit_permission_codes.py --gate --dsn "$DSN" || { echo "FAIL: audit --gate 失败" >&2; exit 1; }
phase_end "静态校验 + 审计"

echo "[4/4] up-down-up 重放（重建隔离库 → 基线 + 前向重放）"
phase
# 整库重建而不是 DROP SCHEMA：基线快照含 _sqlx_test/ai/... 多个 schema，
# 只删 public 会让快照里的 CREATE SCHEMA 撞车。
dropdb --if-exists -h "$PGHOST" -p "$PGPORT" "$DB" >/dev/null 2>&1 || true
createdb -h "$PGHOST" -p "$PGPORT" "$DB" || { echo "FAIL: 重放前重建库失败" >&2; exit 1; }
gzip -dc "$SCHEMA_GZ" | psql "$DSN" -v ON_ERROR_STOP=1 -q >/dev/null
psql "$DSN" -v ON_ERROR_STOP=1 -q -f "$LEDGER_SQL" >/dev/null
gzip -dc "$DATA_GZ" | psql "$DSN" -v ON_ERROR_STOP=1 -q >/dev/null
bash scripts/migration/apply-forward.sh --dsn "$DSN" >/dev/null || { echo "FAIL: 重放前向迁移失败" >&2; exit 1; }
phase_end "up-down-up"

for dir in "${SVC_DIRS[@]:-}"; do
    [[ -z "$dir" ]] && continue
    svc="$(echo "$dir" | cut -d'/' -f2)"
    echo "[svc] $svc 重放"
    phase
    # 独立 service 迁移账本：整库重建，避免套用主链基线
    dropdb --if-exists -h "$PGHOST" -p "$PGPORT" "$DB" >/dev/null 2>&1 || true
    createdb -h "$PGHOST" -p "$PGPORT" "$DB" || { echo "FAIL: ${svc} 重放前重建库失败" >&2; exit 1; }
    psql "$DSN" -v ON_ERROR_STOP=1 -q -c "CREATE SCHEMA IF NOT EXISTS \"$svc\";" \
        || { echo "FAIL: ${svc} 建 schema 失败" >&2; exit 1; }
    "$SQLX" migrate run --source "$dir" --database-url "$DSN" || { echo "FAIL: $svc 首次 up 失败" >&2; exit 1; }
    dropdb --if-exists -h "$PGHOST" -p "$PGPORT" "$DB" >/dev/null 2>&1 || true
    createdb -h "$PGHOST" -p "$PGPORT" "$DB" || { echo "FAIL: ${svc} 重放重建库失败" >&2; exit 1; }
    psql "$DSN" -v ON_ERROR_STOP=1 -q -c "CREATE SCHEMA IF NOT EXISTS \"$svc\";" \
        || { echo "FAIL: ${svc} 重放建 schema 失败" >&2; exit 1; }
    "$SQLX" migrate run --source "$dir" --database-url "$DSN" || { echo "FAIL: $svc 重放失败" >&2; exit 1; }
    phase_end "$svc 重放"
done

echo "PASS: drill:anchor 通过（anchor=${ANCHOR}，总耗时 $(( $(date +%s) - TOTAL_START ))s）"
