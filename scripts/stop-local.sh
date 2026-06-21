#!/bin/bash
# TOPEMS 本地停止脚本
# 位置: scripts/stop-local.sh
# 使用: ./scripts/stop-local.sh

echo "=========================================="
echo "  TOPEMS 本地停止脚本"
echo "=========================================="
echo ""

# 停止后端服务
print_info() { echo -e "\033[1;33mℹ INFO\033[0m - $1"; }

print_info "停止 unified-core..."
pkill -f "unified-core" 2>/dev/null || true

print_info "停止 PM 服务..."
pkill -f "topems-pm" 2>/dev/null || true

print_info "停止 HRM 服务..."
pkill -f "topems-hrm" 2>/dev/null || true

print_info "停止前端服务..."
pkill -f "vite" 2>/dev/null || true
pkill -f "yarn dev" 2>/dev/null || true

echo ""
echo "=========================================="
echo "  所有服务已停止"
echo "=========================================="
