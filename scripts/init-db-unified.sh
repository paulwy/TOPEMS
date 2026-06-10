#!/bin/bash
# TOPEMS 统一数据库初始化脚本
# 支持本地 PostgreSQL 和 Docker PostgreSQL
# 自动检测环境并配置

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "╔══════════════════════════════════════════════════════════╗"
echo "║        TOPEMS 统一数据库初始化                         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 配置
DB_NAME="topems"
DB_USER="topems"
DB_PASS="topems_secret"
LOCAL_USER="xingzhai"  # macOS 本地用户名

# 检测环境函数
detect_environment() {
    echo -e "${YELLOW}📡 检测数据库环境...${NC}"
    echo ""

    # 检查 Docker PostgreSQL
    if docker ps | grep -q "topems-postgres"; then
        echo -e "  ${BLUE}检测到 Docker PostgreSQL${NC}"

        # 获取 Docker PostgreSQL 信息
        DOCKER_VERSION=$(docker exec topems-postgres psql -U topems -d topems -c "SELECT version();" 2>/dev/null | grep -o 'PostgreSQL [0-9.]*' | awk '{print $2}')
        DOCKER_PGVECTOR=$(docker exec topems-postgres psql -U topems -d topems -c "SELECT extname FROM pg_extension WHERE extname = 'vector';" 2>/dev/null | grep -c "vector" || echo "0")

        echo "    版本: ${DOCKER_VERSION:-未知}"
        echo -n "    pgvector: "
        if [ "$DOCKER_PGVECTOR" = "1" ]; then
            echo -e "${GREEN}已安装${NC}"
        else
            echo -e "${RED}未安装${NC}"
        fi

        DOCKER_AVAILABLE=true
    else
        echo -e "  ${YELLOW}Docker PostgreSQL 未运行${NC}"
        DOCKER_AVAILABLE=false
        DOCKER_PGVECTOR=0
    fi

    echo ""

    # 检查本地 PostgreSQL
    if command -v psql &> /dev/null; then
        LOCAL_VERSION=$(psql --version 2>/dev/null | awk '{print $3}' | cut -d. -f1,2)
        echo -e "  ${BLUE}检测到本地 PostgreSQL${NC}"
        echo "    版本: ${LOCAL_VERSION:-未知}"

        # 检查 pgvector
        LOCAL_PGVECTOR=$(psql -U $LOCAL_USER -d postgres -c "SELECT extname FROM pg_extension WHERE extname = 'vector';" 2>/dev/null | grep -c "vector" || echo "0")
        echo -n "    pgvector: "
        if [ "$LOCAL_PGVECTOR" = "1" ]; then
            echo -e "${GREEN}已安装${NC}"
        else
            echo -e "${RED}未安装${NC}"
        fi

        LOCAL_AVAILABLE=true
    else
        echo -e "  ${YELLOW}本地 PostgreSQL 未安装${NC}"
        LOCAL_AVAILABLE=false
        LOCAL_PGVECTOR=0
    fi

    echo ""

    # 确定最佳环境
    if [ "$DOCKER_AVAILABLE" = "true" ] && [ "$DOCKER_PGVECTOR" = "1" ]; then
        echo -e "${GREEN}✅ 推荐使用: Docker PostgreSQL (带 pgvector)${NC}"
        SELECTED_ENV="docker"
    elif [ "$LOCAL_AVAILABLE" = "true" ] && [ "$LOCAL_PGVECTOR" = "1" ]; then
        echo -e "${GREEN}✅ 推荐使用: 本地 PostgreSQL (带 pgvector)${NC}"
        SELECTED_ENV="local"
    elif [ "$DOCKER_AVAILABLE" = "true" ]; then
        echo -e "${YELLOW}⚠️  使用: Docker PostgreSQL (无 pgvector)${NC}"
        SELECTED_ENV="docker"
    elif [ "$LOCAL_AVAILABLE" = "true" ]; then
        echo -e "${YELLOW}⚠️  使用: 本地 PostgreSQL (无 pgvector)${NC}"
        SELECTED_ENV="local"
    else
        echo -e "${RED}❌ 未检测到可用的 PostgreSQL${NC}"
        exit 1
    fi

    echo ""
}

# 初始化本地 PostgreSQL
init_local() {
    echo -e "${BLUE}📦 初始化本地 PostgreSQL...${NC}"
    echo ""

    # 创建用户
    echo -e "  创建数据库用户: $DB_USER"
    if psql -U $LOCAL_USER -d postgres -c "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER';" 2>/dev/null | grep -q "1"; then
        echo -e "    ${GREEN}用户已存在${NC}"
    else
        psql -U $LOCAL_USER -d postgres -c "CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS' CREATEDB SUPERUSER;" 2>/dev/null
        echo -e "    ${GREEN}用户创建成功${NC}"
    fi

    # 创建数据库
    echo -e "  创建数据库: $DB_NAME"
    if psql -U $LOCAL_USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" 2>/dev/null | grep -q "1"; then
        echo -e "    ${GREEN}数据库已存在${NC}"
    else
        psql -U $LOCAL_USER -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null
        echo -e "    ${GREEN}数据库创建成功${NC}"
    fi

    # 启用 pgvector
    echo -e "  启用 pgvector 扩展..."
    psql -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null
    echo -e "    ${GREEN}pgvector 启用成功${NC}"

    # 初始化表结构
    init_tables_local

    # 显示连接信息
    echo ""
    echo -e "${GREEN}✅ 本地 PostgreSQL 初始化完成！${NC}"
    echo ""
    echo "连接信息:"
    echo "  DATABASE_URL=postgres://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
    echo ""
}

# 初始化表结构（本地）
init_tables_local() {
    echo -e "  初始化表结构..."

    # IAM 表
    psql -U $DB_USER -d $DB_NAME -c "
    CREATE SCHEMA IF NOT EXISTS iam;
    CREATE TABLE IF NOT EXISTS iam.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    " 2>/dev/null

    # HRM 表
    psql -U $DB_USER -d $DB_NAME -c "
    CREATE SCHEMA IF NOT EXISTS hrm;
    CREATE TABLE IF NOT EXISTS hrm.employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_no VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        department_id UUID,
        position VARCHAR(100),
        skills TEXT[],
        embedding_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hrm.departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        parent_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    " 2>/dev/null

    echo -e "    ${GREEN}表结构初始化完成${NC}"
}

# 初始化 Docker PostgreSQL
init_docker() {
    echo -e "${BLUE}📦 初始化 Docker PostgreSQL...${NC}"
    echo ""

    # 启用 pgvector
    echo -e "  尝试启用 pgvector..."
    if docker exec topems-postgres psql -U topems -d topems -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null; then
        echo -e "    ${GREEN}pgvector 启用成功${NC}"
    else
        echo -e "    ${YELLOW}pgvector 未安装（Docker 镜像不支持）${NC}"
    fi

    # 初始化表结构
    init_tables_docker

    # 显示连接信息
    echo ""
    echo -e "${GREEN}✅ Docker PostgreSQL 初始化完成！${NC}"
    echo ""
    echo "连接信息:"
    echo "  DATABASE_URL=postgres://topems:topems@host.docker.internal:5432/topems"
    echo ""
}

# 初始化表结构（Docker）
init_tables_docker() {
    echo -e "  初始化表结构..."

    # IAM 表
    docker exec topems-postgres psql -U topems -d topems -c "
    CREATE SCHEMA IF NOT EXISTS iam;
    CREATE TABLE IF NOT EXISTS iam.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    " 2>/dev/null

    # HRM 表
    docker exec topems-postgres psql -U topems -d topems -c "
    CREATE SCHEMA IF NOT EXISTS hrm;
    CREATE TABLE IF NOT EXISTS hrm.employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_no VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        department_id UUID,
        position VARCHAR(100),
        skills TEXT[],
        embedding_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hrm.departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        parent_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    " 2>/dev/null

    echo -e "    ${GREEN}表结构初始化完成${NC}"
}

# 创建默认管理员
create_admin() {
    echo -e "${BLUE}👤 创建默认管理员...${NC}"

    local admin_exists=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM iam.users WHERE username = 'admin';" 2>/dev/null | tr -d ' ')

    if [ "$admin_exists" = "0" ]; then
        # 简单密码哈希（实际使用 bcrypt）
        local password_hash=$(echo -n "admin123" | sha256sum | cut -d' ' -f1)

        psql -U $DB_USER -d $DB_NAME -c "
        INSERT INTO iam.users (username, password_hash, email, is_active)
        VALUES ('admin', '$password_hash', 'admin@topems.local', true);
        " 2>/dev/null

        echo -e "    ${GREEN}管理员创建成功: admin / admin123${NC}"
    else
        echo -e "    ${YELLOW}管理员已存在${NC}"
    fi
}

# 生成环境配置
generate_env_config() {
    echo -e "${BLUE}📝 生成环境配置...${NC}"

    cat > .env.database << 'EOF'
# PostgreSQL 数据库配置
# 使用本地 PostgreSQL（推荐，支持 pgvector）
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems

# Docker PostgreSQL 配置（替代方案）
# DATABASE_URL=postgres://topems:topems@host.docker.internal:5432/topems

# Redis 配置
REDIS_URL=redis://localhost:6379

# Ollama AI 配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
AI_PROVIDER=ollama
EOF

    echo -e "    ${GREEN}配置文件已生成: .env.database${NC}"
}

# 主入口
main() {
    # 检测环境
    detect_environment

    # 选择环境
    echo -e "${YELLOW}请选择初始化方式:${NC}"
    echo "  1) 自动选择最佳环境"
    echo "  2) 仅使用本地 PostgreSQL"
    echo "  3) 仅使用 Docker PostgreSQL"
    echo ""

    read -p "请输入选项 [1]: " choice
    choice=${choice:-1}

    case $choice in
        1)
            if [ "$SELECTED_ENV" = "docker" ]; then
                init_docker
            else
                init_local
                create_admin
            fi
            ;;
        2)
            init_local
            create_admin
            ;;
        3)
            init_docker
            ;;
        *)
            echo -e "${RED}无效选项${NC}"
            exit 1
            ;;
    esac

    # 生成环境配置
    generate_env_config

    # 完成
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                  初始化完成                            ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "下一步:"
    echo "  1. 运行: source .env.database"
    echo "  2. 启动服务: bash scripts/start-local.sh"
    echo ""
}

main "$@"
