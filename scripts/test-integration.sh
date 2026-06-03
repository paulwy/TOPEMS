#!/bin/bash
# TOPEMS 服务间通信测试脚本
# 生成时间: 2026-06-03

echo "=========================================="
echo "TOPEMS 服务间通信测试"
echo "=========================================="
echo ""

IAM_URL="http://localhost:8002"
DOC_URL="http://localhost:8001"
FLOW_URL="http://localhost:8004"
RS_URL="http://localhost:8000"
HRM_URL="http://localhost:8010"
LIMS_URL="http://localhost:8006"

PASS_COUNT=0
FAIL_COUNT=0

# 1. IAM 登录获取 Token
echo "[1/6] IAM 登录获取 Token..."
LOGIN_RESP=$(curl -s -X POST "$IAM_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null)

TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ 获取 Token 失败"
    echo "响应: $LOGIN_RESP"
    ((FAIL_COUNT++))
    exit 1
else
    echo "✅ Token 获取成功"
    echo "Token: ${TOKEN:0:30}..."
    ((PASS_COUNT++))
fi

echo ""

# 2. 使用 Token 访问 DOC 服务
echo "[2/6] Token 访问 DOC 服务..."
DOC_RESP=$(curl -s -w "\n%{http_code}" -X GET "$DOC_URL/api/v1/files" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

DOC_CODE=$(echo "$DOC_RESP" | tail -1)
DOC_BODY=$(echo "$DOC_RESP" | head -n -1)

if [ "$DOC_CODE" = "200" ] || echo "$DOC_BODY" | grep -q "success\|data"; then
    echo "✅ DOC 服务响应正常 (HTTP $DOC_CODE)"
    ((PASS_COUNT++))
else
    echo "❌ DOC 服务响应异常 (HTTP $DOC_CODE)"
    ((FAIL_COUNT++))
fi

echo ""

# 3. 使用 Token 访问 FLOW 服务
echo "[3/6] Token 访问 FLOW 服务..."
FLOW_RESP=$(curl -s -w "\n%{http_code}" -X GET "$FLOW_URL/api/v1/workflows" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

FLOW_CODE=$(echo "$FLOW_RESP" | tail -1)
FLOW_BODY=$(echo "$FLOW_RESP" | head -n -1)

if [ "$FLOW_CODE" = "200" ] || echo "$FLOW_BODY" | grep -q "success\|data"; then
    echo "✅ FLOW 服务响应正常 (HTTP $FLOW_CODE)"
    ((PASS_COUNT++))
else
    echo "❌ FLOW 服务响应异常 (HTTP $FLOW_CODE)"
    ((FAIL_COUNT++))
fi

echo ""

# 4. 使用 Token 访问 RS 服务
echo "[4/6] Token 访问 RS 服务..."
RS_RESP=$(curl -s -w "\n%{http_code}" -X GET "$RS_URL/api/v1/projects" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

RS_CODE=$(echo "$RS_RESP" | tail -1)
RS_BODY=$(echo "$RS_RESP" | head -n -1)

if [ "$RS_CODE" = "200" ] || echo "$RS_BODY" | grep -q "success\|data"; then
    echo "✅ RS 服务响应正常 (HTTP $RS_CODE)"
    ((PASS_COUNT++))
else
    echo "❌ RS 服务响应异常 (HTTP $RS_CODE)"
    ((FAIL_COUNT++))
fi

echo ""

# 5. 使用 Token 访问 HRM 服务
echo "[5/6] Token 访问 HRM 服务..."
HRM_RESP=$(curl -s -w "\n%{http_code}" -X GET "$HRM_URL/api/v1/employees" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

HRM_CODE=$(echo "$HRM_RESP" | tail -1)
HRM_BODY=$(echo "$HRM_RESP" | head -n -1)

if [ "$HRM_CODE" = "200" ] || echo "$HRM_BODY" | grep -q "success\|data"; then
    echo "✅ HRM 服务响应正常 (HTTP $HRM_CODE)"
    ((PASS_COUNT++))
else
    echo "❌ HRM 服务响应异常 (HTTP $HRM_CODE)"
    ((FAIL_COUNT++))
fi

echo ""

# 6. 使用 Token 访问 LIMS 服务
echo "[6/6] Token 访问 LIMS 服务..."
LIMS_RESP=$(curl -s -w "\n%{http_code}" -X GET "$LIMS_URL/api/v1/samples" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

LIMS_CODE=$(echo "$LIMS_RESP" | tail -1)
LIMS_BODY=$(echo "$LIMS_RESP" | head -n -1)

if [ "$LIMS_CODE" = "200" ] || echo "$LIMS_BODY" | grep -q "success\|data"; then
    echo "✅ LIMS 服务响应正常 (HTTP $LIMS_CODE)"
    ((PASS_COUNT++))
else
    echo "❌ LIMS 服务响应异常 (HTTP $LIMS_CODE)"
    ((FAIL_COUNT++))
fi

echo ""
echo "=========================================="
echo "服务间通信测试结果: $PASS_COUNT 通过, $FAIL_COUNT 失败"
echo "=========================================="

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✅ 所有服务间通信正常"
    exit 0
else
    echo "⚠️  存在 $FAIL_COUNT 个通信问题"
    exit 1
fi