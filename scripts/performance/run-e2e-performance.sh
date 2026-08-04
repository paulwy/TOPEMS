#!/usr/bin/env bash
# =============================================================================
# TOPEMS 一键 E2E 性能测试
# =============================================================================
#
# 流程：
#   1. 检查前置依赖（k6, cargo）
#   2. 启动基础设施（PostgreSQL, Redis，若未运行）
#   3. 编译并启动 SCM 后端服务
#   4. 等待 /health 就绪
#   5. 执行 k6 性能测试套件
#   6. 输出结果摘要，可选保留服务
#
# 用法：
#   ./run-e2e-performance.sh                     # 完整性能测试
#   ./run-e2e-performance.sh --smoke             # 冒烟测试（快速验证）
#   ./run-e2e-performance.sh --keep              # 测试后保留服务运行
#   ./run-e2e-performance.sh --skip-start        # 跳过启动（已有后端在运行）
#   ./run-e2e-performance.sh --base-url URL      # 指定后端地址
#
# 环境变量：
#   SMOKE=true|false       冒烟测试模式（默认 false）
#   BASE_URL=url          后端地址（默认 http://localhost:8040）
#   KEEP_SERVICES=1       测试后保留服务
#   SKIP_START=1          跳过服务启动
#   PG_PORT=5432          PostgreSQL 端口
#   REDIS_PORT=6379       Redis 端口
#   SCM_PORT=8040         SCM 服务端口
#
# =============================================================================

set -o pipefail

# ---------------------------------------------------------------------------
# 路径与配置
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
LOG_DIR="${SCRIPT_DIR}/logs"
mkdir -p "${RESULTS_DIR}" "${LOG_DIR}"

# ---------------------------------------------------------------------------
# 默认配置
# ---------------------------------------------------------------------------
SMOKE="${SMOKE:-false}"
BASE_URL="${BASE_URL:-http://localhost:8040}"
KEEP_SERVICES="${KEEP_SERVICES:-0}"
SKIP_START="${SKIP_START:-0}"
PG_PORT="${PG_PORT:-5432}"
REDIS_PORT="${REDIS_PORT:-6379}"
SCM_PORT="${SCM_PORT:-8040}"

# ---------------------------------------------------------------------------
# 参数解析
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --smoke)       SMOKE="true"; ;;
        --keep)        KEEP_SERVICES="1"; ;;
        --skip-start)  SKIP_START="1"; ;;
        --base-url)    BASE_URL="$2"; shift; ;;
        *) echo "未知参数: $1" >&2; exit 1 ;;
    esac
    shift
done

# 从 BASE_URL 提取 host:port
SCM_HOST="${BASE_URL#http://}"
SCM_HOST="${SCM_HOST%%/*}"
SCM_PORT="${SCM_HOST##*:}"
SCM_HOST="${SCM_HOST%%:*}"
[[ "$SCM_HOST" == "$SCM_PORT" ]] && SCM_HOST="localhost"

# ---------------------------------------------------------------------------
# 日志函数
# ---------------------------------------------------------------------------
log()  { echo -e "\033[1;34m[INFO]\033[0m  $*"; }
ok()   { echo -e "\033[1;32m[OK]\033[0m   $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
err()  { echo -e "\033[1;31m[ERR]\033[0m  $*"; }
header() { echo ""; echo "=========================================="; echo " $*"; echo "=========================================="; }

# ---------------------------------------------------------------------------
# 前置检查
# ---------------------------------------------------------------------------
header "TOPEMS 一键 E2E 性能测试"
echo "  模式:        $([ "$SMOKE" = "true" ] && echo '冒烟 (SMOKE)' || echo '完整性能')"
echo "  后端地址:    $BASE_URL"
echo "  保留服务:    $([ "$KEEP_SERVICES" = "1" ] && echo '是' || echo '否')"
echo "  跳过启动:    $([ "$SKIP_START" = "1" ] && echo '是' || echo '否')"
echo ""

# 检查 k6
if ! command -v k6 &> /dev/null; then
    err "k6 未安装"
    echo "   brew install k6 (macOS)"
    echo "   或访问 https://k6.io/docs/get-started/installation/"
    exit 1
fi
ok "k6 已安装: $(k6 version 2>/dev/null | head -1)"

# 检查 cargo（仅在需要启动服务时）
if [[ "$SKIP_START" != "1" ]] && ! command -v cargo &> /dev/null; then
    err "cargo 未安装，请先安装 Rust 工具链"
    exit 1
fi

# ---------------------------------------------------------------------------
# 端口/健康检查工具
# ---------------------------------------------------------------------------
port_listening() { lsof -iTCP:"$1" -sTCP:LISTEN -n &> /dev/null; }
health_ok() {
    local url="${1:-http://localhost:8040/health}"
    curl -sf -o /dev/null --connect-timeout 3 "$url" 2>/dev/null
}

# ---------------------------------------------------------------------------
# 启动基础设施（仅 macOS，开发环境）
# ---------------------------------------------------------------------------
start_infra_macos() {
    # PostgreSQL
    if port_listening "$PG_PORT"; then
        ok "PostgreSQL 已在端口 $PG_PORT 运行"
    else
        log "启动 PostgreSQL..."
        local pg_ver="$(brew list --versions | grep -i postgresql | head -1 | awk '{print $1}')"
        if [[ -n "$pg_ver" ]]; then
            brew services start "$pg_ver" 2>/dev/null || brew services start postgresql 2>/dev/null || {
                warn "brew services start postgresql 失败，请手动启动"
                return 1
            }
        else
            warn "PostgreSQL 未安装，请运行: brew install postgresql@16"
            return 1
        fi
        # 等待端口就绪
        local waited=0
        while ! port_listening "$PG_PORT" && [[ $waited -lt 30 ]]; do
            sleep 2; waited=$((waited + 2))
        done
        port_listening "$PG_PORT" && ok "PostgreSQL 已就绪 (端口 $PG_PORT)" || { warn "PostgreSQL 启动超时"; return 1; }
    fi

    # Redis
    if port_listening "$REDIS_PORT"; then
        ok "Redis 已在端口 $REDIS_PORT 运行"
    else
        log "启动 Redis..."
        brew services start redis 2>/dev/null || { warn "brew services start redis 失败"; return 1; }
        local waited=0
        while ! port_listening "$REDIS_PORT" && [[ $waited -lt 15 ]]; do
            sleep 2; waited=$((waited + 2))
        done
        port_listening "$REDIS_PORT" && ok "Redis 已就绪 (端口 $REDIS_PORT)" || { warn "Redis 启动超时"; return 1; }
    fi
    return 0
}

# ---------------------------------------------------------------------------
# 启动 SCM 服务
# ---------------------------------------------------------------------------
SCM_PID=""

start_scm_service() {
    if port_listening "$SCM_PORT"; then
        if health_ok "$BASE_URL/health"; then
            ok "SCM 服务已在端口 $SCM_PORT 运行且健康"
            return 0
        else
            warn "端口 $SCM_PORT 已被占用但 /health 不可用，尝试终止旧进程..."
            local old_pid
            old_pid="$(lsof -tiTCP:"$SCM_PORT" -sTCP:LISTEN 2>/dev/null | head -1)"
            if [[ -n "$old_pid" ]]; then
                kill "$old_pid" 2>/dev/null
                sleep 2
            fi
        fi
    fi

    log "编译并启动 SCM 服务 (端口 $SCM_PORT)..."
    (
        cd "$PROJECT_ROOT"
        DEVELOPMENT_MODE="false" \
        SCM_PORT="$SCM_PORT" \
        nohup cargo run --release --bin "topems-scm" \
            > "${LOG_DIR}/scm-$(date +%s).log" 2>&1 &
        echo $! > "${LOG_DIR}/scm.pid"
    )
    SCM_PID="$(cat "${LOG_DIR}/scm.pid" 2>/dev/null)"

    # 等待健康检查就绪（最多 120s）
    log "等待 SCM 服务就绪..."
    local waited=0
    while ! health_ok "$BASE_URL/health" && [[ $waited -lt 120 ]]; do
        sleep 3; waited=$((waited + 3))
        if [[ $((waited % 15)) -eq 0 ]]; then
            log "  ...已等待 ${waited}s"
        fi
    done

    if health_ok "$BASE_URL/health"; then
        ok "SCM 服务已就绪 (端口 $SCM_PORT，等待 ${waited}s)"
        return 0
    else
        err "SCM 服务启动超时 (120s)"
        err "日志: ${LOG_DIR}/scm-$(date +%s)*.log"
        if [[ -n "$SCM_PID" ]]; then
            kill "$SCM_PID" 2>/dev/null || true
        fi
        return 1
    fi
}

# ---------------------------------------------------------------------------
# 清理服务
# ---------------------------------------------------------------------------
cleanup() {
    if [[ "$KEEP_SERVICES" == "1" ]]; then
        log "保留服务运行 (--keep 已启用)"
    else
        if [[ -n "$SCM_PID" ]]; then
            log "停止 SCM 服务 (PID $SCM_PID)..."
            kill "$SCM_PID" 2>/dev/null || true
            wait "$SCM_PID" 2>/dev/null || true
            ok "SCM 服务已停止"
        fi
    fi
}

# 仅在我们启动了服务时才清理
trap cleanup EXIT

# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
STARTED_SERVICES=0

if [[ "$SKIP_START" != "1" ]]; then
    header "1. 启动基础设施"

    # macOS: 自动启动 PostgreSQL 和 Redis
    if [[ "$(uname)" == "Darwin" ]]; then
        start_infra_macos || {
            warn "部分基础设施启动失败，继续尝试..."
        }
    else
        warn "非 macOS 系统，请手动确保 PostgreSQL 和 Redis 已运行"
        echo "   PostgreSQL: pg_isready -p $PG_PORT"
        echo "   Redis: redis-cli -p $REDIS_PORT ping"
    fi

    header "2. 启动 SCM 后端服务"
    if start_scm_service; then
        STARTED_SERVICES=1
    else
        err "SCM 服务启动失败，无法执行性能测试"
        exit 1
    fi
else
    header "1-2. 跳过服务启动 (--skip-start)"
    if ! health_ok "$BASE_URL/health"; then
        err "后端服务 $BASE_URL/health 不可用"
        echo "   请先启动后端，或移除 --skip-start 让脚本自动启动"
        exit 1
    fi
    ok "后端服务已就绪"
fi

# ---------------------------------------------------------------------------
# 执行 k6 性能测试
# ---------------------------------------------------------------------------
header "3. 执行 k6 性能测试套件"

SMOKE="$SMOKE" \
BASE_URL="$BASE_URL" \
"${SCRIPT_DIR}/run-all-tests.sh"
TEST_EXIT=$?

# ---------------------------------------------------------------------------
# 结果汇总
# ---------------------------------------------------------------------------
header "4. 结果汇总"

REPORT_FILE="${SCRIPT_DIR}/performance-report.json"
if [[ -f "$REPORT_FILE" ]]; then
    echo ""
    echo "SCM 性能报告摘要:"
    python3 -c "
import json
with open('${REPORT_FILE}') as f:
    m = json.load(f)
print(f\"  总请求数:     {m.get('http_reqs', 'N/A')}\")
print(f\"  平均响应时间: {m.get('http_req_duration_avg', 'N/A')}ms\")
print(f\"  p95:          {m.get('http_req_duration_p95', 'N/A')}ms\")
print(f\"  p99:          {m.get('http_req_duration_p99', 'N/A')}ms\")
err_rate = m.get('errors_rate', 'N/A')
if err_rate != 'N/A' and isinstance(err_rate, (int, float)):
    print(f\"  错误率:       {err_rate*100:.2f}%\")
else:
    print(f\"  错误率:       N/A\")
print(f\"  最大并发用户: {m.get('vus_max', 'N/A')}\")
" 2>/dev/null || echo "  (报告解析失败，请查看 ${REPORT_FILE} 原文)"
fi

DB_REPORT="${SCRIPT_DIR}/database-performance-report.json"
if [[ -f "$DB_REPORT" ]]; then
    echo ""
    echo "数据库性能报告摘要:"
    python3 -c "
import json
with open('${DB_REPORT}') as f:
        m = json.load(f)
print(f\"  总请求数:     {m.get('total_requests', 'N/A')}\")
print(f\"  平均查询耗时: {m.get('avg_response_time_ms', 'N/A')}ms\")
print(f\"  p95:          {m.get('p95_response_time_ms', 'N/A')}ms\")
print(f\"  总查询数:     {m.get('total_db_queries', 'N/A')}\")
" 2>/dev/null || echo "  (报告解析失败，请查看 ${DB_REPORT} 原文)"
fi

echo ""
echo "报告文件:"
echo "  ${REPORT_FILE}"
echo "  ${DB_REPORT}"

exit $TEST_EXIT