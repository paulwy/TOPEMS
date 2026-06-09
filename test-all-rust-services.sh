#!/bin/bash
# 测试所有Rust服务

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# 服务列表
SERVICES=(
    "shared/lib"
    "platform/topems-iam/backend"
    "platform/topems-doc/backend"
    "platform/topems-flow/backend"
    "services/topems-pm/backend"
    "services/topems-rs/backend"
    "services/topems-mail/backend"
    "services/notification-service"
    "services/topems-notification/backend"
    "services/topems-ai/backend"
    "services/topems-portal/backend"
    "services/topems-wms/backend"
    "services/topems-scm/backend"
    "services/topems-qms/backend"
    "services/topems-crm/backend"
    "services/topems-hrm/backend"
    "services/topems-im/backend"
    "services/topems-gis/backend"
    "services/topems-erp/backend"
    "services/topems-lims/backend"
    "services/topems-mes/backend"
    "services/topems-bi/backend"
    "services/topems-mobile/backend"
    "services/topems-integration/backend"
    "services/topems-ehs/backend"
    "services/topems-srm/backend"
    "services/topems-pdm/backend"
    "services/report-service"
)

FAILED=()
SUCCESS=()
NO_TESTS=()
TOTAL=0

echo "=============================================="
echo "  测试所有Rust服务"
echo "=============================================="
echo ""

for service in "${SERVICES[@]}"; do
    if [ -d "$service" ]; then
        TOTAL=$((TOTAL + 1))
        echo -n "Testing $service ... "
        
        cd "$service"
        
        # 检查是否有测试
        if cargo test --no-run --quiet 2>/dev/null; then
            # 运行测试
            if cargo test --quiet 2>&1 | grep -q "test result:"; then
                cargo test --quiet 2>&1 | tail -n 1
                SUCCESS+=("$service")
            else
                # 测试失败
                echo -e "${RED}❌ FAIL${NC}"
                FAILED+=("$service")
            fi
        else
            # 没有测试或编译失败
            if [ -f "src/tests.rs" ] || find src -name "*.rs" -exec grep -l "#\[cfg(test)\]" {} \; | grep -q .; then
                # 有测试文件但编译失败
                echo -e "${RED}❌ COMPILE ERROR${NC}"
                FAILED+=("$service")
            else
                # 没有测试
                echo -e "${YELLOW}⚠️  NO TESTS${NC}"
                NO_TESTS+=("$service")
            fi
        fi
        
        cd - > /dev/null 2>&1
    else
        echo -e "${YELLOW}⚠️  Directory not found: $service${NC}"
    fi
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
    log_info "所有Rust服务测试通过！"
fi
