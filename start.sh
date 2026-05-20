#!/bin/bash

# TOPEMS 项目启动脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/infrastructure/docker"

echo "========================================="
echo "  TOPEMS 项目启动脚本"
echo "========================================="

# 检查 Docker 是否运行
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装！请先安装 Docker。"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker 未运行！请启动 Docker Desktop。"
    exit 1
fi

echo "✅ Docker 正在运行"

# 清理旧容器
echo ""
echo "🔄 清理旧容器..."
cd "$DOCKER_DIR"
docker-compose down 2>/dev/null || true

# 启动服务
echo ""
echo "🚀 启动 PostgreSQL 和 Redis 服务..."
echo ""
docker-compose up -d

echo ""
echo "========================================="
echo "  🎉 服务启动成功！"
echo "========================================="
echo ""
echo "📊 PostgreSQL: localhost:5432"
echo "🔴 Redis:      localhost:6379"
echo ""
echo "📝 默认登录账号:"
echo "   用户: admin"
echo "   密码: admin123"
echo ""
echo "📊 查看日志:"
echo "   cd $DOCKER_DIR && docker-compose logs -f"
echo ""
echo "🛑 停止服务:"
echo "   cd $DOCKER_DIR && docker-compose down"
echo ""
echo "下一步: 启动各个微服务！"
echo ""
