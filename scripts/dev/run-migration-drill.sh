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
# 连接解析：统一委托 scripts/ci/lib/db-target.mjs（profile=migration-drill）。
#   顺序：MIGRATION_DRILL_DB_URL（env → .env）→ TEST_DATABASE_URL（env → .env）
#   → 内置 postgresql://topems_test_runner@127.0.0.1:5432/postgres。
#   不接 MIGRATE_URL / DATABASE_URL：演练库需要 CREATEDB，且不能用开发库身份代替。
#   - 复用任意一档时都只借其角色与口令，演练库名由脚本强制改写为
#     topems_migration_drill_<pid>，不会写 TEST_DATABASE_URL 指向的库本身。
#   - 口令：PGPASSWORD → DSN 内嵌 → PGPASSFILE → .env 同角色口令；仍无则 fail-closed，
#     不会静默回落到 socket（socket 会以 OS 用户连入，通常是 superuser，恒被拒绝）。
#   - 完整解析顺序与诊断（--explain）见 docs/quality/environment-provisioning.md §12.1。
#   - 连接成功后校验 current_user 的 rolsuper/rolbypassrls，命中即失败：
#     这类连接会 BYPASSRLS，演练里的权限/RLS 校验恒真（2026-11-19 假绿事故）。
#     仅本地演练可用 MIGRATION_DRILL_ALLOW_SUPERUSER=1 显式豁免（CI 不得设置）。
#
# 干净检出：脚本在 HEAD 创建独立 git worktree，迁移/基线/校验脚本全部从该检出读取，
#   不扫描共享工作树里其他会话在途的迁移。仅把本脚本、apply-forward.sh 与
#   策略快照门禁脚本覆盖进 worktree（否则 HEAD 版本还没有这些逻辑）；数据库资产仍全部来自 HEAD。
#   闸门 GUC（如 app.drop_dead_tables_gate）由 apply-forward.sh --drill-gate-guc-auto
#   按迁移文件语义逐文件注入，prod/SSH 模式拒绝该参数。
#
# W9-A 回滚循环（[4b/6]，anchor 早于 20261121235940 时执行）：
#   回滚 → 逐表断言（policyname=ALL/PERMISSIVE/{public} 且表达式逐字等于严格 B）
#   → 删账本行 → apply-forward --apply-deferred 重放，共 3 轮。
#   期望「迁移前」以全窗口顺序为准：20261119210000 改名 + erp canonical 重建后，
#   8 张表各 1 条 rls_tenant_isolation。
#
# 策略快照门禁（§6.3）与菜单权限码门禁（W1-2c）：
#   [5/6] 用同一个非特权演练库比对 database/rls_policy_expected.json 与实测
#   pg_policies / pg_class；多/少表、多/少策略、表达式、ENABLE/FORCE 变化一律失败。
#   [6/6] core_menus.permissions->>'permission' 必须全部存在于 core_permissions.code，
#   防止菜单引用不存在的权限码（W1-2c 的 crm:* 别名漂移）。
#   - 快照更新入口（只随迁移一起用）：
#       MIGRATION_DRILL_WRITE_POLICY_SNAPSHOT=1 bash scripts/dev/run-migration-drill.sh anchor
#     生成后逐条 review git diff，与同批迁移一起提交；不得为过门禁直接刷新快照。
#   - 更新/排障时可显式跳过比对：MIGRATION_DRILL_SKIP_POLICY_SNAPSHOT_CHECK=1
#   - 该步骤只验证「迁移链终态 = 快照」，不验证生产库；生产发布前用 topems_drift
#     手动跑 scripts/ci/check-rls-policy-snapshot.mjs（见 §6.3）。
#
# 用法：
#   bash scripts/dev/run-migration-drill.sh anchor [--anchor 20261115130000]
#   bash scripts/dev/run-migration-drill.sh zero
#   bash scripts/dev/run-migration-drill.sh anchor --svc svc/erp/migrations
# =============================================================================
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then echo "FAIL: 不在 git 仓库内" >&2; exit 1; fi
SOURCE_ROOT="$ROOT"
cd "$ROOT"

MODE="${1:-}"
[[ "$MODE" == "anchor" || "$MODE" == "zero" ]] || {
    echo "用法: $0 anchor [--anchor <14位>] [--svc <dir>] | $0 zero" >&2
    exit 2
}
shift

DB="topems_migration_drill_$$"
TEMPLATE_DB="${MIGRATION_DRILL_TEMPLATE_DB:-topems_drill_template}"
case "$TEMPLATE_DB" in
    *topems_prod*) echo "FAIL: 拒绝：演练模板库不得指向 topems_prod" >&2; exit 1 ;;
esac
ALLOW_SUPERUSER="${MIGRATION_DRILL_ALLOW_SUPERUSER:-}"

# ---- 连接串解析：统一解析器 scripts/ci/lib/db-target.mjs ----
# 顺序：MIGRATION_DRILL_DB_URL（env → .env）→ TEST_DATABASE_URL（env → .env）
#       → 内置 topems_test_runner@127.0.0.1:5432/postgres。
# 不接 MIGRATE_URL / DATABASE_URL：演练库需要 CREATEDB，且不能用开发库身份代替。
# 口令：PGPASSWORD → DSN 内嵌 → PGPASSFILE → .env 同角色口令；不回落 socket。
# 完整口径见 docs/quality/environment-provisioning.md §12.1。

sanitize_dsn() {
    printf '%s' "$1" | sed -E 's#(://[^:/@]+):[^@/]*@#\1:***@#'
}

DB_TARGET_OUT=""
if ! DB_TARGET_OUT="$(node "$SOURCE_ROOT/scripts/ci/lib/db-target.mjs" --hook migration-drill --shell)"; then
    echo "FAIL: 无法解析演练数据库连接（诊断见上）。" >&2
    echo "  修法：export MIGRATION_DRILL_DB_URL='postgresql://topems_test_runner@127.0.0.1:5432/postgres'，" >&2
    echo "        并由 .env 的 TEST_DATABASE_URL 提供同角色口令（或 export PGPASSWORD=<口令>）；" >&2
    echo "        诊断：node scripts/ci/lib/db-target.mjs --hook migration-drill --explain" >&2
    echo "        文档：docs/quality/environment-provisioning.md §12.1" >&2
    exit 1
fi
eval "$DB_TARGET_OUT"
BASE_DSN="$DB_TARGET_URL"
DSN_SOURCE="$DB_TARGET_SOURCE"

if [[ ! "$BASE_DSN" =~ ^[A-Za-z0-9+.-]+:// ]]; then
    echo "FAIL: 连接串不是 URI 形式（来源 ${DSN_SOURCE}）：$(sanitize_dsn "$BASE_DSN")" >&2
    echo "  修法：export MIGRATION_DRILL_DB_URL='postgresql://<角色>@127.0.0.1:5432/postgres'，并 export PGPASSWORD=<口令>" >&2
    exit 1
fi

if [[ "$DB_TARGET_HAS_PASSWORD" != "1" ]]; then
    echo "FAIL: ${DSN_SOURCE} 未携带口令（且未设置 PGPASSWORD/PGPASSFILE，.env 中也无同角色口令）。" >&2
    echo "      默认路径要求 .env 的 TEST_DATABASE_URL 带上 topems_test_runner 的口令；" >&2
    echo "      或显式 export MIGRATION_DRILL_DB_URL（形如 postgresql://<角色>@127.0.0.1:5432/postgres），再 export PGPASSWORD=<口令>。" >&2
    echo "      诊断：node scripts/ci/lib/db-target.mjs --hook migration-drill --explain" >&2
    exit 1
fi

echo "[conn] 来源 ${DSN_SOURCE}；口令来源 ${DB_TARGET_PASSWORD_SOURCE:-未提供（socket/peer）}"

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

# ---- HEAD 干净检出：迁移/基线/校验全部来自 HEAD，避免带进共享工作树在途迁移 ----
HEAD_SHA="$(git -C "$SOURCE_ROOT" rev-parse HEAD)"
DRILL_WORKTREE="$(mktemp -d "${TMPDIR:-/tmp}/topems-drill-head.XXXXXX")"
rmdir "$DRILL_WORKTREE" 2>/dev/null || {
    echo "FAIL: 无法准备 worktree 目录 ${DRILL_WORKTREE}" >&2
    exit 1
}
cleanup_worktree() {
    git -C "$SOURCE_ROOT" worktree remove --force "$DRILL_WORKTREE" >/dev/null 2>&1 || rm -rf "$DRILL_WORKTREE"
}
if ! git -C "$SOURCE_ROOT" worktree add --detach --quiet "$DRILL_WORKTREE" "$HEAD_SHA"; then
    echo "FAIL: 无法在 ${DRILL_WORKTREE} 创建 HEAD(${HEAD_SHA}) 的干净检出" >&2
    rm -rf "$DRILL_WORKTREE"
    exit 1
fi
# 仅覆盖受测脚本；迁移/基线/校验资产仍全部来自 HEAD。
cp "$SOURCE_ROOT/scripts/dev/run-migration-drill.sh" "$DRILL_WORKTREE/scripts/dev/run-migration-drill.sh"
cp "$SOURCE_ROOT/scripts/migration/apply-forward.sh" "$DRILL_WORKTREE/scripts/migration/apply-forward.sh"
for f in \
    scripts/ci/check-rls-policy-snapshot.mjs \
    scripts/ci/check-menu-permission-codes.mjs \
    scripts/ci/gen-rls-policy-snapshot.mjs \
    scripts/ci/lib/rls-policy-snapshot.mjs \
    scripts/ci/lib/db-target.mjs; do
    if [[ -f "$SOURCE_ROOT/$f" ]]; then
        mkdir -p "$DRILL_WORKTREE/$(dirname "$f")"
        cp "$SOURCE_ROOT/$f" "$DRILL_WORKTREE/$f"
    fi
done
ROOT="$DRILL_WORKTREE"
cd "$ROOT"
echo "[worktree] HEAD ${HEAD_SHA} → ${DRILL_WORKTREE}；迁移/基线/校验只读该检出"
trap 'cleanup_worktree' EXIT

for dir in "${SVC_DIRS[@]:-}"; do
    [[ -z "$dir" ]] && continue
    [[ -d "$ROOT/$dir" ]] || {
        echo "FAIL: --svc 目录在 HEAD 干净检出中不存在：${dir}" >&2
        cleanup_worktree
        exit 1
    }
done

for bin in psql createdb dropdb; do
    command -v "$bin" >/dev/null 2>&1 || { echo "FAIL: 缺少 ${bin}" >&2; exit 1; }
done
SQLX="$(command -v sqlx || true)"
# 非交互 ssh / launchd 的 PATH 常缺 ~/.cargo/bin，补一次兜底查找
if [[ -z "$SQLX" ]]; then
    for cand in "${HOME}/.cargo/bin/sqlx" /usr/local/bin/sqlx /opt/homebrew/bin/sqlx; do
        [[ -x "$cand" ]] && { SQLX="$cand"; break; }
    done
fi
[[ -n "$SQLX" && -x "$SQLX" ]] || { echo "FAIL: 未找到 sqlx-cli（cargo install sqlx-cli --no-default-features --features postgres,rustls）" >&2; exit 1; }
# sqlx 需要 cargo 环境用于离线校验时能定位 rust 工具链
[[ -d "${HOME}/.cargo/bin" ]] && PATH="${HOME}/.cargo/bin:${PATH}"; export PATH

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

TEMPLATE_OK="$(psql "$ADMIN_DSN" -v ON_ERROR_STOP=1 -tAc \
    "SELECT datistemplate::text FROM pg_database WHERE datname = '${TEMPLATE_DB//\'/\'\'}'" 2>/dev/null || true)"
if [[ "$TEMPLATE_OK" != "t" && "$TEMPLATE_OK" != "true" ]]; then
    cat >&2 <<EOF
FAIL: 演练模板库 ${TEMPLATE_DB} 不存在或未标记为模板
  先执行一次性 bootstrap（仅本机特权，不触碰 topems_prod）：
    bash scripts/dev/bootstrap-migration-drill-template.sh
  为什么需要：anchor 基线快照含 CREATE EXTENSION（pgcrypto / uuid-ossp / vector），
  非特权角色无法在新库创建；模板库预装扩展后，演练用 createdb --template 复制。
EOF
    exit 1
fi
echo "[template] ${TEMPLATE_DB}（IS_TEMPLATE=true）"

cleanup() {
    dropdb --if-exists --maintenance-db="$ADMIN_DSN" "$DB" >/dev/null 2>&1 || true
    cleanup_worktree
    rm -f "${FORCE_RLS_SQL:-}" "${CONN_ERR:-}" 2>/dev/null || true
}
trap cleanup EXIT

phase() { PHASE_START=$(date +%s); }
phase_end() { echo "  ↳ $1 耗时 $(( $(date +%s) - PHASE_START ))s"; }

# 基线数据恢复以演练角色（表 owner）执行；FORCE RLS 会连 owner 一起挡住。
# 仅在该步临时 NO FORCE，数据恢复后按原清单恢复 FORCE；迁移/校验仍看到原策略。
capture_and_disable_forced_rls() {
    psql "$DSN" -v ON_ERROR_STOP=1 -Atq -c "
        SELECT format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY;', n.nspname, c.relname)
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity
        ORDER BY 1
    " > "$FORCE_RLS_SQL" || return 1
    psql "$DSN" -v ON_ERROR_STOP=1 -q -c "
        DO \$\$
        DECLARE r record;
        BEGIN
            FOR r IN
                SELECT n.nspname, c.relname
                FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity
            LOOP
                EXECUTE format('ALTER TABLE %I.%I NO FORCE ROW LEVEL SECURITY', r.nspname, r.relname);
            END LOOP;
        END \$\$;
    " || return 1
}

restore_forced_rls() {
    if [[ -s "$FORCE_RLS_SQL" ]]; then
        psql "$DSN" -v ON_ERROR_STOP=1 -q -f "$FORCE_RLS_SQL" || return 1
    fi
}

# 基线 pg_dump 剥离了 CREATE SCHEMA（schema 唯一入口是 bootstrap_schemas.sql），
# 前向迁移按治理规则不得自建 schema。隔离库恢复快照后，需补齐快照未含的预置 schema
# （如 archive/file/im），否则归档类迁移建表会报 "schema does not exist"。
# 演练角色是隔离库属主，可自建 schema；这里不带 AUTHORIZATION（属主留库属主），
# schema 属主角色名不属 drill 门禁校验范围（终态只比对策略/表/权限码）。
ensure_preset_schemas() {
    local BOOTSTRAP_SQL="$ROOT/database/scripts/bootstrap_schemas.sql"
    [[ -f "$BOOTSTRAP_SQL" ]] || { echo "FAIL: 缺 ${BOOTSTRAP_SQL}" >&2; return 1; }
    local n=0 sch
    while IFS= read -r sch; do
        [[ -n "$sch" ]] || continue
        psql "$DSN" -v ON_ERROR_STOP=1 -q -c "CREATE SCHEMA IF NOT EXISTS \"$sch\"" || return 1
        n=$((n+1))
    done < <(grep -E '^[[:space:]]*CREATE SCHEMA IF NOT EXISTS [a-z_]+' "$BOOTSTRAP_SQL" | grep -oE 'CREATE SCHEMA IF NOT EXISTS [a-z_]+' | awk '{print $6}' | sort -u)
    echo "  ↳ 预置 schema 清单 ${n} 个（IF NOT EXISTS，已存在的跳过）"
}

TOTAL_START=$(date +%s)
echo "== 迁移演练 / ${MODE}（隔离库 ${DB}）=="

createdb --maintenance-db="$ADMIN_DSN" --template="$TEMPLATE_DB" "$DB" || { echo "FAIL: createdb 失败（维护库 ${ADMIN_DSN_SHOWN}，模板 ${TEMPLATE_DB}）" >&2; exit 1; }

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
FORCE_RLS_SQL="$(mktemp "${TMPDIR:-/tmp}/topems-drill-force-rls.XXXXXX")"
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

echo "[1/6] 恢复基线快照（anchor=${ANCHOR}）"
phase
# 基线 pg_dump 末尾有 COMMENT ON EXTENSION；扩展由 bootstrap 以特权角色预装，
# 演练角色不是扩属主，COMMENT 会报 "must be owner of extension"。
# 只过滤扩展注释（纯元数据），其余 schema 语句原样恢复。
gzip -dc "$SCHEMA_GZ" | grep -v '^COMMENT ON EXTENSION ' | psql "$DSN" -v ON_ERROR_STOP=1 -q >/dev/null || { echo "FAIL: schema 快照恢复失败" >&2; exit 1; }
capture_and_disable_forced_rls || { echo "FAIL: 临时关闭 FORCE RLS 失败" >&2; exit 1; }
psql "$DSN" -v ON_ERROR_STOP=1 -q -f "$LEDGER_SQL" >/dev/null || { echo "FAIL: 账本恢复失败" >&2; exit 1; }
gzip -dc "$DATA_GZ" | psql "$DSN" -v ON_ERROR_STOP=1 -q >/dev/null || { echo "FAIL: 参考数据恢复失败" >&2; exit 1; }
restore_forced_rls || { echo "FAIL: 恢复 FORCE RLS 失败" >&2; exit 1; }
ensure_preset_schemas || { echo "FAIL: 预置 schema 失败" >&2; exit 1; }
LEDGER_MAX="$(psql "$DSN" -tAc "SELECT max(version) FROM _sqlx_migrations WHERE success")"
[[ "$LEDGER_MAX" == "$ANCHOR" ]] || { echo "FAIL: 账本 max(version)=${LEDGER_MAX}，与锚点 ${ANCHOR} 不一致" >&2; exit 1; }
phase_end "恢复基线"

echo "[2/6] 前向迁移（apply-forward.sh，只应用 version > ${ANCHOR}）"
phase
bash scripts/migration/apply-forward.sh --dsn "$DSN" --drill-gate-guc-auto || { echo "FAIL: 前向迁移失败" >&2; exit 1; }
phase_end "前向迁移"

echo "[3/6] 迁移静态校验 + 权限码审计"
phase
DATABASE_URL="$DSN" bash scripts/migration/validate.sh || { echo "FAIL: validate.sh 失败" >&2; exit 1; }
python3 scripts/audit_permission_codes.py --gate --dsn "$DSN" || { echo "FAIL: audit --gate 失败" >&2; exit 1; }
phase_end "静态校验 + 审计"

echo "[4/6] up-down-up 重放（重建隔离库 → 基线 + 前向重放）"
phase
# 整库重建而不是 DROP SCHEMA：基线快照含 _sqlx_test/ai/... 多个 schema，
# 只删 public 会让快照里的 CREATE SCHEMA 撞车。
dropdb --if-exists --maintenance-db="$ADMIN_DSN" "$DB" >/dev/null 2>&1 || true
createdb --maintenance-db="$ADMIN_DSN" --template="$TEMPLATE_DB" "$DB" || { echo "FAIL: 重放前重建库失败（维护库 ${ADMIN_DSN_SHOWN}，模板 ${TEMPLATE_DB}）" >&2; exit 1; }
# 基线 pg_dump 末尾有 COMMENT ON EXTENSION；扩展由 bootstrap 以特权角色预装，
# 演练角色不是扩属主，COMMENT 会报 "must be owner of extension"。
# 只过滤扩展注释（纯元数据），其余 schema 语句原样恢复。
gzip -dc "$SCHEMA_GZ" | grep -v '^COMMENT ON EXTENSION ' | psql "$DSN" -v ON_ERROR_STOP=1 -q >/dev/null
capture_and_disable_forced_rls || { echo "FAIL: 重放前临时关闭 FORCE RLS 失败" >&2; exit 1; }
psql "$DSN" -v ON_ERROR_STOP=1 -q -f "$LEDGER_SQL" >/dev/null
gzip -dc "$DATA_GZ" | psql "$DSN" -v ON_ERROR_STOP=1 -q >/dev/null
restore_forced_rls || { echo "FAIL: 重放前恢复 FORCE RLS 失败" >&2; exit 1; }
ensure_preset_schemas || { echo "FAIL: 重放前预置 schema 失败" >&2; exit 1; }
bash scripts/migration/apply-forward.sh --dsn "$DSN" --drill-gate-guc-auto >/dev/null || { echo "FAIL: 重放前向迁移失败" >&2; exit 1; }
phase_end "up-down-up"

echo "[4b/6] W9-A 回滚→重放 ×3（逐表断言策略名/命令/roles/表达式）"
phase
# 仅当基线水位早于 W9-A 时才有可回滚对象；anchor 已含 W9-A 时跳过。
W9_VERSION=20261121235940
W9_TICKET="${MIGRATION_DRILL_W9_TICKET:-ERP-COMPANY-RLS-20261122}"
W9_ROLLBACK="$ROOT/database/rollback/${W9_VERSION}_erp_consolidation_company_rls.rollback.sql"
if [[ ! -f "$W9_ROLLBACK" ]]; then
    echo "SKIP: 未找到 ${W9_ROLLBACK}（HEAD 无该回滚件）"
elif [[ "$ANCHOR" -ge "$W9_VERSION" ]]; then
    echo "SKIP: anchor=${ANCHOR} 已不早于 W9-A=${W9_VERSION}，无需回滚演练"
else
    # W9-A 回滚会 DROP erp.company_readable / current_company_id / parent_visible_company_ids。
    # 若更新的迁移引用了这些函数（例如 W12 公司级策略），单独回滚 W9-A 会因依赖对象而失败；
    # 正确做法：先按版本降序回滚依赖方，再回滚 W9-A；回放时按升序补回。
    W9_DEPENDENT_VERSIONS=()
    while IFS= read -r rb; do
        [[ -n "$rb" ]] || continue
        v="$(basename "$rb" | cut -d_ -f1)"
        [[ "$v" -gt "$W9_VERSION" ]] || continue
        fwd="$(ls "$ROOT/database/migrations/${v}"_*.sql 2>/dev/null | head -1 || true)"
        [[ -n "$fwd" ]] || continue
        # 纳入两类 W9 链依赖方（均须先于 W9 回滚、后于 W9 重放）：
        #   ① 前向引用 W9 公司级函数（company_readable/parent_visible_company_ids/current_company_id）；
        #   ② 在既有 erp 表上叠加并列 *_public_read 读策略（后建）。回滚 W9/W14 链前须先撤它，
        #      否则回滚件/前向前置断言会把共存策略误判为非预期；重放时由前向幂等重建。
        if grep -qE 'erp\.(company_readable|parent_visible_company_ids|current_company_id)' "$fwd" \
           || grep -qE "'_public_read'" "$fwd"; then
            W9_DEPENDENT_VERSIONS+=("$v")
        fi
    done < <(ls "$ROOT"/database/rollback/*.rollback.sql 2>/dev/null | sort -r)
    if (( ${#W9_DEPENDENT_VERSIONS[@]} > 0 )); then
        echo "  [4b] W9-A 依赖方（先回滚、后回放）：${W9_DEPENDENT_VERSIONS[*]}"
    fi
    W9_ASSERT_SQL="$(mktemp "${TMPDIR:-/tmp}/topems-drill-w9-assert.XXXXXX")"
    cat > "$W9_ASSERT_SQL" <<'SQL'
-- 期望：迁移前（20261119210000 改名 + canonical 重建后）8 张表各 1 条
-- rls_tenant_isolation / ALL / PERMISSIVE / {public}，表达式为严格 B。
WITH expected(tablename) AS (
    VALUES
        ('company_relations'),
        ('consolidation_scope_companies'),
        ('internal_transactions'),
        ('elimination_candidates'),
        ('consolidation_scopes'),
        ('consolidation_reports'),
        ('consolidation_report_lines'),
        ('elimination_rules')
), actual AS (
    SELECT e.tablename,
           p.policyname,
           p.cmd::text AS cmd,
           p.permissive,
           p.roles::text AS roles,
           p.qual,
           p.with_check
      FROM expected e
      LEFT JOIN pg_policies p
        ON p.schemaname = 'erp' AND p.tablename = e.tablename
), bad AS (
    SELECT tablename,
           count(*) AS n,
           count(*) FILTER (
               WHERE policyname IS DISTINCT FROM 'rls_tenant_isolation'
                  OR cmd IS DISTINCT FROM 'ALL'
                  OR permissive IS DISTINCT FROM 'PERMISSIVE'
                  OR roles IS DISTINCT FROM '{public}'
                  OR qual IS DISTINCT FROM
                     $strict$((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))$strict$
                  OR with_check IS DISTINCT FROM
                     $strict$((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))$strict$
           ) AS mismatch
      FROM actual
     GROUP BY tablename
)
SELECT tablename || '|policies=' || n || '|mismatch=' || mismatch
  FROM bad
 WHERE n <> 1 OR mismatch <> 0;
SQL
    W9_FWD_SQL="$(mktemp "${TMPDIR:-/tmp}/topems-drill-w9-fwd.XXXXXX")"
    cat > "$W9_FWD_SQL" <<'SQL'
-- 重放后：8 张表各 4 条公司维度策略，且无其他策略。
WITH expected(tablename) AS (
    VALUES
        ('company_relations'),
        ('consolidation_scope_companies'),
        ('internal_transactions'),
        ('elimination_candidates'),
        ('consolidation_scopes'),
        ('consolidation_reports'),
        ('consolidation_report_lines'),
        ('elimination_rules')
), bad AS (
    SELECT e.tablename,
           count(p.policyname) AS n,
           count(*) FILTER (WHERE p.policyname NOT LIKE '%\_company\_%') AS non_company
      FROM expected e
      LEFT JOIN pg_policies p
        ON p.schemaname = 'erp' AND p.tablename = e.tablename
     GROUP BY e.tablename
)
SELECT tablename || '|policies=' || n || '|non_company=' || non_company
  FROM bad
 WHERE n <> 4 OR non_company <> 0;
SQL
    for cycle in 1 2 3; do
        echo "  [4b] 第 ${cycle}/3 轮：回滚 → 断言"
        W9_RB_ARGS=(-v ON_ERROR_STOP=1 --single-transaction -q)
        for dep in ${W9_DEPENDENT_VERSIONS[@]+"${W9_DEPENDENT_VERSIONS[@]}"}; do
            dep_rb="$(ls "$ROOT/database/rollback/${dep}"_*.rollback.sql 2>/dev/null | head -1 || true)"
            [[ -n "$dep_rb" ]] || { echo "FAIL: 第 ${cycle} 轮缺少依赖方回滚件 ${dep}" >&2; rm -f "$W9_ASSERT_SQL" "$W9_FWD_SQL"; exit 1; }
            W9_RB_ARGS+=(-f "$dep_rb")
        done
        W9_RB_ARGS+=(-f "$W9_ROLLBACK")
        psql "$DSN" "${W9_RB_ARGS[@]}" \
            || { echo "FAIL: 第 ${cycle} 轮 W9-A 回滚失败" >&2; rm -f "$W9_ASSERT_SQL" "$W9_FWD_SQL"; exit 1; }
        W9_VIOLATIONS="$(psql "$DSN" -v ON_ERROR_STOP=1 -tA -f "$W9_ASSERT_SQL")" \
            || { echo "FAIL: 第 ${cycle} 轮策略断言查询失败" >&2; rm -f "$W9_ASSERT_SQL" "$W9_FWD_SQL"; exit 1; }
        if [[ -n "$W9_VIOLATIONS" ]]; then
            echo "FAIL: 第 ${cycle} 轮回滚后策略与迁移前不一致：" >&2
            printf '%s\n' "$W9_VIOLATIONS" >&2
            rm -f "$W9_ASSERT_SQL" "$W9_FWD_SQL"
            exit 1
        fi
        echo "  OK: 第 ${cycle} 轮回滚后 8 表逐表 = rls_tenant_isolation/ALL/PERMISSIVE/{public} + 严格 B 表达式"

        W9_DELETE_VERSIONS="$W9_VERSION"
        for dep in ${W9_DEPENDENT_VERSIONS[@]+"${W9_DEPENDENT_VERSIONS[@]}"}; do
            W9_DELETE_VERSIONS+=",$dep"
        done
        psql "$DSN" -v ON_ERROR_STOP=1 -q -c \
            "DELETE FROM public._sqlx_migrations WHERE version IN (${W9_DELETE_VERSIONS})" \
            || { echo "FAIL: 第 ${cycle} 轮删除 W9-A 账本行失败" >&2; rm -f "$W9_ASSERT_SQL" "$W9_FWD_SQL"; exit 1; }
        bash scripts/migration/apply-forward.sh --dsn "$DSN" \
            --apply-deferred "$W9_VERSION" --ticket "$W9_TICKET" --drill-gate-guc-auto \
            || { echo "FAIL: 第 ${cycle} 轮 W9-A 重放失败" >&2; rm -f "$W9_ASSERT_SQL" "$W9_FWD_SQL"; exit 1; }
        for dep in $(printf '%s\n' ${W9_DEPENDENT_VERSIONS[@]+"${W9_DEPENDENT_VERSIONS[@]}"} | sort); do
            dep_applied="$(psql "$DSN" -tA -c "SELECT count(*) FROM public._sqlx_migrations WHERE version = ${dep} AND success")"
            if [[ "${dep_applied:-0}" -gt 0 ]]; then
                echo "  [4b] 依赖方 ${dep} 已随 W9-A 重放一并应用，跳过补投"
                continue
            fi
            dep_max="$(psql "$DSN" -tA -c 'SELECT COALESCE(max(version),0) FROM public._sqlx_migrations WHERE success')"
            dep_max="${dep_max:-0}"
            if [[ "$dep" -gt "$dep_max" ]]; then
                bash scripts/migration/apply-forward.sh --dsn "$DSN" --drill-gate-guc-auto \
                    || { echo "FAIL: 第 ${cycle} 轮依赖方 ${dep} 重放失败" >&2; rm -f "$W9_ASSERT_SQL" "$W9_FWD_SQL"; exit 1; }
            else
                bash scripts/migration/apply-forward.sh --dsn "$DSN" \
                    --apply-deferred "$dep" --ticket "$W9_TICKET" --drill-gate-guc-auto \
                    || { echo "FAIL: 第 ${cycle} 轮依赖方 ${dep} 重放失败" >&2; rm -f "$W9_ASSERT_SQL" "$W9_FWD_SQL"; exit 1; }
            fi
        done
        W9_VIOLATIONS="$(psql "$DSN" -v ON_ERROR_STOP=1 -tA -f "$W9_FWD_SQL")" \
            || { echo "FAIL: 第 ${cycle} 轮重放后断言查询失败" >&2; rm -f "$W9_ASSERT_SQL" "$W9_FWD_SQL"; exit 1; }
        if [[ -n "$W9_VIOLATIONS" ]]; then
            echo "FAIL: 第 ${cycle} 轮重放后公司维度策略不完整：" >&2
            printf '%s\n' "$W9_VIOLATIONS" >&2
            rm -f "$W9_ASSERT_SQL" "$W9_FWD_SQL"
            exit 1
        fi
        echo "  OK: 第 ${cycle} 轮重放后 8 表各 4 条公司维度策略"
    done
    rm -f "$W9_ASSERT_SQL" "$W9_FWD_SQL"
fi
phase_end "W9 回滚循环"

echo "[5/6] 策略期望快照（非特权连接 + 实测 pg_policies/pg_class）"
phase
SNAPSHOT_FILE="$SOURCE_ROOT/database/rls_policy_expected.json"
if [[ "${MIGRATION_DRILL_WRITE_POLICY_SNAPSHOT:-}" =~ ^(1|true|TRUE|True|yes|YES|on|ON)$ ]]; then
    # 只随迁移一起更新：写入后必须 review diff，并与同批迁移一起提交。
    node scripts/ci/gen-rls-policy-snapshot.mjs --dsn "$DSN" --write --out "$SNAPSHOT_FILE" \
        || { echo "FAIL: 策略快照生成失败" >&2; exit 1; }
fi
if [[ "${MIGRATION_DRILL_SKIP_POLICY_SNAPSHOT_CHECK:-}" =~ ^(1|true|TRUE|True|yes|YES|on|ON)$ ]]; then
    echo "SKIP: 已显式跳过策略快照比对（MIGRATION_DRILL_SKIP_POLICY_SNAPSHOT_CHECK=1，仅限快照更新/排障）"
else
    node scripts/ci/check-rls-policy-snapshot.mjs --dsn "$DSN" --snapshot "$SNAPSHOT_FILE" \
        || { echo "FAIL: 策略快照比对失败" >&2; exit 1; }
fi
phase_end "策略快照"

echo "[6/6] 菜单权限码完整性（core_menus → core_permissions）"
phase
node scripts/ci/check-menu-permission-codes.mjs --dsn "$DSN" \
    || { echo "FAIL: 菜单权限码完整性校验失败（菜单引用了 permissions 表中不存在的码）" >&2; exit 1; }
phase_end "菜单权限码"

for dir in "${SVC_DIRS[@]:-}"; do
    [[ -z "$dir" ]] && continue
    svc="$(echo "$dir" | cut -d'/' -f2)"
    echo "[svc] $svc 重放"
    phase
    # 独立 service 迁移账本：整库重建，避免套用主链基线
    dropdb --if-exists --maintenance-db="$ADMIN_DSN" "$DB" >/dev/null 2>&1 || true
    createdb --maintenance-db="$ADMIN_DSN" --template="$TEMPLATE_DB" "$DB" || { echo "FAIL: ${svc} 重放前重建库失败（维护库 ${ADMIN_DSN_SHOWN}，模板 ${TEMPLATE_DB}）" >&2; exit 1; }
    psql "$DSN" -v ON_ERROR_STOP=1 -q -c "CREATE SCHEMA IF NOT EXISTS \"$svc\";" \
        || { echo "FAIL: ${svc} 建 schema 失败" >&2; exit 1; }
    "$SQLX" migrate run --source "$dir" --database-url "$DSN" || { echo "FAIL: $svc 首次 up 失败" >&2; exit 1; }
    dropdb --if-exists --maintenance-db="$ADMIN_DSN" "$DB" >/dev/null 2>&1 || true
    createdb --maintenance-db="$ADMIN_DSN" --template="$TEMPLATE_DB" "$DB" || { echo "FAIL: ${svc} 重放重建库失败（维护库 ${ADMIN_DSN_SHOWN}，模板 ${TEMPLATE_DB}）" >&2; exit 1; }
    psql "$DSN" -v ON_ERROR_STOP=1 -q -c "CREATE SCHEMA IF NOT EXISTS \"$svc\";" \
        || { echo "FAIL: ${svc} 重放建 schema 失败" >&2; exit 1; }
    "$SQLX" migrate run --source "$dir" --database-url "$DSN" || { echo "FAIL: $svc 重放失败" >&2; exit 1; }
    phase_end "$svc 重放"
done

echo "PASS: drill:anchor 通过（anchor=${ANCHOR}，总耗时 $(( $(date +%s) - TOTAL_START ))s）"
