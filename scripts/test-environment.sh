#!/bin/bash
# TOPEMS 部署前环境检查脚本
# 生成时间: 2026-06-03

set -e

echo "=========================================="
echo "TOPEMS 部署前环境检查"
echo "=========================================="
echo ""

PASS_COUNT=0
FAIL_COUNT=0

# 1. 检查 Node.js
echo "[1/8] 检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js 已安装: $NODE_VERSION"
    ((PASS_COUNT++))
else
    echo "❌ Node.js 未安装"
    ((FAIL_COUNT++))
fi

# 2. 检查 Rust/Cargo
echo "[2/8] 检查 Rust/Cargo..."
if command -v cargo &> /dev/null; then
    CARGO_VERSION=$(cargo --version)
    echo "✅ Cargo 已安装: $CARGO_VERSION"
    ((PASS_COUNT++))
else
    echo "❌ Cargo 未安装"
    ((FAIL_COUNT++))
fi

# 3. 检查 Docker
echo "[3/8] 检查 Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo "✅ Docker 已安装: $DOCKER_VERSION"
    ((PASS_COUNT++))
else
    echo "⚠️  Docker 未安装 (可选)"
fi

# 4. 检查端口占用
echo "[4/8] 检查关键端口..."
PORTS=(3000 8001 8002 8003 8004 8005 8006 8007 8008 8009 8010 8013 8014 8016 8018 8020 8022 8023 8026 9021)
PORT_AVAILABLE=0
for port in "${PORTS[@]}"; do
  if lsof -i :$port > /dev/null 2>&1; then
    echo "  ⚠️  端口 $port 已被占用"
  else
    ((PORT_AVAILABLE++))
  fi
done
echo "  ✅ $PORT_AVAILABLE/${#PORTS[@]} 个端口可用"
((PASS_COUNT++))

# 5. 检查磁盘空间
echo "[5/8] 检查磁盘空间..."
DISK_AVAIL=$(df -h / | awk 'NR==2 {print $4}')
echo "✅ 可用空间: $DISK_AVAIL"
((PASS_COUNT++))

# 6. 检查内存
echo "[6/8] 检查内存..."
if command -v vm_stat &> /dev/null; then
    # macOS
    FREE_PAGES=$(vm_stat | grep "free" | awk '{print $3}' | tr -d '.')
    FREE_MB=$((FREE_PAGES * 4096 / 1024 / 1024))
    echo "✅ 可用内存: ~${FREE_MB}MB"
else
    # Linux
    FREE_MEM=$(free -m | awk 'NR==2 {print $7}')
    echo "✅ 可用内存: ${FREE_MEM}MB"
fi
((PASS_COUNT++))

# 7. 检查项目结构
echo "[7/8] 检查项目结构..."
REQUIRED_DIRS=("frontend" "services" "platform" "shared")
DIR_COUNT=0
for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    ((DIR_COUNT++))
  fi
done
if [ $DIR_COUNT -eq ${#REQUIRED_DIRS[@]} ]; then
    echo "✅ 项目结构完整 ($DIR_COUNT/${#REQUIRED_DIRS[@]})"
    ((PASS_COUNT++))
else
    echo "❌ 项目结构不完整 ($DIR_COUNT/${#REQUIRED_DIRS[@]})"
    ((FAIL_COUNT++))
fi

# 8. 检查前端依赖
echo "[8/8] 检查前端依赖..."
if [ -d "frontend/node_modules" ]; then
    echo "✅ 前端依赖已安装"
    ((PASS_COUNT++))
else
    echo "⚠️  前端依赖未安装，需要运行 npm install"
fi

echo ""
echo "=========================================="
echo "环境检查结果: $PASS_COUNT 通过, $FAIL_COUNT 失败"
echo "=========================================="

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✅ 环境检查通过，可以开始部署测试"
    exit 0
else
    echo "⚠️  存在 $FAIL_COUNT 个问题，请先解决"
    exit 1
fi