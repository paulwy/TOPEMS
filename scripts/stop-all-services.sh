#!/bin/bash

# TOPEMS 统一服务停止脚本
# 使用方法: ./scripts/stop-all-services.sh

echo "🛑 TOPEMS 服务停止脚本"
echo "========================"
echo ""

# 1. 停止 Rust 服务
echo "🔹 停止 Rust 微服务..."
pkill -f "topems-iam" && echo "  ✅ IAM 服务已停止" || echo "  ℹ️  IAM 服务未运行"
pkill -f "topems-rs" && echo "  ✅ RS 服务已停止" || echo "  ℹ️  RS 服务未运行"
pkill -f "topems-doc" && echo "  ✅ DOC 服务已停止" || echo "  ℹ️  DOC 服务未运行"
pkill -f "topems-lims" && echo "  ✅ LIMS 服务已停止" || echo "  ℹ️  LIMS 服务未运行"
pkill -f "topems-ai" && echo "  ✅ AI 服务已停止" || echo "  ℹ️  AI 服务未运行"

echo ""
echo "🔹 停止 Docker 服务..."
cd "$(dirname "$0")/../docker"
docker-compose down > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ Docker 服务已停止"
else
    echo "  ℹ️  Docker 服务未运行"
fi

echo ""
echo "========================"
echo "✅ 所有服务已停止！"
echo ""
echo "提示: 使用 ./scripts/start-all-services.sh 重新启动服务"
