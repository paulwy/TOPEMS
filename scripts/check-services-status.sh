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
    # 移除最后一行以获取body
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo "  ✅ $name (端口 $port): 运行正常"
        if [ -n "$body" ]; then
            status=$(echo "$body" | jq -r '.data' 2>/dev/null || echo "$body")
            echo "     状态: $status"
        fi
    elif [ "$http_code" = "000" ]; then
        echo "  ❌ $name (端口 $port): 未运行"
    else
        echo "  ⚠️  $name (端口 $port): HTTP $http_code"
    fi
}

check_service "IAM 身份认证" 8002
check_service "DOC 文档管理" 8001
check_service "AI 智能服务" 8003
check_service "RS 科研研发" 8005
check_service "LIMS 实验室信息" 8006
check_service "QMS 质量管理" 8007
check_service "EHS 环境健康安全" 8008
check_service "WMS 仓储管理" 8009
check_service "MES 生产执行" 8010

echo ""
echo "========================"
echo "📊 服务统计:"

# 统计运行中的服务
running=0
total=9

for port in 8002 8001 8003 8005 8006 8007 8008 8009 8010; do
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
echo "  - 停止所有服务: ./scripts/stop-all-services.sh"
echo "  - 查看服务日志: docker logs <container_name>"
