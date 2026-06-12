#!/bin/bash

# TOPEMS 数据库初始化脚本
# 用于创建数据库、用户和授予权限

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  TOPEMS 数据库初始化"
echo "=============================================="
echo ""

# 检查 PostgreSQL 是否运行 - 使用 Docker 检查
echo "🔍 检查 PostgreSQL 服务..."
POSTGRES_CONTAINER=$(docker ps --format '{{.Names}}' | grep topems-postgres)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo -e "${RED}错误:${NC} PostgreSQL 容器未运行"
    echo "请先启动 Docker 容器: docker-compose up -d"
    exit 1
fi

echo -e "${GREEN}✅${NC} PostgreSQL 容器正在运行: $POSTGRES_CONTAINER"

# 定义使用 Docker 执行 psql 的函数
docker_psql() {
    docker exec "$POSTGRES_CONTAINER" psql -U topems -d topems "$@"
}

docker_psql_as_postgres() {
    docker exec "$POSTGRES_CONTAINER" psql -U postgres -d postgres "$@"
}
echo ""

# 创建用户
echo "👤 创建数据库用户..."
docker_psql_as_postgres -c "CREATE USER topems WITH PASSWORD 'topems_secret';" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅${NC} 用户 topems 已创建"
else
    echo -e "${YELLOW}⚠️${NC} 用户 topems 可能已存在，继续..."
fi

# 创建数据库
echo "📦 创建数据库..."
docker_psql_as_postgres -c "CREATE DATABASE topems OWNER topems;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅${NC} 数据库 topems 已创建"
else
    echo -e "${YELLOW}⚠️${NC} 数据库 topems 可能已存在，继续..."
fi

# 授予权限
echo "🔐 授予权限..."
docker_psql -c "GRANT ALL PRIVILEGES ON SCHEMA public TO topems;" 2>/dev/null
docker_psql -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO topems;" 2>/dev/null
docker_psql -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO topems;" 2>/dev/null

echo -e "${GREEN}✅${NC} 权限已授予"
echo ""

# 初始化 IAM schema
echo "🔐 初始化 IAM 表结构..."
IAM_SCHEMA_FILE="svc/iam/src/db/migrations/20260522000001_create_iam_schema.sql"

if [ -f "$IAM_SCHEMA_FILE" ]; then
    docker cp "$IAM_SCHEMA_FILE" "$POSTGRES_CONTAINER:/tmp/iam_schema.sql" > /dev/null 2>&1
    docker exec "$POSTGRES_CONTAINER" psql -U topems -d topems -f "/tmp/iam_schema.sql" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅${NC} IAM 表结构已创建"
    else
        echo -e "${YELLOW}⚠️${NC} IAM 表结构可能已存在，继续..."
    fi
else
    echo -e "${YELLOW}⚠️${NC} IAM schema 文件不存在: $IAM_SCHEMA_FILE"
fi

# 初始化所有其他 schema
echo "📋 初始化所有服务的数据库 schema..."
SCHEMA_FILES=(
    "svc/shared/migrations/20260612000001_create_shared_schema.sql"
    "svc/erp/migrations/20260612000001_create_consolidation_schema.sql"
    "svc/erp/migrations/20260608100000_create_erp_schema.sql"
    "svc/file/migrations/20260611000001_create_storage_schema.sql"
    "svc/mobile/migrations/20260609100006_create_mobile_schema.sql"
    "svc/integration/migrations/20260609100005_create_integration_schema.sql"
    "svc/report/migrations/20260609100007_create_report_schema.sql"
    "svc/wms/migrations/20260608100004_create_wms_schema.sql"
    "svc/portal/migrations/20260609100004_create_portal_schema.sql"
    "svc/mes/migrations/20260608100003_create_mes_schema.sql"
    "svc/im/migrations/20260608100000_create_im_schema.sql"
    "svc/gis/migrations/20260608100000_create_gis_schema.sql"
    "svc/ehs/migrations/20260609100000_create_ehs_schema.sql"
    "svc/srm/migrations/20260609100002_create_srm_schema.sql"
    "svc/scm/migrations/20260609100001_create_scm_schema.sql"
    "svc/pm/migrations/20260609100003_create_pm_schema.sql"
    "svc/qms/migrations/20260608100002_create_qms_schema.sql"
    "svc/lims/migrations/20260608100000_create_lims_schema.sql"
    "svc/crm/migrations/20260608100001_create_crm_schema.sql"
    "svc/hrm/migrations/20260609000000_create_initialization_schema.sql"
    "svc/hrm/migrations/20260608100000_create_hrm_schema.sql"
    "svc/doc/src/db/migrations/20260523000001_create_doc_schema.sql"
    "svc/doc/src/db/migrations/20260527000001_create_templates_and_help_center_schema.sql"
    "svc/doc/src/db/migrations/20260605000001_create_archive_schema.sql"
    "svc/rs/migrations/20260601000000_projects.sql"
    "svc/rs/migrations/20260601000001_project_phases.sql"
    "svc/rs/migrations/20260601000002_project_milestones.sql"
    "svc/rs/migrations/20260601000003_project_members.sql"
)

initialized_count=0
skipped_count=0

for schema_file in "${SCHEMA_FILES[@]}"; do
    if [ -f "$schema_file" ]; then
        docker cp "$schema_file" "$POSTGRES_CONTAINER:/tmp/$(basename $schema_file)" > /dev/null 2>&1
        docker exec "$POSTGRES_CONTAINER" psql -U topems -d topems -f "/tmp/$(basename $schema_file)" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            ((initialized_count++))
        else
            ((skipped_count++))
        fi
    fi
done

echo -e "${GREEN}✅${NC} 已初始化 $initialized_count 个 schema, $skipped_count 个已存在"

echo ""
echo "=============================================="
echo "  数据库初始化完成！"
echo "=============================================="
echo ""
echo "数据库信息："
echo "  数据库名: topems"
echo "  用户名:   topems"
echo "  密码:     topems_secret"
echo "  端口:     5432"
echo ""
echo "权限管理："
echo "  默认角色: admin, developer, manager, user, guest"
echo "  默认权限: 70+ 个权限已初始化"
echo ""
echo "系统账号："
echo "  默认超级管理员: admin / admin123"
echo "  其他用户需通过管理员创建"
echo ""
echo "⚠️ 安全提示:"
echo "  - 首次登录后请立即修改默认密码"
echo "  - 建议定期更换密码"
echo ""
echo "连接字符串:"
echo "  postgres://topems:topems_secret@localhost:5432/topems"
echo ""
