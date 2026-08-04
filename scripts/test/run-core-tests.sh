#!/bin/bash
# 核心模块权限测试运行脚本
#
# 用法:
#   ./scripts/run-core-tests.sh [选项]
#
# 选项:
#   --module <name>   运行指定模块测试 (iam, workflow, doc, file, notification, im)
#   --all             运行所有模块测试 (默认)
#   --report          生成测试报告

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 默认配置
MODULE="all"
GENERATE_REPORT=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --module)
            MODULE="$2"
            shift 2
            ;;
        --all)
            MODULE="all"
            shift
            ;;
        --report)
            GENERATE_REPORT=true
            shift
            ;;
        *)
            echo "未知参数: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  核心模块权限测试${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查环境
check_environment() {
    echo -e "${YELLOW}检查测试环境...${NC}"

    if command -v cargo &> /dev/null; then
        echo -e "${GREEN}✓ Rust/Cargo 已安装${NC}"
    else
        echo -e "${RED}✗ Rust/Cargo 未安装${NC}"
        exit 1
    fi

    if psql -U topems -d topems -c "SELECT 1" &> /dev/null; then
        echo -e "${GREEN}✓ 数据库连接正常${NC}"
    else
        echo -e "${RED}✗ 数据库连接失败${NC}"
    fi

    if curl -sf http://localhost:8000/health 2>/dev/null | grep -q "healthy" 2>/dev/null; then
        echo -e "${GREEN}✓ API 服务运行中${NC}"
    else
        echo -e "${YELLOW}⚠ API 服务未运行，部分测试可能失败${NC}"
    fi

    echo ""
}

# 运行单个模块测试
run_module_test() {
    local module=$1
    local test_file="${module}_permission_tests"
    local module_upper=$(echo "$module" | tr '[:lower:]' '[:upper:]')

    echo -e "${BLUE}----------------------------------------${NC}"
    echo -e "${BLUE}  ${module_upper} 模块测试${NC}"
    echo -e "${BLUE}----------------------------------------${NC}"

    cargo test --package unified-core-service --test "$test_file" 2>&1 | while IFS= read -r line; do
        if [[ "$line" == *"test result: ok"* ]]; then
            echo -e "${GREEN}$line${NC}"
        elif [[ "$line" == *"FAILED"* ]]; then
            echo -e "${RED}$line${NC}"
        elif [[ "$line" == *"test"* && "$line" == *"ok"* ]]; then
            echo -e "${GREEN}$line${NC}"
        else
            echo "$line"
        fi
    done

    echo ""
}

# 运行所有测试
run_all_tests() {
    local modules=("iam" "workflow" "doc" "file" "notification" "im")
    local passed=0
    local failed=0

    for module in "${modules[@]}"; do
        local module_upper=$(echo "$module" | tr '[:lower:]' '[:upper:]')
        echo -e "${YELLOW}运行 ${module_upper} 模块测试...${NC}"

        if cargo test --package unified-core-service --test "${module}_permission_tests" 2>&1 | grep -q "test result: ok"; then
            echo -e "${GREEN}✓ ${module_upper} 模块测试通过${NC}"
            passed=$((passed + 1))
        else
            echo -e "${RED}✗ ${module_upper} 模块测试失败${NC}"
            failed=$((failed + 1))
        fi
        echo ""
    done

    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  测试总结${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}通过: ${passed}${NC}"
    echo -e "${RED}失败: ${failed}${NC}"
    echo ""

    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}所有测试通过！${NC}"
    else
        echo -e "${YELLOW}部分测试失败，请检查日志${NC}"
    fi
}

# 生成测试报告
generate_report() {
    local report_file="test-report-$(date +%Y%m%d-%H%M%S).md"

    echo "# 核心模块权限测试报告" > "$report_file"
    echo "" >> "$report_file"
    echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')" >> "$report_file"
    echo "" >> "$report_file"

    local modules=("iam" "workflow" "doc" "file" "notification" "im")

    for module in "${modules[@]}"; do
        local module_upper=$(echo "$module" | tr '[:lower:]' '[:upper:]')
        echo "## ${module_upper} 模块" >> "$report_file"
        echo "" >> "$report_file"
        echo '```' >> "$report_file"
        cargo test --package unified-core-service --test "${module}_permission_tests" 2>&1 >> "$report_file"
        echo '```' >> "$report_file"
        echo "" >> "$report_file"
    done

    echo -e "${GREEN}测试报告已生成: ${report_file}${NC}"
}

# 主流程
main() {
    check_environment

    if [ "$MODULE" == "all" ]; then
        run_all_tests
    else
        run_module_test "$MODULE"
    fi

    if [ "$GENERATE_REPORT" = true ]; then
        generate_report
    fi
}

main
