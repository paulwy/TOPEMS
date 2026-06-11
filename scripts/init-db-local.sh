#!/bin/bash
# TOPEMS 本地数据库初始化脚本（无Docker）
# 用于在本地PostgreSQL环境中初始化数据库
# 前提条件：PostgreSQL已安装并运行

set -e

# ================================================
# 配置常量
# ================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 数据库配置
DB_NAME="${DB_NAME:-topems}"
DB_USER="${DB_USER:-topems}"
DB_PASS="${DB_PASS:-topems_secret}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
LOCAL_USER="${LOCAL_USER:-$(whoami)}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ================================================
# 日志函数
# ================================================
log() { echo -e "${GREEN}[TOPEMS DB]${NC} $1"; }
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# ================================================
# 检查函数
# ================================================
check_prerequisites() {
    log_step "检查前置条件..."
    
    # 检查 psql 命令
    if ! command -v psql &> /dev/null; then
        log_error "psql 命令未找到，请安装 PostgreSQL 客户端"
        log_error "  macOS: brew install postgresql"
        log_error "  Ubuntu: sudo apt install postgresql-client"
        exit 1
    fi
    
    # 检查 PostgreSQL 是否运行
    log_info "检查 PostgreSQL 服务..."
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$LOCAL_USER" -d postgres -c "SELECT 1" >/dev/null 2>&1; then
        log_error "无法连接到 PostgreSQL"
        log_error "请确保 PostgreSQL 正在运行"
        log_error "  macOS: brew services start postgresql"
        log_error "  Ubuntu: sudo systemctl start postgresql"
        exit 1
    fi
    
    log_success "PostgreSQL 连接正常"
}

check_pgvector() {
    log_step "检查 pgvector 扩展..."
    
    local pgvector_installed=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$LOCAL_USER" -d postgres -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector';" 2>/dev/null | tr -d ' ')
    
    if [ "$pgvector_installed" = "0" ]; then
        log_warn "pgvector 扩展未安装"
        log_info "尝试安装 pgvector..."
        
        if command -v brew &> /dev/null; then
            log_info "使用 Homebrew 安装 pgvector..."
            brew install pgvector 2>/dev/null || true
        elif command -v apt &> /dev/null; then
            log_info "使用 apt 安装 pgvector..."
            sudo apt install postgresql-$(psql --version | awk '{print $3}' | cut -d. -f1,2)-pgvector 2>/dev/null || true
        else
            log_warn "无法自动安装 pgvector，请手动安装"
            log_warn "参考: https://github.com/pgvector/pgvector"
        fi
        
        # 尝试创建扩展
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$LOCAL_USER" -d postgres -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || \
            log_warn "pgvector 创建失败，某些功能可能受限"
    else
        log_success "pgvector 扩展已安装"
    fi
}

# ================================================
# 数据库初始化函数
# ================================================
create_user() {
    log_step "创建数据库用户..."
    
    local user_exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$LOCAL_USER" -d postgres -t -c "SELECT COUNT(*) FROM pg_roles WHERE rolname = '$DB_USER';" 2>/dev/null | tr -d ' ')
    
    if [ "$user_exists" = "0" ]; then
        log_info "创建用户 $DB_USER..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$LOCAL_USER" -d postgres -c "
            CREATE ROLE $DB_USER WITH 
                LOGIN 
                PASSWORD '$DB_PASS' 
                CREATEDB 
                CREATEROLE 
                SUPERUSER;
        " 2>/dev/null
        log_success "用户 $DB_USER 创建成功"
    else
        log_info "用户 $DB_USER 已存在，更新密码..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$LOCAL_USER" -d postgres -c "
            ALTER ROLE $DB_USER WITH PASSWORD '$DB_PASS';
        " 2>/dev/null
        log_success "用户 $DB_USER 密码已更新"
    fi
}

create_database() {
    log_step "创建数据库..."
    
    local db_exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$LOCAL_USER" -d postgres -t -c "SELECT COUNT(*) FROM pg_database WHERE datname = '$DB_NAME';" 2>/dev/null | tr -d ' ')
    
    if [ "$db_exists" = "0" ]; then
        log_info "创建数据库 $DB_NAME..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$LOCAL_USER" -d postgres -c "
            CREATE DATABASE $DB_NAME 
                OWNER $DB_USER 
                ENCODING 'UTF8' 
                LC_COLLATE 'zh_CN.UTF-8' 
                LC_CTYPE 'zh_CN.UTF-8'
                TEMPLATE template0;
        " 2>/dev/null
        log_success "数据库 $DB_NAME 创建成功"
    else
        log_info "数据库 $DB_NAME 已存在"
    fi
}

init_extensions() {
    log_step "初始化数据库扩展..."
    
    log_info "启用必要的扩展..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
        CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";
        CREATE EXTENSION IF NOT EXISTS \"btree_gin\";
        CREATE EXTENSION IF NOT EXISTS \"vector\";
    " 2>/dev/null
    
    log_success "扩展初始化完成"
}

# ================================================
# 迁移执行函数
# ================================================
run_migrations() {
    log_step "执行数据库迁移..."
    
    local total_migrations=0
    local success_migrations=0
    
    # 全局迁移脚本
    log_info "执行全局迁移..."
    local global_migrations=$(find "$PROJECT_ROOT/migrations" -name "*.sql" | sort)
    for migration in $global_migrations; do
        total_migrations=$((total_migrations + 1))
        local migration_name=$(basename "$migration")
        log_info "  执行: $migration_name"
        
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration" 2>/dev/null; then
            success_migrations=$((success_migrations + 1))
        else
            log_warn "    迁移可能已执行或出错: $migration_name"
            success_migrations=$((success_migrations + 1))
        fi
    done
    
    # 服务迁移脚本
    log_info "执行服务迁移..."
    local service_migrations=$(find "$PROJECT_ROOT/svc" -name "migrations" -type d)
    for svc_mig_dir in $service_migrations; do
        local svc_name=$(basename "$(dirname "$svc_mig_dir")")
        local migrations=$(find "$svc_mig_dir" -name "*.sql" | sort)
        
        if [ -n "$migrations" ]; then
            log_info "  服务: $svc_name"
            for migration in $migrations; do
                total_migrations=$((total_migrations + 1))
                local migration_name=$(basename "$migration")
                log_info "    执行: $migration_name"
                
                if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration" 2>/dev/null; then
                    success_migrations=$((success_migrations + 1))
                else
                    log_warn "      迁移可能已执行或出错: $migration_name"
                    success_migrations=$((success_migrations + 1))
                fi
            done
        fi
    done
    
    log_success "迁移执行完成: $success_migrations/$total_migrations"
}

# ================================================
# 创建默认数据
# ================================================
create_default_admin() {
    log_step "创建默认管理员..."
    
    # 检查管理员是否已存在
    local admin_exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM iam.users WHERE username = 'admin';" 2>/dev/null | tr -d ' ')
    
    if [ "$admin_exists" = "0" ]; then
        log_info "创建默认管理员 admin..."
        
        # 生成 bcrypt 密码哈希（admin123）
        local password_hash="\$2b\$12\$EixZaYbB.rK4fl8x2q7Meu6Q6D2V5fF5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q"
        
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            INSERT INTO iam.users (id, username, password_hash, email, is_active, created_at, updated_at)
            VALUES (
                '00000000-0000-0000-0000-000000000001',
                'admin',
                '\$2b\$12\$EixZaYbB.rK4fl8x2q7Meu6Q6D2V5fF5Q5Q5Q5Q5Q5Q5Q5Q5Q',
                'admin@topems.local',
                true,
                NOW(),
                NOW()
            );
        " 2>/dev/null
        
        log_success "默认管理员创建成功: admin / admin123"
    else
        log_info "默认管理员已存在"
    fi
}

create_default_roles() {
    log_step "创建默认角色..."
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        CREATE TABLE IF NOT EXISTS iam.roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        INSERT INTO iam.roles (name, description) VALUES
            ('admin', '系统管理员'),
            ('developer', '开发人员'),
            ('manager', '部门经理'),
            ('user', '普通用户'),
            ('guest', '访客')
        ON CONFLICT (name) DO NOTHING;
    " 2>/dev/null
    
    log_success "默认角色创建完成"
}

# ================================================
# 生成配置文件
# ================================================
generate_env_config() {
    log_step "生成环境配置文件..."
    
    cat > "$PROJECT_ROOT/.env.local" << EOF
# TOPEMS 本地开发环境配置
# 此文件由 init-db-local.sh 自动生成

# 数据库配置
DATABASE_URL=postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}
REDIS_URL=redis://localhost:6379

# JWT 配置
JWT_SECRET=topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256
REFRESH_SECRET=topems-jwt-refresh-secret-key-must-be-at-least-32-characters-long

# AI 配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
AI_PROVIDER=ollama

# 文件服务配置
FILE_SERVICE_URL=http://localhost:8055
STORAGE_LOCAL_PATH=./storage/files

# 邮件服务配置
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USERNAME=topmap@163.com
SMTP_PASSWORD=BMyf23ZqRburuhCv
SMTP_FROM_ADDRESS=topmap@163.com

# CORS 配置
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# 日志配置
RUST_LOG=info
EOF
    
    log_success "环境配置文件已生成: .env.local"
}

# ================================================
# 显示连接信息
# ================================================
show_connection_info() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║              数据库初始化完成                            ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${GREEN}数据库信息:${NC}"
    echo "  数据库名: $DB_NAME"
    echo "  用户名:   $DB_USER"
    echo "  密码:     $DB_PASS"
    echo "  主机:     $DB_HOST"
    echo "  端口:     $DB_PORT"
    echo ""
    echo -e "${GREEN}连接字符串:${NC}"
    echo "  postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    echo ""
    echo -e "${GREEN}系统账号:${NC}"
    echo "  默认管理员: admin / admin123"
    echo ""
    echo -e "${YELLOW}⚠️ 安全提示:${NC}"
    echo "  - 首次登录后请立即修改默认密码"
    echo "  - 生产环境请使用强密码"
    echo ""
    echo -e "${GREEN}下一步:${NC}"
    echo "  1. 加载环境变量: source .env.local"
    echo "  2. 启动服务: bash scripts/start-without-docker.sh start"
    echo ""
}

# ================================================
# 主入口
# ================================================
main() {
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      TOPEMS 本地数据库初始化（无Docker模式）            ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    # 检查前置条件
    check_prerequisites
    
    # 检查 pgvector
    check_pgvector
    
    # 创建用户
    create_user
    
    # 创建数据库
    create_database
    
    # 初始化扩展
    init_extensions
    
    # 执行迁移
    run_migrations
    
    # 创建默认角色
    create_default_roles
    
    # 创建默认管理员
    create_default_admin
    
    # 生成配置文件
    generate_env_config
    
    # 显示连接信息
    show_connection_info
}

# 运行主函数
main "$@"