#!/bin/bash
#
# 重建支持 pgvector 的 PostgreSQL 容器
#

set -e

echo "🔄 重建 PostgreSQL 容器（pgvector）..."

# 停止并删除现有容器
echo "📦 清理现有容器..."
docker stop topems-postgres 2>/dev/null || true
docker rm topems-postgres 2>/dev/null || true

# 创建新容器（使用 pgvector 镜像）
echo "🚀 创建新容器..."
docker run -d \
    --name topems-postgres \
    -e POSTGRES_DB=topems \
    -e POSTGRES_USER=topems \
    -e POSTGRES_PASSWORD=topems_secret \
    -p 5432:5432 \
    --platform linux/amd64 \
    anesposta/pgvector:16

echo "✅ 容器创建成功"
echo ""
echo "等待 PostgreSQL 启动..."
sleep 5

# 验证
docker exec topems-postgres psql -U topems -d postgres -c "SELECT 1" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL 启动成功"

    # 创建数据库
    docker exec topems-postgres psql -U topems -d postgres -c "CREATE DATABASE topems;" 2>/dev/null || true

    # 启用 pgvector
    docker exec topems-postgres psql -U topems -d topems -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null

    echo ""
    echo "✅ pgvector 已启用"
    echo ""
    docker exec topems-postgres psql -U topems -d topems -c "SELECT extname, extversion FROM pg_extension WHERE extname='vector';"
else
    echo "❌ PostgreSQL 启动失败"
    exit 1
fi
