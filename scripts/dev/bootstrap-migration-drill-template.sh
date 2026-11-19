#!/usr/bin/env bash
# =============================================================================
# bootstrap-migration-drill-template.sh — 一次性造迁移演练模板库（幂等）
# =============================================================================
# 目的：
#   anchor 基线快照含 CREATE EXTENSION（pgcrypto / "uuid-ossp" / vector），
#   非特权角色无法在新库执行；本脚本只用本机特权连接把扩展预装进一个空模板库，
#   之后演练用 createdb --template=<模板库> 复制，迁移/校验仍全部走非特权连接。
#
# 边界（硬约束）：
#   - 特权只出现在本脚本；不连接、不修改 topems_prod（脚本显式拒绝该库名）。
#   - 只创建/维护模板库与扩展，不建业务表、不恢复基线、不应用迁移。
#   - 幂等：模板库已存在则跳过创建；扩展逐个 CREATE EXTENSION IF NOT EXISTS。
#   - 若模板库已存在但含用户表，直接失败，避免把脏库当模板。
#
# 扩展来源（不硬编码）：
#   递归扫描 database/migrations/**/*.sql、svc/**/migrations/**/*.sql
#   以及 database/baseline/prod_schema_*.sql.gz 中的 CREATE EXTENSION 语句。
#
# 用法：
#   bash scripts/dev/bootstrap-migration-drill-template.sh
#   MIGRATION_DRILL_TEMPLATE_DB=topems_drill_template \
#   MIGRATION_DRILL_ROLE=topems_test_runner \
#   MIGRATION_DRILL_ADMIN_DSN='postgresql:///postgres' \
#     bash scripts/dev/bootstrap-migration-drill-template.sh
#
# 回滚：
#   psql -d postgres -c 'ALTER DATABASE topems_drill_template ALLOW_CONNECTIONS true'
#   psql -d postgres -c 'ALTER DATABASE topems_drill_template IS_TEMPLATE false'
#   dropdb topems_drill_template
# =============================================================================
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then echo "FAIL: 不在 git 仓库内" >&2; exit 1; fi

TEMPLATE_DB="${MIGRATION_DRILL_TEMPLATE_DB:-topems_drill_template}"
DRILL_ROLE="${MIGRATION_DRILL_ROLE:-topems_test_runner}"
ADMIN_DSN="${MIGRATION_DRILL_ADMIN_DSN:-postgresql:///postgres}"

case "$TEMPLATE_DB $ADMIN_DSN" in
    *topems_prod*)
        echo "FAIL: 拒绝：模板库 bootstrap 不得触碰 topems_prod（TEMPLATE_DB=${TEMPLATE_DB}）" >&2
        exit 1
        ;;
esac

for bin in psql createdb; do
    command -v "$bin" >/dev/null 2>&1 || { echo "FAIL: 缺少 ${bin}" >&2; exit 1; }
done

IDENT="$(psql "$ADMIN_DSN" -v ON_ERROR_STOP=1 -tAc \
    "SELECT current_user || '|' || rolsuper::text FROM pg_roles WHERE rolname = current_user")" || {
    echo "FAIL: 连不上本机维护库 ${ADMIN_DSN}（模板库 bootstrap 只允许本机特权连接）" >&2
    exit 1
}
IFS='|' read -r ADMIN_USER IS_SUPER <<< "$IDENT"
if [[ "$IS_SUPER" != "t" && "$IS_SUPER" != "true" ]]; then
    cat >&2 <<EOF
FAIL: 模板库 bootstrap 需要本机特权角色（当前 current_user=${ADMIN_USER} rolsuper=${IS_SUPER}）
  说明：这一步只造模板库，不连接 topems_prod；日常演练仍用非特权角色。
  修法：以本机管理员身份运行，或设置 MIGRATION_DRILL_ADMIN_DSN 指向本机特权连接。
EOF
    exit 1
fi

# ---- 从迁移 + 基线快照推导扩展名（去重、排序；兼容 macOS bash 3.2，不用 mapfile） ----
EXTENSIONS=()
while IFS= read -r ext; do
    [[ -n "$ext" ]] && EXTENSIONS+=("$ext")
done < <(
    {
        find "$ROOT/database/migrations" "$ROOT/svc" -type f -name '*.sql' -print0 2>/dev/null \
            | xargs -0 grep -hoiE 'CREATE EXTENSION( IF NOT EXISTS)?[[:space:]]+"?[A-Za-z0-9_-]+"?' 2>/dev/null || true
        find "$ROOT/database/baseline" -maxdepth 1 -type f -name 'prod_schema_*.sql.gz' -print0 2>/dev/null \
            | while IFS= read -r -d '' f; do gzip -cd "$f"; done \
            | grep -ioE 'CREATE EXTENSION( IF NOT EXISTS)?[[:space:]]+"?[A-Za-z0-9_-]+"?' 2>/dev/null || true
    } | sed -E 's/.*[[:space:]]"?([A-Za-z0-9_-]+)"?$/\1/' | tr '[:upper:]' '[:lower:]' | sort -u
)

if [[ ${#EXTENSIONS[@]} -eq 0 ]]; then
    echo "FAIL: 未从迁移/基线中推导出任何扩展，拒绝猜测" >&2
    exit 1
fi

echo "[derive] 扩展（来自迁移+基线）：${EXTENSIONS[*]}"
echo "[admin] current_user=${ADMIN_USER}（仅用于造模板库；不连接 topems_prod）"

# ---- 模板库：存在则复用，不存在则创建 ----
DB_EXISTS="$(psql "$ADMIN_DSN" -v ON_ERROR_STOP=1 -tAc \
    "SELECT 1 FROM pg_database WHERE datname = '${TEMPLATE_DB//\'/\'\'}'")"
if [[ "$DB_EXISTS" == "1" ]]; then
    echo "[template] ${TEMPLATE_DB} 已存在，跳过创建（幂等）"
else
    createdb --maintenance-db="$ADMIN_DSN" "$TEMPLATE_DB"
    echo "[template] 已创建 ${TEMPLATE_DB}"
fi

# 后续要在模板库内 CREATE/ALTER EXTENSION；先临时开放连接，结束时再关闭。
psql "$ADMIN_DSN" -v ON_ERROR_STOP=1 -q -c \
    "ALTER DATABASE \"$TEMPLATE_DB\" ALLOW_CONNECTIONS true"

# psql 的“位置参数 + -d”会冲突；用 \connect 在已建立的特权会话里切换模板库。
psql_template() {
    psql "$ADMIN_DSN" -v ON_ERROR_STOP=1 -q -c "\\connect \"$TEMPLATE_DB\"" "$@"
}

# 只允许空模板：除扩展自带对象外，不允许用户表/用户 schema。
USER_OBJECTS="$(psql_template -tAc "
    SELECT count(*) FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r','p','v','m','S','f')
      AND n.nspname NOT IN ('pg_catalog','information_schema')
      AND n.nspname NOT LIKE 'pg_toast%'
")"
if [[ "$USER_OBJECTS" != "0" ]]; then
    echo "FAIL: 模板库 ${TEMPLATE_DB} 含非扩展用户对象（count=${USER_OBJECTS}），拒绝把脏库当模板" >&2
    exit 1
fi

# ---- 逐扩展幂等安装 ----
for ext in "${EXTENSIONS[@]}"; do
    psql_template -c "CREATE EXTENSION IF NOT EXISTS \"${ext}\""
    echo "[ext] ${ext} ok"
done

# ---- 标记为模板并只授权给演练角色 ----
psql "$ADMIN_DSN" -v ON_ERROR_STOP=1 -q -c \
    "ALTER DATABASE \"$TEMPLATE_DB\" IS_TEMPLATE true"
psql "$ADMIN_DSN" -v ON_ERROR_STOP=1 -q -c \
    "ALTER DATABASE \"$TEMPLATE_DB\" ALLOW_CONNECTIONS false"
psql "$ADMIN_DSN" -v ON_ERROR_STOP=1 -q -c \
    "GRANT CONNECT ON DATABASE \"$TEMPLATE_DB\" TO \"$DRILL_ROLE\"" || {
    echo "WARN: 角色 ${DRILL_ROLE} 不存在或无法授权；演练前需确保该角色存在且有 CREATEDB" >&2
}

echo "PASS: 模板库 ${TEMPLATE_DB} 就绪（IS_TEMPLATE=true, ALLOW_CONNECTIONS=false, 角色=${DRILL_ROLE}）"
echo "  演练：bash scripts/dev/run-migration-drill.sh anchor"
