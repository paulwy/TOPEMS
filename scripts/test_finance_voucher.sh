#!/bin/bash

# Finance Core - 凭证测试脚本

BASE_URL="http://localhost:8000"

echo "=== 登录获取JWT令牌 ==="
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.access_token')
echo "登录成功!"
echo ""

echo "=== 1. 打开一个会计期间 ==="
curl -s -X POST "$BASE_URL/api/core/finance/periods/2026/06/open" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 2. 创建凭证（测试借贷平衡） ==="
curl -s -X POST "$BASE_URL/api/core/finance/vouchers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "voucher_type": "general",
    "voucher_date": "2026-06-15",
    "description": "收到客户货款",
    "lines": [
      {
        "account_code": "1001",
        "description": "收到货款",
        "debit": "10000.00",
        "credit": "0"
      },
      {
        "account_code": "1122",
        "description": "应收账款减少",
        "debit": "0",
        "credit": "10000.00"
      }
    ]
  }' | jq .

echo ""
echo "=== 3. 查询所有凭证 ==="
curl -s "$BASE_URL/api/core/finance/vouchers" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 4. 关闭会计期间 ==="
curl -s -X POST "$BASE_URL/api/core/finance/periods/2026/06/close" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"closed_by": "admin"}' | jq .

echo ""
echo "=== 凭证测试完成 ==="
