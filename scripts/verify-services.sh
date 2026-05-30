#!/bin/bash

# TOPEMS 服务验证脚本
# 快速测试后端服务是否可以正常编译

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    echo -e "${RED}[ERROR]${NC} $1"
}

# 测试单个服务编译
test_service() {
    local service_path=$1
    local service_name=$(basename "$(dirname "$service_path")")
    
    echo ""
    echo "========================================"
    log_info "测试服务: $service_name"
    echo "========================================"
    
    if [ -d "$service_path" ]; then
        cd "$service_path"
        
        if [ -f "Cargo.toml" ]; then
            log_info "运行 cargo check..."
            if cargo check --quiet; then
                log_success "$service_name 编译通过！"
                return 0
            else
                log_error "$service_name 编译失败！"
                return 1
            fi
        else
            log_warning "$service_name 不是 Rust 项目"
            return 0
        fi
    else
        log_warning "$service_name 目录不存在"
        return 0
    fi
}

log_info "开始验证 TOPEMS 后端服务..."
echo ""

# 核心服务列表
SERVICES=(
    "platform/topems-iam/backend"
    "platform/topems-doc/backend"
    "platform/topems-flow/backend"
    "services/topems-ai/backend"
)

# 统计结果
PASSED=0
FAILED=0
TOTAL=${#SERVICES[@]}

for service in "${SERVICES[@]}"; do
    if test_service "$SCRIPT_DIR/$service"; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
done

echo ""
echo "========================================"
echo "验证结果:"
echo "  总计: $TOTAL"
echo -e "  ${GREEN}通过: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "  ${RED}失败: $FAILED${NC}"
else
    echo -e "  ${GREEN}失败: $FAILED${NC}"
fi
echo "========================================"

if [ $FAILED -eq 0 ]; then
    log_success "所有服务验证通过！"
    echo ""
    echo "下一步: 你可以使用 ./start.sh 来启动服务"
    exit 0
else
    log_error "部分服务验证失败"
    exit 1
fi
