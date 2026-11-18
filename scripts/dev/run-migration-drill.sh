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
# 连接解析：MIGRATION_DRILL_DB_URL → DATABASE_URL → .env 的 MIGRATE_URL → 缺省 socket。
#   - 连接串无口令且未设置 PGPASSWORD/PGPASSFILE → 回落 socket
#     （postgresql:///<库名>，本机 peer 认证），并打印实际用的来源。
#   - 本机 pg_hba 把 127.0.0.1/32 改成 scram-sha-256 后，无口令 TCP 连接必然失败；
#     socket 回落是本地默认路径，失败文案给的是「怎么设置」而不是裸的连不上。
#   - 连接成功后校验 current_user 的 rolsuper/rolbypassrls，命中即失败：
#     这类连接会 BYPASSRLS，演练里的权限/RLS 校验恒真（2026-11-19 假绿事故）。
#     仅本地演练可用 MIGRATION_DRILL_ALLOW_SUPERUSER=1 显式豁免（CI 不得设置）。
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

DB="topems_migration_drill_$$"
ALLOW_SUPERUSER="${MIGRATION_DRILL_ALLOW_SUPERUSER:-}"

# ---- 连接串解析：MIGRATION_DRILL_DB_URL → DATABASE_URL → .env MIGRATE_URL → socket 默认 ----
read_env_migrate_url() {
    local f="$ROOT/.env" line
    [[ -f "$f" ]] || return 0
    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ "$line" =~ ^[[:space:]]*MIGRATE_URL=(.*)$ ]]; then
            line="${BASH_REMATCH[1]}"
            line="${line%\"}"; line="${line#\"}"
            line="${line%\'}"; line="${line#\'}"
            printf '%s\n' "$line"
            return 0
        fi
    done < "$f"
}

sanitize_dsn() {
    printf '%s' "$1" | sed -E 's#(://[^:/@]+):[^@/]*@#\1:***@#'
}

url_has_password() {
    [[ "$1" =~ ^[A-Za-z0-9+.-]+://[^/@:]*:[^/@]*@ ]] && return 0
    [[ -n "${PGPASSWORD:-}" || -n "${PGPASSFILE:-}" ]] && return 0
    return 1
}

url_is_socket() {
    [[ "$1" =~ ^[A-Za-z0-9+.-]+:/// ]]
}

if [[ -n "${MIGRATION_DRILL_DB_URL:-}" ]]; then
    BASE_DSN="$MIGRATION_DRILL_DB_URL"
    DSN_SOURCE="MIGRATION_DRILL_DB_URL（环境变量）"
elif [[ -n "${DATABASE_URL:-}" ]]; then
    BASE_DSN="$DATABASE_URL"
    DSN_SOURCE="DATABASE_URL（环境变量/外层 shell 导出）"
else
    BASE_DSN="$(read_env_migrate_url)"
    if [[ -n "$BASE_DSN" ]]; then
        DSN_SOURCE=".env 的 MIGRATE_URL"
    else
        BASE_DSN="postgresql:///postgres"
        DSN_SOURCE="缺省 socket（peer 认证）"
    fi
fi

if [[ ! "$BASE_DSN" =~ ^[A-Za-z0-9+.-]+:// ]]; then
    echo "FAIL: 连接串不是 URI 形式（来源 ${DSN_SOURCE}）：$(sanitize_dsn "$BASE_DSN")" >&2
    echo "  修法：export MIGRATION_DRILL_DB_URL='postgresql://<角色>@127.0.0.1:5432/postgres'，并 export PGPASSWORD=<口令>" >&2
    exit 1
fi

if ! url_is_socket "$BASE_DSN" && ! url_has_password "$BASE_DSN"; then
    echo "[info] ${DSN_SOURCE} 未携带口令（且未设置 PGPASSWORD/PGPASSFILE）→ 回落 unix socket（peer 认证）"
    BASE_DSN="postgresql:///postgres"
    DSN_SOURCE="${DSN_SOURCE} → 无口令，回落 socket（peer 认证）"
fi

# 只替换库名：连接参数（角色/口令/host/query）沿用 BASE_DSN，演练库名由脚本强制。
if [[ ! "$BASE_DSN" =~ ^[A-Za-z0-9+.-]+://[^/?]*/[^/?]+(\?.*)?$ ]]; then
    echo "FAIL: 连接串缺少库名（来源 ${DSN_SOURCE}）：$(sanitize_dsn "$BASE_DSN")" >&2
    echo "  修法：写成 postgresql://<角色>@127.0.0.1:5432/postgres 或 postgresql:///postgres" >&2
    exit 1
fi
BASE_QUERY=""
BASE_NOQ="$BASE_DSN"
if [[ "$BASE_DSN" == *\?* ]]; then
    BASE_QUERY="?${BASE_DSN#*\?}"
    BASE_NOQ="${BASE_DSN%%\?*}"
fi
BASE_PREFIX="${BASE_NOQ%/*}/"
DSN="${BASE_PREFIX}${DB}${BASE_QUERY}"
ADMIN_DSN="${BASE_PREFIX}postgres${BASE_QUERY}"
ADMIN_DSN_SHOWN="$(sanitize_dsn "$ADMIN_DSN")"

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

CONN_ERR="$(mktemp "${TMPDIR:-/tmp}/topems-drill-conn.XXXXXX")"
if ! IDENT="$(psql "$ADMIN_DSN" -v ON_ERROR_STOP=1 -tAc \
    "SELECT current_user || '|' || rolsuper::text || '|' || rolbypassrls::text FROM pg_roles WHERE rolname = current_user" \
    2>"$CONN_ERR")"; then
    echo "FAIL: 连不上 PostgreSQL（来源 ${DSN_SOURCE}；目标 ${ADMIN_DSN_SHOWN}）" >&2
    sed -n '1,3p' "$CONN_ERR" >&2 || true
    rm -f "$CONN_ERR"
    cat >&2 <<'EOF'
  怎么设置（任选其一）：
    1) 带口令连接：export MIGRATION_DRILL_DB_URL='postgresql://<角色>@127.0.0.1:5432/postgres'，再 export PGPASSWORD=<口令>
    2) 复用仓库 .env：让 MIGRATE_URL 指向可连的本地库（连接串内嵌口令，或配合 PGPASSWORD）
    3) 走 socket（仅当 OS 用户与库角色一致）：export MIGRATION_DRILL_DB_URL='postgresql:///postgres'
  说明：本机 pg_hba 若把 127.0.0.1/32 设为 scram-sha-256，无口令的 TCP 连接必然失败；
        脚本在「无口令」时会自动回落 socket，但连接串显式带了错误口令仍会在这里失败。
  另：确认服务已启动（brew services start postgresql@18 或 pg_ctl status）。
EOF
    exit 1
fi
rm -f "$CONN_ERR"
IFS='|' read -r CONN_USER ROLSUPER ROLBYPASS <<< "$IDENT"

if [[ "$ROLSUPER" == "t" || "$ROLSUPER" == "true" || "$ROLBYPASS" == "t" || "$ROLBYPASS" == "true" ]]; then
    if [[ ! "$ALLOW_SUPERUSER" =~ ^(1|true|TRUE|True|yes|YES|on|ON)$ ]]; then
        cat >&2 <<EOF
FAIL: 该连接会 BYPASSRLS，校验恒真 —— 拒绝在特权角色上执行迁移演练
  来源：${DSN_SOURCE}
  连接身份：current_user=${CONN_USER} rolsuper=${ROLSUPER} rolbypassrls=${ROLBYPASS}
  为什么拒绝：superuser / BYPASSRLS 绕过行级安全，演练里的权限/RLS 校验会恒真（假绿）。
  怎么改（任选其一）：
    1) 用非特权角色 + 口令：export MIGRATION_DRILL_DB_URL='postgresql://<角色>@127.0.0.1:5432/postgres'
       并 export PGPASSWORD=<口令>；该角色需具备 CREATEDB（演练要建临时库），例如 topems_test_runner。
    2) 仅本地演练显式豁免：MIGRATION_DRILL_ALLOW_SUPERUSER=1（CI 不得设置，结论不可用于发布判定）。
  已知限制：anchor 基线快照含 CREATE EXTENSION（如 vector），非特权角色无法恢复（实测
            permission denied to create extension）；该限制与门禁判定无关，需 DBA 侧解决。
EOF
        exit 1
    fi
    echo "WARN: 特权连接已显式豁免（MIGRATION_DRILL_ALLOW_SUPERUSER=1）：current_user=${CONN_USER} rolsuper=${ROLSUPER} rolbypassrls=${ROLBYPASS}；结论不可用于发布判定"
fi

echo "[conn] 来源 ${DSN_SOURCE}；维护库 ${ADMIN_DSN_SHOWN}；身份 current_user=${CONN_USER}（rolsuper=${ROLSUPER}，rolbypassrls=${ROLBYPASS}）"

cleanup() {
    dropdb --if-exists --maintenance-db="$ADMIN_DSN" "$DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT

phase() { PHASE_START=$(date +%s); }
phase_end() { echo "  ↳ $1 耗时 $(( $(date +%s) - PHASE_START ))s"; }

TOTAL_START=$(date +%s)
echo "== 迁移演练 / ${MODE}（隔离库 ${DB}）=="

createdb --maintenance-db="$ADMIN_DSN" "$DB" || { echo "FAIL: createdb 失败（维护库 ${ADMIN_DSN_SHOWN}）" >&2; exit 1; }

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
dropdb --if-exists --maintenance-db="$ADMIN_DSN" "$DB" >/dev/null 2>&1 || true
createdb --maintenance-db="$ADMIN_DSN" "$DB" || { echo "FAIL: 重放前重建库失败（维护库 ${ADMIN_DSN_SHOWN}）" >&2; exit 1; }
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
    dropdb --if-exists --maintenance-db="$ADMIN_DSN" "$DB" >/dev/null 2>&1 || true
    createdb --maintenance-db="$ADMIN_DSN" "$DB" || { echo "FAIL: ${svc} 重放前重建库失败（维护库 ${ADMIN_DSN_SHOWN}）" >&2; exit 1; }
    psql "$DSN" -v ON_ERROR_STOP=1 -q -c "CREATE SCHEMA IF NOT EXISTS \"$svc\";" \
        || { echo "FAIL: ${svc} 建 schema 失败" >&2; exit 1; }
    "$SQLX" migrate run --source "$dir" --database-url "$DSN" || { echo "FAIL: $svc 首次 up 失败" >&2; exit 1; }
    dropdb --if-exists --maintenance-db="$ADMIN_DSN" "$DB" >/dev/null 2>&1 || true
    createdb --maintenance-db="$ADMIN_DSN" "$DB" || { echo "FAIL: ${svc} 重放重建库失败（维护库 ${ADMIN_DSN_SHOWN}）" >&2; exit 1; }
    psql "$DSN" -v ON_ERROR_STOP=1 -q -c "CREATE SCHEMA IF NOT EXISTS \"$svc\";" \
        || { echo "FAIL: ${svc} 重放建 schema 失败" >&2; exit 1; }
    "$SQLX" migrate run --source "$dir" --database-url "$DSN" || { echo "FAIL: $svc 重放失败" >&2; exit 1; }
    phase_end "$svc 重放"
done

echo "PASS: drill:anchor 通过（anchor=${ANCHOR}，总耗时 $(( $(date +%s) - TOTAL_START ))s）"
