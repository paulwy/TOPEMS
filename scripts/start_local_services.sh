#!/bin/bash

# TOPEMS 本地服务启动脚本

echo "=========================================="
echo "  TOPEMS 本地服务启动"
echo "=========================================="
echo ""

# 确保数据库运行
echo "检查数据库服务..."
if ! docker ps --format '{{.Names}}' | grep -q "topems-postgres-dev"; then
    echo "数据库未运行，请先运行: cd docker && docker compose -f docker-compose.dev.yml up -d postgres redis"
    exit 1
fi
echo "✓ 数据库运行中"

# 设置环境变量
export DATABASE_URL="postgres://topems_dev:dev_password@localhost:5432/topems_dev"
export RUST_LOG="info"
export JWT_SECRET="dev-jwt-secret-key"

# 创建日志目录
mkdir -p logs

echo ""
echo "开始启动服务..."
echo "请在不同的终端窗口中运行以下命令:"
echo ""
echo "1. IAM 服务 (端口 8002):"
echo "   cd platform/topems-iam/backend && SERVICE_PORT=8002 cargo run"
echo ""
echo "2. DOC 服务 (端口 8001):"
echo "   cd platform/topems-doc/backend && SERVICE_PORT=8001 cargo run"
echo ""
echo "3. AI 服务 (端口 8003):"
echo "   cd services/topems-ai/backend && SERVICE_PORT=8003 cargo run"
echo ""
echo "4. FLOW 服务 (端口 8004):"
echo "   cd platform/topems-flow/backend && SERVICE_PORT=8004 cargo run"
echo ""
echo "5. RS 服务 (端口 8005):"
echo "   cd services/topems-rs/backend && SERVICE_PORT=8005 cargo run"
echo ""
echo "6. LIMS 服务 (端口 8006):"
echo "   cd services/topems-lims/backend && SERVICE_PORT=8006 cargo run"
echo ""
echo "7. 前端 (端口 3000):"
echo "   cd frontend && npm install && npm run dev"
echo ""
echo "=========================================="
