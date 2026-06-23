#!/bin/bash

# =============================================
# TOPEMS 统一入口脚本
# =============================================
# 主脚本，整合所有服务管理功能

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLI_DIR="$PROJECT_ROOT/cli"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
detail() { echo -e "${CYAN}[DETAIL]${NC} $1"; }

# 服务配置
load_services_config() {
    local config_file="$SCRIPT_DIR/services.conf"
    if [ -f "$config_file" ]; then
        SERVICES_CONFIG=$(grep -v "^#" "$config_file" | grep -v "^$" | grep -v "CORE_SERVICES")
        CORE_SERVICES=$(grep "CORE_SERVICES" "$config_file" | cut -d'=' -f2 | tr -d ' ')
    else
        # 默认服务配置（与 config/services.yaml 保持一致）
        SERVICES_CONFIG="
iam         svc/unified-core       unified-core-service        8000
pm          svc/pm                 topems-pm                   8023
erp         svc/erp                topems-erp                  8010
hrm         svc/hrm                topems-hrm                  8020
crm         svc/crm                topems-crm                  8029
mes         svc/mes                topems-mes                  8030
pdm         svc/pdm                topems-pdm                  8031
scm         svc/scm                topems-scm                  8040
wms         svc/wms                topems-wms                  8041
srm         svc/srm                topems-srm                  8042
qms         svc/qms                topems-qms                  8050
lims        svc/lims               topems-lims                 8051
ehs         svc/ehs                topems-ehs                  8052
rs          svc/rs                 topems-rs                   8053
bi          svc/bi                 topems-bi                   8060
report      svc/report             topems-report               8061
monitor     svc/monitor            topems-monitor              8062
portal      svc/portal             topems-portal               8063
ai          svc/ai                 topems-ai                   8064
mobile      svc/mobile             topems-mobile               8070
gis         svc/gis                topems-gis                  8071
integration svc/integration        topems-integration          8072
"
        CORE_SERVICES="iam"
    fi
}

load_services_config

# 服务管理函数
get_service_path() { echo "$SERVICES_CONFIG" | grep "^${1} " | awk '{print $2}'; }
get_service_port() { echo "$SERVICES_CONFIG" | grep "^${1} " | awk '{print $4}'; }
get_all_services() { echo "$SERVICES_CONFIG" | grep -v "^$" | awk '{print $1}' | sort; }
get_executable_name() {
    local binary_name=$(echo "$SERVICES_CONFIG" | grep "^${1} " | awk '{print $3}')
    echo "${binary_name:-topems-$1}"
}

check_port() { lsof -Pi ":$1" -sTCP:LISTEN -t >/dev/null 2>&1 && return 0 || return 1; }
get_service_pid() {
    local port=$2
    local executable_name=$(get_executable_name "$1")
    lsof -ti:${port} 2>/dev/null || ps aux | grep -v grep | grep "$executable_name" | awk '{print $2}' 2>/dev/null
}

# 加载环境变量
load_env() {
    if [ -f "$PROJECT_ROOT/.env" ]; then
        # 安全地加载 .env 文件（处理带引号的值）
        while IFS='=' read -r key value; do
            # 跳过注释和空行
            [[ "$key" =~ ^# ]] && continue
            [[ -z "$key" ]] && continue
            # 去除引号
            value="${value%\"}"
            value="${value#\"}"
            value="${value%\'}"
            value="${value#\'}"
            # 导出变量
            export "$key=$value" 2>/dev/null || true
        done < "$PROJECT_ROOT/.env"
    else
        warning "根目录 .env 文件不存在"
    fi
}

# 编译服务
build_service() {
    local service_name=$1
    local service_path=$(get_service_path "$service_name")
    [ -z "$service_path" ] && error "服务 $service_name 不存在" && return 1

    info "编译 $service_name 服务..."
    cd "$PROJECT_ROOT/$service_path"
    cargo build --release 2>&1 && success "$service_name 编译成功" || { error "$service_name 编译失败"; return 1; }
}

# 全量编译所有后端服务
build_all_backend() {
    info "全量编译所有后端服务..."
    
    local success_count=0
    local fail_count=0
    
    for service in $(get_all_services); do
        if build_service "$service" 2>/dev/null; then
            ((success_count++))
        else
            ((fail_count++))
        fi
    done
    
    echo ""
    if [ $fail_count -eq 0 ]; then
        success "所有后端服务编译完成 ($success_count 成功)"
    else
        warning "后端编译完成 ($success_count 成功, $fail_count 失败)"
    fi
    
    return $fail_count
}

# 编译前端
build_frontend() {
    info "编译前端..."
    
    local pkg_cmd="yarn"
    if ! command -v yarn &> /dev/null; then
        if command -v pnpm &> /dev/null; then
            pkg_cmd="pnpm"
        else
            error "yarn 和 pnpm 都未安装"
            return 1
        fi
    fi
    
    cd "$PROJECT_ROOT/apps/web"
    
    if [ ! -d "node_modules" ]; then
        info "安装前端依赖..."
        $pkg_cmd install --silent
    fi
    
    $pkg_cmd build 2>&1 && success "前端编译成功" || { error "前端编译失败"; return 1; }
}

# 全量编译（后端+前端）
build_all() {
    info "========== 全量编译开始 =========="
    
    build_all_backend
    local backend_result=$?
    
    info "========== 编译前端 =========="
    build_frontend
    local frontend_result=$?
    
    echo ""
    info "========== 全量编译完成 =========="
    if [ $backend_result -eq 0 ] && [ $frontend_result -eq 0 ]; then
        success "全量编译成功"
        return 0
    else
        error "全量编译失败"
        return 1
    fi
}

# 运行后端测试
test_backend() {
    info "运行后端测试..."

    local success_count=0
    local fail_count=0

    for service in $(get_all_services); do
        local service_path=$(get_service_path "$service")
        [ -z "$service_path" ] && { warning "服务 $service 路径未配置"; continue; }

        cd "$PROJECT_ROOT/$service_path"
        [ ! -f "Cargo.toml" ] && { warning "$service 无 Cargo.toml，跳过"; continue; }

        info "测试 $service 服务..."
        if cargo test --release -- --test-threads=1 2>&1 | grep -q "test result:"; then
            ((success_count++))
            success "$service 测试通过"
        else
            ((fail_count++))
            error "$service 测试失败"
        fi
    done

    echo ""
    if [ $fail_count -eq 0 ]; then
        success "所有后端测试通过 ($success_count)"
    else
        warning "后端测试完成 ($success_count 通过, $fail_count 失败)"
    fi

    return $fail_count
}

# 运行前端测试
test_frontend() {
    info "运行前端测试..."
    
    local pkg_cmd="yarn"
    if ! command -v yarn &> /dev/null; then
        if command -v pnpm &> /dev/null; then
            pkg_cmd="pnpm"
        else
            error "yarn 和 pnpm 都未安装"
            return 1
        fi
    fi
    
    cd "$PROJECT_ROOT/apps/web"
    
    if [ ! -d "node_modules" ]; then
        info "安装前端依赖..."
        $pkg_cmd install --silent
    fi
    
    $pkg_cmd test 2>&1 && success "前端测试通过" || { error "前端测试失败"; return 1; }
}

# 运行所有测试
test_all() {
    info "========== 运行所有测试 =========="
    
    test_backend
    local backend_result=$?
    
    info "========== 运行前端测试 =========="
    test_frontend
    local frontend_result=$?
    
    echo ""
    info "========== 测试完成 =========="
    if [ $backend_result -eq 0 ] && [ $frontend_result -eq 0 ]; then
        success "所有测试通过"
        return 0
    else
        error "测试失败"
        return 1
    fi
}

# 启动服务
start_service() {
    local service_name=$1
    local force=${2:-false}
    local service_path=$(get_service_path "$service_name")
    local port=$(get_service_port "$service_name")

    [ -z "$service_path" ] && error "服务 $service_name 不存在" && return 1
    [ -z "$port" ] && error "无法获取服务 $service_name 的端口" && return 1

    info "启动 $service_name 服务..."

    if check_port $port; then
        local pid=$(get_service_pid "$service_name" "$port")
        if [ -n "$pid" ]; then
            warning "$service_name 服务已在运行 (PID: $pid, 端口: $port)"
            [ "$force" = "true" ] && { info "强制重启..."; stop_service "$service_name"; } || return 0
        else
            warning "端口 $port 已被占用"
            [ "$force" = "true" ] || { info "使用 --force 强制清理端口"; return 1; }
        fi
    fi

    local executable_name=$(get_executable_name "$service_name")
    local executable_path="$PROJECT_ROOT/target/release/${executable_name}"
    
    [ ! -f "$executable_path" ] && { warning "可执行文件不存在，开始编译..."; build_service "$service_name" || return 1; }

    load_env
    cd "$PROJECT_ROOT/$service_path"
    # 设置环境变量并启动服务
    local env_cmd="env"
    case "$service_name" in
        iam) env_cmd="env CORE_PORT=$port" ;;
        pm) env_cmd="env PM_PORT=$port" ;;
        mes) env_cmd="env MES_PORT=$port" ;;
        pdm) env_cmd="env PDM_PORT=$port" ;;
        qms) env_cmd="env QMS_PORT=$port" ;;
        lims) env_cmd="env LIMS_PORT=$port" ;;
        ehs) env_cmd="env EHS_PORT=$port" ;;
        bi) env_cmd="env BI_PORT=$port" ;;
        report) env_cmd="env REPORT_PORT=$port" ;;
        ai) env_cmd="env AI_PORT=$port" ;;
        *) env_cmd="env SERVER_PORT=$port" ;;
    esac
    $env_cmd nohup "$executable_path" > "/tmp/topems-${service_name}.log" 2>&1 &
    local pid=$!
    sleep 3

    if check_port $port; then
        success "$service_name 服务启动成功 (PID: $pid, 端口: $port)"
        return 0
    else
        error "$service_name 服务启动失败，请查看日志: /tmp/topems-${service_name}.log"
        tail -10 "/tmp/topems-${service_name}.log" 2>/dev/null
        return 1
    fi
}

# 停止服务
stop_service() {
    local service_name=$1
    local port=$(get_service_port "$service_name")
    [ -z "$port" ] && error "无法获取服务 $service_name 的端口" && return 1

    info "停止 $service_name 服务..."
    if check_port $port; then
        local pid=$(get_service_pid "$service_name" "$port")
        if [ -n "$pid" ]; then
            kill $pid 2>/dev/null
            sleep 1
            if ! check_port $port; then
                success "$service_name 服务已停止"
                return 0
            else
                kill -9 $pid 2>/dev/null
                sleep 1
                ! check_port $port && success "$service_name 服务已强制停止" || error "无法停止 $service_name 服务"
            fi
        else
            warning "未找到运行中的 $service_name 进程"
        fi
    else
        warning "$service_name 服务未运行"
    fi
}

# 查看服务状态
status_service() {
    local service_name=$1
    local port=$(get_service_port "$service_name")
    [ -z "$port" ] && { echo -e "${RED}❌ $service_name: 无法获取端口${NC}"; return; }

    if check_port $port; then
        local pid=$(get_service_pid "$service_name" "$port")
        if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
            echo -e "${GREEN}✅${NC} $service_name (端口 $port) 运行中 (PID: $pid) [健康]"
        else
            echo -e "${YELLOW}⚠️${NC} $service_name (端口 $port) 运行中 (PID: $pid) [健康检查失败]"
        fi
    else
        echo -e "${RED}❌${NC} $service_name (端口 $port) 未运行"
    fi
}

# 查看日志
logs_service() {
    local service_name=$1
    local lines=${2:-50}
    [ -f "/tmp/topems-${service_name}.log" ] && tail -n $lines "/tmp/topems-${service_name}.log" || { error "日志文件不存在"; return 1; }
}

# 启动所有服务
start_all_services() {
    info "启动所有服务..."
    load_env

    local success_count=0
    local fail_count=0

    info "启动核心服务..."
    for service in $CORE_SERVICES; do
        if start_service "$service" 2>/dev/null; then
            ((success_count++))
        else
            ((fail_count++))
        fi
    done

    info "启动其他服务..."
    for service in $(get_all_services); do
        if echo "$CORE_SERVICES" | grep -wq "$service"; then
            continue
        fi
        if start_service "$service" 2>/dev/null; then
            ((success_count++))
        else
            ((fail_count++))
        fi
    done
    
    # 启动前端
    if start_frontend 2>/dev/null; then
        ((success_count++))
    else
        ((fail_count++))
    fi

    echo ""
    if [ $fail_count -eq 0 ]; then
        success "所有服务启动完成 ($success_count 成功)"
    else
        warning "服务启动完成 ($success_count 成功, $fail_count 失败)"
    fi
}

# 停止所有服务
stop_all_services() {
    info "停止所有服务..."
    for service in $(get_all_services); do
        stop_service "$service"
    done
    stop_frontend
}

# 启动开发环境（macOS）
start_dev_macos() {
    info "启动 macOS 开发环境..."

    # 检查依赖
    check_command() {
        if ! command -v "$1" &> /dev/null; then
            error "$1 未安装"
            return 1
        fi
    }

    check_command "cargo" || return 1
    check_command "node" || return 1
    # 检查 yarn 或 pnpm
    if ! command -v yarn &> /dev/null; then
        if ! command -v pnpm &> /dev/null; then
            error "yarn 或 pnpm 未安装"
            return 1
        fi
        warning "未安装 yarn，将使用 pnpm"
        YARN_CMD="pnpm"
    else
        YARN_CMD="yarn"
    fi
    check_command "psql" || return 1

    # 启动数据库（复用统一函数）
    db_start
    redis_start

    # 检查环境变量
    if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
        warning ".env 文件不存在，从示例复制..."
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$PROJECT_ROOT/.env"
        rm "$PROJECT_ROOT/.env.bak"
    fi

    # 启动后端服务
    start_service "iam"

    # 启动前端
    info "启动前端服务..."
    if ! lsof -Pi ":3000" -sTCP:LISTEN -t &> /dev/null; then
        cd "$PROJECT_ROOT/apps/web"
        [ ! -d "node_modules" ] && $YARN_CMD install --silent
        nohup $YARN_CMD dev > "/tmp/topems-web.log" 2>&1 &
        sleep 5
        info "前端服务启动中..."
    else
        warning "前端已在端口 3000 运行"
    fi

    success "开发环境启动完成!"
    echo ""
    echo "服务状态:"
    show_all_status
}

# 启动前端服务
start_frontend() {
    info "启动前端服务..."
    
    # 检测包管理器
    local pkg_cmd="yarn"
    if ! command -v yarn &> /dev/null; then
        if command -v pnpm &> /dev/null; then
            pkg_cmd="pnpm"
            warning "使用 pnpm"
        else
            error "yarn 和 pnpm 都未安装"
            return 1
        fi
    fi
    
    cd "$PROJECT_ROOT/apps/web"
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        info "安装前端依赖..."
        $pkg_cmd install --silent
    fi
    
    # 启动前端
    if check_port 3000; then
        info "前端已在端口 3000 运行"
        return 0
    fi
    
    nohup $pkg_cmd dev > "/tmp/topems-web.log" 2>&1 &
    local pid=$!
    
    sleep 5
    
    if check_port 3000; then
        success "前端服务启动成功 (PID: $pid, 端口: 3000)"
        return 0
    else
        error "前端服务启动失败，请查看日志: /tmp/topems-web.log"
        tail -20 "/tmp/topems-web.log" 2>/dev/null
        return 1
    fi
}

# 停止前端服务
stop_frontend() {
    info "停止前端服务..."
    local pid=$(lsof -ti:3000 2>/dev/null)
    if [ -n "$pid" ]; then
        kill $pid 2>/dev/null
        sleep 1
        success "前端服务已停止"
    else
        warning "前端服务未运行"
    fi
}

# 显示所有服务状态
show_all_status() {
    echo ""
    info "TOPEMS 服务状态"
    echo "=================================================="

    local running_count=0
    local total_count=0

    for service in $(get_all_services); do
        status_service "$service"
        ((total_count++))
        check_port $(get_service_port "$service") && ((running_count++))
    done

    check_port 3000 && { echo -e "${GREEN}✅${NC} 前端 (端口 3000) 运行中"; ((running_count++)); } || echo -e "${RED}❌${NC} 前端 (端口 3000) 未运行"
    ((total_count++))
    
    echo "=================================================="
    info "状态统计: ${running_count}/${total_count} 服务运行中"
}

# =============================================
# 数据库管理
# =============================================

# 启动 PostgreSQL
db_start() {
    info "启动 PostgreSQL..."
    if command -v brew &> /dev/null; then
        brew services start postgresql@16 2>/dev/null || brew services start postgresql 2>/dev/null
        sleep 2
    elif command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql 2>/dev/null || true
    fi

    if psql -h localhost -U "$USER" -d "postgres" -c "SELECT 1;" &> /dev/null; then
        success "PostgreSQL 已启动"
        return 0
    else
        error "PostgreSQL 启动失败"
        return 1
    fi
}

# 停止 PostgreSQL
db_stop() {
    info "停止 PostgreSQL..."
    if command -v brew &> /dev/null; then
        brew services stop postgresql@16 2>/dev/null || brew services stop postgresql 2>/dev/null
    elif command -v systemctl &> /dev/null; then
        sudo systemctl stop postgresql 2>/dev/null || true
    fi
    success "PostgreSQL 已停止"
}

# 数据库状态
db_status() {
    info "=== PostgreSQL 状态 ==="
    if psql -h localhost -U "$USER" -d "postgres" -c "SELECT 1;" &> /dev/null; then
        success "PostgreSQL 运行中"
        psql -h localhost -U "$USER" -d "postgres" -c "SELECT version();" 2>/dev/null | head -3
    else
        error "PostgreSQL 未运行"
    fi

    echo ""
    info "=== Redis 状态 ==="
    if redis-cli ping &> /dev/null; then
        success "Redis 运行中"
        redis-cli info server 2>/dev/null | grep "redis_version" | head -1
    else
        error "Redis 未运行"
    fi
}

# 启动 Redis
redis_start() {
    info "启动 Redis..."
    if command -v brew &> /dev/null; then
        brew services start redis 2>/dev/null
        sleep 2
    elif command -v systemctl &> /dev/null; then
        sudo systemctl start redis 2>/dev/null || true
    fi

    if redis-cli ping &> /dev/null; then
        success "Redis 已启动"
        return 0
    else
        error "Redis 启动失败"
        return 1
    fi
}

# 停止 Redis
redis_stop() {
    info "停止 Redis..."
    if command -v brew &> /dev/null; then
        brew services stop redis 2>/dev/null
    elif command -v systemctl &> /dev/null; then
        sudo systemctl stop redis 2>/dev/null || true
    fi
    success "Redis 已停止"
}

# 数据库迁移
db_migrate() {
    info "运行数据库迁移..."

    # 检查是否使用 sqlx-cli
    if command -v sqlx &> /dev/null; then
        cd "$PROJECT_ROOT"
        sqlx migrate run --source migrations 2>&1 && success "数据库迁移完成" || { error "数据库迁移失败"; return 1; }
    else
        warning "sqlx-cli 未安装，使用各服务的 migrate 命令"
        for service in $(get_all_services); do
            local service_path=$(get_service_path "$service")
            [ -d "$PROJECT_ROOT/$service_path/migrations" ] || continue

            info "迁移 $service 服务..."
            cd "$PROJECT_ROOT/$service_path"
            if [ -f "Cargo.toml" ]; then
                cargo run --release --bin migrate 2>&1 | tail -5 || warning "$service 迁移失败"
            fi
        done
    fi
}

# 备份数据库
db_backup() {
    local backup_dir="$PROJECT_ROOT/backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/topems_db_${timestamp}.sql"

    mkdir -p "$backup_dir"

    info "备份数据库到 $backup_file..."
    if [ -f "$PROJECT_ROOT/.env" ]; then
        load_env
        local db_name=${DATABASE_NAME:-topems}
        local db_user=${DATABASE_USER:-postgres}

        if command -v docker &> /dev/null && docker ps | grep -q postgres; then
            docker exec -t topems-postgres pg_dump -U "$db_user" "$db_name" > "$backup_file" 2>/dev/null
        else
            pg_dump -h localhost -U "$db_user" "$db_name" > "$backup_file" 2>/dev/null
        fi

        if [ $? -eq 0 ] && [ -s "$backup_file" ]; then
            success "数据库备份成功: $backup_file ($(du -h "$backup_file" | cut -f1))"
        else
            error "数据库备份失败"
            return 1
        fi
    else
        error ".env 文件不存在，无法读取数据库配置"
        return 1
    fi
}

# 恢复数据库
db_restore() {
    local backup_file=$1
    [ -z "$backup_file" ] && { error "请指定备份文件"; return 1; }
    [ ! -f "$backup_file" ] && { error "备份文件不存在: $backup_file"; return 1; }

    info "恢复数据库从 $backup_file..."
    load_env
    local db_name=${DATABASE_NAME:-topems}
    local db_user=${DATABASE_USER:-postgres}

    read -p "确认恢复数据库 $db_name ? [y/N] " confirm
    [[ ! "$confirm" =~ ^[Yy]$ ]] && { info "取消恢复"; return 0; }

    if command -v docker &> /dev/null && docker ps | grep -q postgres; then
        cat "$backup_file" | docker exec -i topems-postgres psql -U "$db_user" "$db_name"
    else
        psql -h localhost -U "$db_user" "$db_name" < "$backup_file"
    fi

    success "数据库恢复完成"
}

# 重置数据库
db_reset() {
    load_env
    local db_name=${DATABASE_NAME:-topems}
    local db_user=${DATABASE_USER:-postgres}

    read -p "确认重置数据库 $db_name ? 将会删除所有数据! [y/N] " confirm
    [[ ! "$confirm" =~ ^[Yy]$ ]] && { info "取消重置"; return 0; }

    info "重置数据库..."
    psql -h localhost -U "$db_user" -c "DROP DATABASE IF EXISTS $db_name;" 2>/dev/null
    psql -h localhost -U "$db_user" -c "CREATE DATABASE $db_name;" 2>/dev/null
    success "数据库重置完成"
}

# =============================================
# 一键运行/停止
# =============================================

# 一键运行：启动依赖 + 所有服务
run_all() {
    info "========== 一键运行 =========="

    # 1. 启动数据库
    db_start
    redis_start
    sleep 2

    # 2. 启动所有服务
    start_all_services

    echo ""
    success "一键运行完成！"
    show_all_status
}

# 一键停止：停止所有服务 + 数据库
stop_everything() {
    info "========== 一键停止 =========="

    # 1. 停止所有服务
    stop_all_services

    # 2. 停止数据库（可选）
    read -p "是否同时停止 PostgreSQL 和 Redis ? [y/N] " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        db_stop
        redis_stop
    fi

    success "一键停止完成"
}

# 重启所有服务
restart_all() {
    info "========== 重启所有服务 =========="
    stop_all_services
    sleep 2
    start_all_services
    show_all_status
}

# 调用Python CLI
run_cli() {
    if [ -d "$CLI_DIR" ]; then
        cd "$CLI_DIR"
        [ -f ".venv/bin/activate" ] && source .venv/bin/activate
        export PYTHONPATH="$CLI_DIR/src"
        python -m topems_cli "$@"
    else
        error "Python CLI 未安装"
        echo "请运行以下命令安装:"
        echo "  cd $CLI_DIR && python -m venv .venv && source .venv/bin/activate && pip install pyyaml click rich httpx"
        exit 1
    fi
}

# 显示帮助
show_help() {
    cat << EOF
TOPEMS 服务管理工具

用法: topems <命令> [选项]

服务管理:
  status [服务]           查看服务状态
  start <服务>            启动服务
  stop <服务>             停止服务
  restart <服务>          重启服务
  logs <服务> [行数]      查看服务日志
  build <服务>            编译服务
  build-all               全量编译所有服务（后端+前端）
  build-backend           编译所有后端服务
  build-frontend          编译前端
  start-all               启动所有服务（含前端）
  stop-all                停止所有服务（含前端）
  restart-all             重启所有服务

一键运行:
  run                     一键启动数据库+所有服务
  run-stop                一键停止所有服务+数据库

前端:
  start web               启动前端服务
  stop web                停止前端服务

测试:
  test-all                运行所有测试（后端+前端）
  test-backend            运行后端测试
  test-frontend           运行前端测试

数据库:
  db start                启动 PostgreSQL
  db stop                 停止 PostgreSQL
  db status               查看数据库状态（PostgreSQL+Redis）
  db migrate              运行数据库迁移
  db backup               备份数据库
  db restore <文件>       从备份文件恢复
  db reset                重置数据库（删除所有数据）
  redis start             启动 Redis
  redis stop              停止 Redis

开发环境:
  dev                     启动开发环境 (macOS)
  install-deps            安装依赖

AI模型管理:
  ai start                启动 Ollama 服务
  ai stop                 停止 Ollama 服务
  ai status               查看 Ollama 状态
  ai pull <模型>          下载AI模型

部署:
  deploy                  一键部署
  update-password         重置管理员密码

用户管理:
  reset-password [用户] [密码]  重置用户密码（默认 admin/admin123）

示例:
  topems status               查看所有服务状态
  topems start iam            启动 IAM 服务
  topems start-all            启动所有服务（含前端）
  topems start web            启动前端
  topems logs hrm 100         查看 HRM 最近 100 行日志
  topems build-all            全量编译所有服务
  topems test-all             运行所有测试
  topems run                  一键运行（数据库+所有服务）
  topems db status            查看数据库状态
  topems db backup            备份数据库
  topems dev                  启动开发环境
  topems reset-password       重置 admin 密码为 admin123
  topems reset-password admin newpass123  重置 admin 密码为 newpass123

完整功能请使用 Python CLI:
  cd cli && python -m topems_cli --help
EOF
}

# 主命令处理
case "${1:-help}" in
    status)
        [ -z "$2" ] && show_all_status || status_service "$2"
        ;;
    start)
        case "${2:-}" in
            web|frontend)
                start_frontend
                ;;
            "")
                error "请指定服务名"
                show_help
                exit 1
                ;;
            *)
                start_service "$2" "${3:-false}"
                ;;
        esac
        ;;
    stop)
        case "${2:-}" in
            web|frontend)
                stop_frontend
                ;;
            "")
                stop_all_services
                ;;
            *)
                stop_service "$2"
                ;;
        esac
        ;;
    restart)
        case "${2:-}" in
            web|frontend)
                stop_frontend && start_frontend
                ;;
            "")
                error "请指定服务名"
                show_help
                exit 1
                ;;
            *)
                stop_service "$2" && sleep 1 && start_service "$2" "${3:-false}"
                ;;
        esac
        ;;
    logs)
        [ -z "$2" ] && { error "请指定服务名"; show_help; exit 1; }
        logs_service "$2" "${3:-50}"
        ;;
    build)
        [ -z "$2" ] && { error "请指定服务名"; show_help; exit 1; }
        build_service "$2"
        ;;
    build-all)
        build_all
        ;;
    build-backend)
        build_all_backend
        ;;
    build-frontend)
        build_frontend
        ;;
    test-all)
        test_all
        ;;
    test-backend)
        test_backend
        ;;
    test-frontend)
        test_frontend
        ;;
    start-all)
        start_all_services
        show_all_status
        ;;
    stop-all)
        stop_all_services
        ;;
    restart-all)
        restart_all
        ;;
    run)
        run_all
        ;;
    run-stop)
        stop_everything
        ;;
    db)
        case "$2" in
            start)
                db_start
                ;;
            stop)
                db_stop
                ;;
            status)
                db_status
                ;;
            migrate)
                db_migrate
                ;;
            backup)
                db_backup
                ;;
            restore)
                db_restore "$3"
                ;;
            reset)
                db_reset
                ;;
            *)
                error "未知数据库命令: $2"
                echo "可用命令: start, stop, status, migrate, backup, restore, reset"
                exit 1
                ;;
        esac
        ;;
    redis)
        case "$2" in
            start)
                redis_start
                ;;
            stop)
                redis_stop
                ;;
            *)
                error "未知 redis 命令: $2"
                echo "可用命令: start, stop"
                exit 1
                ;;
        esac
        ;;
    dev)
        start_dev_macos
        ;;
    install-deps)
        info "调用依赖安装脚本..."
        "$SCRIPT_DIR/install-deps.sh" all
        ;;
    ai)
        case "$2" in
            start|stop|status|pull)
                "$SCRIPT_DIR/ai-models.sh" "$2" "${3:-}"
                ;;
            *)
                "$SCRIPT_DIR/ai-models.sh"
                ;;
        esac
        ;;
    deploy)
        info "调用部署脚本..."
        "$SCRIPT_DIR/deploy.sh" deploy
        ;;
    update-password|reset-password)
        info "调用密码重置脚本..."
        "$SCRIPT_DIR/update_admin_password.sh" "${2:-admin}" "${3:-admin123}"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        run_cli "$@"
        ;;
esac