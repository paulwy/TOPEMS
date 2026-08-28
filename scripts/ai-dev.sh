#!/bin/bash
# TOPEMS DSH AI 模块开发脚本
#
# 用法: ./scripts/ai-dev.sh <command> [options]
#
# 命令:
#   dev              启动 AI 模块开发环境
#   test             运行 AI 模块测试
#   test:coverage    运行测试并生成覆盖率报告
#   lint             运行代码质量检查
#   build            构建 AI 模块
#   clean            清理构建产物
#   docs             生成 API 文档
#   health           健康检查
#   help             显示帮助信息

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# 显示帮助
show_help() {
    cat << EOF
TOPEMS DSH AI 模块开发脚本

用法: ./scripts/ai-dev.sh <command> [options]

命令:
  dev              启动 AI 模块开发环境
  test             运行 AI 模块测试
  test:coverage    运行测试并生成覆盖率报告
  lint             运行代码质量检查
  build            构建 AI 模块
  clean            清理构建产物
  docs             生成 API 文档
  health           健康检查
  help             显示帮助信息

选项:
  --watch          监听模式（适用于 test）
  --release        生产模式构建
  --verbose        显示详细输出

示例:
  ./scripts/ai-dev.sh dev
  ./scripts/ai-dev.sh test --watch
  ./scripts/ai-dev.sh build --release
  ./scripts/ai-dev.sh lint
EOF
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "命令 '$1' 未找到，请先安装"
        exit 1
    fi
}

# 启动开发环境
cmd_dev() {
    log_info "启动 AI 模块开发环境..."

    # 检查必要工具
    check_command cargo
    check_command pnpm

    # 启动后端
    log_info "启动后端服务..."
    cargo run -p topems-unified-core &
    BACKEND_PID=$!

    # 启动前端
    log_info "启动前端服务..."
    cd apps/web
    pnpm dev &
    FRONTEND_PID=$!
    cd "$PROJECT_ROOT"

    # 等待用户中断
    log_success "开发环境已启动"
    log_info "后端: http://localhost:8080"
    log_info "前端: http://localhost:3000"
    log_info "按 Ctrl+C 停止服务"

    # 清理函数
    cleanup() {
        log_info "停止服务..."
        kill $BACKEND_PID 2>/dev/null || true
        kill $FRONTEND_PID 2>/dev/null || true
        log_success "服务已停止"
    }
    trap cleanup EXIT

    # 等待
    wait
}

# 运行测试
cmd_test() {
    local WATCH=false
    local VERBOSE=false

    # 解析参数
    for arg in "$@"; do
        case $arg in
            --watch) WATCH=true ;;
            --verbose) VERBOSE=true ;;
        esac
    done

    log_info "运行 AI 模块测试..."

    # 后端测试
    log_info "运行后端测试..."
    if [ "$VERBOSE" = true ]; then
        cargo test -p topems-unified-core -- --nocapture
    else
        cargo test -p topems-unified-core
    fi
    log_success "后端测试完成"

    # 前端测试
    log_info "运行前端测试..."
    cd apps/web
    if [ "$WATCH" = true ]; then
        pnpm test --watch
    else
        pnpm test
    fi
    cd "$PROJECT_ROOT"
    log_success "前端测试完成"

    log_success "所有测试完成"
}

# 测试覆盖率
cmd_test_coverage() {
    log_info "运行测试并生成覆盖率报告..."

    # 后端覆盖率
    log_info "生成后端覆盖率报告..."
    check_command cargo-tarpaulin
    cargo tarpaulin -p topems-unified-core --out Html --output-dir target/coverage
    log_success "后端覆盖率报告: target/coverage/topems-unified-core.html"

    # 前端覆盖率
    log_info "生成前端覆盖率报告..."
    cd apps/web
    pnpm test --coverage
    cd "$PROJECT_ROOT"
    log_success "前端覆盖率报告: apps/web/coverage/index.html"

    log_success "覆盖率报告生成完成"
}

# 代码质量检查
cmd_lint() {
    log_info "运行代码质量检查..."

    # 后端格式化检查
    log_info "检查后端代码格式..."
    cargo fmt --check
    log_success "后端代码格式检查通过"

    # 后端 Clippy
    log_info "运行后端 Clippy 检查..."
    cargo clippy -p topems-unified-core -- -D warnings
    log_success "后端 Clippy 检查通过"

    # 前端 ESLint
    log_info "运行前端 ESLint 检查..."
    cd apps/web
    pnpm lint
    cd "$PROJECT_ROOT"
    log_success "前端 ESLint 检查通过"

    # 前端类型检查
    log_info "运行前端类型检查..."
    cd apps/web
    pnpm typecheck
    cd "$PROJECT_ROOT"
    log_success "前端类型检查通过"

    log_success "所有代码质量检查通过"
}

# 构建
cmd_build() {
    local RELEASE=false

    # 解析参数
    for arg in "$@"; do
        case $arg in
            --release) RELEASE=true ;;
        esac
    done

    log_info "构建 AI 模块..."

    # 后端构建
    log_info "构建后端..."
    if [ "$RELEASE" = true ]; then
        cargo build --release -p topems-unified-core
    else
        cargo build -p topems-unified-core
    fi
    log_success "后端构建完成"

    # 前端构建
    log_info "构建前端..."
    cd apps/web
    pnpm build
    cd "$PROJECT_ROOT"
    log_success "前端构建完成"

    log_success "所有构建完成"
}

# 清理
cmd_clean() {
    log_info "清理构建产物..."

    # 后端清理
    log_info "清理后端构建产物..."
    cargo clean
    log_success "后端构建产物已清理"

    # 前端清理
    log_info "清理前端构建产物..."
    rm -rf apps/web/dist
    rm -rf apps/web/.next
    rm -rf apps/web/coverage
    log_success "前端构建产物已清理"

    log_success "清理完成"
}

# 生成文档
cmd_docs() {
    log_info "生成 API 文档..."

    # 后端文档
    log_info "生成后端 API 文档..."
    cargo doc -p topems-unified-core --no-deps
    log_success "后端文档: target/doc/topems_unified_core/index.html"

    # 前端文档（如果有）
    if [ -f "apps/web/typedoc.json" ]; then
        log_info "生成前端 API 文档..."
        cd apps/web
        pnpm docs
        cd "$PROJECT_ROOT"
        log_success "前端文档: apps/web/docs/index.html"
    fi

    log_success "文档生成完成"
}

# 健康检查
cmd_health() {
    log_info "执行健康检查..."

    # 检查后端服务
    log_info "检查后端服务..."
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        log_success "后端服务运行正常"
        curl -s http://localhost:8080/health | python3 -m json.tool 2>/dev/null || true
    else
        log_warning "后端服务未运行或无法访问"
    fi

    # 检查 AI 模块
    log_info "检查 AI 模块..."
    if curl -s http://localhost:8080/api/ai/health > /dev/null 2>&1; then
        log_success "AI 模块运行正常"
        curl -s http://localhost:8080/api/ai/health | python3 -m json.tool 2>/dev/null || true
    else
        log_warning "AI 模块未运行或无法访问"
    fi

    # 检查前端服务
    log_info "检查前端服务..."
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        log_success "前端服务运行正常"
    else
        log_warning "前端服务未运行或无法访问"
    fi

    # 检查数据库
    log_info "检查数据库连接..."
    if command -v pg_isready &> /dev/null; then
        if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
            log_success "数据库连接正常"
        else
            log_warning "数据库连接失败"
        fi
    else
        log_warning "pg_isready 命令未找到，跳过数据库检查"
    fi

    # 检查 Redis
    log_info "检查 Redis 连接..."
    if command -v redis-cli &> /dev/null; then
        if redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
            log_success "Redis 连接正常"
        else
            log_warning "Redis 连接失败"
        fi
    else
        log_warning "redis-cli 命令未找到，跳过 Redis 检查"
    fi

    log_success "健康检查完成"
}

# 主函数
main() {
    local command="${1:-help}"
    shift || true

    case $command in
        dev)
            cmd_dev "$@"
            ;;
        test)
            cmd_test "$@"
            ;;
        test:coverage)
            cmd_test_coverage "$@"
            ;;
        lint)
            cmd_lint "$@"
            ;;
        build)
            cmd_build "$@"
            ;;
        clean)
            cmd_clean "$@"
            ;;
        docs)
            cmd_docs "$@"
            ;;
        health)
            cmd_health "$@"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
