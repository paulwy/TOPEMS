#!/bin/bash
#
# TOPEMS Database Setup Script
# Initializes PostgreSQL database for TOPEMS
#
# Usage: ./setup-db.sh [OPTIONS]
# Options:
#   --host HOST       Database host (default: localhost)
#   --port PORT       Database port (default: 5432)
#   --user USER       Database user (default: topems)
#   --password PWD    Database password
#   --database DB     Database name (default: topems)
#   --create-user     Create database user
#   --create-db       Create database
#   --init-schema     Initialize schema
#   --force-nonempty  Skip the non-empty DB guard (⚠️ explicit opt-in only; never for prod)
#
# 守卫：本工具仅用于「全新空库初始化」。--init-schema 执行前会检查：
#   - 目标 DSN 的库名/host 命中 prod 特征 → 一律拒绝（--force-nonempty 也不放行）；
#   - 已存在 public._sqlx_migrations 成功记录，或存在任何非系统 schema 的业务表 → 拒绝；
#   - 探测失败（连接/权限/超时）→ 拒绝（不做默认放行）。
# 已有库升级请使用 scripts/migration/apply-forward.sh --prod（基线 + 前向迁移）。
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="topems"
DB_PASSWORD=""
DB_NAME="topems"
CREATE_USER=false
CREATE_DB=false
INIT_SCHEMA=false
FORCE_NONEMPTY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            DB_HOST="$2"
            shift 2
            ;;
        --port)
            DB_PORT="$2"
            shift 2
            ;;
        --user)
            DB_USER="$2"
            shift 2
            ;;
        --password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --database)
            DB_NAME="$2"
            shift 2
            ;;
        --create-user)
            CREATE_USER=true
            shift
            ;;
        --create-db)
            CREATE_DB=true
            shift
            ;;
        --init-schema)
            INIT_SCHEMA=true
            shift
            ;;
        --force-nonempty)
            FORCE_NONEMPTY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TOPEMS Database Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Host: ${GREEN}${DB_HOST}:${DB_PORT}${NC}"
echo -e "User: ${GREEN}${DB_USER}${NC}"
echo -e "Database: ${GREEN}${DB_NAME}${NC}"
echo ""

# 仓库根（脚本位于 scripts/deploy/，上移两级）；init.sql 与 migrations 均在仓库根 database/ 下
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# PGPASSWORD for non-interactive auth
export PGPASSWORD="${DB_PASSWORD}"

# ==================== 非空库守卫 ====================
# 本工具仅用于「全新空库初始化」。对已有库（尤其 prod）执行 --init-schema 会重放历史/定向迁移，
# 必须拦截。判定（任一命中即非空）：
#   1) 库名/host 命中 prod 特征（复用 check-prod-migration-entry.mjs 的 topems_prod /
#      192.168.110.115 / xingzhai 口径），此类不可绕过（--force-nonempty 也不放行）；
#   2) public._sqlx_migrations 存在且含成功记录；
#   3) 存在任何非系统 schema 的业务表（pg_class.relkind='r'）。
# 探测本身失败（连接/权限/超时）同样 exit 1（fail-closed，不做默认放行）。
guard_nonempty_db() {
    local name_lc host_lc raw table_count ledger_exists ledger_rows ledger_max
    local probe_opts=(-X -q -v ON_ERROR_STOP=1)
    local probe_msg="无法探测目标库元数据（连接/权限/超时失败）；检测失败不做默认放行（fail-closed）"

    # 1) prod 特征：不可绕过
    name_lc="$(printf '%s' "$DB_NAME" | tr '[:upper:]' '[:lower:]')"
    host_lc="$(printf '%s' "$DB_HOST" | tr '[:upper:]' '[:lower:]')"
    if [[ "$name_lc" =~ (^|_)(prod|production)(_|$) ]] || [[ "$host_lc" =~ 192\.168\.110\.115|xingzhai|prod ]]; then
        echo -e "${RED}✗ 拒绝：目标 DSN 命中 prod 特征（db=${DB_NAME} host=${DB_HOST}）${NC}"
        echo -e "  ${RED}本工具仅用于全新空库初始化（prohibited on existing DB）${NC}"
        echo "  prod 禁止使用本工具；--force-nonempty 也不放行。"
        echo "  prod 迁移唯一入口：bash scripts/migration/apply-forward.sh --prod --anchor <基线锚点> ..."
        exit 1
    fi

    # 2) 业务表数（statement_timeout 防止大库元数据查询拖住）
    if ! raw="$(PGOPTIONS="-c statement_timeout=5s" psql -h "$DB_HOST" -p "$DB_PORT" \
        -U "$DB_USER" -d "$DB_NAME" "${probe_opts[@]}" -tAc \
        "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema')" 2>&1)"; then
        echo -e "${RED}✗ 拒绝：${probe_msg}${NC}"
        printf '  %s\n' "$(printf '%s' "$raw" | head -1)"
        exit 1
    fi
    table_count="${raw//[^0-9]/}"
    table_count="${table_count:-0}"

    # 3) 迁移账本（存在且含成功记录即非空）
    if ! raw="$(PGOPTIONS="-c statement_timeout=5s" psql -h "$DB_HOST" -p "$DB_PORT" \
        -U "$DB_USER" -d "$DB_NAME" "${probe_opts[@]}" -tAc \
        "SELECT COALESCE(to_regclass('public._sqlx_migrations')::text,'')" 2>&1)"; then
        echo -e "${RED}✗ 拒绝：${probe_msg}${NC}"
        printf '  %s\n' "$(printf '%s' "$raw" | head -1)"
        exit 1
    fi
    ledger_exists="$(printf '%s' "$raw" | tr -d '[:space:]')"
    ledger_rows=0
    ledger_max=0
    if [[ -n "$ledger_exists" ]]; then
        if ! raw="$(PGOPTIONS="-c statement_timeout=5s" psql -h "$DB_HOST" -p "$DB_PORT" \
            -U "$DB_USER" -d "$DB_NAME" "${probe_opts[@]}" -tAc \
            "SELECT count(*) FROM public._sqlx_migrations WHERE success" 2>&1)"; then
            echo -e "${RED}✗ 拒绝：${probe_msg}${NC}"
            printf '  %s\n' "$(printf '%s' "$raw" | head -1)"
            exit 1
        fi
        ledger_rows="${raw//[^0-9]/}"
        ledger_rows="${ledger_rows:-0}"

        if ! raw="$(PGOPTIONS="-c statement_timeout=5s" psql -h "$DB_HOST" -p "$DB_PORT" \
            -U "$DB_USER" -d "$DB_NAME" "${probe_opts[@]}" -tAc \
            "SELECT COALESCE(max(version),0) FROM public._sqlx_migrations WHERE success" 2>&1)"; then
            echo -e "${RED}✗ 拒绝：${probe_msg}${NC}"
            printf '  %s\n' "$(printf '%s' "$raw" | head -1)"
            exit 1
        fi
        ledger_max="${raw//[^0-9]/}"
        ledger_max="${ledger_max:-0}"
    fi

    if (( table_count > 0 )) || (( ledger_rows > 0 )); then
        echo -e "${RED}✗ 拒绝：目标库非空（本工具仅用于全新空库初始化 / prohibited on existing DB）${NC}"
        echo "  库名        : ${DB_NAME} (${DB_HOST}:${DB_PORT})"
        echo "  已存在表数  : ${table_count}（非系统 schema 的 relkind='r' 业务表）"
        echo "  账本        : ${ledger_exists:-不存在}；成功记录 ${ledger_rows} 条，最大版本 ${ledger_max}"
        echo "  对已有库执行整链迁移会重放历史/定向迁移，可能造成重复数据或破坏 schema。"
        echo "  已有库升级请使用：bash scripts/migration/apply-forward.sh --prod --anchor <基线锚点> ..."
        if [[ "$FORCE_NONEMPTY" == true ]]; then
            echo -e "${YELLOW}⚠️  WARN: --force-nonempty 已显式绕过非空库守卫（库=${DB_NAME} 表=${table_count} 账本成功记录=${ledger_rows}），后果自负${NC}"
            return 0
        fi
        echo "  如确认风险且仅用于本地/测试库，可显式追加 --force-nonempty（会打印 WARN）。"
        exit 1
    fi
    echo -e "${GREEN}✓ 空库校验通过（表=0，无迁移账本）${NC}"
}

# Create user
if [[ "$CREATE_USER" == true ]]; then
    echo -e "${YELLOW}Creating database user: ${DB_USER}${NC}"

    # Check if user exists
    user_exists=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U postgres -tAc \
        "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'")

    if [[ "$user_exists" == "1" ]]; then
        echo -e "${YELLOW}User ${DB_USER} already exists${NC}"
    else
        psql -h "${DB_HOST}" -p "${DB_PORT}" -U postgres -c \
            "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
        echo -e "${GREEN}✓ User ${DB_USER} created${NC}"
    fi
fi

# Create database
if [[ "$CREATE_DB" == true ]]; then
    echo -e "${YELLOW}Creating database: ${DB_NAME}${NC}"

    # Check if database exists
    db_exists=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U postgres -lqt | \
        cut -d \| -f 1 | grep -qw "${DB_NAME}")

    if [[ "$db_exists" ]]; then
        echo -e "${YELLOW}Database ${DB_NAME} already exists${NC}"
    else
        psql -h "${DB_HOST}" -p "${DB_PORT}" -U postgres -c \
            "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
        echo -e "${GREEN}✓ Database ${DB_NAME} created${NC}"
    fi

    # Grant privileges
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U postgres -c \
        "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
    echo -e "${GREEN}✓ Privileges granted${NC}"
fi

# Initialize schema
if [[ "$INIT_SCHEMA" == true ]]; then
    echo -e "${YELLOW}Initializing database schema...${NC}"

    # 前置守卫：非空库（含 prod）拒绝整链迁移；--force-nonempty 显式绕过
    guard_nonempty_db

    # Run init.sql if exists
    if [[ -f "${PROJECT_ROOT}/database/postgres/init.sql" ]]; then
        psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
            -f "${PROJECT_ROOT}/database/postgres/init.sql"
        echo -e "${GREEN}✓ Base schema initialized${NC}"
    fi

    # Run migrations
    # 2026-10-15 修复（双轨制消除）：原 psql 逐文件重放 database/migrations 不遵守
    #   _sqlx_migrations 记录——非幂等迁移重复执行会失败/重复数据，且与项目 sqlx 迁移链
    #   （production-deploy.sh / migrate.sh / cli）双轨漂移。统一改走 sqlx migrate run
    #   （幂等，_sqlx_migrations 保证只应用未应用项）；sqlx 不可用时保留 psql 重放作 legacy fallback。
    if [[ -d "${PROJECT_ROOT}/database/migrations" ]]; then
        if command -v sqlx >/dev/null 2>&1; then
            # 密码经 URL 编码后拼 DATABASE_URL（部署机无 python3 时回退原样拼接）
            if command -v python3 >/dev/null 2>&1; then
                ENC_PW="$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$DB_PASSWORD")"
            else
                ENC_PW="$DB_PASSWORD"
            fi
            DB_URL="postgres://${DB_USER}:${ENC_PW}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
            echo -e "${YELLOW}Running sqlx migrations (chain, idempotent)...${NC}"
            DATABASE_URL="$DB_URL" sqlx migrate run --source "${PROJECT_ROOT}/database/migrations"
            echo -e "${GREEN}✓ Migrations applied${NC}"
        else
            echo -e "${YELLOW}sqlx not found — legacy psql replay (non-idempotent, prefer installing sqlx)${NC}"
            for sql_file in "${PROJECT_ROOT}/database/migrations"/*.sql; do
                if [[ -f "$sql_file" ]]; then
                    echo -e "${YELLOW}Running: ${sql_file}${NC}"
                    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
                        -f "$sql_file" || echo -e "${YELLOW}⚠ Some statements may have failed${NC}"
            fi
        done
        fi
        echo -e "${GREEN}✓ Migrations applied${NC}"
    fi

    # Enable extensions
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c \
        "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c \
        "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c \
        "CREATE EXTENSION IF NOT EXISTS \"vector\";" || echo -e "${YELLOW}⚠ pgvector not installed${NC}"

    echo -e "${GREEN}✓ Extensions enabled${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Database setup completed!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test connection
echo -e "${YELLOW}Testing connection...${NC}"
if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo "Please check your configuration"
fi

unset PGPASSWORD