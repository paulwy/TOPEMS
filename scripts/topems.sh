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
# 单次启动等待端口就绪的最长时间（秒）；unified-core 冷启动含 30 张表 schema 自检，实测 ~18s
READY_TIMEOUT=${READY_TIMEOUT:-60}

# 服务配置
load_services_config() {
    local config_file="$SCRIPT_DIR/services.conf"
    if [ -f "$config_file" ]; then
        SERVICES_CONFIG=$(grep -v "^#" "$config_file" | grep -v "^$" | grep -v "CORE_SERVICES")
        CORE_SERVICES=$(grep "CORE_SERVICES" "$config_file" | cut -d'=' -f2 | tr -s ' ' | xargs)
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
ticket      svc/ticket             topems-ticket               8086
# [V2026.08 已合并] feedback 服务已合并至 ticket（customer_feedback 类型），原端口 8087 停用
# [V2026.08 已移除] lowcode 空壳占位服务（原端口 8088）
master-data svc/master-data        topems-master-data          8090
tms         svc/tms                topems-tms                  8073
monitor     svc/monitor            topems-monitor              8095
plugin-registry svc/plugin-registry    topems-plugin-registry  8096
"
        CORE_SERVICES="iam plugin-registry"
    fi
}

load_services_config

# 服务管理函数
get_service_path() { echo "$SERVICES_CONFIG" | grep "^${1} " | awk '{print $2}'; }
get_service_port() { echo "$SERVICES_CONFIG" | grep "^${1} " | awk '{print $4}'; }
get_all_services() { echo "$SERVICES_CONFIG" | grep -v "^#" | grep -v "^$" | awk '{print $1}' | sort; }
get_executable_name() {
    local binary_name
    binary_name=$(echo "$SERVICES_CONFIG" | grep "^${1} " | awk '{print $3}')
    echo "${binary_name:-topems-$1}"
}

# ============ 跨平台工具（Windows/Git Bash · Linux · macOS） ============
# OS 判定：Git Bash/MSYS2/Cygwin => windows；Darwin => macos；其余(含 WSL) => linux
detect_os() {
    case "$(uname -s)" in
        MINGW*|MSYS*|CYGWIN*) echo windows ;;
        Darwin*) echo macos ;;
        *) echo linux ;;
    esac
}
_is_windows() { [ "$(detect_os)" = "windows" ]; }

check_port() {
    local port=$1
    if command -v lsof &>/dev/null; then
        lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1 && return 0 || return 1
    fi
    case "$(detect_os)" in
        windows)
            netstat -ano 2>/dev/null | grep -qE "[:.]${port} .*LISTENING" && return 0 ;;
        darwin)
            netstat -an 2>/dev/null | grep -qE "\.${port} .*LISTEN" && return 0 ;;
        linux)
            if command -v ss &>/dev/null; then
                ss -tln 2>/dev/null | grep -qE ":${port}[[:space:]]" && return 0
            else
                netstat -tln 2>/dev/null | grep -qE ":${port}[[:space:]]" && return 0
            fi ;;
    esac
    return 1
}
# 获取监听指定端口的 PID（lsof 优先，其余按 OS 用 ss/netstat 兜底）
get_port_pid() {
    local port=$1
    if command -v lsof &>/dev/null; then
        lsof -ti:"$port" 2>/dev/null
        return 0
    fi
    case "$(detect_os)" in
        windows)
            netstat -ano 2>/dev/null | grep -E "[:.]${port} .*LISTENING" | awk '{print $NF}' | sort -u ;;
        darwin)
            # macOS 系统自带 lsof 且 netstat 不输出 PID，此分支仅兜底监听判断
            : ;;
        linux)
            if command -v ss &>/dev/null; then
                ss -tlnp 2>/dev/null | grep -E ":${port}[[:space:]]" | grep -oE "pid=[0-9]+" | cut -d= -f2 | sort -u
            else
                netstat -tlnp 2>/dev/null | grep -E ":${port}[[:space:]]" | grep -oE "pid=[0-9]+" | cut -d= -f2 | sort -u
            fi ;;
    esac
}
get_service_pid() {
    local port=$2
    local executable_name
    executable_name=$(get_executable_name "$1")
    local pid=""
    if _is_windows; then
        # Windows/Git Bash: use netstat for the real Windows PID (MSYS ps PID is not usable)
        pid=$(get_port_pid "$port" | head -1)
    else
        pid=$(lsof -ti:${port} 2>/dev/null || true)
    fi
    [ -z "$pid" ] && pid=$(ps aux | grep -v grep | grep "$executable_name" | awk '{print $2}' 2>/dev/null || true)
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

# =============================================
# SQLx 离线缓存新鲜度门禁（V3xx）
# 背景：mes 离线缓存缺失/过时曾反复导致编译与启动失败。根治设施：
#   - 根 .sqlx/ 全量缓存已入库（309 条），mes 已纳入离线校验范围；
#   - scripts/dev/sqlx-prepare.sh --check 为离线缓存一致性门禁
#     （lefthook pre-commit Gate S / pre-push / CI 共用同一逻辑）；
#   - lefthook.yml pre-commit Gate S 对 .rs/.sql/.sqlx 变更阻断，
#     pre-push 四个 cargo 命令 SQLX_OFFLINE=true 串行。
# 本函数把同一门禁前移到 topems.sh 的编译/启动主流程入口：
#   - build / build-all / build-backend / start / start-all / run / dev
#     默认先跑 --check，失败即停并给出修复指引，避免"编译或启动时才暴露缓存缺失"。
# 跳过方式：参数 --skip-sqlx-check，或环境变量 SQLX_CHECK_SKIP=1，
#           或 --online（在线模式不消费离线缓存）。
# 同一进程内只跑一次（_SQLX_CHECKED 守卫），build-all 不会逐包重复检查。
# =============================================
_SQLX_CHECKED=0
_check_sqlx_cache_freshness() {
    local args=("$@")
    local skip=0
    local a
    for a in "${args[@]}"; do
        case "$a" in
            --skip-sqlx-check|--online) skip=1 ;;
        esac
    done
    if [ "${SQLX_CHECK_SKIP:-0}" = "1" ]; then
        skip=1
    fi
    if [ "$skip" -eq 1 ]; then
        detail "已跳过 SQLx 缓存新鲜度校验（--skip-sqlx-check / --online / SQLX_CHECK_SKIP=1）"
        return 0
    fi
    if [ "$_SQLX_CHECKED" -eq 1 ]; then
        detail "SQLx 缓存新鲜度本进程已校验通过，跳过重复检查"
        return 0
    fi
    info "========== [门禁] SQLx 离线缓存新鲜度校验（sqlx-prepare.sh --check） =========="
    if [ ! -x "$SCRIPT_DIR/dev/sqlx-prepare.sh" ]; then
        error "缺少 $SCRIPT_DIR/dev/sqlx-prepare.sh，无法校验离线缓存。"
        return 1
    fi
    if ! bash "$SCRIPT_DIR/dev/sqlx-prepare.sh" --check; then
        echo ""
        error "========== SQLx 离线缓存缺失或与当前代码不一致，已中止操作 =========="
        error "修复指引："
        error "  1) 连接数据库后刷新缓存：  ./scripts/dev/sqlx-prepare.sh"
        error "  2) 提交缓存变更：          git add .sqlx && git commit"
        error "  3) 重新执行本命令；临时绕过： topems <cmd> --skip-sqlx-check（或 SQLX_CHECK_SKIP=1）"
        return 1
    fi
    _SQLX_CHECKED=1
    success "SQLx 离线缓存新鲜度校验通过（缓存与当前代码匹配）"
    return 0
}

# 返回 mes 专用 DATABASE_URL（.env 派生 + search_path=mes,public；无 .env 时回退默认）
_mes_db_url() {
    local url="${DATABASE_URL:-}"
    if [ -z "$url" ]; then
        load_env
        url="${DATABASE_URL:-postgresql://topems_app:topems_app_secret@localhost:5432/topems}"
    fi
    if [[ "$url" != *"search_path"* ]]; then
        if [[ "$url" == *"?"* ]]; then
            url="${url}&options=-csearch_path=mes,public"
        else
            url="${url}?options=-csearch_path=mes,public"
        fi
    fi
    echo "$url"
}

# 编译服务（V70+ 增加内存自适应 & 构建锁；V3xx 统一离线优先 + SQLx 缓存门禁）
build_service() {
    local service_name=$1
    shift
    local extra_opts="$*"
    local service_path
    service_path=$(get_service_path "$service_name")

    # V70+ 保存/恢复 CARGO_BUILD_JOBS，避免污染后续构建
    local _orig_cargo_jobs="${CARGO_BUILD_JOBS:-}"
    local _cargo_jobs_modified=0
    _restore_cargo_jobs() {
        if [ "$_cargo_jobs_modified" -eq 1 ]; then
            if [ -n "$_orig_cargo_jobs" ]; then
                export CARGO_BUILD_JOBS="$_orig_cargo_jobs"
            else
                unset CARGO_BUILD_JOBS
            fi
            _cargo_jobs_modified=0
        fi
    }

    [ -z "$service_path" ] && error "服务 $service_name 不存在" && return 1

    info "编译 $service_name 服务..."
    local executable_name
    executable_name=$(get_executable_name "$service_name")
    cd "$PROJECT_ROOT"

    # V3xx 参数解析：显式循环（替代子串匹配，避免 --debug/--dev 误判；未知 flag 透传）
    # V64+ 编译策略：默认优先离线（SQLX_OFFLINE=true），依赖根目录 .sqlx/
    # 除非显式声明 --online 或 env FORCE_ONLINE_BUILD=1
    local online="${FORCE_ONLINE_BUILD:-0}"
    local offline_only=0
    local profile="--release"
    local _opt
    for _opt in $extra_opts; do
        case "$_opt" in
            --dev|--debug) profile="" ;;
            --online)      online=1 ;;
            --offline)     online=0; offline_only=1 ;;
        esac
    done

    # V70+ 内存自适应 + serial 模式
    local cargo_jobs=""
    local mem_status=0
    local _safe_mode=0
    local _serial_requested=0
    if [[ "$extra_opts" == *"--serial"* ]]; then
        _serial_requested=1
    fi

    # --serial 模式：强制单线程构建，忽略内存检查
    if [ $_serial_requested -eq 1 ]; then
        export CARGO_BUILD_JOBS=1
        _cargo_jobs_modified=1
        cargo_jobs=" (jobs=1, 串行模式)"
    elif [[ "$extra_opts" != *"--skip-mem-check"* ]]; then
        _check_available_memory
        mem_status=$?
        case "$mem_status" in
            2)
                _restore_cargo_jobs
                error "内存不足，无法安全编译 $service_name。请释放内存后重试，或使用 --skip-mem-check 跳过。"
                return 1
                ;;
            1)
                # 内存偏低：限制并行编译线程数
                local cpu_count
                cpu_count=$(sysctl -n hw.ncpu 2>/dev/null || echo 4)
                local safe_jobs=$(( cpu_count / 2 ))
                [ "$safe_jobs" -lt 1 ] && safe_jobs=1
                export CARGO_BUILD_JOBS=$safe_jobs
                _cargo_jobs_modified=1
                cargo_jobs=" (jobs=$safe_jobs, 内存安全模式)"
                _safe_mode=1
                ;;
            *)
                # 内存充足：使用默认并行
                ;;
        esac
    fi

    # V3xx：统一离线优先（含 mes）。根 .sqlx/ 缓存 309 条已入库，sqlx-prepare.sh --check
    # 离线门禁保证缓存与代码匹配；mes 不再走"rm svc/mes/.sqlx + 在线编译"特例，
    # 与其它服务一致（在线回退时自动附加 search_path=mes,public）。
    local cmd
    if [ "$online" = "1" ]; then
        cmd="SQLX_OFFLINE='' cargo build $profile --bin $executable_name"
    else
        cmd="SQLX_OFFLINE=true cargo build $profile --bin $executable_name"
    fi
    info "  命令: $cmd$cargo_jobs"

    if eval "$cmd" 2>&1; then
        success "$service_name 编译成功 ($( [ -z "$profile" ] && echo "debug" || echo "release" ), $( [ "$online" = "1" ] && echo "online" || echo "offline sqlx" ))"
        _restore_cargo_jobs
        return 0
    fi

    # 内存不足导致失败时，不再重试（会再次 OOM）
    if [ "$mem_status" -eq 2 ] || [ "$mem_status" -eq 1 ]; then
        _restore_cargo_jobs
        error "$service_name 编译失败（可能与内存不足有关）。建议: 释放内存后重试。"
        return 1
    fi

    # --offline 显式指定：失败即停，绝不静默回退在线（帮助文档语义一致）
    if [ "$offline_only" -eq 1 ]; then
        _restore_cargo_jobs
        error "$service_name 离线编译失败（--offline 模式不回退在线编译）。"
        error "修复指引："
        error "  1) 校验离线缓存与当前代码是否一致：  ./scripts/dev/sqlx-prepare.sh --check"
        error "  2) 连接数据库刷新缓存：              ./scripts/dev/sqlx-prepare.sh"
        error "  3) 提交缓存变更后重试：              git add .sqlx && git commit"
        return 1
    fi

    # 默认模式：离线失败自动尝试在线（需要 DATABASE_URL）
    warning "$service_name 离线编译失败，自动尝试在线编译（需要 DATABASE_URL）..."
    load_env
    local online_url="${DATABASE_URL:-}"
    if [ "$service_name" = "mes" ] && [ -n "$online_url" ] && [[ "$online_url" != *"search_path"* ]]; then
        # mes 查询依赖 search_path=mes,public（见 docs/developer/backend/mes-compile-mechanism.md）
        if [[ "$online_url" == *"?"* ]]; then
            online_url="${online_url}&options=-csearch_path=mes,public"
        else
            online_url="${online_url}?options=-csearch_path=mes,public"
        fi
    fi
    if [ -z "$online_url" ]; then
        _restore_cargo_jobs
        error "未配置 DATABASE_URL（.env 缺失或未设置），无法在线回退。"
        error "请先运行 ./scripts/dev/sqlx-prepare.sh --check 定位离线缓存问题，或配置 DATABASE_URL 后重试。"
        return 1
    fi
    if DATABASE_URL="$online_url" SQLX_OFFLINE='' cargo build $profile --bin "$executable_name" 2>&1; then
        success "$service_name 在线编译成功"
        _restore_cargo_jobs
        return 0
    else
        _restore_cargo_jobs
        error "$service_name 编译失败（离线+在线均失败），建议执行: ./scripts/dev/sqlx-prepare.sh 刷新根 .sqlx/ 后重试"
        return 1
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
    # 层 2（业务：finance/erp/crm/scm/srm/hrm/pm/qms/wms/mes/pdm/ehs/lims/rd/portal）
    # 层 3（分析/搜索/AI/集成等扩展）
    echo "iam finance erp crm scm srm hrm pm qms wms mes pdm ehs lims rd portal master-data ticket communication mobile gis integration search ai bi tms monitor plugin-registry"
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
        # 本机 dev 场景跳过 puppeteer Chromium 下载（CI 应通过环境变量显式启用）
        # 避免 puppeteer postinstall 网络失败阻塞 pnpm install
        if [ -z "${PUPPETEER_SKIP_DOWNLOAD:-}" ]; then
            export PUPPETEER_SKIP_DOWNLOAD=true
            detail "已自动设置 PUPPETEER_SKIP_DOWNLOAD=true（本机 dev 模式）"
        fi
        $pkg_cmd install --silent
    fi

    return 0
}

# 全量编译所有后端服务（只编译服务包，避免编译 workspace 中所有包）
# V70+: 增加构建锁、内存自适应、--serial 模式、进度追踪
build_all_backend() {
    local extra_opts="${1:-""}"
    info "全量编译所有后端服务..."

    cd "$PROJECT_ROOT"

    # V64+ 新参数: --prepare（先刷新 sqlx 缓存，需要 DATABASE_URL）
    #              --online（强制在线编译，跳过离线）
    #              --offline（强制离线编译，失败即停）
    #              --only-core（只编 iam+finance+erp+scm+srm+crm 核心组）
    # V70+ 新参数: --serial（强制串行构建，关闭并行优化）
    #              --force（强制获取构建锁）
    #              --skip-mem-check（跳过内存检查，CI 场景）
    local do_prepare=0
    local only_core=0
    local force_lock=0
    local skip_mem_check=0
    local serial_mode=0
    local build_cooldown=2
    local skip_packages=""
    for opt in $extra_opts; do
        case "$opt" in
            --prepare)        do_prepare=1 ;;
            --only-core)      only_core=1 ;;
            --force)          force_lock=1 ;;
            --skip-mem-check) skip_mem_check=1 ;;
            --serial)         serial_mode=1 ;;
            --cooldown=*)     build_cooldown="${opt#--cooldown=}" ;;
            --skip=*)         skip_packages="${skip_packages} ${opt#--skip=}" ;;
        esac
    done

    # V70+ 构建锁：防止多个 build-all 并发
    if ! _acquire_build_lock "$( [ $force_lock -eq 1 ] && echo true || echo false )"; then
        error "无法获取构建锁，请等待其他构建完成，或使用 --force 强制获取。"
        return 1
    fi

    # V70+ 内存预检 + serial 模式处理
    local mem_status=0
    if [ $skip_mem_check -eq 0 ]; then
        _check_available_memory
        mem_status=$?
        case "$mem_status" in
            2)
                _release_build_lock
                error "内存严重不足，取消全量编译。请释放内存后重试。"
                return 1
                ;;
            1)
                warn "内存偏低，将启用安全模式（串行+低并行度）进行构建。"
                ;;
        esac
    fi

    # --serial 模式：强制串行单线程构建
    if [ $serial_mode -eq 1 ]; then
        warn "已指定 --serial 模式，强制单线程构建 (CARGO_BUILD_JOBS=1)。"
        export CARGO_BUILD_JOBS=1
    elif [ $mem_status -eq 1 ]; then
        # 内存偏低时默认启用安全模式
        serial_mode=1
        export CARGO_BUILD_JOBS=1
    fi

    # V3xx SQLx 离线缓存新鲜度门禁：缓存与当前代码匹配才进入编译
    if [ "$do_prepare" = "1" ]; then
        info "========== 预处理: 刷新 SQLx 离线缓存 =========="
        load_env
        if [ -x "$SCRIPT_DIR/dev/sqlx-prepare.sh" ]; then
            "$SCRIPT_DIR/dev/sqlx-prepare.sh" || warning "sqlx prepare 失败，但继续尝试编译"
        else
            warning "找不到 $SCRIPT_DIR/dev/sqlx-prepare.sh，跳过 sqlx prepare 阶段"
        fi
        # 刷新后强制校验：确认本次刷新真的让离线缓存可用
        if ! _check_sqlx_cache_freshness $extra_opts; then
            _release_build_lock
            return 1
        fi
    else
        # 默认离线优先：缓存缺失/过时即停（--skip-sqlx-check / SQLX_CHECK_SKIP=1 可跳过）
        if ! _check_sqlx_cache_freshness $extra_opts; then
            _release_build_lock
            return 1
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
    local build_total=0
    local failed_list=""
    local start_time
    start_time=$(date +%s)
    local is_safe_mode=0

    # V70+ 构建间内存检查条件（serial 模式下也每个服务前检查）
    local _need_mem_check=0
    if [ $skip_mem_check -eq 0 ] && ( [ $is_safe_mode -eq 1 ] || [ $serial_mode -eq 1 ] ); then
        _need_mem_check=1
    fi

    for svc in $svc_order; do
        # 按 --skip 过滤
        local skip_this=0
        for s in $skip_packages; do
            [ "$svc" = "$s" ] && skip_this=1 && break
        done
        [ $skip_this -eq 1 ] && { build_skipped=$((build_skipped + 1)); continue; }

        # 某些 svc 别名 bi=analytics，需要映射
        local binary_name
        case "$svc" in
            bi) binary_name="topems-analytics" ;;
            *)  binary_name="$(get_executable_name "$svc")" ;;
        esac
        [ -z "$binary_name" ] && { build_skipped=$((build_skipped+1)); continue; }

        build_total=$((build_total + 1))

        # V70+ 构建间内存检查（serial/安全模式下每个服务前都检查）
        if [ $_need_mem_check -eq 1 ]; then
            local cur_mem=0
            _check_available_memory >/dev/null 2>&1
            cur_mem=$?
            if [ $cur_mem -eq 2 ]; then
                warn "构建 $svc 前检测到内存严重不足，暂停构建 10 秒等待系统释放内存..."
                sleep 10
                _check_available_memory >/dev/null 2>&1
                cur_mem=$?
                if [ $cur_mem -eq 2 ]; then
                    error "内存仍未恢复，跳过 $svc。"
                    build_failed=$((build_failed + 1))
                    failed_list="$failed_list $svc"
                    continue
                fi
            fi
        fi

        local elapsed=$(( $(date +%s) - start_time ))
        local eta_str=""
        if [ $build_success -gt 0 ] && [ $build_total -gt $build_success ]; then
            local avg_time=$(( elapsed / (build_success) ))
            local remaining=$(( (build_total - build_success - build_failed) * avg_time ))
            eta_str=" (预计剩余 ~${remaining}s)"
        fi

        info "[$((build_success + build_failed + 1))/$build_total] 编译 $svc -> bin=$binary_name ...${eta_str}"

        # V70+ 传递 --serial 给 build_service
        local _svc_opts="$extra_opts"
        if [ $serial_mode -eq 1 ]; then
            _svc_opts="$_svc_opts --serial"
        fi

        # 单包离线构建优先
        if build_service "$svc" "$_svc_opts" >/tmp/topems-build-"$svc".log 2>&1; then
            build_success=$((build_success + 1))
            success "  ✅ $svc 构建成功"
        else
            build_failed=$((build_failed + 1))
            failed_list="$failed_list $svc"
            error "  ❌ $svc 构建失败，日志 /tmp/topems-build-$svc.log（末 15 行）"
            tail -n 15 "/tmp/topems-build-$svc.log" >&2

            # V70+ 内存不足时自动切换到安全模式
            if [[ "$extra_opts" != *"--skip-mem-check"* ]]; then
                _check_available_memory >/dev/null 2>&1
                local post_mem=$?
                if [ $post_mem -eq 1 ] || [ $post_mem -eq 2 ]; then
                    is_safe_mode=1
                    serial_mode=1
                    export CARGO_BUILD_JOBS=1
                    _need_mem_check=1
                    warn "检测到内存压力，切换到安全模式（串行+低并行度）继续构建..."
                fi
            fi
        fi

        # V70+ 构建间冷却：可配置冷却时间让 GC/缓存释放
        if [ $serial_mode -eq 1 ]; then
            sleep "$build_cooldown"
        elif [ $build_cooldown -gt 0 ]; then
            sleep 1
        fi
    done

    _release_build_lock

    local total_elapsed=$(( $(date +%s) - start_time ))
    local elapsed_min=$(( total_elapsed / 60 ))
    local elapsed_sec=$(( total_elapsed % 60 ))

    echo ""
    info "========== 后端编译汇总 =========="
    info "成功: $build_success   失败: $build_failed   跳过: $build_skipped   耗时: ${elapsed_min}m ${elapsed_sec}s"
    [ -n "$failed_list" ] && error "失败列表:$failed_list"
    [ $is_safe_mode -eq 1 ] && warn "构建过程中启用了安全模式（内存自适应）"
    [ $serial_mode -eq 1 ] && detail "构建模式: 串行单线程 (CARGO_BUILD_JOBS=1)"
    detail "冷却间隔: ${build_cooldown}s (serial/安全模式) / 1s (普通模式)"
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

    local pkg_cmd
    pkg_cmd=$(get_pkg_cmd) || return 1
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
    _preflight_check "$@" || return 1
    local extra_opts="$*"
    # 剥掉 --skip-preflight 避免透传给子函数
    local filtered_opts=""
    for opt in $extra_opts; do [ "$opt" != "--skip-preflight" ] && filtered_opts="$filtered_opts $opt"; done
    extra_opts="$filtered_opts"
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
# shellcheck disable=SC2120
test_backend() {
    _preflight_check "$@" || return 1
    info "运行后端测试..."

    # 前置：确保 DB schema 就绪（迁移 + 应用自建表；失败仅告警，由测试内 init 兜底）
    info "测试前执行数据库迁移（db_migrate）..."
    if ! db_migrate; then
        warning "db_migrate 未完全成功，继续测试（依赖应用 init_database 兜底）"
    fi

    cd "$PROJECT_ROOT"
    # V3xx：与 lefthook pre-push / CI 一致，离线模式跑测试（根 .sqlx 已入库）
    export SQLX_OFFLINE=true
    if cargo test --release --workspace 2>&1; then
        success "所有后端测试通过"
        return 0
    else
        error "后端测试失败"
        return 1
    fi
}

# 运行前端测试
# 用法: test_frontend [subcommand] [flags]
#   subcommand: all(default) | unit | component | smoke | coverage | shard:N (N=1..8)
#   flags:      --no-typecheck  跳过前置 tsc --noEmit
# 输出: 染色 summary（Test Files X passed / Tests Y passed），失败时返回非 0
test_frontend() {
    local subcmd="all"
    local do_typecheck=1
    local shard_index=""

    # --- 参数解析（按位置 + 长 flag 混合）---
    local arg
    for arg in "$@"; do
        case "$arg" in
            --no-typecheck)      do_typecheck=0 ;;
            all|unit|component|smoke|coverage)   subcmd="$arg" ;;
            shard:1|shard:2|shard:3|shard:4|shard:5|shard:6|shard:7|shard:8)
                subcmd="shard"
                shard_index="${arg#shard:}"
                ;;
            *)
                warning "未知参数: $arg（已忽略）"
                ;;
        esac
    done

    info "运行前端测试（subcmd=${subcmd}, typecheck=$( [ "$do_typecheck" = "1" ] && echo "ON" || echo "OFF" )）..."

    local pkg_cmd
    pkg_cmd=$(get_pkg_cmd) || return 1
    ensure_frontend_deps "$pkg_cmd" || return 1

    local web_dir="$PROJECT_ROOT/apps/web"
    # 先读取可用 scripts（与 build_frontend 相同防御思路）
    local pkg_scripts
    pkg_scripts=$(cd "$web_dir" && node -e 'console.log(Object.keys(require("./package.json").scripts || {}).join("\n"))' 2>/dev/null || true)
    has_script() {
        local name="$1"
        printf '%s\n' "$pkg_scripts" | grep -Fxq "$name"
    }

    # --- 1) 映射到 package.json 里真实存在的 script ---
    local script_name=""
    case "$subcmd" in
        all)       script_name="test" ;;                       # vitest run (unit + component)
        unit)      script_name="test:unit" ;;
        component) script_name="test:component" ;;
        smoke)     script_name="test:smoke" ;;
        coverage)  script_name="test:coverage" ;;
        shard)
            # 传了 shard:N 就用命名脚本；否则理论上不会进入此分支（上面解析要求数字）
            if [ -n "$shard_index" ]; then
                script_name="test:shard:${shard_index}"
            else
                script_name="test:shard"
            fi
            ;;
    esac

    if [ -z "$script_name" ] || ! has_script "$script_name"; then
        error "apps/web/package.json 未定义脚本: $script_name（可用: test, test:unit, test:component, test:smoke, test:coverage, test:shard:1..8）"
        return 1
    fi

    # --- 2) 前置：typecheck（默认开启）---
    if [ "$do_typecheck" = "1" ]; then
        if has_script "typecheck"; then
            info "  [1/2] 类型检查: $pkg_cmd typecheck"
            local log_typecheck="/tmp/topems-test-frontend-typecheck.log"
            if ! ( cd "$web_dir" && $pkg_cmd typecheck ) >"$log_typecheck" 2>&1; then
                error "类型检查失败（$pkg_cmd typecheck），摘要如下："
                tail -n 30 "$log_typecheck" >&2
                detail "完整日志: $log_typecheck"
                return 1
            fi
            success "  [1/2] 类型检查通过"
        else
            warning "  [1/2] apps/web 未定义 typecheck 脚本，跳过类型检查"
        fi
    else
        info "  [1/2] 已指定 --no-typecheck，跳过类型检查"
    fi

    # --- 3) 实际执行 vitest ---
    local step_label="[2/2]"
    if [ "$do_typecheck" != "1" ]; then step_label="[1/1]"; fi
    local log_test="/tmp/topems-test-frontend-${subcmd}${shard_index:+-$shard_index}.log"
    info "  $step_label 测试: $pkg_cmd run $script_name"
    info "  工作目录: $web_dir"
    info "  完整日志: $log_test"

    local rc=0
    # 用子 shell 包 cd，不污染主进程工作目录
    ( cd "$web_dir" && $pkg_cmd run "$script_name" ) >"$log_test" 2>&1 || rc=$?

    # --- 4) 提取 summary 行（vitest 输出末几行固定模式，含 ANSI 颜色码）---
    # 匹配形如:
    #   Test Files  5 passed (5)
    #   Tests  123 passed (123)
    local test_files_line tests_line
    # 放宽：允许 ANSI 前缀（\e[...m 用 .* 匹配，因为落盘时已经是字面量字节）
    test_files_line=$(grep -E "Test Files.*passed" "$log_test" 2>/dev/null | tail -n 1 || true)
    tests_line=$(grep -E "^.*Tests.*passed" "$log_test" 2>/dev/null | tail -n 1 || true)
    # 清洗 ANSI：删除 \e[...m 序列，保持最终 CLI 清爽
    _strip_ansi() { sed -E 's/\x1B\[[0-9;]*[mK]//g'; }
    if [ -n "$test_files_line" ]; then test_files_line=$(printf '%s' "$test_files_line" | _strip_ansi); fi
    if [ -n "$tests_line" ];      then tests_line=$(printf '%s' "$tests_line" | _strip_ansi); fi

    if [ "$rc" -eq 0 ]; then
        success "前端测试通过"
        if [ -n "$test_files_line" ]; then detail "  $test_files_line"; fi
        if [ -n "$tests_line" ];      then detail "  $tests_line"; fi
        return 0
    fi

    error "前端测试失败（exit=$rc）"
    if [ -n "$test_files_line" ]; then detail "  $test_files_line"; fi
    if [ -n "$tests_line" ];      then detail "  $tests_line"; fi
    detail "失败摘要（日志末 40 行）:"
    tail -n 40 "$log_test" >&2
    detail "完整日志: $log_test"
    return "$rc"
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
        bi|analytics) echo "BI_PORT" ;;
        portal) echo "PORTAL_PORT" ;;
        mobile) echo "MOBILE_PORT" ;;
        gis) echo "GIS_PORT" ;;
        integration) echo "INTEGRATION_PORT" ;;
        search) echo "SEARCH_PORT" ;;
        communication) echo "COMMUNICATION_PORT" ;;
        ticket) echo "TICKET_PORT" ;;
        # [V2026.08 已合并] feedback（原 FEEDBACK_PORT 8087，已合并至 ticket）
        master-data) echo "MASTER_DATA_PORT" ;;
        # [V2026.08 已移除] lowcode（原 LOWCODE_PORT）
        tms) echo "TMS_PORT" ;;
        monitor) echo "MONITOR_PORT" ;;
        plugin-registry) echo "PLUGIN_REGISTRY_PORT" ;;
        *) echo "SERVER_PORT" ;;
    esac
}

_start_service_internal() {
    local service_name=$1
    local port=$2
    local executable_path=$3
    local port_env_var
    port_env_var=$(get_port_env_var "$service_name")

    cd "$PROJECT_ROOT"
    
    if [ "$service_name" = "iam" ]; then
        # port_env_var 对 iam 即 CORE_PORT，无需重复赋值
        env $port_env_var=$port nohup "$executable_path" > "/tmp/topems-${service_name}.log" 2>&1 &
    else
        env SERVER_PORT=$port $port_env_var=$port nohup "$executable_path" > "/tmp/topems-${service_name}.log" 2>&1 &
    fi
    
    echo "$!"
}

start_service() {
    local service_name=$1
    local force=${2:-false}
    local service_path
    service_path=$(get_service_path "$service_name")
    local port
    port=$(get_service_port "$service_name")

    [ -z "$service_path" ] && error "服务 $service_name 不存在" && return 1
    [ -z "$port" ] && error "无法获取服务 $service_name 的端口" && return 1

    info "启动 $service_name 服务..."

    if check_port $port; then
        local pid
        pid=$(get_service_pid "$service_name" "$port")
        if [ -n "$pid" ]; then
            warning "$service_name 服务已在运行 (PID: $pid, 端口: $port)"
            [ "$force" = "true" ] && { info "强制重启..."; stop_service "$service_name"; } || return 0
        else
            warning "端口 $port 已被占用"
            [ "$force" = "true" ] || { info "使用 --force 强制清理端口"; return 1; }
        fi
    fi

    local executable_name
    executable_name=$(get_executable_name "$service_name")
    local executable_path="$PROJECT_ROOT/target/release/${executable_name}"
    
    if [ -n "$executable_name" ] && ps aux | grep -v grep | grep -q "$executable_name" && [ "$executable_name" != "topems-unified-core" ]; then
        local other_service
        other_service=$(echo "$SERVICES_CONFIG" | grep -v "^${service_name} " | grep " ${executable_name} " | awk '{print $1}')
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

        # 轮询等待端口就绪：固定 sleep 3 对冷启动含 schema 自检的服务（unified-core ~18s）
        # 必然误判失败，并在重试时 kill -9 正在迁移的进程。改为最长等待 READY_TIMEOUT，
        # 端口绑定即成功；进程提前退出则立即跳出重试，避免空等。
        local waited=0 ready=0
        while [ $waited -lt $READY_TIMEOUT ]; do
            if check_port $port; then ready=1; break; fi
            if ! kill -0 "$pid" 2>/dev/null; then break; fi
            sleep 2
            waited=$((waited + 2))
        done

        if [ $ready -eq 1 ]; then
            success "$service_name 服务启动成功 (PID: $pid, 端口: $port, 就绪耗时 ${waited}s)"

            if [ "$service_name" != "iam" ]; then
                if ! register_plugin "$service_name"; then
                    echo "$service_name" >> /tmp/topems-register-failed.log
                fi
            fi

            return 0
        else
            local failed_pid
            failed_pid=$(get_service_pid "$service_name" "$port")
            if [ -n "$failed_pid" ]; then
                kill -9 $failed_pid 2>/dev/null || true
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
    local port
    port=$(get_service_port "$service_name")
    [ -z "$port" ] && error "无法获取服务 $service_name 的端口" && return 1

    info "停止 $service_name 服务..."
    if check_port $port; then
        local pid
        pid=$(get_service_pid "$service_name" "$port")
        if [ -n "$pid" ]; then
            if _is_windows; then taskkill //F //PID "$pid" >/dev/null 2>&1 || true; else kill $pid 2>/dev/null || true; fi
            sleep 1
            if ! check_port $port; then
                success "$service_name 服务已停止"
                return 0
            else
                if _is_windows; then taskkill //F //PID "$pid" >/dev/null 2>&1 || true; else kill -9 $pid 2>/dev/null || true; fi
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
    local port
    port=$(get_service_port "$service_name")
    [ -z "$port" ] && { echo -e "${RED}❌ $service_name: 无法获取端口${NC}"; return 1; }

    if check_port $port; then
        local pid
        pid=$(get_service_pid "$service_name" "$port")
        if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
            echo -e "${GREEN}✅${NC} $service_name (端口 $port) 运行中 (PID: $pid) [健康]"
        else
            echo -e "${YELLOW}⚠️${NC} $service_name (端口 $port) 运行中 (PID: $pid) [健康检查失败]"
        fi
    else
        local executable_name
        executable_name=$(get_executable_name "$service_name")
        if [ -n "$executable_name" ] && ps aux | grep -v grep | grep -q "$executable_name" && [ "$executable_name" != "topems-unified-core" ]; then
            local provider
            provider=$(echo "$SERVICES_CONFIG" | grep -v "^${service_name} " | grep " ${executable_name} " | awk '{print $1}')
            if [ -n "$provider" ]; then
                local provider_port
                provider_port=$(get_service_port "$provider")
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

# 等待 plugin-registry 的插件注册接口就绪
# 返回: 0=就绪, 1=未就绪
_wait_for_plugin_registry() {
    local registry_url="http://localhost:8096"
    local max_wait=15
    local interval=1
    local waited=0

    while [ $waited -lt $max_wait ]; do
        local health
        health=$(curl -s -o /dev/null -w "%{http_code}" "$registry_url/health" 2>/dev/null || echo "000")
        if [ "$health" = "200" ]; then
            local test_resp
            test_resp=$(curl -s -o /dev/null -w "%{http_code}" "$registry_url/dev/runtime/ping/register" 2>/dev/null || echo "000")
            if [ "$test_resp" != "000" ]; then
                return 0
            fi
        fi
        sleep $interval
        waited=$((waited + interval))
    done
    return 1
}

# 安全解析 JSON 字段（失败返回默认值）
_safe_json_field() {
    local json="$1"
    local field="$2"
    local default="${3:-}"
    local py_cmd=""
    # runtime probe: python3 may be a silent Microsoft Store stub on Windows/Git Bash
    if command -v python3 >/dev/null 2>&1 && echo '{}' | python3 -c "import sys,json" >/dev/null 2>&1; then
        py_cmd=python3
    elif command -v python >/dev/null 2>&1 && echo '{}' | python -c "import sys,json" >/dev/null 2>&1; then
        py_cmd=python
    fi
    if [ -n "$py_cmd" ]; then
        echo "$json" | "$py_cmd" -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('$field', '$default'))
except Exception:
    print('$default')
" 2>/dev/null || echo "$default"
    else
        echo "$default"
    fi
}

# 服务注册到 plugin-registry（含重试与指数退避）
register_plugin() {
    local service_name=$1
    local port
    port=$(get_service_port "$service_name")
    [ -z "$port" ] && return

    local registry_url="http://localhost:8096"
    local max_retries=5
    local initial_delay=2
    local max_delay=30

    local service_display_name
    service_display_name=$(get_service_display_name "$service_name")
    local description
    description=$(get_service_description "$service_name")
    local runtime_url="http://localhost:$port"
    local plugin_token="${PLUGIN_REGISTRATION_TOKEN:-}"

    local attempt=1
    local delay=$initial_delay

    while [ $attempt -le $max_retries ]; do
        if [ $attempt -eq 1 ]; then
            if ! _wait_for_plugin_registry; then
                warning "plugin-registry 注册接口未就绪，$service_name 跳过注册（将在全部启动后重试）"
                return 1
            fi
        else
            sleep $delay
            delay=$((delay * 2))
            [ $delay -gt $max_delay ] && delay=$max_delay
        fi

        detail "注册 $service_name (第 $attempt/$max_retries 次)..."

        local token_header=""
        [ -n "$plugin_token" ] && token_header="-H \"X-Plugin-Token: $plugin_token\""

        # Windows/Git Bash: payload via temp file to avoid MSYS arg mangling of UTF-8
        local tmp_body
        tmp_body=$(mktemp /tmp/topems-register-body.XXXXXX 2>/dev/null || mktemp 2>/dev/null)
        cat > "$tmp_body" <<JSON
{
    "code": "${service_name}",
    "name": "${service_display_name}",
    "description": "${description}",
    "version": "0.1.0",
    "runtime_url": "${runtime_url}",
    "permissions": [],
    "category": "business"
}
JSON

        local response
        # curl 在连接失败时返回非零（如 exit 7=连接拒绝），set -e 会直接退出函数，
        # 导致 L1082 的空响应兜底分支不可达；用 || true 确保 curl 失败不触发 set -e
        response=$(eval curl -s --connect-timeout 5 --max-time 10 -X POST \
            "\"$registry_url/dev/runtime/${service_name}/register\"" \
            -H "\"Content-Type: application/json\"" \
            $token_header \
            -d "@$tmp_body" 2>/dev/null || true)
        rm -f "$tmp_body"

        if [ -z "$response" ]; then
            attempt=$((attempt + 1))
            continue
        fi

        local success
        success=$(_safe_json_field "$response" "success" "False")

        if [ "$success" = "True" ]; then
            success "$service_name 注册成功"
            # 从失败列表中移除（如果之前标记过）
            if [ -f /tmp/topems-register-failed.log ]; then
                grep -vx "$service_name" /tmp/topems-register-failed.log > /tmp/topems-register-failed.tmp 2>/dev/null
                mv /tmp/topems-register-failed.tmp /tmp/topems-register-failed.log 2>/dev/null
            fi
            return 0
        else
            local msg
            msg=$(_safe_json_field "$response" "message" "")
            if [ -n "$msg" ] && [ "$msg" != "" ]; then
                warning "$service_name 注册失败: $msg"
            fi
        fi

        attempt=$((attempt + 1))
    done

    warning "$service_name 注册失败（已重试 $max_retries 次），将在全部服务启动后再次尝试"
    return 1
}

# 批量注册所有服务到 plugin-registry
# 用法: ./scripts/topems.sh register-all
register_all_plugins() {
    local registry_url="http://localhost:8096"
    local -a services_to_register=()
    local success_count=0
    local fail_count=0

    if ! _wait_for_plugin_registry; then
        error "plugin-registry 注册接口未就绪，请先启动服务"
        return 1
    fi

    info "批量注册所有服务到 plugin-registry..."
    for service in $(get_all_services); do
        if echo "$CORE_SERVICES" | grep -wq "$service"; then
            continue
        fi
        local port
        port=$(get_service_port "$service")
        if check_port "$port"; then
            services_to_register+=("$service")
        else
            warning "$service 未运行，跳过注册"
        fi
    done

    info "待注册 ${#services_to_register[@]} 个服务..."
    for svc in "${services_to_register[@]}"; do
        if register_plugin "$svc"; then
            success_count=$((success_count + 1))
        else
            fail_count=$((fail_count + 1))
        fi
    done

    echo ""
    info "注册汇总: 成功 $success_count, 失败 $fail_count"
    [ $fail_count -eq 0 ] && success "所有服务注册完成 ✅" || warning "部分服务注册失败"
    return $fail_count
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
        tms) echo "运输管理" ;;
        communication) echo "通讯服务" ;;
        master-data) echo "主数据服务" ;;
        search) echo "搜索服务" ;;
        ticket) echo "工单服务" ;;
        # [V2026.08 已移除] lowcode（原低代码平台）
        # 注意：\U 是 GNU sed 扩展，macOS BSD sed 不支持，改用 awk toupper
        *) echo "$1" | awk '{print toupper(substr($0,1,1)) substr($0,2) "服务"}' ;;
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
        tms) echo "运输管理服务" ;;
        communication) echo "IM/通知/邮件/短信等通讯能力统一服务" ;;
        master-data) echo "企业级主数据统一管理服务" ;;
        search) echo "Elasticsearch全文检索与搜索聚合服务" ;;
        ticket) echo "工单与服务请求流程引擎服务" ;;
        # [V2026.08 已移除] lowcode（原低代码应用搭建与表单引擎平台）
        # 注意：\U 是 GNU sed 扩展，macOS BSD sed 不支持，改用 awk toupper
        *) echo "$1" | awk '{print toupper(substr($0,1,1)) substr($0,2) "服务"}' ;;
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
        local port
        port=$(get_service_port "$service")
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

    for service in $CORE_SERVICES; do
        local port
        port=$(get_service_port "$service")
        local elapsed=0
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
    _preflight_check "$@" || return 1
    local extra_opts="$*"
    # 剥掉 --skip-preflight 避免透传给子函数
    local filtered_opts=""
    for opt in $extra_opts; do [ "$opt" != "--skip-preflight" ] && filtered_opts="$filtered_opts $opt"; done
    extra_opts="$filtered_opts"
    # V3xx SQLx 缓存新鲜度门禁：缓存与当前代码匹配才启动（--skip-sqlx-check 可跳过）
    _check_sqlx_cache_freshness $extra_opts || return 1
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
    local register_failed_log="/tmp/topems-register-failed.log"
    rm -f "$register_failed_log"

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

    # 核心服务启动后，主动等待 plugin-registry 注册接口就绪
    if [ "$no_register" = "0" ]; then
        info "等待 plugin-registry 注册接口就绪..."
        if _wait_for_plugin_registry; then
            success "plugin-registry 注册接口已就绪"
        else
            warning "plugin-registry 注册接口未就绪，注册将在服务启动后自动重试"
        fi
    fi

    if [ "$only_core" = "1" ]; then
        info "========== --only-core 指定，仅启动核心服务，退出 =========="
    else
        info "========== [2/3] 启动其他服务 =========="
        local -a svc_start_order=()
        for service in $(get_all_services); do
            if echo "$CORE_SERVICES" | grep -wq "$service"; then
                continue
            fi
            local skip_this=0
            for s in $skip_packages; do
                [ "$service" = "$s" ] && skip_this=1 && break
            done
            [ $skip_this -eq 1 ] && continue
            svc_start_order+=("$service")
        done

        for service in "${svc_start_order[@]}"; do
            if start_service "$service"; then
                success_count=$((success_count + 1))
            else
                fail_count=$((fail_count + 1))
            fi
        done

        # 全部服务启动后，统一重试注册失败的服务
        if [ "$no_register" = "0" ] && [ -f "$register_failed_log" ] && [ -s "$register_failed_log" ]; then
            local failed_count
            failed_count=$(wc -l < "$register_failed_log" | tr -s ' ' | xargs)
            echo ""
            info "========== [2b/3] 重试注册失败的服务 ($failed_count 个) =========="
            while IFS= read -r svc; do
                [ -z "$svc" ] && continue
                if register_plugin "$svc"; then
                    success "$svc 重新注册成功"
                else
                    warning "$svc 重新注册仍失败"
                fi
            done < "$register_failed_log"
        fi
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
    rm -f /tmp/topems-register-failed.log
}

# 启动开发环境（macOS）
# shellcheck disable=SC2120
start_dev_macos() {
    _preflight_check "$@" || return 1
    # V3xx SQLx 缓存新鲜度门禁（--skip-sqlx-check / SQLX_CHECK_SKIP=1 可跳过）
    _check_sqlx_cache_freshness "$@" || return 1
    info "启动 macOS 开发环境..."

    check_command() {
        if ! command -v "$1" &> /dev/null; then
            error "$1 未安装"
            return 1
        fi
    }

    check_command "cargo" || return 1
    check_command "node" || return 1
    local pkg_cmd
    pkg_cmd=$(get_pkg_cmd) || return 1
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
        # stdin=/dev/null 避免 TTY 关闭导致 Vite readline 触发 EIO 崩溃
        cd "$PROJECT_ROOT/apps/web" && \
            nohup "$pkg_cmd" run dev -- \
                --port 3000 \
                --host "${FRONTEND_BIND_HOST:-::}" \
                < /dev/null \
                > "/tmp/topems-web.log" 2>&1 &
        cd - > /dev/null
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
    if _is_windows; then
        # Windows/Git Bash：用 PowerShell 按命令行匹配 vite/tsc
        powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | Where-Object { \$_.CommandLine -match 'vite|tsc' -and \$_.CommandLine -match 'apps.web|topems-web' } | Select-Object -ExpandProperty ProcessId" 2>/dev/null | tr -d '\r'
    else
        ps aux | grep -v grep \
            | grep -E "(vite|tsc.*watch|topems-web\.log)" \
            | grep -E "(apps/web|$PROJECT_ROOT/apps/web)" \
            | awk '{print $2}' | sort -u | head -5
    fi
}

# 启动前端服务（带轮询等待，避免静态 sleep 5 与实际端口就绪不一致）
start_frontend() {
    info "启动前端服务..."

    local pkg_cmd
    pkg_cmd=$(get_pkg_cmd) || return 1
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
        # 用 nohup + stdin=/dev/null 脱离 TTY，防止 TTY 关闭后 Vite readline 读到 EIO 崩溃
        # 使用 -- 透传参数到 vite（pnpm 自身参数不会误传入 vite）
        cd "$PROJECT_ROOT/apps/web" && \
            nohup "$pkg_cmd" run dev -- \
                --port 3000 \
                --host "${FRONTEND_BIND_HOST:-::}" \
                < /dev/null \
                > "/tmp/topems-web.log" 2>&1 &
        cd - > /dev/null
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
    port_pid=$(get_port_pid 3000)
    # 再按进程名杀（仍在编译、端口未开的 vite/tsc 进程）
    local proc_pid
    proc_pid=$(get_frontend_pid)
    local all_pid
    all_pid=$(echo "$port_pid $proc_pid" | tr ' ' '\n' | sort -u | grep -v "^$")

    if [ -n "$all_pid" ]; then
        if _is_windows; then
            # Windows：MSYS kill 对原生 node.exe 无效，使用 taskkill 强杀
            for p in $all_pid; do taskkill //F //PID "$p" >/dev/null 2>&1 || true; done
            sleep 1
        else
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
        # shellcheck disable=SC2046
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
        local name
        name=$(echo "$endpoint" | cut -d: -f1)
        local path
        path=$(echo "$endpoint" | cut -d: -f2)
        local port
        port=$(echo "$endpoint" | cut -d: -f3)
        
        local backend_running=false
        if check_port $port; then
            backend_running=true
        fi
        
        if [ "$frontend_running" = true ]; then
            local proxy_status
            proxy_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 \
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
            local backend_status
            backend_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 \
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
    detail "详细文档: docs/developer/standards/websocket-path-mapping.md"
}

# =============================================
# 数据库管理
# =============================================

# 解析 DATABASE_URL 获取数据库连接信息
parse_database_url() {
    local db_url=${DATABASE_URL:-"postgres://topems:topems_secret@localhost:5432/topems"}
    # 格式: postgres://user:password@host:port/database
    DB_USER=$(echo "$db_url" | sed -n 's|postgres://\([^:]*\):.*|\1|p')
    DB_PASSWORD=$(echo "$db_url" | sed -n 's|postgres://[^:]*:\([^@]*\)@.*|\1|p')
    DB_HOST=$(echo "$db_url" | sed -n 's|.*@\([^:]*\):.*|\1|p')
    DB_PORT=$(echo "$db_url" | sed -n 's|.*@.*:\([0-9]*\)/.*|\1|p')
    DB_NAME=$(echo "$db_url" | sed -n 's|.*/\([^/]*\)$|\1|p')
    DB_USER=${DB_USER:-topems}
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    DB_NAME=${DB_NAME:-topems}
}

# =============================================
# 数据库/缓存状态检查（跨平台：Windows/Git Bash · Linux · macOS）
# =============================================

# 定位 psql（跨平台）：PATH → 常见安装目录
find_psql_bin() {
    local p
    p=$(command -v psql 2>/dev/null)
    if [ -z "$p" ] && _is_windows; then
        for pg_dir in "/c/Program Files/PostgreSQL"/*/bin "/d/Program Files/PostgreSQL"/*/bin "/e/Program Files/PostgreSQL"/*/bin; do
            if [ -x "$pg_dir/psql" ]; then p="$pg_dir/psql"; break; fi
        done
    fi
    [ -n "$p" ] && echo "$p"
}

# 分层检查 PostgreSQL 是否就绪（跨平台）
# 第一层 pg_isready（官方工具，最快；0=接受连接 1=拒绝连接 2=无响应）
# 缺失时回退 psql SELECT 1
# 返回: 0=接受连接 1=运行中但拒绝 2=未运行/无响应
db_is_ready() {
    parse_database_url
    local psql_cmd=${PSQL_BIN:-$(find_psql_bin)}
    local pg_isready_cmd=""
    if command -v pg_isready &>/dev/null; then
        pg_isready_cmd="pg_isready"
    elif [ -n "$psql_cmd" ]; then
        local pi
        pi="$(dirname "$psql_cmd")/pg_isready"
        [ -x "$pi" ] && pg_isready_cmd="$pi"
    fi

    if [ -n "$pg_isready_cmd" ]; then
        "$pg_isready_cmd" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1
        local code=$?
        case $code in
            0) return 0 ;;
            1) return 1 ;;
            *) return 2 ;;
        esac
    fi

    if [ -n "$psql_cmd" ] && PGPASSWORD=$DB_PASSWORD "$psql_cmd" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        return 0
    fi
    return 2
}

# 定位 redis-cli（跨平台）：PATH → 常见安装目录
find_redis_cli() {
    local rcli
    rcli=$(command -v redis-cli 2>/dev/null)
    if [ -z "$rcli" ] && _is_windows; then
        for rdir in "/e/ZenTao/bin/redis" "/c/Program Files/Redis" "/d/Program Files/Redis" "/c/Program Files/Memurai"; do
            if [ -x "$rdir/redis-cli.exe" ]; then rcli="$rdir/redis-cli.exe"; break; fi
        done
    fi
    [ -n "$rcli" ] && echo "$rcli"
}

# 从 REDIS_URL 提取密码（无密码输出空）
redis_auth_arg() {
    [ -n "$REDIS_URL" ] && echo "$REDIS_URL" | sed -n 's|redis://:\([^@]*\)@.*|\1|p'
}

# Redis 是否就绪（带密码 ping，跨平台）
redis_is_ready() {
    local rcli
    rcli=$(find_redis_cli)
    [ -z "$rcli" ] && return 2
    local rpass
    rpass=$(redis_auth_arg)
    if [ -n "$rpass" ]; then
        "$rcli" -a "$rpass" ping >/dev/null 2>&1
    else
        "$rcli" ping >/dev/null 2>&1
    fi
}

# 启动 PostgreSQL
db_start() {
    info "启动 PostgreSQL..."
    if command -v brew &> /dev/null; then
        local pg_version
        pg_version=$(brew list | grep -E '^postgresql@[0-9]+$' | sort -r | head -1)
        if [ -n "$pg_version" ]; then
            brew services start "$pg_version" 2>/dev/null
        else
            brew services start postgresql 2>/dev/null
        fi
        sleep 2
    elif command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql 2>/dev/null || true
    elif _is_windows; then
        # Windows/Git Bash：PostgreSQL 通常已注册为 Windows 服务，仅需探测 psql
        local psql_bin
        psql_bin=$(find_psql_bin)
        if [ -z "$psql_bin" ]; then
            error "未找到 psql，请安装 PostgreSQL 并将其 bin 目录加入 PATH（或使用 topems.ps1）"
            return 1
        fi
        PSQL_BIN="$psql_bin"
    fi

    parse_database_url
    db_is_ready
    local rc=$?
    if [ "$rc" -eq 0 ]; then
        success "PostgreSQL 已启动"
        return 0
    elif [ "$rc" -eq 1 ]; then
        warn "PostgreSQL 运行中但拒绝新连接（连接数可能已满或正在恢复），请检查 max_connections"
        return 1
    else
        error "PostgreSQL 未启动（端口 ${DB_PORT} 无响应）"
        return 1
    fi
}

# 停止 PostgreSQL
db_stop() {
    info "停止 PostgreSQL..."
    if _is_windows; then
        # Windows：PostgreSQL 是系统服务，脚本不管理其生命周期
        warn "Windows 下 PostgreSQL 由系统服务管理，请用管理员终端执行: Stop-Service postgresql-x64-* -Force"
        return 1
    fi
    if command -v brew &> /dev/null; then
        local pg_version
        pg_version=$(brew list | grep -E '^postgresql@[0-9]+$' | sort -r | head -1)
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
    local psql_cmd=${PSQL_BIN:-$(find_psql_bin)}
    info "=== PostgreSQL 状态 ==="
    db_is_ready
    local rc=$?
    if [ "$rc" -eq 0 ]; then
        success "PostgreSQL 运行中并接受连接"
        [ -n "$psql_cmd" ] && PGPASSWORD=$DB_PASSWORD "$psql_cmd" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" 2>/dev/null | head -1
        case "$(detect_os)" in
            windows)
                local pid
                pid=$(netstat -ano 2>/dev/null | grep -E "[:.]${DB_PORT} .*LISTENING" | awk '{print $NF}' | sort -u | head -1)
                [ -n "$pid" ] && detail "端口 ${DB_PORT} 由 postgres (PID ${pid}) 监听"
                ;;
            linux)
                local act
                act=$(systemctl is-active postgresql 2>/dev/null || true)
                [ -n "$act" ] && detail "systemd 服务状态: ${act}"
                ;;
            darwin)
                local brewst
                brewst=$(brew services list 2>/dev/null | grep -iE 'postgres' | head -1 || true)
                [ -n "$brewst" ] && detail "${brewst}"
                ;;
        esac
    elif [ "$rc" -eq 1 ]; then
        warn "PostgreSQL 运行中但拒绝新连接（连接数可能已满或正在恢复）"
    else
        error "PostgreSQL 未运行（端口 ${DB_PORT} 无响应）"
    fi

    echo ""
    info "=== Redis 状态 ==="
    if redis_is_ready; then
        local rcli
        rcli=$(find_redis_cli)
        local rpass
        rpass=$(redis_auth_arg)
        local rver=""
        if [ -n "$rpass" ]; then
            rver=$("$rcli" -a "$rpass" info server 2>/dev/null | grep "redis_version" | head -1)
        else
            rver=$("$rcli" info server 2>/dev/null | grep "redis_version" | head -1)
        fi
        success "Redis 运行中"
        [ -n "$rver" ] && detail "Redis 版本: ${rver#redis_version:}"
    else
        error "Redis 未运行或认证失败（请检查 REDIS_URL 与 redis-server）"
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

    local redis_cli
    redis_cli=$(find_redis_cli)
    if [ -z "$redis_cli" ]; then
        error "未找到 redis-cli，请安装 Redis 并将其 bin 目录加入 PATH（或使用 topems.ps1）"
        return 1
    fi
    if redis_is_ready; then
        success "Redis 已启动"
        return 0
    else
        error "Redis 启动失败（ping 不通或认证失败）"
        return 1
    fi
}

# 停止 Redis
redis_stop() {
    info "停止 Redis..."
    if _is_windows; then
        warn "Windows 下 Redis 由系统服务/禅道等自带进程管理，请自行停止对应服务或进程（脚本不代为停止）"
        return 1
    fi
    if command -v brew &> /dev/null; then
        brew services stop redis 2>/dev/null
    elif command -v systemctl &> /dev/null; then
        sudo systemctl stop redis 2>/dev/null || true
    fi
    success "Redis 已停止"
}

# 数据库迁移
db_migrate() {
    info "运行数据库迁移（统一入口 scripts/migrate.sh）..."
    cd "$PROJECT_ROOT"

    load_env
    parse_database_url

    # 收敛为 migrate.sh 唯一入口（sqlx-cli 优先、psql fallback 结构与 sqlx 对齐）：
    # 扫描 database/migrations + svc/*/migrations，失败返回非零（不误记账、不静默空转）
    if ! command -v psql >/dev/null 2>&1 && ! command -v sqlx >/dev/null 2>&1; then
        error "未找到 psql/sqlx-cli，请安装 PostgreSQL 客户端后重试"
        return 1
    fi

    export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    bash "$PROJECT_ROOT/scripts/migrate.sh" run
    return $?
}

# ==============================================================================
# Schema 防御自检（V69.2）
#
# 退出码语义：
#   0 = 全部通过（0 WARN / 0 ERROR）
#   1 = 有警告（存在 仍缺失 X 列 的 WARN）
#   2 = 有错误（编译失败 / 服务启动失败 / 没找到 defense 日志 等）
# ==============================================================================

# 跨平台 timeout 包装：优先系统 timeout(Linux) / gtimeout(macOS brew coreutils)，
# 均不可用时用 bash 后台进程 + sleep + TERM/KILL 兜底模拟。
#
# 用法: _timeout <seconds> <cmd...>
# 始终将 stdout/stderr 捕获到当前 shell 中；到达秒数强制终止。
_timeout() {
    local secs="$1"; shift
    if command -v timeout >/dev/null 2>&1; then
        timeout --kill-after=2 "$secs" "$@"
        return $?
    fi
    if command -v gtimeout >/dev/null 2>&1; then
        gtimeout --kill-after=2 "$secs" "$@"
        return $?
    fi
    # Bash 原生兜底：后台跑 + sleep + TERM（2秒后补KILL）
    local pid
    ( "$@" ) &
    pid=$!
    (
        sleep "$secs"
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" 2>/dev/null || true
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
    ) &
    local watcher=$!
    wait "$pid" 2>/dev/null
    local rc=$?
    wait "$watcher" 2>/dev/null || true
    # TERM/KILL 子进程时 wait 返回 128+sig 或其它，但我们只关心程序跑完没
    return $rc
}

defense_check_color() {
    # 根据退出码染色打印
    local code="$1"
    local svc="$2"
    local detail="$3"
    case "$code" in
        0) success "[✓ PASS] $svc  —  $detail" ;;
        1) warning "[⚠ WARN] $svc  —  $detail" ;;
        *) error   "[✗ FAIL] $svc  —  $detail" ;;
    esac
}

# 单个服务的 defense-check：
#   1) 先尝试 cargo check（缺则 warn 不中断）
#   2) 启动该服务 10 秒捕获启动日志
#   3) grep [svc schema 自检] 和 仍缺失列 关键字
#   返回: 0/1/2
db_defense_check() {
    local svc="$1"
    if [ -z "$svc" ]; then
        error "用法: topems.sh db defense-check <service>  例如: topems db defense-check ehs"
        echo "示例: ./scripts/topems.sh db defense-check gis"
        echo "      ./scripts/topems.sh db defense-check-all"
        exit 2
    fi

    local svc_dir="$PROJECT_ROOT/svc/$svc"
    if [ ! -d "$svc_dir" ]; then
        defense_check_color 2 "$svc" "目录 svc/$svc 不存在（请确认拼写）"
        return 2
    fi

    local rc=0
    local detail_parts=()

    # 阶段A: 编译存在性（强制项，但失败不退出）
    # 优先方案：预热后 target/debug/<pkg> 已存在 → 跳过 cargo check，复用已编译的二进制
    # 兜底方案：target 下缺失 → 用 cargo check -p 在 PROJECT_ROOT 下跑（共用 workspace target）
    local pkg_name="topems-${svc}"
    local bin_path="$PROJECT_ROOT/target/debug/${pkg_name}"
    info "[$svc] 编译检查..."
    if [ -x "$bin_path" ]; then
        detail_parts+=("build=SKIP（预热二进制已就绪 ${bin_path}）")
    elif (cd "$PROJECT_ROOT" && cargo check --offline -p "$pkg_name" 2>&1) \
        >/tmp/defense-check-${svc}-build.log 2>&1; then
        detail_parts+=("build=OK")
    else
        detail_parts+=("build=FAIL（见 /tmp/defense-check-${svc}-build.log）")
        rc=2
    fi

    # 阶段B: 捕获 15 秒启动日志，grep schema 自检段
    # 直接运行 target/debug/<pkg>（不经过 cargo run），避免每次再触发重编译耗时
    local log_tmp="/tmp/defense-check-${svc}-start.log"
    info "[$svc] 启动 15s 捕获 schema 自检日志（需要 DB 已运行）..."
    load_env 2>/dev/null || true
    if [ -x "$bin_path" ]; then
        (_timeout 15 "$bin_path" || true) > "$log_tmp" 2>&1 || true
    else
        (_timeout 15 "$SHELL" -c "cd '$PROJECT_ROOT' && cargo run --offline -p '$pkg_name' 2>&1" || true) \
            > "$log_tmp" 2>&1 || true
    fi

    # grep 迁移日志
    local stage1_line
    stage1_line=$(grep -E "增量迁移.*完成.*张表" "$log_tmp" 2>/dev/null | tail -1 || true)
    local stage2_line
    stage2_line=$(grep -E "schema 自检.*完成" "$log_tmp" 2>/dev/null | tail -1 || true)
    local warn_lines
    warn_lines=$(grep -E "仍缺失.*列" "$log_tmp" 2>/dev/null || true)

    if [ -z "$stage1_line" ] && [ -z "$stage2_line" ] && [ $rc -ne 2 ]; then
        # 既没 build 失败，也没自检日志 —— 说明该服务还没落地 TABLE_DEFS 防御
        detail_parts+=("defense=N/A（该服务尚未实现 TABLE_DEFS + 两阶段自检，请纳入下一批推进）")
        rc=1
    else
        # 统计表数 / 列数
        local t_count c_count
        t_count=$(echo "$stage1_line" | grep -oE "[0-9]+ 张表" | grep -oE "[0-9]+" | head -1)
        c_count=$(echo "$stage1_line" | grep -oE "[0-9]+ 列" | grep -oE "[0-9]+" | head -1)
        [ -z "$t_count" ] && t_count=0
        [ -z "$c_count" ] && c_count=0
        local miss_count
        miss_count=$(printf '%s' "$warn_lines" | grep -c "仍缺失" 2>/dev/null || true)
        [ -z "$miss_count" ] && miss_count=0

        detail_parts+=("tables=$t_count cols=$c_count missing-tables=$miss_count")
        if [ "$miss_count" -gt 0 ] && [ $rc -eq 0 ]; then
            rc=1
        fi
    fi

    # 输出最终染色行 + 明细（WARN 时附具体缺列表）
    defense_check_color $rc "$svc" "$(IFS=" | "; echo "${detail_parts[*]}")"
    if [ $rc -eq 1 ] && [ -n "$warn_lines" ]; then
        echo "$warn_lines" | sed 's/^/         └─  /'
    fi
    return $rc
}

db_defense_check_all() {
    info "全量 Schema 防御自检：遍历 svc/*（无需 DB / 无需前台启动）"
    echo "===================================================================="
    local total=0 pass=0 warn=0 fail=0
    # 第1批（已落地，P0）
    local b1_total=0 b1_pass=0 b1_warn=0 b1_fail=0
    for svc in gis ehs portal finance; do
        b1_total=$((b1_total + 1)); total=$((total + 1))
        if db_defense_check "$svc"; then pass=$((pass + 1)); b1_pass=$((b1_pass + 1))
        else
            local exit_code=$?
            local rc=$exit_code
            case "$rc" in
                1) warn=$((warn + 1)); b1_warn=$((b1_warn + 1)) ;;
                *) fail=$((fail + 1)); b1_fail=$((b1_fail + 1)) ;;
            esac
        fi
        echo "--------------------------------------------------------------------"
    done
    echo
    info "第1批（核心4服务）汇总：通过 $b1_pass / 警告 $b1_warn / 失败 $b1_fail （共 ${b1_total} 服务）"
    echo
    # 第2批（高频业务11服务 — V69.3 shared-db 抽象，已落地）
    local b2_total=0 b2_pass=0 b2_warn=0 b2_fail=0
    for svc in erp hrm crm pm scm wms srm pdm mes qms lims; do
        b2_total=$((b2_total + 1)); total=$((total + 1))
        if db_defense_check "$svc"; then pass=$((pass + 1)); b2_pass=$((b2_pass + 1))
        else
            local exit_code=$?
            local rc=$exit_code
            case "$rc" in
                1) warn=$((warn + 1)); b2_warn=$((b2_warn + 1)) ;;
                *) fail=$((fail + 1)); b2_fail=$((b2_fail + 1)) ;;
            esac
        fi
        echo "--------------------------------------------------------------------"
    done
    echo
    info "第2批（高频业务11服务）汇总：通过 $b2_pass / 警告 $b2_warn / 失败 $b2_fail （共 ${b2_total} 服务）"
    echo
    # 第3批（业务5服务 — V69.3 shared-db 抽象，已落地）
    local batch3="ai rd ticket plugin-registry mobile"
    local b3_total=0 b3_pass=0 b3_warn=0 b3_fail=0
    for svc in $batch3; do
        b3_total=$((b3_total + 1)); total=$((total + 1))
        if db_defense_check "$svc"; then pass=$((pass + 1)); b3_pass=$((b3_pass + 1))
        else
            local exit_code=$?
            local rc=$exit_code
            case "$rc" in
                1) warn=$((warn + 1)); b3_warn=$((b3_warn + 1)) ;;
                *) fail=$((fail + 1)); b3_fail=$((b3_fail + 1)) ;;
            esac
        fi
        echo "--------------------------------------------------------------------"
    done
    echo
    info "第3批（业务5服务 — V69.3 shared-db 抽象）汇总：通过 $b3_pass / 警告 $b3_warn / 失败 $b3_fail （共 ${b3_total} 服务）"
    echo
    # 第4批（平台5服务 — V69.3 shared-db 抽象，已落地）
    local batch4="unified-core integration master-data communication analytics"
    local b4_total=0 b4_pass=0 b4_warn=0 b4_fail=0
    for svc in $batch4; do
        b4_total=$((b4_total + 1)); total=$((total + 1))
        if db_defense_check "$svc"; then pass=$((pass + 1)); b4_pass=$((b4_pass + 1))
        else
            local exit_code=$?
            local rc=$exit_code
            case "$rc" in
                1) warn=$((warn + 1)); b4_warn=$((b4_warn + 1)) ;;
                *) fail=$((fail + 1)); b4_fail=$((b4_fail + 1)) ;;
            esac
        fi
        echo "--------------------------------------------------------------------"
    done
    echo
    info "第4批（平台5服务 — V69.3 shared-db 抽象）汇总：通过 $b4_pass / 警告 $b4_warn / 失败 $b4_fail （共 ${b4_total} 服务）"
    echo
    # 骨架服务（无 DB 表，跳过）— monitor / search
    # [V2026.08 已移除] lowcode（原骨架服务）
    info "骨架服务（无 DB 表，已排除）：monitor search"
    echo "===================================================================="
    info "全量汇总（共 ${total} 服务）：通过 $pass / 警告 $warn / 失败 $fail"
    echo "Exit codes: 0=全通过  1=有警告(缺列)  2=有错误(build/启动)"
    local overall=0
    [ $warn -gt 0 ] && overall=1
    [ $fail -gt 0 ] && overall=2
    return $overall
}

# 备份数据库
db_backup() {
    local backup_dir="$PROJECT_ROOT/backups"
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
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
        if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$backup_file" 2>&1; then
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
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" < "$backup_file"
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
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
    success "数据库重置完成"
}

# =============================================
# 一键运行/停止
# =============================================

# 一键运行：启动依赖 + 所有服务
run_all() {
    _preflight_check "$@" || return 1
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

# =============================================
# 清理/预检 公共工具函数（供 clean_project 和 _preflight_check 共用）
# =============================================

# kill 后台 cargo-(llvm-cov|test|bench|build) 进程
# 用法: _kill_background_cargo [--dry-run]
# 返回: 0=无进程或已清理, 1=dry-run 预览
_kill_background_cargo() {
    local dry_run=false
    [ "$1" = "--dry-run" ] && dry_run=true

    local cargo_pids
    cargo_pids=$(ps aux | grep -v grep \
        | grep -E "cargo-(llvm-cov|test|bench|build)" \
        | grep -v "grep" \
        | awk '{print $2}' | tr '\n' ' ')

    [ -z "$cargo_pids" ] && return 0

    if $dry_run; then
        info "[DRY-RUN] 将终止后台 cargo 进程: $cargo_pids"
        return 1
    fi

    warn "检测到后台 cargo 进程（会持续膨胀 target 吃磁盘），自动终止: $cargo_pids"
    local p
    for p in $cargo_pids; do
        kill "$p" 2>/dev/null || true
    done
    sleep 2
    local still=""
    for p in $cargo_pids; do
        kill -0 "$p" 2>/dev/null && still="$still $p"
    done
    if [ -n "$still" ]; then
        warn "TERM 未退出，强制 kill -9:$still"
        for p in $still; do
            kill -9 "$p" 2>/dev/null || true
        done
    fi
    pkill -9 -f "cargo-llvm-cov" 2>/dev/null || true
    pkill -9 -f "cargo test.*llvm-cov" 2>/dev/null || true
    success "后台 cargo 进程已终止"
    return 1
}

# 清理 coverage 独立 target 目录（cargo clean 不会碰它）
# 用法: _clean_cov_remnants [--dry-run]
# 返回: 0=无残留, 1=已清理或 dry-run 预览
_clean_cov_remnants() {
    local dry_run=false
    [ "$1" = "--dry-run" ] && dry_run=true

    local cov_dirs=(
        "$PROJECT_ROOT/target/llvm-cov-target"
        "$PROJECT_ROOT/lib/target"
    )
    local cleaned=0
    for cov_dir in "${cov_dirs[@]}"; do
        if [ -d "$cov_dir" ]; then
            local size
            size=$(du -sh "$cov_dir" 2>/dev/null | awk '{print $1}')
            if $dry_run; then
                info "[DRY-RUN] 将删除 coverage/target 残留: $cov_dir ($size)"
            else
                info "清理 coverage 残留: $cov_dir ($size)"
                rm -rf "$cov_dir"
                detail "已清理 $cov_dir"
            fi
            cleaned=1
        fi
    done
    return $cleaned
}

# 磁盘空间守卫
# 用法: _check_disk_space
# 返回: 0=磁盘充足, 1=磁盘不足（阻断）
_check_disk_space() {
    local avail_kb
    avail_kb=$(df -k "$PROJECT_ROOT" 2>/dev/null | awk 'NR==2 {print $4}')
    [ -z "$avail_kb" ] && return 0
    local avail_gb=$((avail_kb / 1024 / 1024))
    if [ "$avail_gb" -lt 5 ]; then
        error "磁盘仅剩 ${avail_gb}GiB！即将满盘，请先执行: $0 clean"
        return 1
    elif [ "$avail_gb" -lt 10 ]; then
        warn "磁盘仅剩 ${avail_gb}GiB，建议执行: $0 clean"
    fi
    return 0
}

# =============================================
# 内存守卫 & 构建锁（V70+）
# =============================================
# 检查可用内存
# 返回: 0=充足(>2GB), 1=偏低(1-2GB, WARN), 2=不足(<1GB, FAIL)
_check_available_memory() {
    local avail_kb=0
    local threshold_gb_fatal=${BUILD_MEMORY_FATAL_GB:-1}
    local threshold_gb_warn=${BUILD_MEMORY_WARN_GB:-2}

    case "$(uname -s)" in
        Darwin)
            # macOS: free + inactive 都属于可回收内存
            local pages_free pages_inactive page_size
            pages_free=$(vm_stat 2>/dev/null | grep "Pages free" | awk '{print $3}' | tr -d '.')
            pages_inactive=$(vm_stat 2>/dev/null | grep "Pages inactive" | awk '{print $3}' | tr -d '.')
            page_size=$(vm_stat 2>/dev/null | head -1 | grep -oE 'page size of [0-9]+' | grep -oE '[0-9]+' || echo 4096)
            [ -z "$pages_free" ] && return 0
            : "${pages_inactive:=0}"
            avail_kb=$(( (pages_free + pages_inactive) * page_size / 1024 ))
            ;;
        Linux)
            avail_kb=$(grep MemAvailable /proc/meminfo 2>/dev/null | awk '{print $2}')
            ;;
        *)
            return 0
            ;;
    esac

    [ -z "$avail_kb" ] || [ "$avail_kb" -eq 0 ] && return 0
    local avail_gb=$((avail_kb / 1024 / 1024))
    local avail_mb=$((avail_kb / 1024))

    if [ "$avail_gb" -lt "$threshold_gb_fatal" ]; then
        error "可用内存仅 ${avail_mb}MB！低于安全阈值 ${threshold_gb_fatal}GiB，构建可能失败。"
        error "建议: 关闭其他应用或增加 swap，然后重试。"
        return 2
    elif [ "$avail_gb" -lt "$threshold_gb_warn" ]; then
        warn "可用内存 ${avail_mb}MB，低于推荐阈值 ${threshold_gb_warn}GiB，将自动启用安全模式（串行+节流）。"
        return 1
    else
        detail "可用内存 ${avail_gb}GiB，充足"
        return 0
    fi
}

# 构建锁机制：防止多个 build-all 并发执行导致 cargo 包缓存锁竞争
# 锁文件: /tmp/topems-build.lock
_BUILD_LOCK="/tmp/topems-build.lock"

_acquire_build_lock() {
    local force=${1:-false}
    if [ -f "$_BUILD_LOCK" ]; then
        local lock_pid
        lock_pid=$(cat "$_BUILD_LOCK" 2>/dev/null)
        if [ -n "$lock_pid" ] && kill -0 "$lock_pid" 2>/dev/null; then
            if [ "$force" = "true" ]; then
                warn "构建锁被 PID=$lock_pid 占用，强制获取..."
                kill "$lock_pid" 2>/dev/null || true
                sleep 1
            else
                error "检测到另一个构建正在运行 (PID=$lock_pid)，请等待其完成。"
                error "如需强制获取锁，使用 --force 参数。"
                return 1
            fi
        else
            warn "发现过期的构建锁 (PID=$lock_pid 已不存在)，清理..."
            rm -f "$_BUILD_LOCK"
        fi
    fi
    echo "$$" > "$_BUILD_LOCK"
    return 0
}

_release_build_lock() {
    if [ -f "$_BUILD_LOCK" ]; then
        local lock_pid
        lock_pid=$(cat "$_BUILD_LOCK" 2>/dev/null)
        if [ "$lock_pid" = "$$" ]; then
            rm -f "$_BUILD_LOCK"
            detail "构建锁已释放 (PID=$$)"
        fi
    fi
}

# 构建完成时自动释放锁
trap '_release_build_lock' EXIT

# =============================================
# 主流程预检（轻量模式，调用 clean_project --preflight）
# 在 run_all / start_dev / build / test 等主流程入口自动调用。
# 接受 --skip-preflight 参数跳过（CI 场景或已清理过的情况）。
# =============================================
_preflight_check() {
    local -a args=("$@")
    for a in "${args[@]}"; do
        [ "$a" = "--skip-preflight" ] && { detail "已指定 --skip-preflight，跳过预检"; return 0; }
    done
    clean_project --preflight
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
    local clean_deep=false
    local dry_run=false
    local preflight=false

    for arg in "$@"; do
        case "$arg" in
            --rust)         clean_rust=true ;;
            --frontend)     clean_frontend=true ;;
            --cache)        clean_cache=true ;;
            --system-cache) clean_system_cache=true ;;
            --logs)         clean_logs=true ;;
            --ollama)       clean_ollama=true ;;
            --all)          clean_all=true ;;
            --deep)         clean_deep=true ;;
            --dry-run)      dry_run=true ;;
            --preflight)    preflight=true ;;
            *)
                error "未知参数: $arg"
                echo "可用选项: --rust --frontend --cache --system-cache --ollama --logs --all --deep --dry-run --preflight"
                return 1
                ;;
        esac
    done

    # ── 轻量预检模式（主流程自动调用入口）─────────────────────────
    if $preflight; then
        local issues=0
        echo ""
        info "================================================"
        info "  TOPEMS 预检（轻量清理）"
        info "================================================"
        echo ""

        # 1. 杀后台 cargo 进程（函数在清理后返回 1，不能让 set -e 误判为失败）
        if ! _kill_background_cargo; then issues=$((issues + 1)); fi

        # 2. 清 coverage 残留（同理：清理过则返回 1）
        if ! _clean_cov_remnants; then issues=$((issues + 1)); fi

        # 3. 磁盘守卫
        _check_disk_space || return 1

        if [ $issues -gt 0 ]; then
            success "预检完成（自动修复 $issues 项）"
        else
            detail "预检通过 ✅"
        fi
        return 0
    fi

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
    # --deep 必须配合 --frontend（deep 清理在 frontend 块内执行）
    if [ "$clean_deep" = true ]; then
        clean_frontend=true
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
        # ── 杀后台 cargo 进程 + 清 coverage 残留（公共函数）──────────
        # shellcheck disable=SC2046
        _kill_background_cargo $( $dry_run && echo --dry-run ) && did_clean=true
        # shellcheck disable=SC2046
        _clean_cov_remnants $( $dry_run && echo --dry-run ) && did_clean=true

        # target/ 完整清理
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
        # 默认不删除.sqlx缓存（已入库git，删除会导致离线编译失败暴露大量历史类型错误）
        # 只有显式加 --sqlx 参数才清理
        if [ "${CLEAN_SQLX:-false}" = "true" ]; then
            if [ -d "$sqlx_dir" ]; then
                local sqlx_size
                sqlx_size=$(du -sh "$sqlx_dir" 2>/dev/null | awk '{print $1}')
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将删除 SQLx 缓存: $sqlx_dir ($sqlx_size)"
                else
                    rm -rf "$sqlx_dir"
                    detail "已清理 .sqlx ($sqlx_size)"
                    warning "注意：.sqlx 为 SQLx 离线编译缓存（已入库 git）。清理后离线编译/启动会依赖它，"
                    warning "  如需恢复：git checkout -- .sqlx，或运行 ./scripts/dev/sqlx-prepare.sh 重新生成。"
                    did_clean=true
                fi
            fi
        else
            detail "默认跳过 .sqlx 缓存清理（已入库git，删除会导致离线编译失败）"
            detail "  如需强制清理.sqlx，请执行: CLEAN_SQLX=true ./scripts/topems.sh clean --sqlx"
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

        # --deep: 深度清理所有 node_modules（解决 dual versions / lockfile 漂移 / 本机污染）
        if [ "$clean_deep" = true ]; then
            warn "--deep 模式: 将删除所有 node_modules 目录并 pnpm store prune"
            warn "  用于解决 dual @types/react 残留 / node_modules 与 lockfile 不一致等系统性问题"
            local deep_dirs=(
                "$PROJECT_ROOT/node_modules"
                "$PROJECT_ROOT/apps/web/node_modules"
                "$PROJECT_ROOT/apps/desktop/node_modules"
                "$PROJECT_ROOT/apps/mobile/node_modules"
            )
            # 补齐 packages/*/node_modules
            local pkg_dir
            for pkg_dir in "$PROJECT_ROOT/packages"/*/node_modules; do
                [ -d "$pkg_dir" ] && deep_dirs+=("$pkg_dir")
            done
            for dir in "${deep_dirs[@]}"; do
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
            # pnpm store prune（清理未引用包，不影响其他项目）
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
            success "深度清理完成。下次运行 build/dev 时会自动 pnpm install 重新安装"
        fi
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
            ollama_model=$(grep "^OLLAMA_MODEL=" "$PROJECT_ROOT/.env" | cut -d'=' -f2 | tr -s ' ' | xargs)
            embed_model=$(grep "^EMBEDDING_MODEL=" "$PROJECT_ROOT/.env" | cut -d'=' -f2 | tr -s ' ' | xargs)
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
            blob_count=$(ls "$ollama_blobs" 2>/dev/null | wc -l | tr -s ' ' | xargs)
            if [ "$blob_count" -gt 0 ]; then
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将清理 Ollama blobs 残留: $ollama_blobs ($blob_size, $blob_count files)"
                else
                    rm -rf "${ollama_blobs:?}/*" 2>/dev/null
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
  start <服务> [--force]  启动服务（自动注册到 unified-core；二进制缺失时自动编译）
  stop <服务>             停止服务
  restart <服务> [--force]  重启服务（可选 --force 强制重启）
  mes-guard [选项]       运行 mes 编译守卫（遮蔽检查 + 在线编译断言 0 error）
                            --clean          清理 public 遮蔽对象（幂等）
                            --sync-snapshot  同步 fixtures/mes_compile_schema.sql
                            --prepare        生成/更新 sqlx 缓存并合并根 .sqlx（迁移后必跑）
                            --skip-compile   只做遮蔽检查（快排）
  check                   检查服务状态并自动重启异常服务
  logs <服务> [行数]      查看服务日志
  build <服务> [--online|--offline|--dev|--skip-sqlx-check]  编译服务（默认离线优先 + 缓存新鲜度门禁）
  build-all [选项]        全量编译所有服务（后端+前端）
                            --prepare         先刷新 sqlx 缓存（需要 DATABASE_URL）
                            --only-core       只编核心服务（iam=unified-core）
                            --online          强制在线编译（无缓存也可）
                            --offline         强制离线编译（失败立即停止，不回退在线）
                            --skip-sqlx-check 跳过 SQLx 离线缓存新鲜度门禁（build/start 默认先跑 --check）
                            --dev|--debug     编 debug 版（默认 release）
                            --skip=<svc>      跳过某个包，可重复
                            --backend-only    只编后端，跳过前端
                            --force           强制获取构建锁（避免并发冲突）
                            --skip-mem-check  跳过内存检查（CI / Docker 场景）
                            --serial          强制单线程串行构建，避免并行锁竞争
                            --cooldown=N      构建间冷却秒数（默认 2，serial 模式下生效）
  build-backend [选项]    编译所有后端服务（同 build-all 的后端子集）
  build-frontend          编译前端 (tsc && vite build)
                            --dev        若存在 build:dev 脚本则用，否则回退默认 build
                            --skip-lint  若存在 build:nolint 脚本则用，否则忽略（默认 build 不跑 lint）
  register-all           批量注册所有运行中的服务到 unified-core（含重试）
  start-all [选项]        启动所有服务（含前端，自动注册）
                            --only-core       只启动核心服务（iam=unified-core）
                            --no-frontend     不启动前端
                            --no-register     不自动注册插件
                            --skip=<svc>      跳过某个服务
                            --skip-sqlx-check 跳过 SQLx 离线缓存新鲜度门禁
  stop-all                停止所有服务（含前端）
  restart-all [选项]      重启所有服务（透传 start-all 选项）

一键运行:
  run [选项]             一键启动数据库+所有服务（透传 start-all 选项）
                          --only-core       只启动核心服务
                          --no-frontend     不启动前端
                          --skip=<svc>      跳过某个服务
                          --skip-sqlx-check 跳过 SQLx 离线缓存新鲜度门禁
  run-stop                一键停止所有服务+数据库

前端:
  start web               启动前端服务
  stop web                停止前端服务

测试:
  test-all                运行所有测试（后端+前端）
  test-backend            运行后端测试（SQLX_OFFLINE=true 离线模式，与 pre-push/CI 一致）
  test-frontend [模式] [--no-typecheck]
                          运行前端测试（默认前置 tsc 类型检查）
                            模式: all(默认) | unit | component | smoke | coverage
                                  shard:1 .. shard:8  (component 分片，省内存)
                            --no-typecheck: 跳过类型检查（纯跑 vitest）

SQLx 离线缓存 (V64+; V3xx 门禁):
  sqlx prepare [--pkg=X] [--all]  生成离线缓存
  sqlx prepare --check            校验离线缓存
  sqlx prepare --merge            合并分包缓存到根 .sqlx
  sqlx check-offline              无 DATABASE_URL 下全量离线编译校验

SQLx 离线缓存新鲜度门禁 (V3xx):
  build / build-all / build-backend / start / start-all / run / dev 默认先执行
  scripts/dev/sqlx-prepare.sh --check；缓存缺失或与代码不一致即停止并给出修复指引。
  跳过: 命令加 --skip-sqlx-check，或设置环境变量 SQLX_CHECK_SKIP=1，或使用 --online。

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
                            --rust         清理 Rust 编译产物 (target/, .sqlx, llvm-cov-target, lib/target) + 终止后台 cargo 进程
                            --frontend     清理前端产物 (dist/, coverage/, .vite 缓存)
                            --deep         深度清理所有 node_modules + pnpm store prune（解决 dual versions / lockfile 漂移）
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

自动预检（主流程入口自动执行，磁盘 <5GiB 会阻断）:
  预检内容: 杀后台 cargo 进程 + 清 llvm-cov-target 残留 + 磁盘空间检查
  应用命令: run / dev / start-all / restart-all / build-all / test-backend
  跳过预检: 在以上命令后加 --skip-preflight（CI 场景或已清理过）
            例: topems build-all --skip-preflight --only-core

环境变量:
  MAX_RETRIES             最大重试次数（默认: 3）
  RETRY_DELAY             初始重试间隔（默认: 3秒）
  BACKOFF_FACTOR          退避系数（默认: 2，指数退避）
  FORCE_ONLINE_BUILD      设为 1 时 build/build-all 默认在线编译
  SQLX_CHECK_SKIP         设为 1 时跳过 SQLx 离线缓存新鲜度门禁（等同 --skip-sqlx-check）

示例:
  topems status               查看所有服务状态
  topems start iam            启动 IAM 服务
  topems start-all --only-core     仅启动核心服务
  topems start-all --no-frontend   只启动后端服务
  topems logs hrm 100         查看 HRM 最近 100 行日志
  topems build-all            全量编译（离线优先，失败自动切在线）
  topems build-all --serial   全量串行构建（单线程，避免并行锁竞争）
  topems build-all --serial --cooldown=3  串行构建+3秒冷却间隔
  topems build-all --prepare  先刷新 sqlx 缓存再编译（刷新后自动校验缓存可用）
  topems build-all --only-core --dev  仅 debug 编译核心服务
  topems sqlx prepare --all   生成全量 SQLx 离线缓存
  topems test-all             运行所有测试
  topems run                  一键运行（数据库+所有服务）
  topems db status            查看数据库状态
  topems db backup            备份数据库
  topems db defense-check <svc>   单服务 Schema 防御自检（build+启动10s+grep自检日志）
                                        染色输出 ✓/⚠/✗；exit 0/1/2
  topems db defense-check-all       全量 Schema 防御自检（4 批共 25 服务）
                                        第1批 核心4: gis ehs portal finance
                                        第2批 业务11: erp hrm crm pm scm wms srm pdm mes qms lims
                                        第3批 业务5: ai rd ticket plugin-registry mobile
                                        第4批 平台5: unified-core integration master-data communication analytics
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
                # V3xx SQLx 缓存新鲜度门禁（--skip-sqlx-check 可跳过）；--force 归一化
                _check_sqlx_cache_freshness "${@:3}" || exit 1
                if [ "${3:-}" = "--force" ]; then
                    start_service "$2" true
                else
                    start_service "$2" "${3:-false}"
                fi
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
            mes)
                # V3xx SQLx 缓存新鲜度门禁（--skip-sqlx-check 可跳过）
                _check_sqlx_cache_freshness "${@:3}" || exit 1
                # mes 重启前编译守卫：防启动坏/旧版本（MES_GUARD_SKIP=1 跳过）
                # V3xx：DB 连接串从 .env 派生（原硬编码 topems:topems_secret 与 .env 不一致）
                if [ "${MES_GUARD_SKIP:-0}" != "1" ]; then
                    bash "$PROJECT_ROOT/scripts/mes_guard.sh" --db-url "$(_mes_db_url)" || {
                        error "mes 编译守卫失败，已中止重启（MES_GUARD_SKIP=1 可跳过）"
                        exit 1
                    }
                fi
                _topems_force_flag=false
                [ "${3:-}" = "--force" ] && _topems_force_flag=true
                stop_service mes && sleep 1 && start_service mes "$_topems_force_flag"
                ;;
            "")
                error "请指定服务名"
                show_help
                exit 1
                ;;
            *)
                _check_sqlx_cache_freshness "${@:3}" || exit 1
                _topems_force_flag=false
                [ "${3:-}" = "--force" ] && _topems_force_flag=true
                stop_service "$2" && sleep 1 && start_service "$2" "$_topems_force_flag"
                ;;
        esac
        ;;
    logs)
        [ -z "$2" ] && { error "请指定服务名"; show_help; exit 1; }
        logs_service "$2" "${3:-50}"
        ;;
    build)
        [ -z "$2" ] && { error "请指定服务名"; show_help; exit 1; }
        # V3xx SQLx 缓存新鲜度门禁（--skip-sqlx-check 可跳过）
        _check_sqlx_cache_freshness "${@:3}" || exit 1
        build_service "$2" "${@:3}"
        ;;
    mes-guard)
        # mes 编译守卫：遮蔽检查 + 在线编译断言 0 error（--clean/--sync-snapshot/--skip-compile 透传）
        # V3xx：DB 连接串从 .env 派生（原硬编码 topems:topems_secret 与 .env 不一致）
        bash "$PROJECT_ROOT/scripts/mes_guard.sh" --db-url "$(_mes_db_url)" "${@:2}"
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
    register-all)
        register_all_plugins
        ;;
    test-all)
        test_all
        ;;
    test-backend)
        test_backend
        ;;
    test-frontend)
        test_frontend "${@:2}"
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
            defense-check)
                db_defense_check "$3"
                ;;
            defense-check-all)
                db_defense_check_all
                ;;
            boundary-check)
                # 静态跨 schema SQL 引用门禁（无需 DB，与 defense-check 运行时检查互补）
                python3 "$SCRIPT_DIR/check_schema_boundary.py"
                ;;
            *)
                error "未知数据库命令: $2"
                echo "可用命令: start, stop, status, migrate, backup, restore, reset, defense-check, defense-check-all, boundary-check"
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