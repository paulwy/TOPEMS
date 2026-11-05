#!/bin/bash
#
# TOPEMS Database Setup Script（已降级：仅建用户/建库）
#
# 历史链不可从零重放：database/migrations/20261005000004_lims_qa_lab_fk_repoint.sql
# 依赖 public.qa_lab_tasks，而该表由更晚的 20261007000009 才创建；全链 sqlx migrate run
# 在空库必然失败。schema 供给已统一为「基线快照 + 前向迁移」：
#   bash scripts/db/provision-env.sh --env <dev|test|staging|prod-replica> [--dsn ...]
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
#   --init-schema     已停用：直接 exit 1 并提示改用 provision-env.sh
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

if [[ "$INIT_SCHEMA" == true ]]; then
    echo -e "${RED}✗ --init-schema 已停用：历史迁移链不可从零重放${NC}" >&2
    echo "  原因：20261005000004_lims_qa_lab_fk_repoint.sql 依赖 public.qa_lab_tasks，" >&2
    echo "        该表由更晚的 20261007000009 才创建，空库全链 sqlx migrate run 必然失败。" >&2
    echo "  正确入口：bash scripts/db/provision-env.sh --env <dev|test|staging|prod-replica> [--dsn ...]" >&2
    echo "  （基线快照 + 只应用 version > 锚点的前向迁移；详见 docs/quality/environment-provisioning.md）" >&2
    echo "  本脚本现在仅保留 --create-user / --create-db 能力。" >&2
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TOPEMS Database Setup（建用户/建库）${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Host: ${GREEN}${DB_HOST}:${DB_PORT}${NC}"
echo -e "User: ${GREEN}${DB_USER}${NC}"
echo -e "Database: ${GREEN}${DB_NAME}${NC}"
echo ""

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

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}User/Database setup completed!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}Schema 供给请使用：bash scripts/db/provision-env.sh --env <env> [--dsn ...]${NC}"
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
