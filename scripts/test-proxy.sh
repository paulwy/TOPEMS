#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
  echo -e "\n${CYAN}===========================================================${NC}"
  echo -e "${CYAN}${1}${NC}"
  echo -e "${CYAN}===========================================================${NC}"
}

print_success() {
  echo -e "${GREEN}✅ ${1}${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  ${1}${NC}"
}

print_error() {
  echo -e "${RED}❌ ${1}${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  ${1}${NC}"
}

TEST_RESULTS=()
TEST_PASSED=0
TEST_FAILED=0

test_proxy_with_rewrite() {
  local module="$1"
  local frontend_path="$2"
  local expected_target="$3"
  local expected_rewrite="$4"
  local test_name="$5"
  
  echo -n "  ${test_name}..."
  
  local proxy_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000${frontend_path}")
  
  local direct_status=$(curl -s -o /dev/null -w "%{http_code}" "${expected_target}${expected_rewrite}")
  
  local proxy_ok=false
  local direct_ok=false
  
  case $proxy_status in
    200|401|403) proxy_ok=true ;;
  esac
  
  case $direct_status in
    200|401|403) direct_ok=true ;;
  esac
  
  if [ "$proxy_ok" = true ] && [ "$direct_ok" = true ]; then
    print_success "${proxy_status} (代理+重写正确)"
    TEST_PASSED=$((TEST_PASSED + 1))
    TEST_RESULTS+=("✅ ${module} ${test_name}: ${frontend_path} -> ${expected_target}${expected_rewrite} [${proxy_status}]")
  elif [ "$proxy_ok" = true ] && [ "$direct_ok" = false ]; then
    print_warning "${proxy_status} (代理通，后端直接访问${direct_status})"
    TEST_PASSED=$((TEST_PASSED + 1))
    TEST_RESULTS+=("⚠️  ${module} ${test_name}: ${frontend_path} -> ${expected_target}${expected_rewrite} [代理${proxy_status}, 后端${direct_status}]")
  elif [ "$proxy_ok" = false ] && [ "$direct_ok" = true ]; then
    print_error "${proxy_status} (代理失败，后端${direct_status})"
    TEST_FAILED=$((TEST_FAILED + 1))
    TEST_RESULTS+=("❌ ${module} ${test_name}: ${frontend_path} -> ${expected_target}${expected_rewrite} [代理${proxy_status}, 后端${direct_status}]")
  else
    print_warning "${proxy_status} (代理${proxy_status}, 后端${direct_status})"
    TEST_FAILED=$((TEST_FAILED + 1))
    TEST_RESULTS+=("⚠️  ${module} ${test_name}: ${frontend_path} -> ${expected_target}${expected_rewrite} [代理${proxy_status}, 后端${direct_status}]")
  fi
}

test_health() {
  local module="$1"
  local frontend_path="$2"
  local expected_target="$3"
  
  echo -n "  健康检查 ${frontend_path}..."
  
  local proxy_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000${frontend_path}")
  local direct_status=$(curl -s -o /dev/null -w "%{http_code}" "${expected_target}/health")
  
  local proxy_ok=false
  local direct_ok=false
  
  case $proxy_status in
    200|401) proxy_ok=true ;;
  esac
  
  case $direct_status in
    200|401) direct_ok=true ;;
  esac
  
  if [ "$proxy_ok" = true ] && [ "$direct_ok" = true ]; then
    print_success "${proxy_status} OK"
    TEST_PASSED=$((TEST_PASSED + 1))
    TEST_RESULTS+=("✅ ${module} 健康检查: ${frontend_path} -> ${expected_target}/health [${proxy_status}]")
  elif [ "$proxy_ok" = true ] && [ "$direct_ok" = false ]; then
    print_warning "${proxy_status} (后端直接${direct_status})"
    TEST_PASSED=$((TEST_PASSED + 1))
    TEST_RESULTS+=("⚠️  ${module} 健康检查: ${frontend_path} -> ${expected_target}/health [代理${proxy_status}, 后端${direct_status}]")
  elif [ "$proxy_ok" = false ] && [ "$direct_ok" = true ]; then
    print_error "${proxy_status} (代理失败)"
    TEST_FAILED=$((TEST_FAILED + 1))
    TEST_RESULTS+=("❌ ${module} 健康检查: ${frontend_path} -> ${expected_target}/health [代理${proxy_status}, 后端${direct_status}]")
  else
    print_warning "${proxy_status} (服务不可用)"
    TEST_FAILED=$((TEST_FAILED + 1))
    TEST_RESULTS+=("⚠️  ${module} 健康检查: ${frontend_path} -> ${expected_target}/health [代理${proxy_status}, 后端${direct_status}]")
  fi
}

print_header "Vite 代理配置全面测试"

echo -e "\n${YELLOW}测试说明:${NC}"
echo -e "  - 测试验证：代理响应状态码与直接访问后端状态码对比"
echo -e "  - 200 OK: 代理配置正确，后端正常响应"
echo -e "  - 401/403: 代理配置正确，需要认证"
echo -e "  - 404: 代理配置或后端路由有问题"
echo -e "  - 502: 后端服务未运行或不可用"
echo -e "\n${YELLOW}测试目标:${NC}"
echo -e "  - 验证每个模块的代理规则是否正确转发"
echo -e "  - 验证重写路径(rewrite)是否与后端路由匹配"
echo -e "  - 检查健康检查路径是否可访问"

print_header "1. 核心服务 (Core) - 端口 8000"
test_health "Core" "/health" "http://localhost:8000"
test_proxy_with_rewrite "Core" "/api/core/plugins/my" "http://localhost:8000" "/api/core/plugins/my" "插件列表"
test_proxy_with_rewrite "Core" "/core/api/test" "http://localhost:8000" "/api/core/api/test" "Core API"

print_header "2. IAM 服务 - 端口 8000"
echo -n "  登录 (POST)..."
login_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/iam/auth/login" -H "Content-Type: application/json" -d '{}')
case $login_status in
  401|400|200)
    print_success "${login_status} (代理正确)"
    TEST_PASSED=$((TEST_PASSED + 1))
    ;;
  404)
    print_error "404 (路径未找到)"
    TEST_FAILED=$((TEST_FAILED + 1))
    ;;
  *)
    print_warning "${login_status}"
    TEST_FAILED=$((TEST_FAILED + 1))
    ;;
esac
test_proxy_with_rewrite "IAM" "/iam/api/iam/users" "http://localhost:8000" "/api/core/iam/users" "用户列表"

print_header "3. ERP 服务 - 端口 8010"
test_health "ERP" "/erp/health" "http://localhost:8010"
test_proxy_with_rewrite "ERP" "/erp/api/assets?page=1&pagesize=20" "http://localhost:8010" "/api/erp/assets?page=1&pagesize=20" "资产列表"
test_proxy_with_rewrite "ERP" "/erp/system/dict-types" "http://localhost:8010" "/api/erp/dict-types" "字典类型"

print_header "4. HRM 服务 - 端口 8020"
test_health "HRM" "/hrm/health" "http://localhost:8020"
test_proxy_with_rewrite "HRM" "/hrm/api/employees" "http://localhost:8020" "/api/hrm/employees" "员工列表"

print_header "5. PM 服务 - 端口 8023"
test_health "PM" "/pm/health" "http://localhost:8023"
test_proxy_with_rewrite "PM" "/pm/api/projects" "http://localhost:8023" "/api/pm/projects" "项目列表"

print_header "6. CRM 服务 - 端口 8029"
test_health "CRM" "/crm/health" "http://localhost:8029"
test_proxy_with_rewrite "CRM" "/crm/api/contacts" "http://localhost:8029" "/api/crm/contacts" "联系人列表"

print_header "7. MES 服务 - 端口 8030"
test_health "MES" "/mes/health" "http://localhost:8030"

print_header "8. PDM 服务 - 端口 8031"
test_health "PDM" "/pdm/health" "http://localhost:8031"

print_header "9. SCM 服务 - 端口 8040"
test_health "SCM" "/scm/health" "http://localhost:8040"
test_proxy_with_rewrite "SCM" "/scm/api/suppliers" "http://localhost:8040" "/api/scm/suppliers" "供应商列表"

print_header "10. WMS 服务 - 端口 8041"
test_health "WMS" "/wms/health" "http://localhost:8041"

print_header "11. SRM 服务 - 端口 8042"
test_health "SRM" "/srm/health" "http://localhost:8042"

print_header "12. QMS 服务 - 端口 8050"
test_health "QMS" "/qms/health" "http://localhost:8050"

print_header "13. LIMS 服务 - 端口 8051"
test_health "LIMS" "/lims/health" "http://localhost:8051"
test_proxy_with_rewrite "LIMS" "/lims/api/audit-logs" "http://localhost:8051" "/api/lims/audit-logs" "审计日志"

print_header "14. EHS 服务 - 端口 8052"
test_health "EHS" "/ehs/health" "http://localhost:8052"

print_header "15. RS 服务 - 端口 8053"
test_health "RS" "/rs/health" "http://localhost:8053"

print_header "16. BI 服务 - 端口 8060"
test_health "BI" "/bi/health" "http://localhost:8060"
test_proxy_with_rewrite "BI" "/bi/api/dashboards" "http://localhost:8060" "/api/bi/dashboards" "仪表盘列表"

print_header "17. Report 服务 - 端口 8061"
test_health "Report" "/report/health" "http://localhost:8061"

print_header "18. Monitor 服务 - 端口 8062"
test_health "Monitor" "/monitor/health" "http://localhost:8062"
test_proxy_with_rewrite "Monitor" "/monitor/api/alerts" "http://localhost:8062" "/api/v1/monitor/alerts" "告警列表"

print_header "19. Portal 服务 - 端口 8063"
test_health "Portal" "/portal/health" "http://localhost:8063"

print_header "20. Mobile 服务 - 端口 8070"
test_health "Mobile" "/mobile/health" "http://localhost:8070"

print_header "21. GIS 服务 - 端口 8071"
test_health "GIS" "/gis/health" "http://localhost:8071"

print_header "22. Integration 服务 - 端口 8072"
test_health "Integration" "/integration/health" "http://localhost:8072"

print_header "23. AI 服务 - 端口 8013"
test_health "AI" "/ai/health" "http://localhost:8013"
test_proxy_with_rewrite "AI" "/ai/api/chat" "http://localhost:8013" "/api/ai/chat" "AI聊天接口"

print_header "24. Doc 服务 - 端口 8012"
test_proxy_with_rewrite "Doc" "/doc/api/documents" "http://localhost:8012" "/api/doc/documents" "文档列表"

print_header "25. 通信服务 (Comm) - 端口 8000"
test_proxy_with_rewrite "Comm" "/comm/api/health" "http://localhost:8000" "/api/core/comm/api/health" "通信健康"
test_proxy_with_rewrite "Comm" "/notification/api/v1/messages" "http://localhost:8000" "/api/v1/messages" "通知消息"

print_header "26. Plugin Health 检查"
test_proxy_with_rewrite "Plugin-Health" "/plugin-health/erp/api/plugins/health" "http://localhost:8010" "/api/plugins/health" "ERP插件健康"
test_proxy_with_rewrite "Plugin-Health" "/plugin-health/hrm/api/plugins/health" "http://localhost:8020" "/api/plugins/health" "HRM插件健康"
test_proxy_with_rewrite "Plugin-Health" "/plugin-health/monitor/api/plugins/info" "http://localhost:8062" "/api/plugins/info" "Monitor插件信息"

print_header "测试结果汇总"

echo -e "\n${GREEN}通过: ${TEST_PASSED}${NC}"
echo -e "${RED}失败: ${TEST_FAILED}${NC}"
echo -e "${YELLOW}总计: $((TEST_PASSED + TEST_FAILED))${NC}"

if [ $TEST_FAILED -gt 0 ]; then
  echo -e "\n${RED}失败详情:${NC}"
  for result in "${TEST_RESULTS[@]}"; do
    if echo "$result" | grep -q -E "❌|⚠️"; then
      echo "$result"
    fi
  done
fi

if [ $TEST_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}🎉 所有代理配置测试通过！${NC}"
else
  echo -e "\n${YELLOW}⚠️  部分代理配置需要修复，请查看失败详情。${NC}"
  exit 1
fi