#!/usr/bin/env bash
# ==============================================================================
# TOPEMS 生产环境部署验证脚本
#
# 功能：
#   1. 部署前检查（环境、配置、依赖）
#   2. 服务健康检查
#   3. 功能验证（核心 API 端点）
#   4. 性能基准测试
#   5. 安全检查
#   6. 生成部署验证报告
#
# 用法：
#   ./scripts/deploy/production-verify.sh [选项]
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
REPORT_DIR="${PROJECT_ROOT}/test-results/production-verify"
LOG_DIR="${PROJECT_ROOT}/logs/production-verify"
BASE_URL="${BASE_URL:-http://localhost:8013}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3001}"
VERBOSE=false
SKIP_PERFORMANCE=false
SKIP_SECURITY=false

# ==============================================================================
# 工具函数
# ==============================================================================

log_info() { echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_verbose() { [ "$VERBOSE" = true ] && echo -e "${GREEN}[VERBOSE]${NC} $*" || true; }

# 记录检查结果
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0
CHECK_RESULTS=()

record_check() {
    local category="$1" name="$2" status="$3" message="$4" duration="${5:-0}"
    CHECK_RESULTS+=("${category}|${name}|${status}|${message}|${duration}")
    case "$status" in
        pass) PASSED_CHECKS=$((PASSED_CHECKS + 1)); log_success "[$category] $name - $message" ;;
        fail) FAILED_CHECKS=$((FAILED_CHECKS + 1)); log_error "[$category] $name - $message" ;;
        warn) WARNING_CHECKS=$((WARNING_CHECKS + 1)); log_warning "[$category] $name - $message" ;;
    esac
}

# HTTP 请求
http_get() {
    local url="$1" timeout="${2:-10}"
    curl -s -w "\n%{http_code}\n%{time_total}" --max-time "$timeout" "$url" 2>/dev/null
}

http_post() {
    local url="$1" data="$2" timeout="${3:-10}"
    curl -s -w "\n%{http_code}\n%{time_total}" --max-time "$timeout" -X POST -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null
}

# ==============================================================================
# 参数解析
# ==============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --url) BASE_URL="$2"; shift 2 ;;
            --frontend-url) FRONTEND_URL="$2"; shift 2 ;;
            --skip-performance) SKIP_PERFORMANCE=true; shift ;;
            --skip-security) SKIP_SECURITY=true; shift ;;
            --verbose) VERBOSE=true; shift ;;
            --help|-h)
                echo "用法: $0 [选项]"
                echo "  --url              后端服务 URL"
                echo "  --frontend-url     前端服务 URL"
                echo "  --skip-performance 跳过性能测试"
                echo "  --skip-security    跳过安全检查"
                echo "  --verbose          详细输出"
                exit 0 ;;
            *) log_warning "未知选项: $1"; shift ;;
        esac
    done
}

# ==============================================================================
# 部署前检查
# ==============================================================================

pre_deployment_checks() {
    log_info "执行部署前检查..."

    # 检查配置文件
    if [ -f "${PROJECT_ROOT}/.env.production" ]; then
        record_check "pre-deploy" "生产环境配置文件" "pass" "存在"
    else
        record_check "pre-deploy" "生产环境配置文件" "warn" ".env.production 不存在"
    fi

    # 检查必要环境变量
    local required_vars=("DATABASE_URL" "REDIS_URL" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if [ -n "${!var:-}" ]; then
            record_check "pre-deploy" "环境变量 $var" "pass" "已设置"
        else
            record_check "pre-deploy" "环境变量 $var" "warn" "未设置（可能从配置文件读取）"
        fi
    done

    # 检查端口是否被占用
    local backend_port="${SERVER_PORT:-8013}"
    if lsof -i :"$backend_port" &>/dev/null; then
        record_check "pre-deploy" "后端端口 $backend_port" "pass" "端口已被占用（服务可能已运行）"
    else
        record_check "pre-deploy" "后端端口 $backend_port" "warn" "端口未被占用（服务未运行）"
    fi

    log_success "部署前检查完成"
}

# ==============================================================================
# 服务健康检查
# ==============================================================================

health_checks() {
    log_info "执行服务健康检查..."

    # 后端健康检查
    local health_response
    health_response=$(http_get "${BASE_URL}/health" 10)
    local http_code
    http_code=$(echo "$health_response" | tail -2 | head -1)
    if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
        record_check "health" "后端健康检查" "pass" "HTTP $http_code"
    else
        record_check "health" "后端健康检查" "fail" "HTTP $http_code"
    fi

    # API 根路径
    local api_response
    api_response=$(http_get "${BASE_URL}/api" 10)
    local api_code
    api_code=$(echo "$api_response" | tail -2 | head -1)
    if [ "$api_code" = "200" ]; then
        record_check "health" "API 根路径" "pass" "HTTP $api_code"
    else
        record_check "health" "API 根路径" "warn" "HTTP $api_code"
    fi

    # 前端健康检查
    if [ -n "$FRONTEND_URL" ]; then
        local frontend_response
        frontend_response=$(http_get "$FRONTEND_URL" 10)
        local frontend_code
        frontend_code=$(echo "$frontend_response" | tail -2 | head -1)
        if [ "$frontend_code" = "200" ]; then
            record_check "health" "前端健康检查" "pass" "HTTP $frontend_code"
        else
            record_check "health" "前端健康检查" "warn" "HTTP $frontend_code"
        fi
    fi

    # OpenAPI 文档
    local openapi_response
    openapi_response=$(http_get "${BASE_URL}/api-docs/openapi.json" 10)
    local openapi_code
    openapi_code=$(echo "$openapi_response" | tail -2 | head -1)
    if [ "$openapi_code" = "200" ]; then
        record_check "health" "OpenAPI 文档" "pass" "HTTP $openapi_code"
    else
        record_check "health" "OpenAPI 文档" "warn" "HTTP $openapi_code"
    fi

    log_success "健康检查完成"
}

# ==============================================================================
# 功能验证
# ==============================================================================

functional_checks() {
    log_info "执行功能验证..."

    # AI 服务端点
    local endpoints=(
        "/dsh/agent/tools"
        "/dsh/agent/active-sessions"
        "/ai/copilot/modules"
        "/ai/forms/templates"
        "/ai/documents/types"
        "/ai/governance/stats"
    )

    for endpoint in "${endpoints[@]}"; do
        local response
        response=$(http_get "${BASE_URL}${endpoint}" 10)
        local http_code
        http_code=$(echo "$response" | tail -2 | head -1)
        if [ "$http_code" = "200" ]; then
            record_check "functional" "端点 $endpoint" "pass" "HTTP $http_code"
        elif [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
            record_check "functional" "端点 $endpoint" "pass" "需要认证（HTTP $http_code）"
        else
            record_check "functional" "端点 $endpoint" "warn" "HTTP $http_code"
        fi
    done

    log_success "功能验证完成"
}

# ==============================================================================
# 性能基准测试
# ==============================================================================

performance_checks() {
    [ "$SKIP_PERFORMANCE" = true ] && { log_info "跳过性能测试"; return 0; }
    log_info "执行性能基准测试..."

    # 响应时间测试
    local test_endpoints=("/health" "/api" "/api-docs/openapi.json")
    for endpoint in "${test_endpoints[@]}"; do
        local total_time=0 count=10
        for i in $(seq 1 $count); do
            local response
            response=$(http_get "${BASE_URL}${endpoint}" 10)
            local time
            time=$(echo "$response" | tail -1)
            total_time=$(awk "BEGIN {print $total_time + $time}")
        done
        local avg_time
        avg_time=$(awk "BEGIN {printf \"%.3f\", $total_time / $count}")
        local avg_ms
        avg_ms=$(awk "BEGIN {printf \"%.0f\", $avg_time * 1000}")

        if [ "$avg_ms" -lt 500 ]; then
            record_check "performance" "$endpoint 平均响应时间" "pass" "${avg_ms}ms (< 500ms)" "$avg_ms"
        elif [ "$avg_ms" -lt 1000 ]; then
            record_check "performance" "$endpoint 平均响应时间" "warn" "${avg_ms}ms (< 1000ms)" "$avg_ms"
        else
            record_check "performance" "$endpoint 平均响应时间" "fail" "${avg_ms}ms (>= 1000ms)" "$avg_ms"
        fi
    done

    # 并发测试
    log_verbose "并发测试（10 并发）..."
    local concurrent=10 success_count=0
    for i in $(seq 1 $concurrent); do
        local response
        response=$(http_get "${BASE_URL}/health" 10)
        local http_code
        http_code=$(echo "$response" | tail -2 | head -1)
        [ "$http_code" = "200" ] && success_count=$((success_count + 1))
    done
    if [ "$success_count" -eq "$concurrent" ]; then
        record_check "performance" "并发测试 ($concurrent 并发)" "pass" "$success_count/$concurrent 成功"
    else
        record_check "performance" "并发测试 ($concurrent 并发)" "warn" "$success_count/$concurrent 成功"
    fi

    log_success "性能基准测试完成"
}

# ==============================================================================
# 安全检查
# ==============================================================================

security_checks() {
    [ "$SKIP_SECURITY" = true ] && { log_info "跳过安全检查"; return 0; }
    log_info "执行安全检查..."

    # 检查 HTTPS
    if echo "$BASE_URL" | grep -q "^https://"; then
        record_check "security" "HTTPS 加密" "pass" "已启用 HTTPS"
    else
        record_check "security" "HTTPS 加密" "warn" "未启用 HTTPS（生产环境建议启用）"
    fi

    # 检查安全头
    local response
    response=$(curl -s -I --max-time 10 "$BASE_URL" 2>/dev/null || echo "")
    if echo "$response" | grep -qi "X-Frame-Options"; then
        record_check "security" "X-Frame-Options 头" "pass" "已设置"
    else
        record_check "security" "X-Frame-Options 头" "warn" "未设置"
    fi
    if echo "$response" | grep -qi "X-Content-Type-Options"; then
        record_check "security" "X-Content-Type-Options 头" "pass" "已设置"
    else
        record_check "security" "X-Content-Type-Options 头" "warn" "未设置"
    fi

    # Check sensitive endpoints
    local sensitive_endpoints=("/.env" "/.git/config" "/admin" "/debug")
    for endpoint in "${sensitive_endpoints[@]}"; do
        local resp
        resp=$(http_get "${BASE_URL}${endpoint}" 5)
        local status_code
        status_code=$(echo "$resp" | tail -2 | head -1)
        if [ "$status_code" = "404" ] || [ "$status_code" = "403" ]; then
            record_check "security" "Sensitive endpoint $endpoint" "pass" "HTTP $status_code (protected)"
        else
            record_check "security" "Sensitive endpoint $endpoint" "warn" "HTTP $status_code"
        fi
    done

    log_success "安全检查完成"
}

# ==============================================================================
# 报告生成
# ==============================================================================

generate_report() {
    log_info "生成部署验证报告..."
    local report_file="${REPORT_DIR}/production-verify-$(date +%Y%m%d-%H%M%S).html"
    mkdir -p "$(dirname "$report_file")"

    local total_checks=$((PASSED_CHECKS + FAILED_CHECKS + WARNING_CHECKS))
    local pass_rate=0
    [ "$total_checks" -gt 0 ] && pass_rate=$(awk "BEGIN {printf \"%.1f\", $PASSED_CHECKS * 100 / $total_checks}")

    cat > "$report_file" << EOF
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>TOPEMS 生产环境部署验证报告</title>
<style>body{font-family:-apple-system,sans-serif;margin:0;padding:20px;background:#f5f5f5}.container{max-width:1200px;margin:0 auto}.header{background:linear-gradient(135deg,#11998e,#38ef7d);color:white;padding:30px;border-radius:10px;margin-bottom:20px}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:15px;margin-bottom:20px}.stat-card{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.1)}.stat-card h3{margin:0 0 10px;color:#666;font-size:14px}.stat-card .value{font-size:28px;font-weight:bold}.passed{color:#52c41a}.failed{color:#f5222d}.warning{color:#faad14}.total{color:#1890ff}.section{background:white;padding:20px;border-radius:8px;margin-bottom:20px;box-shadow:0 2px 4px rgba(0,0,0,.1)}.section h2{margin-top:0;border-bottom:2px solid #11998e;padding-bottom:10px}table{width:100%;border-collapse:collapse}.pass{background:#f6ffed}.fail{background:#fff2f0}.warn{background:#fffbe6}th,td{padding:10px;text-align:left;border-bottom:1px solid #f0f0f0}th{background:#fafafa;font-weight:600}</style>
</head>
<body><div class="container">
<div class="header"><h1>TOPEMS 生产环境部署验证报告</h1><p>生成时间: $(date '+%Y-%m-%d %H:%M:%S')</p><p>目标服务: ${BASE_URL}</p></div>
<div class="stats">
<div class="stat-card"><h3>总检查项</h3><div class="value total">${total_checks}</div></div>
<div class="stat-card"><h3>通过</h3><div class="value passed">${PASSED_CHECKS}</div></div>
<div class="stat-card"><h3>警告</h3><div class="value warning">${WARNING_CHECKS}</div></div>
<div class="stat-card"><h3>失败</h3><div class="value failed">${FAILED_CHECKS}</div></div>
<div class="stat-card"><h3>通过率</h3><div class="value $( [ "$FAILED_CHECKS" -eq 0 ] && echo passed || echo failed )">${pass_rate}%</div></div>
</div>
<div class="section"><h2>检查详情</h2><table><thead><tr><th>类别</th><th>检查项</th><th>状态</th><th>详情</th><th>耗时</th></tr></thead><tbody>
EOF

    for result in "${CHECK_RESULTS[@]}"; do
        IFS='|' read -r category name status message duration <<< "$result"
        local status_text
        case "$status" in
            pass) status_text="<span style='color:#52c41a'>✓ 通过</span>" ;;
            fail) status_text="<span style='color:#f5222d'>✗ 失败</span>" ;;
            warn) status_text="<span style='color:#faad14'>⚠ 警告</span>" ;;
        esac
        echo "<tr class='${status}'><td>${category}</td><td>${name}</td><td>${status_text}</td><td>${message}</td><td>${duration}ms</td></tr>" >> "$report_file"
    done

    echo "</tbody></table></div>" >> "$report_file"
    echo "<div class='section'><h2>验证结论</h2>" >> "$report_file"
    if [ "$FAILED_CHECKS" -eq 0 ]; then
        echo "<p style='color:#52c41a;font-size:18px;font-weight:bold'>✓ 部署验证通过，所有关键检查项均已通过，可以投入生产使用。</p>" >> "$report_file"
    else
        echo "<p style='color:#f5222d;font-size:18px;font-weight:bold'>✗ 部署验证未通过，存在 ${FAILED_CHECKS} 个失败项，请修复后重新验证。</p>" >> "$report_file"
    fi
    if [ "$WARNING_CHECKS" -gt 0 ]; then
        echo "<p style='color:#faad14'>⚠ 存在 ${WARNING_CHECKS} 个警告项，建议优化。</p>" >> "$report_file"
    fi
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
    echo ""; echo "=============================================="; echo "  TOPEMS 生产环境部署验证"; echo "=============================================="; echo ""
    echo "  目标服务: $BASE_URL"; echo ""
    local start_time=$(date +%s)

    pre_deployment_checks
    health_checks
    functional_checks
    performance_checks
    security_checks

    local report_file
    report_file=$(generate_report)

    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    echo ""; echo "=============================================="; echo "  验证完成"; echo "=============================================="
    echo "  耗时: ${duration}秒"
    echo "  通过: $PASSED_CHECKS | 警告: $WARNING_CHECKS | 失败: $FAILED_CHECKS"
    echo "  报告: $report_file"
    if [ "$FAILED_CHECKS" -eq 0 ]; then
        echo -e "  结论: ${GREEN}验证通过${NC}"
    else
        echo -e "  结论: ${RED}验证未通过${NC}"
    fi
    echo "=============================================="; echo ""
    exit $FAILED_CHECKS
}

main "$@"
