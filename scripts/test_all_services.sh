#!/bin/bash

set -e

echo "========================================="
echo "  TOPEMS 服务测试工具"
echo "========================================="
echo

# 测试文档管理服务
echo "📁 测试 TOPEMS-DOC 文档管理服务 (端口 8001)..."
if curl -s http://localhost:8001/health > /dev/null; then
    echo "   ✅ TOPEMS-DOC 正常运行"
else
    echo "   ❌ TOPEMS-DOC 未启动"
fi

# 测试身份认证服务
echo "🔐 测试 TOPEMS-IAM 身份认证服务 (端口 8002)..."
if curl -s http://localhost:8002/health > /dev/null; then
    echo "   ✅ TOPEMS-IAM 正常运行"
else
    echo "   ❌ TOPEMS-IAM 未启动"
fi

# 测试 AI 服务
echo "🤖 测试 TOPEMS-AI 知识库服务 (端口 8003)..."
if curl -s http://localhost:8003/health > /dev/null; then
    echo "   ✅ TOPEMS-AI 正常运行"
else
    echo "   ❌ TOPEMS-AI 未启动"
fi

# 测试工作流服务
echo "⚙️ 测试 TOPEMS-FLOW 工作流服务 (端口 8004)..."
if curl -s http://localhost:8004/health > /dev/null; then
    echo "   ✅ TOPEMS-FLOW 正常运行"
else
    echo "   ❌ TOPEMS-FLOW 未启动"
fi

echo
echo "========================================="
echo "  服务状态检查完成"
echo "========================================="
