#!/bin/bash
# 文件: scripts/run-tests.sh
# TOPEMS 测试运行工具

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[TEST]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# 获取所有有测试的服务
get_services_with_tests() {
    local services=()
    for dir in svc/*/; do
        local svc_name=$(basename "$dir")
        if [ -d "$dir/tests" ] && [ "$(ls -A "$dir/tests" 2>/dev/null | wc -l)" -gt 0 ]; then
            services+=("$svc_name")
        fi
    done
    echo "${services[@]}"
}

check_dependencies() {
    step "检查测试依赖..."
    
    if ! command -v cargo &> /dev/null; then
        error "未找到 cargo，请安装 Rust"
    fi
    
    if ! command -v cargo-nextest &> /dev/null; then
        warn "未找到 cargo-nextest，使用标准 cargo test"
        USE_NEXTEST=false
    else
        USE_NEXTEST=true
    fi
    
    log "依赖检查完成"
}

run_unit_tests() {
    step "运行单元测试..."
    
    if [ "$USE_NEXTEST" = true ]; then
        cargo nextest run --workspace --no-fail-fast --test-threads=4
    else
        cargo test --workspace --no-fail-fast
    fi
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✓${NC} 单元测试通过"
    else
        error "单元测试失败"
    fi
}

run_integration_tests() {
    step "运行集成测试..."
    
    # 获取所有有测试的服务
    local services=($(get_services_with_tests))
    
    log "发现 ${#services[@]} 个服务有测试"
    
    local passed=0
    local failed=0
    
    for service in "${services[@]}"; do
        svc_dir="$PROJECT_ROOT/svc/$service"
        log "运行 $service 集成测试..."
        
        cd "$svc_dir"
        
        if cargo test --quiet 2>&1 | tail -n 1 | grep -q "test result:"; then
            local result=$(cargo test --quiet 2>&1 | tail -n 1)
            echo -e "     ${GREEN}✓${NC} $result"
            ((passed++))
        else
            echo -e "     ${RED}✗${NC} 测试失败"
            ((failed++))
            FAILED+=("$service")
        fi
        
        cd - > /dev/null 2>&1
    done
    
    echo ""
    log "集成测试完成: ${GREEN}$passed 通过${NC}, ${RED}$failed 失败${NC}"
    
    if [ $failed -gt 0 ]; then
        error "部分集成测试失败"
    fi
}

run_coverage() {
    step "生成测试覆盖率报告..."
    
    if ! command -v cargo-llvm-cov &> /dev/null; then
        warn "未找到 cargo-llvm-cov，正在安装..."
        cargo install cargo-llvm-cov --locked
    fi
    
    cargo llvm-cov clean --workspace
    cargo llvm-cov run --workspace --no-fail-fast
    cargo llvm-cov report --lcov --output-path lcov.info
    cargo llvm-cov show --html --output-dir target/coverage/html
    
    log "${GREEN}✓${NC} 覆盖率报告生成完成"
    log "HTML 报告: file://$PROJECT_ROOT/target/coverage/html/index.html"
    log "LCOV 报告: file://$PROJECT_ROOT/lcov.info"
}

run_static_analysis() {
    step "运行静态分析..."
    
    cargo clippy --workspace --all-targets -- -D warnings
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✓${NC} 静态分析通过"
    else
        error "静态分析失败"
    fi
}

run_format_check() {
    step "检查代码格式..."
    
    cargo fmt --check
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✓${NC} 代码格式检查通过"
    else
        error "代码格式检查失败，运行 cargo fmt 修复"
    fi
}

run_all() {
    log "运行完整测试套件..."
    
    run_format_check
    run_static_analysis
    run_unit_tests
    run_integration_tests
    
    echo ""
    echo "=============================================="
    echo -e "${GREEN}✅ 所有测试通过!${NC}"
    echo "=============================================="
}

show_usage() {
    echo "用法: $0 <command>"
    echo ""
    echo "命令:"
    echo "  all           运行所有测试（格式检查+静态分析+单元测试+集成测试）"
    echo "  unit          仅运行单元测试"
    echo "  integration   仅运行集成测试"
    echo "  coverage      生成测试覆盖率报告"
    echo "  lint          运行静态分析 (clippy)"
    echo "  format        检查代码格式"
    echo ""
    echo "示例:"
    echo "  $0 all              # 运行完整测试套件"
    echo "  $0 unit             # 仅运行单元测试"
    echo "  $0 coverage         # 生成覆盖率报告"
    echo ""
}

# 主命令处理
USE_NEXTEST=false
FAILED=()

case "${1:-help}" in
    all)
        check_dependencies
        run_all
        ;;
    unit)
        check_dependencies
        run_unit_tests
        ;;
    integration)
        check_dependencies
        run_integration_tests
        ;;
    coverage)
        check_dependencies
        run_coverage
        ;;
    lint)
        run_static_analysis
        ;;
    format)
        run_format_check
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        error "未知命令: $1"
        ;;
esac
