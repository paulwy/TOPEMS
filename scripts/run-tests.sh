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

check_dependencies() {
    step "检查测试依赖..."
    
    if ! command -v cargo &> /dev/null; then
        error "未找到 cargo，请安装 Rust"
    fi
    
    if ! command -v cargo-nextest &> /dev/null; then
        warn "未找到 cargo-nextest，正在安装..."
        cargo install cargo-nextest --locked
    fi
    
    if ! command -v cargo-llvm-cov &> /dev/null; then
        warn "未找到 cargo-llvm-cov，正在安装..."
        cargo install cargo-llvm-cov --locked
    fi
    
    log "依赖检查完成"
}

run_unit_tests() {
    step "运行单元测试..."
    
    cargo nextest run --all --no-fail-fast --test-threads=4
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✓${NC} 单元测试通过"
    else
        error "单元测试失败"
    fi
}

run_integration_tests() {
    step "运行集成测试..."
    
    local services=(
        "iam"
        "hrm"
        "erp"
        "crm"
        "doc"
    )
    
    for service in "${services[@]}"; do
        svc_dir="$PROJECT_ROOT/svc/$service"
        if [ -d "$svc_dir/tests" ]; then
            log "运行 $service 集成测试..."
            cd "$svc_dir"
            cargo nextest run --test '*_tests' --no-fail-fast
            
            if [ $? -ne 0 ]; then
                error "$service 集成测试失败"
            fi
        else
            warn "跳过 $service：无测试目录"
        fi
    done
    
    cd "$PROJECT_ROOT"
    log "${GREEN}✓${NC} 集成测试通过"
}

run_coverage() {
    step "生成测试覆盖率报告..."
    
    cargo llvm-cov clean --workspace
    cargo llvm-cov run --all --no-fail-fast
    cargo llvm-cov report --lcov --output-path lcov.info
    cargo llvm-cov show --html --output-dir target/coverage/html
    
    log "${GREEN}✓${NC} 覆盖率报告生成完成"
    log "HTML 报告: file://$PROJECT_ROOT/target/coverage/html/index.html"
    log "LCOV 报告: file://$PROJECT_ROOT/lcov.info"
}

run_mutation_tests() {
    step "运行变异测试..."
    
    if ! command -v cargo-mutants &> /dev/null; then
        warn "未找到 cargo-mutants，正在安装..."
        cargo install cargo-mutants --locked
    fi
    
    cargo mutants --all-targets --output-format=html
    
    log "${GREEN}✓${NC} 变异测试完成"
}

run_static_analysis() {
    step "运行静态分析..."
    
    cargo clippy --all --all-targets -- -D warnings
    
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
    run_coverage
    
    echo ""
    echo "=============================================="
    echo -e "${GREEN}✅ 所有测试通过!${NC}"
    echo "=============================================="
}

show_usage() {
    echo "用法: $0 <command>"
    echo ""
    echo "命令:"
    echo "  all           运行所有测试（格式检查+静态分析+单元测试+集成测试+覆盖率）"
    echo "  unit          仅运行单元测试"
    echo "  integration   仅运行集成测试"
    echo "  coverage      生成测试覆盖率报告"
    echo "  mutation      运行变异测试"
    echo "  lint          运行静态分析 (clippy)"
    echo "  format        检查代码格式"
    echo ""
    echo "示例:"
    echo "  $0 all              # 运行完整测试套件"
    echo "  $0 unit             # 仅运行单元测试"
    echo "  $0 coverage         # 生成覆盖率报告"
    echo ""
}

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
    mutation)
        check_dependencies
        run_mutation_tests
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