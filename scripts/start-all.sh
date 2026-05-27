#!/bin/bash

# TOPEMS 快速启动脚本
# 用法: ./scripts/start-all.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  TOPEMS 企业级研发管理平台"
echo "  快速启动脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 已安装"
        return 0
    else
        echo -e "${RED}✗${NC} $1 未安装"
        return 1
    fi
}

echo "检查依赖..."
MISSING_DEPS=0

if ! check_command "cargo"; then
    echo -e "  请安装 Rust: ${YELLOW}curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh${NC}"
    MISSING_DEPS=1
fi

if ! check_command "cargo-watch"; then
    echo -e "  可选: ${YELLOW}cargo install cargo-watch${NC}"
fi

echo ""
echo "检查服务端口..."

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠${NC} 端口 $port 已被占用"
        return 1
    else
        echo -e "${GREEN}✓${NC} 端口 $port 可用"
        return 0
    fi
}

check_port 8001 || MISSING_DEPS=1
check_port 8002 || MISSING_DEPS=1
check_port 8003 || MISSING_DEPS=1
check_port 8004 || MISSING_DEPS=1
check_port 8005 || MISSING_DEPS=1

if [ $MISSING_DEPS -eq 1 ]; then
    echo ""
    echo -e "${RED}启动前请先解决以上问题${NC}"
    exit 1
fi

echo ""
echo "启动服务..."
echo ""

start_service() {
    local service_name=$1
    local service_path=$2
    local port=$3

    echo -e "${GREEN}→${NC} 启动 $service_name (端口 $port)..."

    cd "$PROJECT_DIR/$service_path"

    if [ -f "Cargo.toml" ]; then
        nohup cargo run --release > "$PROJECT_DIR/logs/$service_name.log" 2>&1 &
        echo $! > "$PROJECT_DIR/pids/$service_name.pid"
        echo -e "  ${GREEN}✓${NC} 已启动 (PID: $(cat "$PROJECT_DIR/pids/$service_name.pid"))"
    fi
}

mkdir -p "$PROJECT_DIR/logs"
mkdir -p "$PROJECT_DIR/pids"

start_service "topems-iam" "services/topems-iam/backend" 8001
start_service "topems-rs" "services/topems-rs/backend" 8002
start_service "topems-lims" "services/topems-lims/backend" 8003
start_service "topems-qms" "services/topems-qms/backend" 8004
start_service "topems-mes" "services/topems-mes/backend" 8005

echo ""
echo "=========================================="
echo -e "${GREEN}所有服务启动完成！${NC}"
echo ""
echo "服务状态:"
echo "  IAM:      http://localhost:8001/health"
echo "  RS:       http://localhost:8002/health"
echo "  LIMS:     http://localhost:8003/health"
echo "  QMS:      http://localhost:8004/health"
echo "  MES:      http://localhost:8005/health"
echo ""
echo "日志文件: $PROJECT_DIR/logs/"
echo ""
echo "停止所有服务: $SCRIPT_DIR/stop-all.sh"
echo "=========================================="
