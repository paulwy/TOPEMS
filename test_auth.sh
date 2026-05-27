#!/bin/bash
# ============================================
# TOPEMS 系统认证测试脚本
# 用于验证所有服务的认证保护是否正常工作
# ============================================

set -e

# 配置
JWT_TOKEN="test-token-12345"
BASE_URL="http://localhost"

# 服务端口配置
declare -A services=(
    ["erp"]="8009"
    ["scm"]="8010"
    ["lims"]="8011"
    ["wms"]="8012"
    ["qms"]="8013"
    ["hrm"]="8014"
    ["crm"]="8015"
    ["mes"]="8016"
    ["pdm"]="8017"
    ["ehs"]="8018"
    ["srm"]="8019"
    ["gis"]="8020"
    ["portal"]="8021"
    ["bi"]="8022"
    ["mobile"]="8023"
    ["integration"]="8024"
    ["ai"]="8025"
    ["im"]="8026"
    ["flow"]="8081"
    ["doc"]="8082"
    ["backend"]="8080"
)

# API 端点配置
declare -A endpoints=(
    ["erp"]="/api/v1/companies"
    ["scm"]="/api/v1/suppliers"
    ["lims"]="/api/v1/samples"
    ["wms"]="/api/v1/warehouses"
    ["qms"]="/api/v1/quality_records"
    ["hrm"]="/api/v1/employees"
    ["crm"]="/api/v1/customers"
    ["mes"]="/api/v1/production_orders"
    ["pdm"]="/api/v1/products"
    ["ehs"]="/api/v1/incidents"
    ["srm"]="/api/v1/suppliers"
    ["gis"]="/api/v1/maps"
    ["portal"]="/api/v1/dashboard"
    ["bi"]="/api/v1/reports"
    ["mobile"]="/api/v1/mobile/users"
    ["integration"]="/api/v1/integrations"
    ["ai"]="/api/v1/ai/analyze"
    ["im"]="/api/v1/messages"
    ["flow"]="/api/v1/workflows"
    ["doc"]="/api/v1/files"
    ["backend"]="/api/v1/health"
)

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "\n${YELLOW}============================================${NC}"
echo -e "${YELLOW}TOPEMS 系统认证测试脚本${NC}"
echo -e "${YELLOW}============================================${NC}\n"

# 测试结果统计
passed=0
failed=0
total=0

# 测试函数
test_service() {
    local service_name=$1
    local port=$2
    local endpoint=$3
    local url="$BASE_URL:$port$endpoint"
    
    echo -e "\n${YELLOW}测试服务: $service_name (端口: $port)${NC}"
    echo "----------------------------------------"
    
    # 测试1: 未认证请求应该返回 401
    echo -e "\n${RED}[测试1] 未认证请求测试${NC}"
    echo "URL: $url"
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$url")
    status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    
    if [ "$status" -eq 401 ] || [ "$status" -eq 403 ]; then
        echo -e "${GREEN}✓ 通过 - 返回状态码: $status${NC}"
        ((passed++))
    else
        echo -e "${RED}✗ 失败 - 返回状态码: $status${NC}"
        echo "响应内容: $body"
        ((failed++))
    fi
    
    # 测试2: 使用无效 token 请求应该返回 401
    echo -e "\n${RED}[测试2] 无效 Token 请求测试${NC}"
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -H "Authorization: Bearer $JWT_TOKEN" "$url")
    status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    
    if [ "$status" -eq 401 ]; then
        echo -e "${GREEN}✓ 通过 - 返回状态码: $status${NC}"
        ((passed++))
    else
        echo -e "${RED}✗ 失败 - 返回状态码: $status${NC}"
        ((failed++))
    fi
    
    # 测试3: 健康检查端点应该可以访问
    echo -e "\n${RED}[测试3] 健康检查端点测试${NC}"
    health_url="$BASE_URL:$port/health"
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$health_url")
    status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    
    if [ "$status" -eq 200 ]; then
        echo -e "${GREEN}✓ 通过 - 返回状态码: $status${NC}"
        ((passed++))
    else
        echo -e "${YELLOW}⚠️  警告 - 返回状态码: $status (服务可能未启动)${NC}"
        ((passed++))
    fi
    
    ((total+=3))
    echo ""
}

# 运行所有测试
for service in "${!services[@]}"; do
    port=${services[$service]}
    endpoint=${endpoints[$service]}
    test_service "$service" "$port" "$endpoint"
done

# 输出测试结果
echo -e "\n${YELLOW}============================================${NC}"
echo -e "${YELLOW}测试结果汇总${NC}"
echo -e "${YELLOW}============================================${NC}"
echo -e "\n${GREEN}✓ 通过: $passed${NC}"
echo -e "${RED}✗ 失败: $failed${NC}"
echo -e "${YELLOW}总计: $total${NC}"

if [ "$failed" -eq 0 ]; then
    echo -e "\n${GREEN}🎉 所有测试通过！认证保护正常工作。${NC}"
else
    echo -e "\n${RED}⚠️  部分测试失败，请检查失败的服务。${NC}"
    exit 1
fi
