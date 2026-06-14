#!/bin/bash

# =============================================
# TOPEMS 统一入口脚本
# =============================================
#
# 此脚本保留用于基本操作和向后兼容。
# 建议使用 Python CLI 获取完整功能:
#
#   cd $(dirname "$0")/../cli
#   pip install pyyaml click rich httpx
#   python -m topems_cli --help
#
# =============================================

set -e

# 获取脚本位置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLI_DIR="$PROJECT_ROOT/cli"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 调用 Python CLI
run_cli() {
    if [ -d "$CLI_DIR" ]; then
        cd "$CLI_DIR"
        if [ -f ".venv/bin/activate" ]; then
            source .venv/bin/activate
        fi
        export PYTHONPATH="$CLI_DIR/src"
        python -m topems_cli "$@"
    else
        error "Python CLI 未安装"
        echo "请运行以下命令安装:"
        echo "  cd $CLI_DIR"
        echo "  python -m venv .venv"
        echo "  source .venv/bin/activate"
        echo "  pip install pyyaml click rich httpx"
        exit 1
    fi
}

# 显示帮助
show_help() {
    cat << EOF
TOPEMS 服务管理工具

用法: topems <命令> [选项]

命令:
  status [服务]     查看服务状态
  start <服务>      启动服务
  stop <服务>       停止服务
  logs <服务>       查看日志
  test              运行测试
  build             构建服务
  cleanup           清理缓存

示例:
  topems status --all       查看所有服务
  topems start -m core     启动核心模块
  topems build all         构建所有服务

文档:
  Python CLI: cd cli && cat README.md
  部署文档: docs/deployment/README.md

注意: 此脚本已简化，完整功能请使用 Python CLI
EOF
}

# 主命令处理
case "${1:-help}" in
    status|start|stop|logs|test|build|cleanup|docker)
        run_cli "$@"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}未知命令: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
