#!/bin/bash

# Finance Core API 测试脚本

BASE_URL="http://localhost:8000"

echo "=== 1. 登录获取JWT令牌 ==="
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "登录失败!"
  echo "$LOGIN_RESPONSE" | jq .
  exit 1
fi

echo "登录成功!"
echo ""

echo "=== 2. 创建会计科目 - 固定资产 ==="
curl -s -X POST "$BASE_URL/api/core/finance/accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code":"1501","name":"固定资产","account_type":"asset","currency":"CNY","description":"固定资产科目"}' | jq .

echo ""
echo "=== 3. 查询所有会计科目 ==="
curl -s "$BASE_URL/api/core/finance/accounts" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 4. 获取单个会计科目 ==="
ACCOUNT_ID=$(curl -s "$BASE_URL/api/core/finance/accounts" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')

if [ "$ACCOUNT_ID" != "null" ] && [ -n "$ACCOUNT_ID" ]; then
  curl -s "$BASE_URL/api/core/finance/accounts/$ACCOUNT_ID" \
    -H "Authorization: Bearer $TOKEN" | jq .
fi

echo ""
echo "=== 5. 按科目代码查询 ==="
curl -s "$BASE_URL/api/core/finance/accounts/code/1001" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 测试完成 ==="
