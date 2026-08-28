#!/bin/bash
# TOPEMS 多场景性能测试运行脚本
#
# 功能：
# 1. 运行 smoke（烟雾测试）、average（平均负载）、stress（压力测试）三种场景
# 2. 支持单个测试脚本或全部测试脚本
# 3. 自动生成性能测试报告
# 4. 支持自定义基础 URL 和并发用户数
#
# 用法:
#   ./run-performance-tests.sh              # 运行所有测试脚本的 smoke 场景
#   ./run-performance-tests.sh --scenario average  # 运行 average 场景
#   ./run-performance-tests.sh --scenario stress   # 运行 stress 场景
#   ./run-performance-tests.sh --all        # 运行所有场景（smoke + average + stress）
#   ./run-performance-tests.sh --test ai-service-actual  # 只运行指定测试
#   ./run-performance-tests.sh --base-url http://localhost:8013  # 自定义基础 URL
#
# 前置条件：
# 1. 已安装 k6（brew install k6）
# 2. 后端服务已启动并可访问
# 3. 数据库和缓存服务已启动

set -euo pipefail

# ==================== 配置 ====================

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 项目根目录（scripts/performance -> scripts -> 项目根目录）
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# 性能测试目录
PERF_TEST_DIR="$PROJECT_DIR/tests/performance"
# 报告输出目录
REPORT_DIR="$PROJECT_DIR/tests/performance/reports"
# 日志目录
LOG_DIR="$PROJECT_DIR/tests/performance/logs"

# 默认配置
DEFAULT_BASE_URL="http://localhost:8013"
DEFAULT_SCENARIO="smoke"

# 场景配置（使用函数替代关联数组以兼容 macOS bash 3.x）
get_scenario_desc() {
    case "$1" in
        smoke) echo "5 VUs, 30秒" ;;
        average) echo "20 VUs, 2分钟" ;;
        stress) echo "50 VUs, 3分钟" ;;
        *) echo "未知场景" ;;
    esac
}

is_valid_scenario() {
    case "$1" in
        smoke|average|stress) return 0 ;;
        *) return 1 ;;
    esac
}

# 可用的测试脚本
TEST_SCRIPTS=(
    "ai-service-actual"
    "ai-business-copilot"
    "ai-business-intelligence-comprehensive"
    "ai-governance-dashboard"
    "ai-dsh-service"
)

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==================== 函数 ====================

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 打印分隔线
print_separator() {
    echo "============================================================"
}

# 检查前置条件
check_prerequisites() {
    print_info "检查前置条件..."
    
    # 检查 k6 是否安装
    if ! command -v k6 &> /dev/null; then
        print_error "k6 未安装。请运行: brew install k6"
        exit 1
    fi
    print_success "k6 已安装: $(k6 version | head -1)"
    
    # 检查后端服务是否可访问
    if curl -s -m 5 "$BASE_URL/health" > /dev/null 2>&1; then
        print_success "后端服务可访问: $BASE_URL"
    else
        print_warning "后端服务不可访问: $BASE_URL"
        print_warning "测试可能会失败。请确保后端服务已启动。"
        read -p "是否继续？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # 创建输出目录
    mkdir -p "$REPORT_DIR"
    mkdir -p "$LOG_DIR"
    
    print_success "前置条件检查完成"
}

# 运行单个测试
run_test() {
    local test_name="$1"
    local scenario="$2"
    local test_file="$PERF_TEST_DIR/${test_name}.k6.js"
    local report_file="$REPORT_DIR/${test_name}_${scenario}_$(date +%Y%m%d_%H%M%S).json"
    local log_file="$LOG_DIR/${test_name}_${scenario}_$(date +%Y%m%d_%H%M%S).log"
    
    print_separator
    print_info "运行测试: $test_name"
    print_info "场景: $scenario ($(get_scenario_desc "$scenario"))"
    print_info "测试文件: $test_file"
    print_info "报告文件: $report_file"
    
    # 检查测试文件是否存在
    if [ ! -f "$test_file" ]; then
        print_error "测试文件不存在: $test_file"
        return 1
    fi
    
    # 运行 k6 测试
    local start_time=$(date +%s)
    
    if k6 run \
        --env BASE_URL="$BASE_URL" \
        --env SCENARIO="$scenario" \
        --out json="$report_file" \
        "$test_file" 2>&1 | tee "$log_file"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "测试完成: $test_name ($duration 秒)"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_error "测试失败: $test_name ($duration 秒)"
        print_error "查看日志: $log_file"
        return 1
    fi
}

# 运行所有测试
run_all_tests() {
    local scenario="$1"
    local passed=0
    local failed=0
    local results=()
    
    print_separator
    print_info "开始运行所有测试 (场景: $scenario)"
    print_separator
    
    for test_name in "${TEST_SCRIPTS[@]}"; do
        if run_test "$test_name" "$scenario"; then
            passed=$((passed + 1))
            results+=("✅ $test_name")
        else
            failed=$((failed + 1))
            results+=("❌ $test_name")
        fi
        echo ""
    done
    
    print_separator
    print_info "测试结果汇总 (场景: $scenario)"
    print_separator
    for result in "${results[@]}"; do
        echo "  $result"
    done
    print_separator
    print_success "通过: $passed"
    if [ $failed -gt 0 ]; then
        print_error "失败: $failed"
    else
        print_success "失败: $failed"
    fi
    print_separator
    
    if [ $failed -gt 0 ]; then
        return 1
    fi
    return 0
}

# 运行所有场景
run_all_scenarios() {
    local test_name="${1:-all}"
    local scenarios=("smoke" "average" "stress")
    
    for scenario in "${scenarios[@]}"; do
        print_separator
        print_info "运行场景: $scenario"
        print_separator
        
        if [ "$test_name" = "all" ]; then
            run_all_tests "$scenario" || true
        else
            run_test "$test_name" "$scenario" || true
        fi
    done
}

# 生成性能测试汇总报告
generate_summary_report() {
    local report_file="$REPORT_DIR/summary_$(date +%Y%m%d_%H%M%S).md"
    
    print_info "生成性能测试汇总报告: $report_file"
    
    cat > "$report_file" << EOF
# TOPEMS 性能测试汇总报告

**生成时间:** $(date '+%Y-%m-%d %H:%M:%S')
**基础 URL:** $BASE_URL
**测试环境:** $(uname -s) $(uname -m)

## 测试场景配置

| 场景 | 并发用户数 | 持续时间 | 说明 |
|------|-----------|---------|------|
| smoke | 5 VUs | 30秒 | 烟雾测试，验证基本功能 |
| average | 20 VUs | 2分钟 | 平均负载测试，模拟正常使用 |
| stress | 50 VUs | 3分钟 | 压力测试，验证系统极限 |

## 性能阈值

| 指标 | 阈值 | 说明 |
|------|------|------|
| p(95) 响应时间 | < 2000ms | 95% 请求响应时间 |
| p(99) 响应时间 | < 5000ms | 99% 请求响应时间 |
| 错误率 | < 10% | 请求失败率 |

## 测试脚本

| 脚本名称 | 说明 |
|---------|------|
EOF
    
    for test_name in "${TEST_SCRIPTS[@]}"; do
        echo "| $test_name |  |" >> "$report_file"
    done
    
    cat >> "$report_file" << EOF

## 使用说明

### 运行单个场景

\`\`\`bash
# 运行烟雾测试
./run-performance-tests.sh --scenario smoke

# 运行平均负载测试
./run-performance-tests.sh --scenario average

# 运行压力测试
./run-performance-tests.sh --scenario stress
\`\`\`

### 运行所有场景

\`\`\`bash
./run-performance-tests.sh --all
\`\`\`

### 运行指定测试

\`\`\`bash
./run-performance-tests.sh --test ai-service-actual --scenario average
\`\`\`

### 自定义基础 URL

\`\`\`bash
./run-performance-tests.sh --base-url http://your-server:8013
\`\`\`

## 注意事项

1. 运行性能测试前，请确保后端服务已启动并可访问
2. 压力测试可能会对服务器造成较大负载，请在测试环境中运行
3. 测试结果会保存在 reports 目录下，日志保存在 logs 目录下
4. 建议在不同时间段多次运行测试，以获得更准确的性能数据

---

*此报告由 TOPEMS 性能测试脚本自动生成*
EOF
    
    print_success "汇总报告已生成: $report_file"
}

# 显示帮助信息
show_help() {
    echo "TOPEMS 多场景性能测试运行脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --scenario <name>   指定测试场景 (smoke/average/stress，默认: smoke)"
    echo "  --all               运行所有场景 (smoke + average + stress)"
    echo "  --test <name>       只运行指定测试脚本"
    echo "  --base-url <url>    自定义基础 URL (默认: http://localhost:8013)"
    echo "  --list              列出所有可用测试脚本"
    echo "  --report            生成性能测试汇总报告"
    echo "  --help              显示此帮助信息"
    echo ""
    echo "场景说明:"
    echo "  smoke    - 烟雾测试 (5 VUs, 30秒)"
    echo "  average  - 平均负载测试 (20 VUs, 2分钟)"
    echo "  stress   - 压力测试 (50 VUs, 3分钟)"
    echo ""
    echo "示例:"
    echo "  $0                                    # 运行所有测试的 smoke 场景"
    echo "  $0 --scenario average                # 运行 average 场景"
    echo "  $0 --all                             # 运行所有场景"
    echo "  $0 --test ai-service-actual          # 只运行指定测试"
    echo "  $0 --base-url http://server:8013    # 自定义基础 URL"
    echo "  $0 --list                            # 列出所有测试脚本"
}

# 列出所有测试脚本
list_tests() {
    echo "可用的性能测试脚本:"
    echo ""
    for test_name in "${TEST_SCRIPTS[@]}"; do
        local test_file="$PERF_TEST_DIR/${test_name}.k6.js"
        if [ -f "$test_file" ]; then
            echo "  ✅ $test_name"
        else
            echo "  ❌ $test_name (文件不存在)"
        fi
    done
}

# ==================== 主程序 ====================

main() {
    local scenario="$DEFAULT_SCENARIO"
    local base_url="$DEFAULT_BASE_URL"
    local test_name="all"
    local run_all=false
    local list_only=false
    local report_only=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --scenario)
                scenario="$2"
                shift 2
                ;;
            --all)
                run_all=true
                shift
                ;;
            --test)
                test_name="$2"
                shift 2
                ;;
            --base-url)
                base_url="$2"
                shift 2
                ;;
            --list)
                list_only=true
                shift
                ;;
            --report)
                report_only=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 设置全局变量
    BASE_URL="$base_url"
    
    # 只列出测试
    if [ "$list_only" = true ]; then
        list_tests
        exit 0
    fi
    
    # 只生成报告
    if [ "$report_only" = true ]; then
        mkdir -p "$REPORT_DIR"
        generate_summary_report
        exit 0
    fi
    
    # 验证场景
    if ! is_valid_scenario "$scenario" && [ "$run_all" = false ]; then
        print_error "未知场景: $scenario"
        print_info "可用场景: smoke, average, stress"
        exit 1
    fi
    
    print_separator
    print_info "TOPEMS 性能测试"
    print_separator
    print_info "基础 URL: $BASE_URL"
    print_info "测试脚本: $test_name"
    if [ "$run_all" = true ]; then
        print_info "运行场景: 所有 (smoke, average, stress)"
    else
        print_info "运行场景: $scenario ($(get_scenario_desc "$scenario"))"
    fi
    print_separator
    
    # 检查前置条件
    check_prerequisites
    
    # 运行测试
    if [ "$run_all" = true ]; then
        run_all_scenarios "$test_name"
    elif [ "$test_name" = "all" ]; then
        run_all_tests "$scenario"
    else
        run_test "$test_name" "$scenario"
    fi
    
    # 生成汇总报告
    generate_summary_report
    
    print_separator
    print_success "性能测试完成！"
    print_info "报告目录: $REPORT_DIR"
    print_info "日志目录: $LOG_DIR"
    print_separator
}

main "$@"
