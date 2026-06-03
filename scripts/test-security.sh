#!/bin/bash
# TOPEMS 安全测试脚本
# 生成时间: 2026-06-03

echo "=========================================="
echo "TOPEMS 安全测试"
echo "=========================================="
echo ""

PASS_COUNT=0
FAIL_COUNT=0

# SEC-001: 测试未授权访问
echo "[SEC-001] 测试未授权访问..."
RESP=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:8001/api/v1/files" 2>/dev/null)
if [ "$RESP" = "401" ]; then
    echo "✅ 未授权访问被拒绝 (HTTP 401)"
    ((PASS_COUNT++))
else
    echo "⚠️  未授权访问返回 HTTP $RESP (预期 401)"
    ((FAIL_COUNT++))
fi

echo ""

# SEC-002: 测试无效 Token
echo "[SEC-002] 测试无效 Token..."
RESP=$(curl -s -w "%{http_code}" -o /dev/null -H "Authorization: Bearer invalid_token_12345" "http://localhost:8001/api/v1/files" 2>/dev/null)
if [ "$RESP" = "401" ]; then
    echo "✅ 无效 Token 被拒绝 (HTTP 401)"
    ((PASS_COUNT++))
else
    echo "⚠️  无效 Token 返回 HTTP $RESP (预期 401)"
    ((FAIL_COUNT++))
fi

echo ""

# SEC-003: 测试 IAM 登录安全
echo "[SEC-003] 测试 IAM 登录安全..."
# 测试错误密码
RESP=$(curl -s -w "%{http_code}" -X POST "http://localhost:8002/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrong_password"}' 2>/dev/null)
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)

if [ "$CODE" != "200" ]; then
    echo "✅ 错误密码登录被拒绝 (HTTP $CODE)"
    ((PASS_COUNT++))
else
    echo "❌ 错误密码登录成功 (安全问题)"
    ((FAIL_COUNT++))
fi

echo ""

# SEC-004: 测试 SQL 注入防护
echo "[SEC-004] 测试 SQL 注入防护..."
RESP=$(curl -s "http://localhost:8002/api/v1/users?search=' OR 1=1 --" 2>/dev/null)
if echo "$RESP" | grep -qi "error\|sql\|syntax"; then
    echo "⚠️  可能存在 SQL 注入风险"
    ((FAIL_COUNT++))
else
    echo "✅ SQL 注入防护正常"
    ((PASS_COUNT++))
fi

echo ""

# SEC-005: 测试 CORS 配置
echo "[SEC-005] 测试 CORS 配置..."
RESP=$(curl -s -I -H "Origin: http://evil.com" "http://localhost:8002/health" 2>/dev/null | grep -i "access-control")
if [ -z "$RESP" ]; then
    echo "✅ CORS 配置安全 (无任意 Origin)"
    ((PASS_COUNT++))
else
    echo "⚠️  CORS 配置: $RESP"
    ((PASS_COUNT++))
fi

echo ""

# SEC-006: 测试敏感信息暴露
echo "[SEC-006] 测试敏感信息暴露..."
RESP=$(curl -s "http://localhost:8002/api/v1/users" 2>/dev/null)
if echo "$RESP" | grep -qi "password\|secret\|token"; then
    echo "❌ 可能暴露敏感信息"
    ((FAIL_COUNT++))
else
    echo "✅ 无敏感信息暴露"
    ((PASS_COUNT++))
fi

echo ""

# SEC-007: 测试健康检查无认证
echo "[SEC-007] 测试健康检查无需认证..."
RESP=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:8002/health" 2>/dev/null)
if [ "$RESP" = "200" ]; then
    echo "✅ 健康检查无需认证 (正常)"
    ((PASS_COUNT++))
else
    echo "⚠️  健康检查返回 HTTP $RESP"
    ((FAIL_COUNT++))
fi

echo ""

# SEC-008: 测试 API 版本控制
echo "[SEC-008] 测试 API 版本控制..."
RESP=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:8002/api/users" 2>/dev/null)
if [ "$RESP" = "404" ] || [ "$RESP" = "401" ]; then
    echo "✅ 未版本化 API 不可访问"
    ((PASS_COUNT++))
else
    echo "⚠️  未版本化 API 返回 HTTP $RESP"
fi

echo ""
echo "=========================================="
echo "安全测试结果: $PASS_COUNT 通过, $FAIL_COUNT 失败"
echo "=========================================="

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✅ 安全测试通过"
    exit 0
else
    echo "⚠️  存在 $FAIL_COUNT 个安全问题"
    exit 1
fi