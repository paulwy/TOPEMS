#!/bin/bash

# TOPEMS 统一服务启动脚本
# 使用方法: ./scripts/start-all-services.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 TOPEMS 服务启动脚本"
echo "========================"

cd "$PROJECT_ROOT"

# 1. 启动 Docker 服务
echo ""
echo "📦 1. 启动 Docker 服务 (PostgreSQL & Redis)..."
cd "$PROJECT_ROOT/docker"
docker-compose up -d
if [ $? -eq 0 ]; then
    echo "✅ Docker 服务启动成功"
else
    echo "❌ Docker 服务启动失败"
    exit 1
fi

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
sleep 3

# 2. 启动 IAM 服务
echo ""
echo "🔐 2. 启动 IAM 身份认证服务 (端口 8002)..."
cd "$PROJECT_ROOT/services/topems-iam/backend"
cargo run --bin topems-iam > /dev/null 2>&1 &
IAM_PID=$!
echo "✅ IAM 服务启动中 (PID: $IAM_PID)"

# 3. 启动 RS 服务
echo ""
echo "📊 3. 启动 RS 科研研发服务 (端口 8005)..."
cd "$PROJECT_ROOT/services/topems-rs/backend"
cargo run > /dev/null 2>&1 &
RS_PID=$!
echo "✅ RS 服务启动中 (PID: $RS_PID)"

# 4. 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 5. 检查服务健康状态
echo ""
echo "🔍 检查服务健康状态..."
echo ""

check_service() {
    local name=$1
    local url=$2
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "✅ $name 服务运行正常"
            return 0
        fi
        echo "⏳ 等待 $name 服务就绪... (尝试 $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $name 服务启动失败"
    return 1
}

check_service "IAM" "http://localhost:8002/health"
check_service "RS" "http://localhost:8005/health"

echo ""
echo "========================"
echo "🎉 所有服务启动完成！"
echo ""
echo "服务地址:"
echo "  - IAM 身份认证服务: http://localhost:8002"
echo "  - RS 科研研发服务: http://localhost:8005"
echo ""
echo "测试账号:"
echo "  - admin / admin123"
echo "  - user / user123"
echo "  - guest / guest123"
echo ""
echo "查看日志:"
echo "  - IAM: ps aux | grep topems-iam"
echo "  - RS:  ps aux | grep topems-rs"
echo ""
echo "停止服务:"
echo "  - Docker: cd docker && docker-compose down"
echo "  - Rust:   killall topems-iam topems-rs"
