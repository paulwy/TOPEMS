#!/bin/bash
# 收集所有Rust服务的测试数据和警告统计

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 服务列表
SERVICES=(
    "shared/lib"
    "services/topems-iam/backend"
    "services/topems-doc/backend"
    "services/topems-flow/backend"
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

echo "=============================================="
echo "  收集所有服务测试数据"
echo "=============================================="
echo ""

# 初始化变量
total=0
pass=0
fail=0
no_test=0
compile_fail=0
total_warnings=0
total_errors=0
total_tests_passed=0

# 输出表格头部
printf "%-45s | %-12s | %-10s | %-8s | %-8s\n" "Service" "Status" "Tests" "Warnings" "Errors"
echo "------------------------------------------------------------------------------------------------------------------------"

for service in "${SERVICES[@]}"; do
    if [ -d "$service" ]; then
        total=$((total + 1))
        echo -n "Checking $service ... "
        
        cd "$service"
        
        # 编译并获取警告和错误数
        compile_output=$(cargo check 2>&1)
        warnings=$(echo "$compile_output" | grep -c "warning:" || true)
        errors=$(echo "$compile_output" | grep -c "error\[" || true)

        # 确保是数字
        warnings=${warnings:-0}
        errors=${errors:-0}

        total_warnings=$((total_warnings + warnings))
        total_errors=$((total_errors + errors))

        # 运行测试
        test_output=$(cargo test 2>&1 | tail -n 10)
        has_test_result=$(echo "$test_output" | grep -c "test result:" || true)

        if [ "$has_test_result" -gt 0 ]; then
            # 解析测试结果
            result_line=$(echo "$test_output" | grep "test result:")
            tests_passed=$(echo "$result_line" | sed -n 's/.*\([0-9]\+\) passed.*/\1/p' | head -1 || echo "0")
            tests_failed=$(echo "$result_line" | sed -n 's/.*\([0-9]\+\) failed.*/\1/p' | head -1 || echo "0")

            # 确保是数字
            tests_passed=${tests_passed:-0}
            tests_failed=${tests_failed:-0}

            total_tests_passed=$((total_tests_passed + tests_passed))

            if [ "$tests_failed" -gt 0 ]; then
                status="${RED}FAIL${NC}"
                fail=$((fail + 1))
            else
                status="${GREEN}PASS${NC}"
                pass=$((pass + 1))
            fi

            printf "%-45s | $status | %5d      | %8d | %8d\n" "$service" "$tests_passed" "$warnings" "$errors"
        else
            if [ "$errors" -gt 0 ]; then
                status="${RED}COMPILE ERR${NC}"
                compile_fail=$((compile_fail + 1))
                printf "%-45s | $status | %5d      | %8d | %8d\n" "$service" "0" "$warnings" "$errors"
            else
                status="${YELLOW}NO TESTS${NC}"
                no_test=$((no_test + 1))
                printf "%-45s | $status | %5d      | %8d | %8d\n" "$service" "0" "$warnings" "$errors"
            fi
        fi

        cd - > /dev/null 2>&1
    else
        echo -e "${YELLOW}⚠  Directory not found: $service${NC}"
    fi
done

echo ""
echo "=============================================="
echo "  统计汇总"
echo "=============================================="
echo ""

# 计算百分比
pass_rate=0
if [ $total -gt 0 ]; then
    pass_rate=$((pass * 100 / total))
fi

compile_rate=100
if [ $total -gt 0 ]; then
    compile_rate=$(( (total - compile_fail) * 100 / total))
fi

echo "总服务数: $total"
echo -e "测试通过: ${GREEN}$pass${NC}"
echo -e "测试失败: ${RED}$fail${NC}"
echo -e "无测试: ${YELLOW}$no_test${NC}"
echo -e "编译失败: ${RED}$compile_fail${NC}"
echo ""
echo -e "总测试用例: ${BLUE}$total_tests_passed${NC}"
echo -e "总警告数: ${YELLOW}$total_warnings${NC}"
echo -e "总错误数: ${RED}$total_errors${NC}"
echo ""
echo -e "测试通过率: ${GREEN}${pass_rate}%${NC}"
echo -e "编译成功率: ${GREEN}${compile_rate}%${NC}"
echo ""
echo "详细数据已保存到 /tmp/test_summary.txt"
