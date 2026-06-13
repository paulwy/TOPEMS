#!/bin/bash
# 测试所有 Rust 服务
# 文件: scripts/test-all-rust-services.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# 获取所有服务目录
get_all_services() {
    local services=()
    for dir in svc/*/; do
        if [ -d "$dir" ] && [ -f "$dir/Cargo.toml" ]; then
            services+=("$(basename "$dir")")
        fi
    done
    echo "${services[@]}"
}

FAILED=()
SUCCESS=()
NO_TESTS=()
SKIPPED=()
TOTAL=0

echo "=============================================="
echo "  测试所有 Rust 服务"
echo "=============================================="
echo ""

# 获取所有服务
ALL_SERVICES=($(get_all_services))

for service in "${ALL_SERVICES[@]}"; do
    svc_dir="svc/$service"
    TOTAL=$((TOTAL + 1))
    echo -n "Testing $service ... "
    
    cd "$PROJECT_ROOT/$svc_dir"
    
    # 检查是否有测试文件
    if [ -d "tests" ] && [ "$(ls -A tests 2>/dev/null | wc -l)" -gt 0 ]; then
        # 尝试编译测试
        if cargo test --no-run --quiet 2>/dev/null; then
            # 运行测试
            if cargo test --quiet 2>&1 | tail -n 1 | grep -q "test result:"; then
                local result=$(cargo test --quiet 2>&1 | tail -n 1)
                echo -e "${GREEN}✅ PASS${NC} $result"
                SUCCESS+=("$service")
            else
                # 测试失败
                echo -e "${RED}❌ FAIL${NC}"
                FAILED+=("$service")
            fi
        else
            # 编译失败
            echo -e "${RED}❌ COMPILE ERROR${NC}"
            FAILED+=("$service")
        fi
    else
        # 没有测试目录
        echo -e "${YELLOW}⚠️  NO TESTS${NC}"
        NO_TESTS+=("$service")
    fi
    
    cd - > /dev/null 2>&1
done

echo ""
echo "=============================================="
echo "  测试完成"
echo "=============================================="
echo "总计: $TOTAL | 成功: ${#SUCCESS[@]} | 无测试: ${#NO_TESTS[@]} | 失败: ${#FAILED[@]}"
echo ""

if [ ${#FAILED[@]} -gt 0 ]; then
    log_error "失败的服务:"
    for service in "${FAILED[@]}"; do
        echo "  ❌ $service"
    done
    exit 1
else
    log_info "所有 Rust 服务测试通过！"
fi
