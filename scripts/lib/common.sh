# shellcheck shell=bash
# =============================================
# TOPEMS lib/common.sh（自 scripts/topems.sh 拆分，2026-11-02）
# =============================================

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
        CORE_SERVICES=$(grep "^CORE_SERVICES=" "$config_file" | cut -d'=' -f2 | tr -s ' ' | xargs)
        # services.conf 自 V2026.08 起不写 CORE_SERVICES= 行（sync-ports.sh 生成），无行时回退默认核心服务
        [ -z "$CORE_SERVICES" ] && CORE_SERVICES="iam plugin-registry"
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

# 加载模块
if [ -f "$SCRIPT_DIR/service.sh" ]; then
    source "$SCRIPT_DIR/service.sh"
fi
if [ -f "$SCRIPT_DIR/build.sh" ]; then
    source "$SCRIPT_DIR/build.sh"
fi
if [ -f "$SCRIPT_DIR/db.sh" ]; then
    source "$SCRIPT_DIR/db.sh"
fi
if [ -f "$SCRIPT_DIR/deploy.sh" ]; then
    source "$SCRIPT_DIR/deploy.sh"
fi
if [ -f "$SCRIPT_DIR/utils.sh" ]; then
    source "$SCRIPT_DIR/utils.sh"
fi

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
