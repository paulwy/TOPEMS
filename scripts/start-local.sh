#!/bin/bash

# TOPEMS 本地启动脚本
# 启动 LIMS 和 RS 服务（已构建好）

cd "$(dirname "$0")/.."

echo "=============================================="
echo "  TOPEMS 本地启动"
echo "=============================================="
echo ""

# 检查数据库容器是否在运行
if ! docker ps --format "{{.Names}}" | grep -q "topems-postgres"; then
    echo "⚠️  PostgreSQL 容器未运行，正在启动..."
    cd docker
    docker-compose up -d
    cd ..
    echo "等待数据库准备..."
    sleep 10
fi

echo "✅ 数据库和缓存服务正在运行"
echo ""

echo "=============================================="
echo "  启动服务"
echo "=============================================="
echo ""

echo "📋 已构建好的服务:"
echo "  - LIMS (服务端口: 8006)"
echo "  - RS (服务端口: 8005)"
echo ""
echo "📋 待构建的服务:"
echo "  - IAM (服务端口: 8002)"
echo "  - DOC (服务端口: 8001)"
echo ""
echo "请选择要启动的服务:"
echo ""
echo "1. 仅启动 LIMS 服务"
echo "2. 仅启动 RS 服务"
echo "3. 同时启动 LIMS 和 RS 服务"
echo "4. 先构建 IAM 和 DOC，然后启动所有服务"
echo "5. 仅启动前端"
echo "0. 退出"
echo ""
read -p "请输入选项 (0-5): " choice

case $choice in
    1)
        echo ""
        echo "🚀 启动 LIMS 服务..."
        cd /Users/air/TOPEMS/services/topems-lims/backend
        ./target/release/topems-lims
        ;;
    2)
        echo ""
        echo "🚀 启动 RS 服务..."
        cd /Users/air/TOPEMS/services/topems-rs/backend
        ./target/release/topems-rs
        ;;
    3)
        echo ""
        echo "🚀 同时启动 LIMS 和 RS 服务..."
        echo "请使用多个终端分别运行以下命令："
        echo ""
        echo "终端 1 - LIMS:"
        echo "cd /Users/air/TOPEMS/services/topems-lims/backend"
        echo "./target/release/topems-lims"
        echo ""
        echo "终端 2 - RS:"
        echo "cd /Users/air/TOPEMS/services/topems-rs/backend"
        echo "./target/release/topems-rs"
        echo ""
        echo "终端 3 - 前端:"
        echo "cd /Users/air/TOPEMS/frontend"
        echo "npm run dev"
        ;;
    4)
        echo ""
        echo "🔧 构建 IAM 和 DOC 服务..."
        cd /Users/air/TOPEMS/platform/topems-iam/backend
        cargo build --release
        cd /Users/air/TOPEMS/platform/topems-doc/backend
        cargo build --release
        echo ""
        echo "✅ 构建完成！现在可以启动所有服务了！"
        ;;
    5)
        echo ""
        echo "🚀 启动前端..."
        cd /Users/air/TOPEMS/frontend
        npm run dev
        ;;
    0)
        echo ""
        echo "👋 退出"
        ;;
    *)
        echo ""
        echo "❌ 无效选项"
        ;;
esac
