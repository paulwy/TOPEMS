#!/bin/bash
set -e

# TOPEMS 数据库初始化脚本
# 支持：本地 PostgreSQL + Docker PostgreSQL

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 默认配置
DB_NAME="topems"
DB_USER="topems"
DB_PASSWORD="topems_secret"
DB_PORT="5432"
DB_HOST="localhost"

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查 PostgreSQL 是否正在运行
check_pg_running() {
    if command_exists pg_isready; then
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
            return 0
        fi
    fi
    # 也检查 Docker 容器
    if command_exists docker && docker ps --format '{{.Names}}' | grep -q "topems-postgres"; then
        return 0
    fi
    return 1
}

# 检查 pgvector 是否已安装
check_pgvector() {
    local result
    result=$(psql "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/postgres" -c "SELECT extname FROM pg_extension WHERE extname = 'vector';" 2>/dev/null)
    if echo "$result" | grep -q "vector"; then
        return 0
    fi
    return 1
}

# 尝试启动本地 PostgreSQL
start_local_postgres() {
    info "尝试启动本地 PostgreSQL..."
    
    # 检查是否安装了 PostgreSQL
    if ! command_exists pg_ctl; then
        warning "本地 PostgreSQL 未安装"
        return 1
    fi
    
    # 找到数据目录 - 动态检测多个可能的位置
    local pg_data_dir
    pg_data_dir=$(pg_config --bindir 2>/dev/null | sed 's|/bin$|/../var/postgresql@18|')
    
    # 如果默认路径不存在，尝试其他常见位置
    if [ ! -d "$pg_data_dir" ]; then
        for candidate in \
            "/opt/homebrew/var/postgresql@18" \
            "/opt/homebrew/var/postgresql@16" \
            "/usr/local/var/postgresql@18" \
            "/usr/local/var/postgresql@16"; do
            if [ -d "$candidate" ]; then
                pg_data_dir="$candidate"
                break
            fi
        done
    fi
    
    # 检查数据目录是否存在
    if [ ! -d "$pg_data_dir" ] || [ -z "$(ls -A "$pg_data_dir")" ]; then
        info "初始化 PostgreSQL 数据目录..."
        initdb -D "$pg_data_dir" || { error "PostgreSQL 数据目录初始化失败"; return 1; }
    fi
    
    # 配置监听地址
    if [ -f "$pg_data_dir/postgresql.conf" ]; then
        sed -i.bak 's/^#listen_addresses = .*/listen_addresses = '\''*'\''/' "$pg_data_dir/postgresql.conf" 2>/dev/null || true
    fi
    
    # 配置 pg_hba.conf 允许密码认证
    if [ -f "$pg_data_dir/pg_hba.conf" ]; then
        echo "host    all             all             127.0.0.1/32            scram-sha-256" >> "$pg_data_dir/pg_hba.conf"
    fi
    
    # 启动 PostgreSQL
    info "启动本地 PostgreSQL..."
    pg_ctl -D "$pg_data_dir" -l /tmp/postgres.log start || { error "PostgreSQL 启动失败"; cat /tmp/postgres.log 2>/dev/null | tail -10; return 1; }
    
    # 等待启动
    info "等待 PostgreSQL 启动..."
    for i in {1..10}; do
        if pg_isready -h "$DB_HOST" -p "$DB_PORT"; then
            success "本地 PostgreSQL 启动成功"
            return 0
        fi
        sleep 2
    done
    
    error "本地 PostgreSQL 启动超时"
    return 1
}

# 启动 Docker PostgreSQL
start_docker_postgres() {
    info "尝试使用 Docker 启动 PostgreSQL..."
    
    if ! command_exists docker; then
        error "Docker 未安装，请先安装 Docker"
        return 1
    fi
    
    # 停止并删除旧容器
    docker stop topems-postgres >/dev/null 2>&1 || true
    docker rm topems-postgres >/dev/null 2>&1 || true
    
    # 创建数据目录
    mkdir -p ./data/postgres
    
    # 检查能否拉取 pgvector 镜像
    info "启动 PostgreSQL 容器..."
    if docker run -d \
        --name topems-postgres \
        -e POSTGRES_DB="$DB_NAME" \
        -e POSTGRES_USER="$DB_USER" \
        -e POSTGRES_PASSWORD="$DB_PASSWORD" \
        -p "$DB_PORT:5432" \
        -v "$(pwd)/data/postgres:/var/lib/postgresql/data" \
        --restart unless-stopped \
        postgres:16; then
        
        # 等待启动
        info "等待 PostgreSQL 容器启动..."
        for i in {1..20}; do
            if docker exec topems-postgres pg_isready -U "$DB_USER"; then
                success "Docker PostgreSQL 启动成功"
                return 0
            fi
            sleep 2
        done
        
        error "Docker PostgreSQL 启动超时"
        return 1
    else
        error "Docker 容器启动失败"
        return 1
    fi
}

# 安装 pgvector 扩展
install_pgvector() {
    info "检查 pgvector 扩展..."
    
    if check_pgvector; then
        success "pgvector 已安装"
        return 0
    fi
    
    info "安装 pgvector 扩展..."
    
    # 尝试多种方式安装 pgvector
    local methods=(
        "psql -c \"CREATE EXTENSION IF NOT EXISTS vector;\""
        "CREATE EXTENSION IF NOT EXISTS vector;"
    )
    
    for method in "${methods[@]}"; do
        if psql "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null 2>&1; then
            success "pgvector 安装成功"
            return 0
        fi
    done
    
    warning "pgvector 安装失败，AI 向量功能将被禁用"
    return 1
}

# 创建数据库和用户
create_db_and_user() {
    info "创建数据库和用户..."
    
    # 检查用户是否存在
    local user_exists
    user_exists=$(psql "postgres://postgres:postgres@$DB_HOST:$DB_PORT/postgres" -t -c "SELECT 1 FROM pg_user WHERE usename = '$DB_USER';" 2>/dev/null)
    
    if [ -z "$user_exists" ]; then
        # 创建用户和数据库
        psql "postgres://postgres:postgres@$DB_HOST:$DB_PORT/postgres" <<EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF
    else
        # 用户已存在，只需确保数据库存在
        psql "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/postgres" -c "CREATE DATABASE IF NOT EXISTS $DB_NAME;" >/dev/null 2>&1
    fi
    
    success "数据库和用户创建完成"
}

# 运行所有数据库迁移
run_migrations() {
    info "运行数据库迁移..."
    
    # 运行核心服务迁移
    local svc_dirs=(
        "svc/iam"
        "svc/pm"
        "svc/notification"
        "svc/portal"
        "svc/flow"
        "svc/integration"
        "svc/erp"
        "svc/hrm"
        "svc/crm"
        "svc/rs"
        "svc/lims"
        "svc/pdm"
        "svc/doc"
        "svc/mes"
        "svc/qms"
        "svc/ehs"
        "svc/scm"
        "svc/srm"
        "svc/wms"
        "svc/file"
        "svc/mail"
        "svc/im"
        "svc/gis"
        "svc/bi"
        "svc/report"
        "svc/ai"
        "svc/mobile"
    )
    
    for svc_dir in "${svc_dirs[@]}"; do
        if [ -d "$svc_dir/migrations" ]; then
            local svc_name=$(basename "$svc_dir")
            info "运行 $svc_name 迁移..."
            
            # 创建 schema（如果需要）
            psql "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" -c "CREATE SCHEMA IF NOT EXISTS $svc_name;" >/dev/null 2>&1
            
            # 运行迁移文件
            for migration in "$svc_dir/migrations"/*.sql; do
                if [ -f "$migration" ]; then
                    psql "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" -f "$migration" >/dev/null 2>&1 || \
                        warning "迁移文件 $migration 执行失败（可能需要 pgvector）"
                fi
            done
        fi
    done
    
    success "数据库迁移完成"
}

# 主函数
main() {
    echo "=========================================="
    echo "    TOPEMS 数据库初始化脚本"
    echo "=========================================="
    
    # 检查是否已经运行
    if check_pg_running; then
        info "PostgreSQL 已在运行"
    else
        # 尝试启动本地 PostgreSQL
        if ! start_local_postgres; then
            # 回退到 Docker
            warning "本地 PostgreSQL 启动失败，尝试 Docker..."
            if ! start_docker_postgres; then
                error "无法启动 PostgreSQL，请手动启动后重试"
                exit 1
            fi
        fi
    fi
    
    # 创建数据库和用户
    create_db_and_user
    
    # 安装 pgvector
    install_pgvector
    
    # 运行迁移
    run_migrations
    
    echo ""
    success "数据库初始化完成！"
    echo ""
    echo "数据库连接信息："
    echo "  URL: postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    echo "  主机: $DB_HOST"
    echo "  端口: $DB_PORT"
    echo "  数据库: $DB_NAME"
}

# 执行主函数
main "$@"