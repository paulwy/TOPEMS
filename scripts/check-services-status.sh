#!/bin/bash

# TOPEMS 服务状态监控脚本
# 使用方法: ./scripts/check-services-status.sh

echo "🔍 TOPEMS 服务状态监控"
echo "========================"
echo ""

# 检查Docker服务
echo "📦 Docker 服务状态:"
cd "$(dirname "$0")/../docker"
docker-compose ps 2>/dev/null || echo "  ❌ Docker 服务未启动"
echo ""

# 检查微服务端口
echo "🔧 微服务状态:"
echo ""

check_service() {
    local name=$1
    local port=$2
    local health_url="http://localhost:$port/health"
    
    response=$(curl -s -w "\n%{http_code}" "$health_url" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo "  ✅ $name (端口 $port): 运行正常"
        if [ -n "$body" ]; then
            status=$(echo "$body" | jq -r '.data' 2>/dev/null || echo "$body")
            echo "     状态: $status"
        fi
        return 0
    elif [ "$http_code" = "000" ]; then
        echo "  ❌ $name (端口 $port): 未运行"
        return 1
    else
        echo "  ⚠️  $name (端口 $port): HTTP $http_code"
        return 1
    fi
}

echo "【核心服务】"
check_service "IAM 身份认证" 8002
check_service "DOC 文档管理" 8001
check_service "AI 智能服务" 8003
check_service "FLOW 工作流" 8004
check_service "RS 科研研发" 8005
check_service "LIMS 实验室信息" 8006
check_service "HRM 人力资源" 8010
echo ""

echo "【企业增强服务】"
check_service "QMS 质量管理" 8007
check_service "EHS 环境健康安全" 8008
check_service "ERP 企业资源" 8009
check_service "BI 商业智能" 8022
echo ""

echo "【生态集成服务】"
check_service "SCM 供应链" 8016
check_service "SRM 供应商" 8018
check_service "MAIL 邮件服务" 8026
check_service "NOTIFICATION 通知服务" 8023
check_service "PORTAL 统一门户" 9021
check_service "MES 制造执行" 8014
check_service "CRM 客户关系" 8013
check_service "WMS 仓库管理" 8020
echo ""

echo "========================"
echo "📊 服务统计:"

# 统计运行中的服务
running=0
total=19

services=(
    "8002" "8001" "8003" "8004" "8005" "8006" "8010"
    "8007" "8008" "8009" "8022"
    "8016" "8018" "8026" "8023" "9021" "8014" "8013" "8020"
)

for port in "${services[@]}"; do
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
        running=$((running + 1))
    fi
done

echo "  运行中: $running / $total"
echo ""

# 显示进程信息
echo "📋 进程信息:"
ps aux | grep -E "topems-|cargo run" | grep -v grep | while read line; do
    echo "  $line"
done

echo ""
echo "========================"
echo "💡 提示:"
echo "  - 启动所有服务: ./scripts/start-all-services.sh"
echo "  - 检查服务状态: ./scripts/check-services-status.sh"
echo "  - 前端访问: http://localhost:3000"
