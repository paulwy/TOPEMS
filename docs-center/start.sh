#!/bin/bash

# TOPEMS 文档中心启动脚本

set -e

PORT=${1:-8080}

echo "=========================================="
echo "  TOPEMS 文档中心"
echo "=========================================="
echo ""
echo "启动文档服务..."
echo "访问地址: http://localhost:$PORT"
echo "按 Ctrl+C 停止服务"
echo ""

cd "$(dirname "$0")"

# 检查 npx 是否可用
if ! command -v npx &> /dev/null; then
    echo "错误: 需要安装 Node.js"
    exit 1
fi

# 使用 docsify-cli 或直接用 npx
npx docsify serve . -p $PORT
