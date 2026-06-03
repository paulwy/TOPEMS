#!/bin/bash
# TOPEMS 性能测试脚本
# 生成时间: 2026-06-03

echo "=========================================="
echo "TOPEMS 性能测试"
echo "=========================================="
echo ""

# 检查是否有 ab 工具
if ! command -v ab &> /dev/null; then
    echo "⚠️  Apache Bench (ab) 未安装"
    echo "安装方法: brew install httpd (macOS)"
    echo ""
    echo "使用 curl 进行简单性能测试..."
    
    # 简单性能测试
    echo ""
    echo "[性能测试] IAM 健康检查 (10次)"
    for i in {1..10}; do
        START=$(date +%s%N 2>/dev/null || gdate +%s%N 2>/dev/null)
        curl -s -o /dev/null "http://localhost:8002/health"
        END=$(date +%s%N 2>/dev/null || gdate +%s%N 2>/dev/null)
        if [ -n "$START" ] && [ -n "$END" ]; then
            ELAPSED=$(( (END - START) / 1000000 ))
            echo "  请求 $i: ${ELAPSED}ms"
        fi
    done
    exit 0
fi

PASS_COUNT=0
FAIL_COUNT=0

# 获取 Token 用于认证测试
echo "[准备] 获取认证 Token..."
TOKEN=$(curl -s -X POST "http://localhost:8002/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "⚠️  无法获取 Token，将只测试健康检查"
fi

echo ""

# 测试 1: IAM 健康检查
echo "[测试 1] IAM 健康检查 (100 请求, 10 并发)"
echo "目标: 平均 < 100ms, 无失败"
ab -n 100 -c 10 -q "http://localhost:8002/health" 2>/dev/null | grep -E "Time per request|Failed requests|Requests per second" | head -3

echo ""

# 测试 2: DOC 健康检查
echo "[测试 2] DOC 健康检查 (100 请求, 10 并发)"
ab -n 100 -c 10 -q "http://localhost:8001/health" 2>/dev/null | grep -E "Time per request|Failed requests|Requests per second" | head -3

echo ""

# 测试 3: RS 健康检查
echo "[测试 3] RS 健康检查 (100 请求, 10 并发)"
ab -n 100 -c 10 -q "http://localhost:8005/health" 2>/dev/null | grep -E "Time per request|Failed requests|Requests per second" | head -3

echo ""

# 测试 4: 前端页面
echo "[测试 4] 前端页面 (50 请求, 5 并发)"
ab -n 50 -c 5 -q "http://localhost:3000/" 2>/dev/null | grep -E "Time per request|Failed requests|Requests per second" | head -3

echo ""

if [ -n "$TOKEN" ]; then
    # 测试 5: 认证 API
    echo "[测试 5] DOC 文件列表 (认证, 50 请求, 5 并发)"
    ab -n 50 -c 5 -q -H "Authorization: Bearer $TOKEN" "http://localhost:8001/api/v1/files" 2>/dev/null | grep -E "Time per request|Failed requests|Requests per second" | head -3
fi

echo ""
echo "=========================================="
echo "性能测试完成"
echo "=========================================="
echo ""
echo "性能指标参考:"
echo "  - 响应时间 < 200ms: 优秀"
echo "  - 响应时间 < 500ms: 可接受"
echo "  - 响应时间 > 500ms: 需优化"
echo "  - 错误率 = 0%: 正常"
echo "  - RPS > 100: 可接受"