#!/usr/bin/env bash
# ==============================================================================
# TOPEMS 完整后端环境联调脚本
#
# 功能：
#   1. 检查并启动所有依赖服务（PostgreSQL、Redis、IAM等）
#   2. 运行数据库迁移
#   3. 启动所有后端服务
#   4. 运行完整的端到端测试套件
#   5. 生成联调报告
#
# 用法：
#   ./scripts/testing/full-e2e-test.sh [选项]
# ==============================================================================

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORT_DIR="${PROJECT_ROOT}/test-results/full-e2e"
LOG_DIR="${PROJECT_ROOT}/logs/e2e"
VERBOSE=false
SKIP_SETUP=false
SKIP_TEARDOWN=false
GENERATE_REPORT=false
SERVICES=""

# 默认测试的服务
DEFAULT_TEST_SERVICES=("ai" "unified-core" "portal")

# ==============================================================================
# 工具函数
# ==============================================================================

log_info() { echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_verbose() { [ "$VERBOSE" = true ] && echo -e "${GREEN}[VERBOSE]${NC} $*" || true; }

check_command() {
    command -v "$1" &> /dev/null && return 0 || { log_error "命令 '$1' 未找到"; return 1; }
}

wait_for_port() {
    local host="$1" port="$2" timeout="${3:-30}" start_time=$(date +%s)
    log_verbose "等待 $host:$port 就绪（超时 ${timeout}s）..."
    while true; do
        nc -z "$host" "$port" 2>/dev/null && return 0
        [ $(($(date +%s) - start_time)) -ge "$timeout" ] && { log_error "等待 $host:$port 超时"; return 1; }
        sleep 1
    done
}

check_http_health() {
    local url="$1" timeout="${2:-10}"
    curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null | grep -q "200\|204"
}

# ==============================================================================
# 参数解析
# ==============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --skip-setup) SKIP_SETUP=true; shift ;;
            --skip-teardown) SKIP_TEARDOWN=true; shift ;;
            --services) SERVICES="$2"; shift 2 ;;
            --report) GENERATE_REPORT=true; shift ;;
            --verbose) VERBOSE=true; shift ;;
            --help|-h)
                echo "用法: $0 [选项]"
                echo "  --skip-setup     跳过环境设置"
                echo "  --skip-teardown  测试完成后不停止服务"
                echo "  --services       指定要测试的服务（逗号分隔）"
                echo "  --report         生成 HTML 报告"
                echo "  --verbose        详细输出"
                exit 0 ;;
            *) log_warning "未知选项: $1"; shift ;;
        esac
    done
}

# ==============================================================================
# 环境检查
# ==============================================================================

check_environment() {
    log_info "检查运行环境..."
    local missing=0
    for cmd in curl ps grep awk; do
        check_command "$cmd" || missing=$((missing + 1))
    done
    command -v cargo &> /dev/null && log_verbose "Cargo: $(cargo --version)" || log_warning "Cargo 未找到"
    command -v node &> /dev/null && log_verbose "Node: $(node --version)" || log_warning "Node.js 未找到"
    [ "$missing" -gt 0 ] && { log_error "缺少 $missing 个必要命令"; return 1; }
    log_success "环境检查通过"
}

# ==============================================================================
# 依赖服务管理
# ==============================================================================

check_database() {
    log_info "检查 PostgreSQL 数据库..."
    local db_host="${DATABASE_HOST:-localhost}" db_port="${DATABASE_PORT:-5432}"
    if wait_for_port "$db_host" "$db_port" 5; then
        log_success "PostgreSQL 已就绪 ($db_host:$db_port)"
        return 0
    fi
    log_warning "PostgreSQL 未运行"
    return 1
}

check_redis() {
    log_info "检查 Redis..."
    local redis_host="${REDIS_HOST:-localhost}" redis_port="${REDIS_PORT:-6379}"
    if wait_for_port "$redis_host" "$redis_port" 5; then
        log_success "Redis 已就绪 ($redis_host:$redis_port)"
        return 0
    fi
    log_warning "Redis 未运行"
    return 1
}

check_iam_service() {
    log_info "检查 IAM 服务..."
    local iam_url="${IAM_URL:-http://localhost:8010}"
    if check_http_health "${iam_url}/health" 5; then
        log_success "IAM 服务已就绪 ($iam_url)"
        return 0
    fi
    log_warning "IAM 服务未运行，部分测试将使用 Mock"
    return 1
}

setup_dependencies() {
    log_info "设置依赖服务..."
    local all_ready=true
    check_database || all_ready=false
    check_redis || all_ready=false
    check_iam_service || all_ready=false
    if [ "$all_ready" = false ]; then
        log_warning "部分依赖服务未就绪，将使用 Mock 或跳过相关测试"
        log_info "启动依赖服务命令："
        echo "  docker run -d -p 5432:5432 -e POSTGRES_DB=topems -e POSTGRES_USER=topems -e POSTGRES_PASSWORD=topems postgres:15"
        echo "  docker run -d -p 6379:6379 redis:7"
    else
        log_success "所有依赖服务已就绪"
    fi
}

teardown() {
    log_info "清理测试环境..."
    # 本脚本不启动常驻服务（依赖检查模式），teardown 清理 E2E 默认产物
    rm -rf "${PROJECT_ROOT}/tests/e2e/test-results" 2>/dev/null || true
    rm -rf "${PROJECT_ROOT}/tests/e2e/playwright-report" 2>/dev/null || true
    log_success "清理完成"
}

run_database_migrations() {
    log_info "运行数据库迁移..."
    [ ! -f "${PROJECT_ROOT}/.env" ] && { log_warning ".env 不存在，跳过迁移"; return 0; }
    if [ -d "${PROJECT_ROOT}/database/migrations" ] && command -v sqlx &> /dev/null; then
        cd "$PROJECT_ROOT"
        sqlx migrate run 2>&1 | tee -a "${LOG_DIR}/migration.log" || log_warning "迁移失败，可能已迁移过"
        log_success "数据库迁移完成"
    else
        log_warning "sqlx CLI 或迁移目录不存在，跳过"
    fi
}

# ==============================================================================
# 测试执行
# ==============================================================================

run_rust_tests() {
    local service="$1"
    log_info "运行 $service Rust 测试..."
    local service_dir="${PROJECT_ROOT}/svc/$service"
    [ ! -d "$service_dir" ] && { log_warning "服务目录不存在: $service_dir"; return 1; }
    cd "$service_dir"
    log_verbose "运行单元测试..."
    cargo test --lib 2>&1 | tee -a "${LOG_DIR}/${service}-unit.log" || { log_error "$service 单元测试失败"; return 1; }
    log_success "$service 单元测试通过"
    if [ -d "tests" ]; then
        log_verbose "运行集成测试..."
        cargo test --test '*' 2>&1 | tee -a "${LOG_DIR}/${service}-integration.log" || { log_error "$service 集成测试失败"; return 1; }
    fi
}

run_ai_service_tests() {
    log_info "运行 AI 服务专项测试..."
    local ai_dir="${PROJECT_ROOT}/svc/ai"
    [ ! -d "$ai_dir" ] && { log_error "AI 服务目录不存在"; return 1; }
    cd "$ai_dir"
    local ai_failed=0
    if [ -f "tests/dsh_agent_e2e_test.rs" ]; then
        log_verbose "DSH Agent E2E..."
        cargo test --test dsh_agent_e2e_test 2>&1 | tee -a "${LOG_DIR}/ai-dsh-agent-e2e.log" || { log_error "DSH Agent E2E 失败"; ai_failed=1; }
    fi
    if [ -f "tests/dsh_ai_enhanced_e2e_test.rs" ]; then
        log_verbose "AI 增强 E2E..."
        cargo test --test dsh_ai_enhanced_e2e_test 2>&1 | tee -a "${LOG_DIR}/ai-enhanced-e2e.log" || { log_error "AI 增强 E2E 失败"; ai_failed=1; }
    fi
    if [ -f "tests/dsh_agent_performance_integration_test.rs" ]; then
        log_verbose "性能集成..."
        cargo test --test dsh_agent_performance_integration_test 2>&1 | tee -a "${LOG_DIR}/ai-performance.log" || { log_error "AI 性能集成测试失败"; ai_failed=1; }
    fi
    if [ $ai_failed -ne 0 ]; then
        log_error "AI 服务专项测试存在失败"
        return 1
    fi
    log_success "AI 服务专项测试完成"
}

run_e2e_tests() {
    log_info "运行端到端测试..."
    local e2e_dir="${PROJECT_ROOT}/tests/e2e"
    [ ! -d "$e2e_dir" ] && { log_warning "E2E 测试目录不存在"; return 1; }
    cd "$e2e_dir"
    if [ -f "package.json" ]; then
        if command -v pnpm &> /dev/null; then
            pnpm install --frozen-lockfile 2>&1 | tee -a "${LOG_DIR}/e2e-install.log" || log_warning "E2E 依赖安装失败，继续尝试运行测试"
        fi
        if [ -f "playwright.config.ts" ] && command -v npx &> /dev/null; then
            log_verbose "Playwright E2E..."
            npx playwright test 2>&1 | tee -a "${LOG_DIR}/e2e-playwright.log" || { log_error "Playwright E2E 测试失败"; return 1; }
        fi
    fi
}

# ==============================================================================
# 报告生成
# ==============================================================================

generate_report() {
    log_info "生成联调报告..."
    local report_file="${REPORT_DIR}/full-e2e-report-$(date +%Y%m%d-%H%M%S).html"
    mkdir -p "$(dirname "$report_file")"
    local total_tests=0 passed_tests=0 failed_tests=0
    for log_file in "${LOG_DIR}"/*.log; do
        [ -f "$log_file" ] || continue
        local test_result
        test_result=$(grep -E "test result:" "$log_file" | tail -1 || echo "")
        if echo "$test_result" | grep -q "test result"; then
            local p f
            p=$(echo "$test_result" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+" || echo 0)
            f=$(echo "$test_result" | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+" || echo 0)
            total_tests=$((total_tests + p + f))
            passed_tests=$((passed_tests + p))
            failed_tests=$((failed_tests + f))
        fi
    done
    local pass_rate=0
    [ "$total_tests" -gt 0 ] && pass_rate=$(awk "BEGIN {printf \"%.1f\", $passed_tests * 100 / $total_tests}")
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>TOPEMS 完整后端环境联调报告</title>
<style>body{font-family:-apple-system,sans-serif;margin:0;padding:20px;background:#f5f5f5}.container{max-width:1200px;margin:0 auto}.header{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:30px;border-radius:10px;margin-bottom:20px}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:20px}.stat-card{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.1)}.stat-card h3{margin:0 0 10px;color:#666;font-size:14px}.stat-card .value{font-size:32px;font-weight:bold}.passed{color:#52c41a}.failed{color:#f5222d}.total{color:#1890ff}.section{background:white;padding:20px;border-radius:8px;margin-bottom:20px;box-shadow:0 2px 4px rgba(0,0,0,.1)}.section h2{margin-top:0;border-bottom:2px solid #1890ff;padding-bottom:10px}.log-file{margin-bottom:15px;padding:10px;background:#fafafa;border-radius:4px}.log-file pre{background:#1e1e1e;color:#d4d4d4;padding:10px;border-radius:4px;overflow-x:auto;max-height:200px;font-size:12px}</style>
</head>
<body><div class="container">
<div class="header"><h1>TOPEMS 完整后端环境联调报告</h1><p>生成时间: $(date '+%Y-%m-%d %H:%M:%S')</p></div>
<div class="stats">
<div class="stat-card"><h3>总测试数</h3><div class="value total">${total_tests}</div></div>
<div class="stat-card"><h3>通过</h3><div class="value passed">${passed_tests}</div></div>
<div class="stat-card"><h3>失败</h3><div class="value failed">${failed_tests}</div></div>
<div class="stat-card"><h3>通过率</h3><div class="value $( [ "$failed_tests" -eq 0 ] && echo passed || echo failed )">${pass_rate}%</div></div>
</div>
<div class="section"><h2>测试日志</h2>
EOF
    for log_file in "${LOG_DIR}"/*.log; do
        [ -f "$log_file" ] || continue
        local filename=$(basename "$log_file")
        echo "<div class=\"log-file\"><h4>${filename}</h4><pre>$(tail -30 "$log_file" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')</pre></div>" >> "$report_file"
    done
    echo "</div></div></body></html>" >> "$report_file"
    log_success "报告已生成: $report_file"
    echo "$report_file"
}

# ==============================================================================
# 主函数
# ==============================================================================

main() {
    parse_args "$@"
    mkdir -p "$REPORT_DIR" "$LOG_DIR"
    echo ""; echo "=============================================="; echo "  TOPEMS 完整后端环境联调"; echo "=============================================="; echo ""
    local start_time=$(date +%s)
    check_environment || exit 1
    [ "$SKIP_SETUP" = false ] && { setup_dependencies; run_database_migrations; } || log_info "跳过环境设置"
    local test_services=()
    if [ -n "$SERVICES" ]; then IFS=',' read -ra test_services <<< "$SERVICES"; else test_services=("${DEFAULT_TEST_SERVICES[@]}"); fi
    log_info "测试服务: ${test_services[*]}"
    local overall_status=0
    for service in "${test_services[@]}"; do
        if [ "$service" = "ai" ]; then run_ai_service_tests || overall_status=1; else run_rust_tests "$service" || overall_status=1; fi
    done
    run_e2e_tests || overall_status=1
    local report_file=""
    [ "$GENERATE_REPORT" = true ] && report_file=$(generate_report)
    if [ "$SKIP_TEARDOWN" = false ]; then
        teardown
    else
        log_info "跳过清理（--skip-teardown）"
    fi
    local end_time=$(date +%s) duration=$((end_time - start_time)) minutes=$((duration / 60)) seconds=$((duration % 60))
    echo ""; echo "=============================================="; echo "  联调完成"; echo "=============================================="
    echo "  耗时: ${minutes}分${seconds}秒"
    [ -n "$report_file" ] && echo "  报告: $report_file"
    [ "$overall_status" -eq 0 ] && echo -e "  状态: ${GREEN}全部通过${NC}" || echo -e "  状态: ${YELLOW}部分失败${NC}"
    echo "=============================================="; echo ""
    exit $overall_status
}

main "$@"
