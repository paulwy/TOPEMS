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