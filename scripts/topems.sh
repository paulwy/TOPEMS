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
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
detail() { echo -e "${CYAN}[DETAIL]${NC} $1"; }

MAX_RETRIES=${MAX_RETRIES:-3}
RETRY_DELAY=${RETRY_DELAY:-3}
BACKOFF_FACTOR=${BACKOFF_FACTOR:-2}

# 服务配置
load_services_config() {
    local config_file="$SCRIPT_DIR/services.conf"
    if [ -f "$config_file" ]; then
        SERVICES_CONFIG=$(grep -v "^#" "$config_file" | grep -v "^$" | grep -v "CORE_SERVICES")
        CORE_SERVICES=$(grep "CORE_SERVICES" "$config_file" | cut -d'=' -f2 | tr -d ' ')
    else
        # 默认服务配置（与 scripts/services.conf 保持一致）
        SERVICES_CONFIG="
iam         svc/unified-core       topems-unified-core        8000
pm          svc/pm                 topems-pm                   8023
erp         svc/erp                topems-erp                  8010
finance     svc/finance            topems-finance              8011
ai          svc/ai                 topems-ai                   8013
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
rd          svc/rd                 topems-rd                   8053
bi          svc/analytics          topems-analytics           8060
portal      svc/portal             topems-portal               8063
mobile      svc/mobile             topems-mobile               8070
gis         svc/gis                topems-gis                  8071
integration svc/integration        topems-integration           8072
search      svc/search             topems-search               8082
communication svc/communication    topems-communication         8084
billing     svc/billing            topems-billing              8085
ticket      svc/ticket             topems-ticket               8086
feedback    svc/feedback           topems-feedback             8087
lowcode     svc/lowcode            topems-lowcode              8088
master-data svc/master-data        topems-master-data          8090
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
    local pid=""
    pid=$(lsof -ti:${port} 2>/dev/null)
    [ -z "$pid" ] && pid=$(ps aux | grep -v grep | grep "$executable_name" | awk '{print $2}' 2>/dev/null)
    echo "$pid"
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
    local extra_opts=${2:-""}
    local service_path=$(get_service_path "$service_name")
    [ -z "$service_path" ] && error "服务 $service_name 不存在" && return 1

    info "编译 $service_name 服务..."
    local executable_name=$(get_executable_name "$service_name")
    cd "$PROJECT_ROOT"

    # V64+ 编译策略：默认优先离线（SQLX_OFFLINE=true），依赖根目录 .sqlx/
    # 除非显式声明 --online 或 env FORCE_ONLINE_BUILD=1
    local online="${FORCE_ONLINE_BUILD:-0}"
    local profile="--release"
    if [[ "$extra_opts" == *"--dev"* ]] || [[ "$extra_opts" == *"--debug"* ]]; then
        profile=""
    fi
    if [[ "$extra_opts" == *"--online"* ]]; then
        online=1
    fi
    if [[ "$extra_opts" == *"--offline"* ]]; then
        online=0
    fi

    local cmd
    if [ "$online" = "1" ]; then
        cmd="SQLX_OFFLINE= cargo build $profile --bin $executable_name"
    else
        cmd="SQLX_OFFLINE=true cargo build $profile --bin $executable_name"
    fi
    info "  命令: $cmd"

    if eval "$cmd" 2>&1; then
        success "$service_name 编译成功 ($( [ -z "$profile" ] && echo "debug" || echo "release" ), $( [ "$online" = "1" ] && echo "online" || echo "offline sqlx" ))"
        return 0
    else
        warning "$service_name 离线编译失败，自动尝试在线编译（需要 DATABASE_URL）..."
        load_env
        if SQLX_OFFLINE= cargo build $profile --bin "$executable_name" 2>&1; then
            success "$service_name 在线编译成功"
            return 0
        else
            error "$service_name 编译失败（离线+在线均失败），建议执行: ./scripts/dev/sqlx-prepare.sh 刷新根 .sqlx/"
            return 1
        fi
    fi
}

# 获取所有服务的二进制名（去重）
get_all_executables() {
    echo "$SERVICES_CONFIG" | grep -v "^$" | awk '{print $3}' | sort -u
}

# 按"依赖层"排序的服务编译顺序（有 query! 宏的包靠后，避免并行时被早期缓存拖慢）
get_build_order() {
    # 层 0（无依赖，纯库级别包不单独编）
    # 层 1（核心：iam = unified-core）
    # 层 2（业务：finance/erp/crm/scm/srm/hrm/pm/billing/qms/wms/mes/pdm/ehs/lims/rd/portal）
    # 层 3（分析/搜索/AI/集成等扩展）
    echo "iam finance erp crm scm srm hrm pm billing qms wms mes pdm ehs lims rd portal master-data ticket feedback communication lowcode mobile gis integration search ai bi"
}

# 检测包管理器（pnpm > yarn）
get_pkg_cmd() {
    if command -v pnpm &> /dev/null; then
        echo "pnpm"
    elif command -v yarn &> /dev/null; then
        echo "yarn"
    else
        error "pnpm 和 yarn 都未安装"
        return 1
    fi
}

# 检查并安装前端依赖
ensure_frontend_deps() {
    local pkg_cmd=$1
    local web_dir="$PROJECT_ROOT/apps/web"
    
    if [ ! -d "$web_dir" ]; then
        error "前端目录不存在: $web_dir"
        return 1
    fi
    
    cd "$web_dir"
    
    if [ ! -d "node_modules" ]; then
        info "安装前端依赖..."
        $pkg_cmd install --silent
    fi
    
    return 0
}

# 全量编译所有后端服务（只编译服务包，避免编译 workspace 中所有包）
build_all_backend() {
    local extra_opts="${1:-""}"
    info "全量编译所有后端服务..."

    cd "$PROJECT_ROOT"

    # V64+ 新参数: --prepare（先刷新 sqlx 缓存，需要 DATABASE_URL）
    #              --online（强制在线编译，跳过离线）
    #              --offline（强制离线编译，失败即停）
    #              --only-core（只编 iam+finance+erp+scm+srm+crm 核心组）
    local do_prepare=0
    local only_core=0
    local skip_packages=""
    for opt in $extra_opts; do
        case "$opt" in
            --prepare)       do_prepare=1 ;;
            --only-core)     only_core=1 ;;
            --skip=*)        skip_packages="${skip_packages} ${opt#--skip=}" ;;
        esac
    done

    if [ "$do_prepare" = "1" ]; then
        info "========== 预处理: 刷新 SQLx 离线缓存 =========="
        load_env
        if [ -x "$SCRIPT_DIR/dev/sqlx-prepare.sh" ]; then
            "$SCRIPT_DIR/dev/sqlx-prepare.sh" || warning "sqlx prepare 失败，但继续尝试编译"
        else
            warning "找不到 $SCRIPT_DIR/dev/sqlx-prepare.sh，跳过 sqlx prepare 阶段"
        fi
    fi

    # 决定编译顺序
    local svc_order
    if [ "$only_core" = "1" ]; then
        svc_order="iam finance erp scm srm crm"
    else
        svc_order="$(get_build_order)"
    fi

    local build_success=0
    local build_failed=0
    local build_skipped=0
    local failed_list=""

    for svc in $svc_order; do
        # 按 --skip 过滤
        local skip_this=0
        for s in $skip_packages; do
            [ "$svc" = "$s" ] && skip_this=1 && break
        done
        [ $skip_this -eq 1 ] && { build_skipped=$((build_skipped + 1)); warning "跳过 $svc (--skip)"; continue; }

        # 某些 svc 别名 bi=analytics，需要映射
        local binary_name
        case "$svc" in
            bi) binary_name="topems-analytics" ;;
            *)  binary_name="$(get_executable_name "$svc")" ;;
        esac
        [ -z "$binary_name" ] && { build_skipped=$((build_skipped+1)); warning "$svc 找不到可执行名，跳过"; continue; }

        info "编译 $svc -> bin=$binary_name ..."
        # 单包离线构建优先
        if build_service "$svc" "$extra_opts" >/tmp/topems-build-"$svc".log 2>&1; then
            build_success=$((build_success + 1))
            success "  ✅ $svc 构建成功"
        else
            build_failed=$((build_failed + 1))
            failed_list="$failed_list $svc"
            error "  ❌ $svc 构建失败，日志 /tmp/topems-build-$svc.log（末 15 行）"
            tail -n 15 "/tmp/topems-build-$svc.log" >&2
        fi
    done

    echo ""
    info "========== 后端编译汇总 =========="
    info "成功: $build_success   失败: $build_failed   跳过: $build_skipped"
    [ -n "$failed_list" ] && error "失败列表:$failed_list"
    info "产物目录: $PROJECT_ROOT/target/release/ (release) 或 target/debug/ (debug)"

    if [ $build_failed -eq 0 ]; then
        success "所有后端服务编译完成 ($build_success 成功)"
        return 0
    else
        error "后端编译失败 ($build_success 成功, $build_failed 失败)"
        return 1
    fi
}

# 编译前端
build_frontend() {
    local extra_opts="${1:-""}"
    info "编译前端..."

    local pkg_cmd=$(get_pkg_cmd) || return 1
    ensure_frontend_deps "$pkg_cmd" || return 1

    local dev_mode=0
    local skip_lint=0
    for opt in $extra_opts; do
        case "$opt" in
            --dev|--debug) dev_mode=1 ;;
            --skip-lint)   skip_lint=1 ;;
        esac
    done

    # V64+ 防御：只调用 apps/web/package.json 中"真正存在"的 scripts，
    # 不再假设 build:dev / build:prod 存在，避免 "Command xxx not found"。
    local pkg_scripts
    pkg_scripts=$(cd "$PROJECT_ROOT/apps/web" && node -e 'console.log(Object.keys(require("./package.json").scripts || {}).join("\n"))' 2>/dev/null || true)
    has_script() {
        local name="$1"
        printf '%s\n' "$pkg_scripts" | grep -Fxq "$name"
    }

    local cmd="$pkg_cmd build"
    # 1. --dev / --debug：优先 build:dev（若存在），否则回退到 build + 提示
    if [ $dev_mode -eq 1 ]; then
        if has_script "build:dev"; then
            cmd="$pkg_cmd build:dev"
        else
            warning "apps/web/package.json 未定义 build:dev 脚本，回退到默认 build（tsc && vite build）"
            cmd="$pkg_cmd build"
        fi
    fi

    # 2. --skip-lint：如果有 build:nolint 之类变体就用，否则直接忽略
    if [ $skip_lint -eq 1 ]; then
        if has_script "build:nolint"; then
            cmd="$pkg_cmd build:nolint"
        else
            warning "apps/web/package.json 未定义 build:nolint，--skip-lint 被忽略（当前 build 不跑 lint，可直接使用）"
        fi
    fi

    info "  命令: cd apps/web && $cmd"
    if ( cd "$PROJECT_ROOT/apps/web" && eval "$cmd" 2>&1 ); then
        success "前端编译成功"
        return 0
    fi

    # 二次降级：如果 pnpm <script> 失败（如未定义脚本 / packageManager 版本不兼容）
    # 再尝试直接调用 vite build（生产形态）或 tsc 再 vite
    warning "脚本 $cmd 失败，自动降级尝试直接调用 vite build ..."
    local fallback_cmd="$pkg_cmd exec -- tsc && $pkg_cmd exec -- vite build"
    info "  降级命令: cd apps/web && $fallback_cmd"
    if ( cd "$PROJECT_ROOT/apps/web" && eval "$fallback_cmd" 2>&1 ); then
        success "前端编译成功（降级 vite build）"
        return 0
    fi

    error "前端编译失败（两次尝试均失败）。直接手工排查：cd apps/web && $pkg_cmd build"
    return 1
}

# 全量编译（后端+前端）
build_all() {
    local extra_opts="$*"
    info "========== 全量编译开始 =========="
    info "参数: $( [ -z "$extra_opts" ] && echo "(无)" || echo "$extra_opts" )"
    info "支持参数: --prepare --only-core --online --offline --dev/--debug --skip=<svc> --skip-lint --backend-only/--no-frontend"

    local backend_result=0
    local frontend_result=0
    local skip_fe=0

    for opt in $extra_opts; do
        case "$opt" in
            --no-frontend|--backend-only) skip_fe=1 ;;
        esac
    done

    if ! build_all_backend "$extra_opts"; then backend_result=1; fi

    if [ $skip_fe -eq 0 ]; then
        info "========== 编译前端 =========="
        if ! build_frontend "$extra_opts"; then frontend_result=1; fi
    else
        info "========== 已指定跳过前端（--backend-only / --no-frontend）=========="
    fi

    echo ""
    info "========== 全量编译完成 =========="
    if [ $backend_result -eq 0 ] && [ $frontend_result -eq 0 ]; then
        success "全量编译成功 ✅"
        echo ""
        info "提示：接下来可启动服务"
        echo "  $0 start-all                       # 启动全部服务+前端"
        echo "  $0 start-all --only-core           # 只启动核心服务"
        echo "  $0 run                             # 一键启动 DB+Redis+所有服务"
        return 0
    else
        error "全量编译失败（后端=$backend_result 前端=$frontend_result）"
        return 1
    fi
}

# 运行后端测试（使用并行测试提高效率）
test_backend() {
    info "运行后端测试..."

    cd "$PROJECT_ROOT"
    if cargo test --release --workspace 2>&1; then
        success "所有后端测试通过"
        return 0
    else
        error "后端测试失败"
        return 1
    fi
}

# 运行前端测试
test_frontend() {
    info "运行前端测试..."
    
    local pkg_cmd=$(get_pkg_cmd) || return 1
    ensure_frontend_deps "$pkg_cmd" || return 1
    
    $pkg_cmd test 2>&1 && success "前端测试通过" || { error "前端测试失败"; return 1; }
}

# 运行所有测试
test_all() {
    info "========== 运行所有测试 =========="

    local backend_result=0
    local frontend_result=0

    if ! test_backend; then
        backend_result=1
    fi

    info "========== 运行前端测试 =========="
    if ! test_frontend; then
        frontend_result=1
    fi

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

# 获取服务对应的端口环境变量名
get_port_env_var() {
    case "$1" in
        iam) echo "CORE_PORT" ;;
        pm) echo "PM_PORT" ;;
        erp) echo "ERP_PORT" ;;
        finance) echo "FINANCE_PORT" ;;
        ai) echo "AI_PORT" ;;
        hrm) echo "HRM_PORT" ;;
        crm) echo "CRM_PORT" ;;
        mes) echo "MES_PORT" ;;
        pdm) echo "PDM_PORT" ;;
        scm) echo "SCM_PORT" ;;
        wms) echo "WMS_PORT" ;;
        srm) echo "SRM_PORT" ;;
        qms) echo "QMS_PORT" ;;
        lims) echo "LIMS_PORT" ;;
        ehs) echo "EHS_PORT" ;;
        rd) echo "RD_PORT" ;;
        bi|analytics) echo "ANALYTICS_PORT" ;;
        portal) echo "PORTAL_PORT" ;;
        mobile) echo "MOBILE_PORT" ;;
        gis) echo "GIS_PORT" ;;
        integration) echo "INTEGRATION_PORT" ;;
        search) echo "SEARCH_PORT" ;;
        communication) echo "COMMUNICATION_PORT" ;;
        billing) echo "BILLING_PORT" ;;
        ticket) echo "TICKET_PORT" ;;
        feedback) echo "FEEDBACK_PORT" ;;
        master-data) echo "MASTER_DATA_PORT" ;;
        lowcode) echo "LOWCODE_PORT" ;;
        *) echo "SERVER_PORT" ;;
    esac
}

_start_service_internal() {
    local service_name=$1
    local port=$2
    local executable_path=$3
    local port_env_var=$(get_port_env_var "$service_name")

    cd "$PROJECT_ROOT"
    
    if [ "$service_name" = "iam" ]; then
        env CORE_PORT=$port $port_env_var=$port nohup "$executable_path" > "/tmp/topems-${service_name}.log" 2>&1 &
    else
        env SERVER_PORT=$port $port_env_var=$port nohup "$executable_path" > "/tmp/topems-${service_name}.log" 2>&1 &
    fi
    
    echo "$!"
}

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
    
    if [ -n "$executable_name" ] && ps aux | grep -v grep | grep -q "$executable_name" && [ "$executable_name" != "topems-unified-core" ]; then
        local other_service=$(echo "$SERVICES_CONFIG" | grep -v "^${service_name} " | grep " ${executable_name} " | awk '{print $1}')
        if [ -n "$other_service" ]; then
            info "$service_name 与 $other_service 共享同一可执行文件，$other_service 已在运行，跳过 $service_name"
            return 0
        fi
    fi
    
    [ ! -f "$executable_path" ] && { warning "可执行文件不存在，开始编译..."; build_service "$service_name" || return 1; }

    load_env

    if [ "$service_name" = "ai" ]; then
        if ! curl -s -f http://localhost:11434/api/tags >/dev/null 2>&1; then
            info "AI 服务需要 Ollama，正在启动..."
            if command -v ollama &> /dev/null; then
                nohup ollama serve > /tmp/ollama.log 2>&1 &
                sleep 5
                if curl -s -f http://localhost:11434/api/tags >/dev/null 2>&1; then
                    success "Ollama 启动成功"
                else
                    warning "Ollama 启动失败，请手动启动: ollama serve"
                fi
            else
                warning "Ollama 未安装，请先安装: brew install ollama"
            fi
        fi
    fi

    local retries=0
    local delay=$RETRY_DELAY
    local pid=""

    while [ $retries -lt $MAX_RETRIES ]; do
        if [ $retries -gt 0 ]; then
            warning "$service_name 服务启动失败，第 $retries/$MAX_RETRIES 次重试，等待 ${delay}s..."
            sleep $delay
            delay=$((delay * BACKOFF_FACTOR))
        fi

        pid=$(_start_service_internal "$service_name" "$port" "$executable_path")
        sleep 3

        if check_port $port; then
            success "$service_name 服务启动成功 (PID: $pid, 端口: $port)"
            
            if [ "$service_name" != "iam" ]; then
                register_plugin "$service_name"
            fi
            
            return 0
        else
            local failed_pid=$(get_service_pid "$service_name" "$port")
            if [ -n "$failed_pid" ]; then
                kill -9 $failed_pid 2>/dev/null
                sleep 1
            fi
            retries=$((retries + 1))
        fi
    done

    error "$service_name 服务启动失败，已重试 $MAX_RETRIES 次，请查看日志: /tmp/topems-${service_name}.log"
    tail -20 "/tmp/topems-${service_name}.log" 2>/dev/null
    return 1
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
    [ -z "$port" ] && { echo -e "${RED}❌ $service_name: 无法获取端口${NC}"; return 1; }

    if check_port $port; then
        local pid=$(get_service_pid "$service_name" "$port")
        if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
            echo -e "${GREEN}✅${NC} $service_name (端口 $port) 运行中 (PID: $pid) [健康]"
        else
            echo -e "${YELLOW}⚠️${NC} $service_name (端口 $port) 运行中 (PID: $pid) [健康检查失败]"
        fi
    else
        local executable_name=$(get_executable_name "$service_name")
        if [ -n "$executable_name" ] && ps aux | grep -v grep | grep -q "$executable_name" && [ "$executable_name" != "topems-unified-core" ]; then
            local provider=$(echo "$SERVICES_CONFIG" | grep -v "^${service_name} " | grep " ${executable_name} " | awk '{print $1}')
            if [ -n "$provider" ]; then
                local provider_port=$(get_service_port "$provider")
                if curl -s -f "http://localhost:$provider_port/health" >/dev/null 2>&1; then
                    echo -e "${GREEN}✅${NC} $service_name (端口 $port) 由 $provider 服务提供 [健康]"
                    return
                fi
            fi
        fi
        echo -e "${RED}❌${NC} $service_name (端口 $port) 未运行"
    fi
}

# 查看日志
logs_service() {
    local service_name=$1
    local lines=${2:-50}
    [ -f "/tmp/topems-${service_name}.log" ] && tail -n $lines "/tmp/topems-${service_name}.log" || { error "日志文件不存在"; return 1; }
}

# 服务注册到 unified-core
register_plugin() {
    local service_name=$1
    local port=$(get_service_port "$service_name")
    [ -z "$port" ] && return

    local core_url="http://localhost:8000"
    
    if ! curl -s -f "$core_url/health" >/dev/null 2>&1; then
        warning "unified-core 未运行，跳过插件注册"
        return
    fi

    local service_display_name=$(get_service_display_name "$service_name")
    local description=$(get_service_description "$service_name")
    local runtime_url="http://localhost:$port"

    detail "注册 $service_name 到 unified-core..."
    local response=$(curl -s -X POST "$core_url/api/core/plugin/dev/plugins/${service_name}/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"code\": \"${service_name}\",
            \"name\": \"${service_display_name}\",
            \"description\": \"${description}\",
            \"version\": \"0.1.0\",
            \"runtime_url\": \"${runtime_url}\",
            \"permissions\": []
        }")

    if echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))" | grep -q "True"; then
        detail "$service_name 注册成功"
    else
        local msg=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message', 'Unknown'))")
        warning "$service_name 注册失败: $msg"
    fi
}

# 获取服务显示名称
get_service_display_name() {
    case "$1" in
        iam) echo "统一认证服务" ;;
        pm) echo "项目管理" ;;
        erp) echo "ERP系统" ;;
        finance) echo "财务管理" ;;
        ai) echo "AI服务" ;;
        hrm) echo "人力资源" ;;
        crm) echo "客户关系" ;;
        mes) echo "生产制造" ;;
        pdm) echo "产品数据" ;;
        scm) echo "供应链管理" ;;
        wms) echo "仓储管理" ;;
        srm) echo "供应商管理" ;;
        qms) echo "质量管理" ;;
        lims) echo "实验室管理" ;;
        ehs) echo "环境健康安全" ;;
        rd) echo "研发服务" ;;
        bi) echo "商业智能" ;;
        portal) echo "门户服务" ;;
        mobile) echo "移动服务" ;;
        gis) echo "地理信息" ;;
        integration) echo "集成服务" ;;
        billing) echo "计费服务" ;;
        communication) echo "通讯服务" ;;
        feedback) echo "反馈服务" ;;
        master-data) echo "主数据服务" ;;
        search) echo "搜索服务" ;;
        ticket) echo "工单服务" ;;
        lowcode) echo "低代码平台" ;;
        *) echo "$(echo "$1" | sed 's/./\U&/')服务" ;;
    esac
}

# 获取服务描述
get_service_description() {
    case "$1" in
        iam) echo "统一身份认证与权限管理服务" ;;
        pm) echo "项目管理服务" ;;
        erp) echo "企业资源计划系统" ;;
        finance) echo "财务管理服务" ;;
        ai) echo "AI智能服务" ;;
        hrm) echo "人力资源管理系统" ;;
        crm) echo "客户关系管理系统" ;;
        mes) echo "生产制造执行系统" ;;
        pdm) echo "产品数据管理系统" ;;
        scm) echo "供应链管理系统" ;;
        wms) echo "仓储管理系统" ;;
        srm) echo "供应商关系管理" ;;
        qms) echo "质量管理系统" ;;
        lims) echo "实验室信息管理系统" ;;
        ehs) echo "环境健康安全管理" ;;
        rd) echo "研发服务管理" ;;
        bi) echo "商业智能分析服务" ;;
        portal) echo "企业门户服务" ;;
        mobile) echo "移动应用服务" ;;
        gis) echo "地理信息服务" ;;
        integration) echo "系统集成服务" ;;
        billing) echo "订阅计费与交易结算服务" ;;
        communication) echo "IM/通知/邮件/短信等通讯能力统一服务" ;;
        feedback) echo "意见反馈与满意度调查服务" ;;
        master-data) echo "企业级主数据统一管理服务" ;;
        search) echo "Elasticsearch全文检索与搜索聚合服务" ;;
        ticket) echo "工单与服务请求流程引擎服务" ;;
        lowcode) echo "低代码应用搭建与表单引擎平台" ;;
        *) echo "$(echo "$1" | sed 's/./\U&/')服务" ;;
    esac
}

# 检查并重启异常服务
check_and_restart_services() {
    info "检查服务状态并自动重启..."

    local restarted=0
    local running=0
    local total=0

    for service in $(get_all_services); do
        total=$((total + 1))
        local port=$(get_service_port "$service")
        if check_port $port; then
            running=$((running + 1))
        else
            warning "$service 未运行，自动重启..."
            if start_service "$service" 2>/dev/null; then
                restarted=$((restarted + 1))
            else
                error "$service 重启失败"
            fi
        fi
    done

    echo ""
    if [ $restarted -eq 0 ]; then
        success "所有服务运行正常 (${running}/${total})"
    else
        info "已重启 ${restarted} 个服务"
    fi
}

# 等待核心服务就绪
wait_for_core_services() {
    info "等待核心服务就绪..."
    local max_wait=60
    local wait_interval=2
    local elapsed=0

    for service in $CORE_SERVICES; do
        local port=$(get_service_port "$service")
        while [ $elapsed -lt $max_wait ]; do
            if check_port $port && curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
                success "$service 服务就绪"
                break
            fi
            sleep $wait_interval
            elapsed=$((elapsed + wait_interval))
        done
        if [ $elapsed -ge $max_wait ]; then
            warning "$service 服务未在 $max_wait 秒内就绪"
        fi
    done
}

# 启动所有服务（V64 支持: --only-core / --no-frontend / --skip=<svc> / --register）
start_all_services() {
    local extra_opts="$*"
    info "启动所有服务..."
    load_env

    local only_core=0
    local skip_fe=0
    local no_register=0
    local skip_packages=""
    for opt in $extra_opts; do
        case "$opt" in
            --only-core)    only_core=1 ;;
            --no-frontend)  skip_fe=1 ;;
            --no-register)  no_register=1 ;;
            --skip=*)       skip_packages="${skip_packages} ${opt#--skip=}" ;;
        esac
    done

    local success_count=0
    local fail_count=0

    info "========== [1/3] 启动核心服务 (iam=unified-core) =========="
    for service in $CORE_SERVICES; do
        local skip_this=0
        for s in $skip_packages; do
            [ "$service" = "$s" ] && skip_this=1 && break
        done
        [ $skip_this -eq 1 ] && { warning "跳过 $service (--skip)"; continue; }

        if start_service "$service"; then
            success_count=$((success_count + 1))
        else
            fail_count=$((fail_count + 1))
        fi
    done

    wait_for_core_services

    # 自动注册插件（V64+ 默认开启）
    if [ "$no_register" = "0" ] && [ -x "$SCRIPT_DIR/dev/register-plugins.sh" ]; then
        info "========== [1b/3] 自动注册插件 =========="
        "$SCRIPT_DIR/dev/register-plugins.sh" >/tmp/topems-register.log 2>&1 || warning "插件注册失败，日志 /tmp/topems-register.log"
    fi

    if [ "$only_core" = "1" ]; then
        info "========== --only-core 指定，仅启动核心服务，退出 =========="
    else
        info "========== [2/3] 启动其他服务 =========="
        for service in $(get_all_services); do
            if echo "$CORE_SERVICES" | grep -wq "$service"; then
                continue
            fi
            local skip_this=0
            for s in $skip_packages; do
                [ "$service" = "$s" ] && skip_this=1 && break
            done
            [ $skip_this -eq 1 ] && { warning "跳过 $service (--skip)"; continue; }

            if start_service "$service"; then
                success_count=$((success_count + 1))
            else
                fail_count=$((fail_count + 1))
            fi
        done
    fi

    if [ $skip_fe -eq 1 ]; then
        info "========== [3/3] 已指定 --no-frontend，跳过前端 =========="
    else
        info "========== [3/3] 启动前端 =========="
        if start_frontend; then
            success_count=$((success_count + 1))
        else
            fail_count=$((fail_count + 1))
        fi
    fi

    echo ""
    info "========== 启动汇总 =========="
    info "成功: $success_count   失败: $fail_count"
    info "查看日志: ls /tmp/topems-*.log"
    info "健康检查: $0 status"
    info "停止服务: $0 stop-all"

    if [ $fail_count -eq 0 ]; then
        success "所有服务启动完成 ($success_count 成功) ✅"
    else
        warning "服务启动完成 ($success_count 成功, $fail_count 失败)"
    fi
}

# 停止所有服务
stop_all_services() {
    info "停止所有服务..."
    for service in $(get_all_services); do
        stop_service "$service" || true
    done
    stop_frontend || true
}

# 启动开发环境（macOS）
start_dev_macos() {
    info "启动 macOS 开发环境..."

    check_command() {
        if ! command -v "$1" &> /dev/null; then
            error "$1 未安装"
            return 1
        fi
    }

    check_command "cargo" || return 1
    check_command "node" || return 1
    local pkg_cmd=$(get_pkg_cmd) || return 1
    check_command "psql" || return 1

    db_start
    redis_start

    if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
        warning ".env 文件不存在，从示例复制..."
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        local jwt_secret
        jwt_secret=$(openssl rand -base64 32 | tr '/' '_' | tr '+' '-' | tr '=' '.')
        awk -F'=' -v secret="$jwt_secret" '$1=="JWT_SECRET" {$2=secret} 1' OFS='=' "$PROJECT_ROOT/.env" > "$PROJECT_ROOT/.env.tmp"
        mv "$PROJECT_ROOT/.env.tmp" "$PROJECT_ROOT/.env"
    fi

    start_service "iam"

    info "启动前端服务..."
    if ! check_port 3000; then
        ensure_frontend_deps "$pkg_cmd" || return 1
        nohup $pkg_cmd dev > "/tmp/topems-web.log" 2>&1 &
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

# 获取前端 dev 进程 PID（vite/tsc/node）
get_frontend_pid() {
    ps aux | grep -v grep \
        | grep -E "(vite|tsc.*watch|topems-web\.log)" \
        | grep -E "(apps/web|$PROJECT_ROOT/apps/web)" \
        | awk '{print $2}' | sort -u | head -5
}

# 启动前端服务（带轮询等待，避免静态 sleep 5 与实际端口就绪不一致）
start_frontend() {
    info "启动前端服务..."

    local pkg_cmd=$(get_pkg_cmd) || return 1
    ensure_frontend_deps "$pkg_cmd" || return 1

    if check_port 3000; then
        info "前端已在端口 3000 运行"
        return 0
    fi

    # 防止重复启动：已有 vite/tsc 进程在跑就先等它
    local existing_pid=""
    existing_pid=$(get_frontend_pid)
    if [ -n "$existing_pid" ]; then
        info "前端进程已存在 (PID: $existing_pid)，等待端口就绪..."
    else
        nohup $pkg_cmd dev > "/tmp/topems-web.log" 2>&1 &
    fi
    local pid=$!
    [ -z "$pid" ] && pid=$existing_pid

    # 轮询等待端口就绪（最长 120s，冷启动含 tsc+vite 预构建通常 15~60s）
    local waited=0
    local interval=3
    local max_wait=120
    while [ $waited -lt $max_wait ]; do
        if check_port 3000; then
            success "前端服务启动成功 (PID: $pid, 端口: 3000, 用时: ${waited}s)"
            return 0
        fi
        # 进程挂了（立即失败）
        if ! kill -0 "$pid" 2>/dev/null; then
            local still_any=""
            still_any=$(get_frontend_pid)
            [ -z "$still_any" ] && break
        fi
        sleep $interval
        waited=$((waited + interval))
    done

    # 超过 max_wait：端口未开，但进程仍活着（仍在编译中）
    local still_pid=""
    still_pid=$(get_frontend_pid)
    if [ -n "$still_pid" ] || kill -0 "$pid" 2>/dev/null; then
        warning "前端服务仍在启动中 (PID: ${still_pid:-$pid})，端口 3000 暂未就绪（tsc 类型检查 / vite 预构建通常需要 30~90 秒）。"
        detail "日志: tail -f /tmp/topems-web.log"
        detail "稍后再查看: $0 status"
        return 0
    fi

    error "前端服务启动失败，请查看日志: /tmp/topems-web.log"
    tail -20 "/tmp/topems-web.log" 2>/dev/null
    return 1
}

# 停止前端服务
stop_frontend() {
    info "停止前端服务..."
    # 先按端口杀（已就绪态）
    local port_pid
    port_pid=$(lsof -ti:3000 2>/dev/null)
    # 再按进程名杀（仍在编译、端口未开的 vite/tsc 进程）
    local proc_pid
    proc_pid=$(get_frontend_pid)
    local all_pid=$(echo "$port_pid $proc_pid" | tr ' ' '\n' | sort -u | grep -v "^$")

    if [ -n "$all_pid" ]; then
        echo "$all_pid" | xargs -I{} kill {} 2>/dev/null || true
        sleep 1
        # 残留强杀
        local remain=""
        for p in $all_pid; do
            kill -0 "$p" 2>/dev/null && remain="$remain $p"
        done
        if [ -n "$remain" ]; then
            echo "$remain" | xargs -I{} kill -9 {} 2>/dev/null || true
            sleep 1
        fi
        success "前端服务已停止 (PID: $(echo "$all_pid" | tr '\n' ' '))"
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
        total_count=$((total_count + 1))
        if check_port $(get_service_port "$service"); then
            running_count=$((running_count + 1))
        fi
    done

    if check_port 3000; then
        echo -e "${GREEN}✅${NC} 前端 (端口 3000) 运行中"
        running_count=$((running_count + 1))
    else
        # 端口未开，但 vite/tsc 仍在编译（仍在启动中 vs 真正未启动）
        local fe_pid=""
        fe_pid=$(get_frontend_pid)
        if [ -n "$fe_pid" ]; then
            echo -e "${YELLOW}⏳${NC} 前端 (端口 3000) 启动中 (PID: $fe_pid, 仍在编译/预构建，通常需要 30~90 秒)"
        else
            echo -e "${RED}❌${NC} 前端 (端口 3000) 未运行"
        fi
    fi
    total_count=$((total_count + 1))

    echo "=================================================="
    info "状态统计: ${running_count}/${total_count} 服务运行中"
}

# =============================================
# WebSocket 连接检查
# =============================================

# 检查 WebSocket 连接状态
ws_check() {
    info "=== WebSocket 连接检查 ==="
    
    local ws_endpoints=(
        "通知服务:/ws/core/notifications:8000"
        "IM服务:/ws/core/im:8000"
        "MES仪表盘:/ws/mes/dashboard:8030"
        "GIS服务:/ws/gis:8071"
    )
    
    local frontend_running=false
    if check_port 3000; then
        frontend_running=true
    fi
    
    local accessible_count=0
    local total_count=${#ws_endpoints[@]}
    
    for endpoint in "${ws_endpoints[@]}"; do
        local name=$(echo "$endpoint" | cut -d: -f1)
        local path=$(echo "$endpoint" | cut -d: -f2)
        local port=$(echo "$endpoint" | cut -d: -f3)
        
        local backend_running=false
        if check_port $port; then
            backend_running=true
        fi
        
        if [ "$frontend_running" = true ]; then
            local proxy_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 \
                -H "Upgrade: websocket" \
                -H "Connection: Upgrade" \
                -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
                -H "Sec-WebSocket-Version: 13" \
                "http://localhost:3000${path}" 2>/dev/null)
            if [ "$proxy_status" = "101" ]; then
                echo -e "${GREEN}✅${NC} $name ($path) 代理配置正确 (状态码: $proxy_status)"
                accessible_count=$((accessible_count + 1))
            elif [ "$proxy_status" = "401" ] || [ "$proxy_status" = "403" ]; then
                echo -e "${GREEN}✅${NC} $name ($path) 代理配置正确 (需要认证: $proxy_status)"
                accessible_count=$((accessible_count + 1))
            elif [ "$proxy_status" = "503" ]; then
                echo -e "${YELLOW}⚠️${NC} $name ($path) 后端服务未响应"
            elif [ "$proxy_status" = "000" ]; then
                echo -e "${YELLOW}⚠️${NC} $name ($path) 连接失败"
            else
                echo -e "${YELLOW}⚠️${NC} $name ($path) 状态码: $proxy_status"
            fi
        elif [ "$backend_running" = true ]; then
            local backend_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 \
                -H "Upgrade: websocket" \
                -H "Connection: Upgrade" \
                -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
                -H "Sec-WebSocket-Version: 13" \
                "http://localhost:${port}${path}" 2>/dev/null)
            if [ "$backend_status" = "101" ]; then
                echo -e "${GREEN}✅${NC} $name ($path) 后端可访问 (状态码: $backend_status)"
                accessible_count=$((accessible_count + 1))
            elif [ "$backend_status" = "401" ]; then
                echo -e "${GREEN}✅${NC} $name ($path) 后端可访问 (需要认证: $backend_status)"
                accessible_count=$((accessible_count + 1))
            else
                echo -e "${YELLOW}⚠️${NC} $name ($path) 后端状态码: $backend_status"
            fi
        else
            echo -e "${RED}❌${NC} $name ($path) 服务未运行 (端口 $port)"
        fi
    done
    
    echo ""
    info "WebSocket 统计: ${accessible_count}/${total_count} 可访问"
    
    if [ "$frontend_running" = false ]; then
        warning "前端未运行，请先启动前端: topems start web"
    fi
    
    echo ""
    detail "路径规范: /ws/{module}/{feature}"
    detail "详细文档: docs/guides/devops/websocket-path-mapping.md"
}

# =============================================
# 数据库管理
# =============================================

# 解析 DATABASE_URL 获取数据库连接信息
parse_database_url() {
    local db_url=${DATABASE_URL:-"postgres://topems:topems_secret@localhost:5432/topems"}
    # 格式: postgres://user:password@host:port/database
    DB_USER=$(echo "$db_url" | sed -n 's|postgres://\([^:]*\):.*|\1|p')
    DB_HOST=$(echo "$db_url" | sed -n 's|.*@\([^:]*\):.*|\1|p')
    DB_PORT=$(echo "$db_url" | sed -n 's|.*@.*:\([0-9]*\)/.*|\1|p')
    DB_NAME=$(echo "$db_url" | sed -n 's|.*/\([^/]*\)$|\1|p')
    DB_USER=${DB_USER:-topems}
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    DB_NAME=${DB_NAME:-topems}
}

# 启动 PostgreSQL
db_start() {
    info "启动 PostgreSQL..."
    if command -v brew &> /dev/null; then
        local pg_version=$(brew list | grep -E '^postgresql@[0-9]+$' | sort -r | head -1)
        if [ -n "$pg_version" ]; then
            brew services start "$pg_version" 2>/dev/null
        else
            brew services start postgresql 2>/dev/null
        fi
        sleep 2
    elif command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql 2>/dev/null || true
    fi

    parse_database_url
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
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
        local pg_version=$(brew list | grep -E '^postgresql@[0-9]+$' | sort -r | head -1)
        if [ -n "$pg_version" ]; then
            brew services stop "$pg_version" 2>/dev/null
        else
            brew services stop postgresql 2>/dev/null
        fi
    elif command -v systemctl &> /dev/null; then
        sudo systemctl stop postgresql 2>/dev/null || true
    fi
    success "PostgreSQL 已停止"
}

# 数据库状态
db_status() {
    parse_database_url
    info "=== PostgreSQL 状态 ==="
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        success "PostgreSQL 运行中"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" 2>/dev/null | head -3
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

    load_env
    parse_database_url

    info "使用 psql 模式执行迁移文件..."
    
    for migrate_dir in "migrations" $(find svc -name migrations -type d); do
        [ -d "$migrate_dir" ] || continue
        
        info "迁移目录: $migrate_dir..."
        for file in $(ls "$migrate_dir"/*.sql 2>/dev/null | sort); do
            [ -f "$file" ] || continue
            local base=$(basename "$file" .sql)
            local version=$(echo "$base" | grep -oE '[0-9]+' | head -1)
            
            if [ -z "$version" ]; then
                warning "迁移文件 $file 没有版本号，跳过"
                continue
            fi
            
            if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version FROM _sqlx_migrations WHERE version = '$version';" 2>/dev/null | grep -q "$version"; then
                detail "迁移 $base 已应用，跳过"
                continue
            fi
            
            info "执行迁移: $file..."
            if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file" 2>&1; then
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time) VALUES ('$version', '$base', NOW(), true, 'manual', 0);" 2>/dev/null || true
            else
                warning "迁移 $file 失败"
            fi
        done
    done
    
    success "数据库迁移完成"
}

# 备份数据库
db_backup() {
    local backup_dir="$PROJECT_ROOT/backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/topems_db_${timestamp}.sql"

    mkdir -p "$backup_dir"

    info "备份数据库到 $backup_file..."
    load_env
    parse_database_url

    local backup_success=false
    
    if command -v docker &> /dev/null && docker ps | grep -q postgres; then
        info "使用 Docker 执行备份..."
        if docker exec -t topems-postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$backup_file" 2>&1; then
            backup_success=true
        fi
    else
        info "使用本地 psql 执行备份..."
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$backup_file" 2>&1; then
            backup_success=true
        fi
    fi

    if [ "$backup_success" = true ] && [ -s "$backup_file" ]; then
        success "数据库备份成功: $backup_file ($(du -h "$backup_file" | cut -f1))"
        return 0
    else
        [ -f "$backup_file" ] && rm -f "$backup_file"
        error "数据库备份失败"
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
    parse_database_url

    read -p "确认恢复数据库 $DB_NAME ? [y/N] " confirm
    [[ ! "$confirm" =~ ^[Yy]$ ]] && { info "取消恢复"; return 0; }

    if command -v docker &> /dev/null && docker ps | grep -q postgres; then
        cat "$backup_file" | docker exec -i topems-postgres psql -U "$DB_USER" "$DB_NAME"
    else
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" < "$backup_file"
    fi

    success "数据库恢复完成"
}

# 重置数据库
db_reset() {
    load_env
    parse_database_url

    read -p "确认重置数据库 $DB_NAME ? 将会删除所有数据! [y/N] " confirm
    [[ ! "$confirm" =~ ^[Yy]$ ]] && { info "取消重置"; return 0; }

    info "重置数据库..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
    success "数据库重置完成"
}

# =============================================
# 一键运行/停止
# =============================================

# 一键运行：启动依赖 + 所有服务
run_all() {
    info "========== 一键运行 =========="

    # 1. 启动数据库
    db_start || { error "数据库启动失败，无法继续。请检查 PostgreSQL 配置。"; return 1; }
    redis_start || { error "Redis 启动失败，无法继续。请检查 Redis 配置。"; return 1; }
    sleep 2

    # 2. 启动所有服务（透传 --only-core / --no-frontend / --skip= 等参数）
    start_all_services "$@"

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

# 重启所有服务（支持透传 --only-core / --no-frontend / --skip= 等）
restart_all() {
    info "========== 重启所有服务 =========="
    stop_all_services
    sleep 2
    start_all_services "$@"
    show_all_status
}

# 调用Python CLI
run_cli() {
    if [ -d "$CLI_DIR" ]; then
        local cli_entry="$CLI_DIR/bin/topems"
        if [ -f "$cli_entry" ]; then
            "$cli_entry" "$@"
            return $?
        fi
        cd "$CLI_DIR"
        # 创建虚拟环境（如果不存在）
        if [ ! -f ".venv/bin/activate" ]; then
            info "创建 Python 虚拟环境 .venv ..."
            python3 -m venv .venv
        fi
        source .venv/bin/activate
        export PYTHONPATH="$CLI_DIR/src"
        # 检查依赖
        python3 -c "import yaml, click, rich" 2>/dev/null || {
            info "缺少 Python CLI 依赖，正在安装..."
            python3 -m pip install pyyaml click rich httpx --quiet
        }
        python3 -m topems_cli "$@"
    else
        error "Python CLI 未安装"
        echo "请运行以下命令安装:"
        echo "  cd $CLI_DIR && python3 -m venv .venv && source .venv/bin/activate && python3 -m pip install pyyaml click rich httpx"
        exit 1
    fi
}

# 显示帮助
# =============================================
# 清理缓存命令
# =============================================
clean_project() {
    local clean_rust=false
    local clean_frontend=false
    local clean_cache=false
    local clean_system_cache=false
    local clean_logs=false
    local clean_ollama=false
    local clean_all=false
    local dry_run=false

    for arg in "$@"; do
        case "$arg" in
            --rust)         clean_rust=true ;;
            --frontend)     clean_frontend=true ;;
            --cache)        clean_cache=true ;;
            --system-cache) clean_system_cache=true ;;
            --logs)         clean_logs=true ;;
            --ollama)       clean_ollama=true ;;
            --all)          clean_all=true ;;
            --dry-run)      dry_run=true ;;
            *)
                error "未知参数: $arg"
                echo "可用选项: --rust --frontend --cache --system-cache --ollama --logs --all --dry-run"
                return 1
                ;;
        esac
    done

    # 默认全量清理（仅项目级，system-cache/ollama 需显式指定）
    if [ "$clean_rust" = false ] && [ "$clean_frontend" = false ] && \
       [ "$clean_cache" = false ] && [ "$clean_system_cache" = false ] && \
       [ "$clean_ollama" = false ] && [ "$clean_logs" = false ] && \
       [ "$clean_all" = false ]; then
        clean_all=true
    fi
    if [ "$clean_all" = true ]; then
        clean_rust=true
        clean_frontend=true
        clean_cache=true
        clean_logs=true
    fi

    # --system-cache 是危险操作，需要二次确认
    local did_clean=false
    if [ "$clean_system_cache" = true ] && [ "$dry_run" = false ]; then
        warn "即将清理系统级缓存，这将影响其他应用并触发全量重新下载！"
        echo "  包括: pnpm 缓存、Cargo registry、IDE 缓存、SCCache 等"
        echo ""
        read -r -p "确认继续？(y/N): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            warn "已取消系统缓存清理。"
            clean_system_cache=false
        fi
    fi

    echo ""
    info "================================================"
    info "  TOPEMS 清理命令"
    info "================================================"
    echo ""

    if [ "$clean_rust" = true ]; then
        local dir="$PROJECT_ROOT/target"
        if [ -d "$dir" ]; then
            local size
            size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
            if [ "$dry_run" = true ]; then
                info "[DRY-RUN] 将删除 Rust 编译产物: $dir ($size)"
            else
                info "清理 Rust 编译产物 (cargo clean)..."
                cargo clean 2>/dev/null
                rm -rf "$dir"
                success "已清理 target/ ($size)"
                did_clean=true
            fi
        else
            detail "target/ 不存在，跳过"
        fi

        local sqlx_dir="$PROJECT_ROOT/.sqlx"
        if [ -d "$sqlx_dir" ]; then
            local sqlx_size
            sqlx_size=$(du -sh "$sqlx_dir" 2>/dev/null | awk '{print $1}')
            if [ "$dry_run" = true ]; then
                info "[DRY-RUN] 将删除 SQLx 缓存: $sqlx_dir ($sqlx_size)"
            else
                rm -rf "$sqlx_dir"
                detail "已清理 .sqlx ($sqlx_size)"
                did_clean=true
            fi
        fi
    fi

    if [ "$clean_frontend" = true ]; then
        local fe_dirs=(
            "$PROJECT_ROOT/apps/web/dist"
            "$PROJECT_ROOT/apps/web/coverage"
            "$PROJECT_ROOT/apps/web/playwright-report"
            "$PROJECT_ROOT/apps/web/test-results"
            "$PROJECT_ROOT/apps/desktop/dist"
            "$PROJECT_ROOT/apps/mobile/dist"
            "$PROJECT_ROOT/apps/web/.vite"
        )
        for dir in "${fe_dirs[@]}"; do
            if [ -d "$dir" ]; then
                local size
                size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将删除: $dir ($size)"
                else
                    rm -rf "$dir"
                    detail "已删除 $dir ($size)"
                    did_clean=true
                fi
            fi
        done

        # node_modules 内部缓存
        local nm_cache_dirs=(
            "$PROJECT_ROOT/apps/web/node_modules/.vite"
            "$PROJECT_ROOT/apps/web/node_modules/.cache"
        )
        for dir in "${nm_cache_dirs[@]}"; do
            if [ -d "$dir" ]; then
                local size
                size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将删除: $dir ($size)"
                else
                    rm -rf "$dir"
                    detail "已删除 $dir ($size)"
                    did_clean=true
                fi
            fi
        done
    fi

    # 项目级缓存（仅影响本项目，安全）
    if [ "$clean_cache" = true ]; then
        local project_cache_dirs=(
            "$PROJECT_ROOT/apps/web/.lighthouseci"
            "$PROJECT_ROOT/apps/web/.storybook"
            "$PROJECT_ROOT/cli/.venv"
            "$PROJECT_ROOT/cli/.pytest_cache"
            "$PROJECT_ROOT/apps/web/node_modules/.cache"
        )
        for dir in "${project_cache_dirs[@]}"; do
            if [ -d "$dir" ]; then
                local size
                size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将删除项目缓存: $dir ($size)"
                else
                    rm -rf "$dir"
                    detail "已删除 $dir ($size)"
                    did_clean=true
                fi
            fi
        done

        # pnpm store prune （仅清理未引用包，不影响其他项目）
        if command -v pnpm &>/dev/null; then
            if [ "$dry_run" = true ]; then
                info "[DRY-RUN] 将执行 pnpm store prune"
            else
                info "执行 pnpm store prune..."
                pnpm store prune 2>/dev/null
                detail "pnpm store 已清理"
                did_clean=true
            fi
        fi
    fi

    # 系统级缓存（危险，影响其他应用）
    if [ "$clean_system_cache" = true ]; then
        local system_cache_dirs=(
            "$HOME/Library/Caches/pnpm"
            "$HOME/Library/Caches/google"
            "$HOME/Library/Caches/Mozilla.sccache"
            "$HOME/Library/Caches/com.trae.app.ShipIt"
            "$HOME/Library/Caches/Trae CN"
        )
        for dir in "${system_cache_dirs[@]}"; do
            if [ -d "$dir" ]; then
                local size
                size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将删除系统缓存: $dir ($size)"
                else
                    rm -rf "$dir"
                    detail "已删除 $dir ($size)"
                    did_clean=true
                fi
            fi
        done

        if [ -d "$HOME/.cargo/registry" ]; then
            local cargo_size
            cargo_size=$(du -sh "$HOME/.cargo/registry" 2>/dev/null | awk '{print $1}')
            if [ "$dry_run" = true ]; then
                info "[DRY-RUN] 将删除 Cargo registry: $HOME/.cargo/registry ($cargo_size)"
            else
                rm -rf "$HOME/.cargo/registry"
                detail "已删除 Cargo registry ($cargo_size)"
                did_clean=true
            fi
        fi
    fi

    # Ollama 模型清理（保留项目使用的模型，删除其他）
    if [ "$clean_ollama" = true ]; then
        # 从 .env 读取项目实际使用的模型
        local required_models=()
        if [ -f "$PROJECT_ROOT/.env" ]; then
            local ollama_model embed_model
            ollama_model=$(grep "^OLLAMA_MODEL=" "$PROJECT_ROOT/.env" | cut -d'=' -f2 | tr -d ' ')
            embed_model=$(grep "^EMBEDDING_MODEL=" "$PROJECT_ROOT/.env" | cut -d'=' -f2 | tr -d ' ')
            [ -n "$ollama_model" ] && required_models+=("$ollama_model")
            [ -n "$embed_model" ] && required_models+=("$embed_model")
        fi
        # 默认保留的模型
        if [ ${#required_models[@]} -eq 0 ]; then
            required_models=("qwen2.5:7b-instruct" "nomic-embed-text")
        fi

        info "项目需要保留的 Ollama 模型: ${required_models[*]}"

        if ! command -v ollama &>/dev/null; then
            warn "未安装 ollama，跳过模型清理"
        else
            local installed_models
            installed_models=$(ollama list 2>/dev/null | tail -n +2 | awk '{print $1}')
            if [ -z "$installed_models" ]; then
                detail "无已安装的 Ollama 模型"
            else
                for model in $installed_models; do
                    local is_required=false
                    for req in "${required_models[@]}"; do
                        if [ "$model" = "$req" ]; then
                            is_required=true
                            break
                        fi
                    done
                    if [ "$is_required" = true ]; then
                        detail "保留项目模型: $model"
                    else
                        if [ "$dry_run" = true ]; then
                            info "[DRY-RUN] 将删除 Ollama 模型: $model"
                        else
                            ollama rm "$model" 2>/dev/null
                            detail "已删除 Ollama 模型: $model"
                            did_clean=true
                        fi
                    fi
                done
            fi
        fi

        # 清理 Ollama blobs 残留（manifests 已删但 blobs 仍在的情况）
        local ollama_blobs="$HOME/.ollama/models/blobs"
        if [ -d "$ollama_blobs" ]; then
            local blob_size
            blob_size=$(du -sh "$ollama_blobs" 2>/dev/null | awk '{print $1}')
            local blob_count
            blob_count=$(ls "$ollama_blobs" 2>/dev/null | wc -l | tr -d ' ')
            if [ "$blob_count" -gt 0 ]; then
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将清理 Ollama blobs 残留: $ollama_blobs ($blob_size, $blob_count files)"
                else
                    rm -rf "$ollama_blobs"/* 2>/dev/null
                    detail "已清理 Ollama blobs 残留 ($blob_size)"
                    did_clean=true
                fi
            fi
        fi
    fi

    if [ "$clean_logs" = true ]; then
        local log_dirs=(
            "$PROJECT_ROOT/logs"
        )
        for dir in "${log_dirs[@]}"; do
            if [ -d "$dir" ]; then
                local size
                size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将清空: $dir ($size)"
                else
                    find "$dir" -name "*.log" -type f -delete 2>/dev/null
                    detail "已清空 $dir 下的日志"
                    did_clean=true
                fi
            fi
        done

        local root_logs
        root_logs=$(find "$PROJECT_ROOT" -maxdepth 1 -name "*.log" -type f 2>/dev/null)
        if [ -n "$root_logs" ]; then
            if [ "$dry_run" = true ]; then
                info "[DRY-RUN] 将删除根目录日志文件"
            else
                find "$PROJECT_ROOT" -maxdepth 1 -name "*.log" -type f -delete 2>/dev/null
                detail "已删除根目录日志文件"
                did_clean=true
            fi
        fi
    fi

    echo ""
    if [ "$dry_run" = true ]; then
        info "[DRY-RUN] 完成。无文件被实际删除。"
    elif [ "$did_clean" = true ]; then
        success "清理完成！"
        echo ""
        detail "后续建议:"
        detail "  Rust:    cargo build  (重建 target/)"
        detail "  前端:    pnpm install && pnpm build"
        detail "  Python:  cd cli && python3 -m venv .venv && source .venv/bin/activate && python3 -m pip install -e ."
    else
        warn "未执行任何清理操作。"
        echo "  使用 --dry-run 预览将清理的内容，或指定具体选项如 --rust --cache 等。"
    fi
}

show_help() {
    cat << EOF
TOPEMS 服务管理工具

用法: topems <命令> [选项]

服务管理:
  status [服务]           查看服务状态
  start <服务>            启动服务（自动注册到 unified-core）
  stop <服务>             停止服务
  restart <服务>          重启服务
  check                   检查服务状态并自动重启异常服务
  logs <服务> [行数]      查看服务日志
  build <服务> [--online|--offline|--dev]  编译服务
  build-all [选项]        全量编译所有服务（后端+前端）
                            --prepare         先刷新 sqlx 缓存（需要 DATABASE_URL）
                            --only-core       只编核心服务（iam finance erp scm srm crm）
                            --online          强制在线编译（无缓存也可）
                            --offline         强制离线编译（失败立即停止）
                            --dev|--debug     编 debug 版（默认 release）
                            --skip=<svc>      跳过某个包，可重复
                            --backend-only    只编后端，跳过前端
  build-backend [选项]    编译所有后端服务（同 build-all 的后端子集）
  build-frontend          编译前端 (tsc && vite build)
                            --dev        若存在 build:dev 脚本则用，否则回退默认 build
                            --skip-lint  若存在 build:nolint 脚本则用，否则忽略（默认 build 不跑 lint）
  start-all [选项]        启动所有服务（含前端，自动注册）
                            --only-core       只启动核心服务（iam=unified-core）
                            --no-frontend     不启动前端
                            --no-register     不自动注册插件
                            --skip=<svc>      跳过某个服务
  stop-all                停止所有服务（含前端）
  restart-all [选项]      重启所有服务（透传 start-all 选项）

一键运行:
  run [选项]             一键启动数据库+所有服务（透传 start-all 选项）
                          --only-core       只启动核心服务
                          --no-frontend     不启动前端
                          --skip=<svc>      跳过某个服务
  run-stop                一键停止所有服务+数据库

前端:
  start web               启动前端服务
  stop web                停止前端服务

测试:
  test-all                运行所有测试（后端+前端）
  test-backend            运行后端测试
  test-frontend           运行前端测试

SQLx 离线缓存 (V64+):
  sqlx prepare [--pkg=X] [--all]  生成离线缓存
  sqlx prepare --check            校验离线缓存
  sqlx prepare --merge            合并分包缓存到根 .sqlx
  sqlx check-offline              无 DATABASE_URL 下全量离线编译校验

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

清理:
  clean [选项]            清理编译产物、缓存、日志
                            --rust         清理 Rust 编译产物 (target/, .sqlx)
                            --frontend     清理前端产物 (dist/, coverage/, .vite 缓存)
                            --cache        清理项目级缓存 (.lighthouseci, .venv, .storybook 等)
                            --system-cache 清理系统级缓存 (pnpm/cargo/IDE，危险操作需确认)
                            --ollama       清理 Ollama 模型（保留项目使用的模型）
                            --logs         清理日志文件 (logs/*.log)
                            --all          全量清理（默认）
                            --dry-run      预演模式，仅显示将删除的内容

开发环境:
  dev                     启动开发环境 (macOS)
  install-deps            安装依赖

AI模型管理:
  ai start                启动 Ollama 服务
  ai stop                 停止 Ollama 服务
  ai status               查看 Ollama 状态
  ai pull <模型>          下载AI模型

WebSocket:
  ws check                检查 WebSocket 连接状态

部署:
  deploy                  一键部署
  update-password         重置管理员密码

用户管理:
  reset-password [用户] [密码]  重置用户密码（默认 admin/admin123）

环境变量:
  MAX_RETRIES             最大重试次数（默认: 3）
  RETRY_DELAY             初始重试间隔（默认: 3秒）
  BACKOFF_FACTOR          退避系数（默认: 2，指数退避）
  FORCE_ONLINE_BUILD      设为 1 时 build/build-all 默认在线编译

示例:
  topems status               查看所有服务状态
  topems start iam            启动 IAM 服务
  topems start-all --only-core     仅启动核心服务
  topems start-all --no-frontend   只启动后端服务
  topems logs hrm 100         查看 HRM 最近 100 行日志
  topems build-all            全量编译（离线优先，失败自动切在线）
  topems build-all --prepare  先刷新 sqlx 缓存再编译
  topems build-all --only-core --dev  仅 debug 编译核心服务
  topems sqlx prepare --all   生成全量 SQLx 离线缓存
  topems test-all             运行所有测试
  topems run                  一键运行（数据库+所有服务）
  topems db status            查看数据库状态
  topems db backup            备份数据库
  topems dev                  启动开发环境
  topems reset-password       重置 admin 密码为 admin123
  topems reset-password admin newpass123  重置 admin 密码为 newpass123

完整功能请使用 Python CLI:
  cd cli && python3 -m topems_cli --help
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
        build_service "$2" "${@:3}"
        ;;
    build-all)
        build_all "${@:2}"
        ;;
    build-backend)
        build_all_backend "${@:2}"
        ;;
    build-frontend)
        build_frontend "${@:2}"
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
        start_all_services "${@:2}"
        show_all_status
        ;;
    stop-all)
        stop_all_services
        ;;
    restart-all)
        restart_all "${@:2}"
        ;;
    check)
        check_and_restart_services
        ;;
    sqlx)
        case "${2:-prepare}" in
            prepare)
                shift 2 || true
                "$SCRIPT_DIR/dev/sqlx-prepare.sh" "$@"
                ;;
            check|check-offline)
                export SQLX_OFFLINE=true
                "$SCRIPT_DIR/dev/sqlx-prepare.sh" --check
                ;;
            merge)
                "$SCRIPT_DIR/dev/sqlx-prepare.sh" --merge
                ;;
            *)
                error "未知 sqlx 子命令: $2"
                echo "可用命令: prepare, check-offline, merge"
                exit 1
                ;;
        esac
        ;;
    run)
        run_all "${@:2}"
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
        "$SCRIPT_DIR/dev/install-deps.sh" all
        ;;
    ai)
        case "$2" in
            start|stop|status|pull)
                "$SCRIPT_DIR/dev/ai-models.sh" "$2" "${3:-}"
                ;;
            *)
                "$SCRIPT_DIR/dev/ai-models.sh"
                ;;
        esac
        ;;
    ws)
        case "$2" in
            check)
                ws_check
                ;;
            *)
                error "未知 WebSocket 命令: $2"
                echo "可用命令: check"
                exit 1
                ;;
        esac
        ;;
    deploy)
        info "调用部署脚本..."
        "$SCRIPT_DIR/deploy/deploy.sh" deploy
        ;;
    update-password|reset-password)
        info "调用密码重置脚本..."
        "$SCRIPT_DIR/dev/update-admin-password.sh" "${2:-admin}" "${3:-admin123}"
        ;;
    help|--help|-h)
        show_help
        ;;
    clean)
        clean_project "${@:2}"
        ;;
    *)
        run_cli "$@"
        ;;
esac