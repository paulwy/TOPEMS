#!/bin/bash
# IAM 模块权限测试运行脚本
#
# 用法:
#   ./scripts/run-iam-tests.sh [选项]
#
# 选项:
#   --backend     仅运行后端测试
#   --frontend    仅运行前端测试
#   --all         运行所有测试 (默认)
#   --report      生成测试报告

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 默认配置
RUN_BACKEND=true
RUN_FRONTEND=true
GENERATE_REPORT=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend)
            RUN_FRONTEND=false
            shift
            ;;
        --frontend)
            RUN_BACKEND=false
            shift
            ;;
        --all)
            RUN_BACKEND=true
            RUN_FRONTEND=true
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
echo -e "${BLUE}  IAM 模块权限测试${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查环境
check_environment() {
    echo -e "${YELLOW}检查测试环境...${NC}"

    # 检查后端服务
    if command -v cargo &> /dev/null; then
        echo -e "${GREEN}✓ Rust/Cargo 已安装${NC}"
    else
        echo -e "${RED}✗ Rust/Cargo 未安装${NC}"
        exit 1
    fi

    # 检查前端服务
    if command -v npx &> /dev/null; then
        echo -e "${GREEN}✓ Node.js/npx 已安装${NC}"
    else
        echo -e "${RED}✗ Node.js/npx 未安装${NC}"
        exit 1
    fi

    # 检查数据库连接
    if psql -U topems -d topems -c "SELECT 1" &> /dev/null; then
        echo -e "${GREEN}✓ 数据库连接正常${NC}"
    else
        echo -e "${RED}✗ 数据库连接失败${NC}"
        echo -e "${YELLOW}  请确保 PostgreSQL 正在运行且数据库已创建${NC}"
    fi

    # 检查 API 服务
    if curl -s http://localhost:8000/health | grep -q "healthy"; then
        echo -e "${GREEN}✓ API 服务运行中${NC}"
    else
        echo -e "${YELLOW}⚠ API 服务未运行，部分测试可能失败${NC}"
    fi

    echo ""
}

# 后端/前端测试失败标志（供 main 聚合退出码）
BACKEND_FAILED=0
FRONTEND_FAILED=0

# 运行后端测试
run_backend_tests() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  后端 Rust 测试${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    cd "$PROJECT_ROOT"

    echo -e "${YELLOW}运行 IAM 权限测试...${NC}"
    echo ""

    # 运行权限库测试（保留真实退出码，不再 || true 吞失败）
    echo -e "${YELLOW}1. 运行权限库测试 (lib/tests/permission_test.rs)${NC}"
    cargo test --package topems-shared --test permission_test 2>&1 | tail -6
    local rc1=${PIPESTATUS[0]}
    if [ $rc1 -ne 0 ]; then
        echo -e "${RED}✗ 权限库测试失败 (exit $rc1)${NC}" >&2
        BACKEND_FAILED=1
    fi
    echo ""

    # 运行 IAM 模块测试
    echo -e "${YELLOW}2. 运行 IAM 模块测试 (svc/unified-core/tests/iam_permission_tests.rs)${NC}"
    cargo test --package topems-unified-core --test iam_permission_tests 2>&1 | tail -6
    local rc2=${PIPESTATUS[0]}
    if [ $rc2 -ne 0 ]; then
        echo -e "${RED}✗ IAM 模块测试失败 (exit $rc2)${NC}" >&2
        BACKEND_FAILED=1
    fi
    echo ""

    echo -e "${GREEN}后端测试完成${NC}"
    echo ""
}

# 运行前端测试
run_frontend_tests() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  前端 E2E 测试${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    cd "$PROJECT_ROOT"/apps/web

    # 检查 Playwright 是否安装
    if ! npx playwright --version &> /dev/null; then
        echo -e "${YELLOW}安装 Playwright...${NC}"
        npm install -D @playwright/test
        npx playwright install
    fi

    echo -e "${YELLOW}运行 IAM 权限 E2E 测试...${NC}"
    echo ""

    # 运行测试（测试文件不存在时明确失败，防止 "No tests found" 假绿）
    local spec="e2e/iam-permission.spec.ts"
    if [ ! -f "$spec" ]; then
        echo -e "${RED}✗ 测试文件不存在: $spec${NC}" >&2
        echo -e "${YELLOW}   e2e 目录当前测试: $(ls e2e/*.spec.ts 2>/dev/null | sed 's|.*/||' | tr '\n' ' ')${NC}" >&2
        FRONTEND_FAILED=1
        return 1
    fi

    local rc=0
    if [ "$GENERATE_REPORT" = true ]; then
        npx playwright test "$spec" --reporter=html 2>&1 | tail -8
        rc=${PIPESTATUS[0]}
    else
        npx playwright test "$spec" 2>&1 | tail -8
        rc=${PIPESTATUS[0]}
    fi
    if [ $rc -ne 0 ]; then
        echo -e "${RED}✗ 前端 E2E 测试失败 (exit $rc)${NC}" >&2
        FRONTEND_FAILED=1
        return 1
    fi

    echo ""
    echo -e "${GREEN}前端测试完成${NC}"
    echo ""

    if [ "$GENERATE_REPORT" = true ]; then
        echo -e "${YELLOW}生成测试报告...${NC}"
        npx playwright show-report
    fi
}

# 生成测试报告
generate_summary() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  测试总结${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    echo -e "${YELLOW}测试用例覆盖:${NC}"
    echo "  - IAM-001: 超级管理员查看用户列表"
    echo "  - IAM-002: 普通用户查看用户列表"
    echo "  - IAM-003: 管理员创建用户"
    echo "  - IAM-004: 无权限用户创建用户"
    echo "  - IAM-005: 管理员删除用户"
    echo "  - IAM-006: 超级管理员分配角色"
    echo "  - IAM-007: 跨租户用户访问"
    echo "  - IAM-008: 用户修改自己密码"
    echo "  - IAM-009: 用户修改他人密码"
    echo ""

    echo -e "${YELLOW}测试文件:${NC}"
    echo "  后端: svc/unified-core/tests/iam_permission_tests.rs"
    echo "  前端: apps/web/e2e/iam-permission.spec.ts"
    echo ""

    echo -e "${GREEN}测试完成！${NC}"
}

# 主流程
main() {
    check_environment

    if [ "$RUN_BACKEND" = true ]; then
        run_backend_tests
    fi

    if [ "$RUN_FRONTEND" = true ]; then
        run_frontend_tests
    fi

    if [ $BACKEND_FAILED -ne 0 ] || [ $FRONTEND_FAILED -ne 0 ]; then
        echo -e "${RED}测试存在失败（后端=${BACKEND_FAILED} 前端=${FRONTEND_FAILED}），退出码非零${NC}" >&2
        exit 1
    fi

    generate_summary
}

main
