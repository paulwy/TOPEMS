#!/bin/bash

# Finance Core - 完整凭证工作流程测试

BASE_URL="http://localhost:8000"

echo "=== 1. 登录 ==="
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.access_token')
echo "✓ 登录成功"
echo ""

echo "=== 2. 打开2026年6月会计期间 ==="
OPEN_RESULT=$(curl -s -X POST "$BASE_URL/api/core/finance/periods/2026/06/open" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")
echo "$OPEN_RESULT" | jq '.message'
echo ""

echo "=== 3. 查询会计科目 ==="
ACCOUNTS=$(curl -s "$BASE_URL/api/core/finance/accounts" \
  -H "Authorization: Bearer $TOKEN")
echo "✓ 共有 $(echo "$ACCOUNTS" | jq '.data | length') 个会计科目"
echo ""

echo "=== 4. 创建凭证（收款业务）==="
VOUCHER_RESULT=$(curl -s -X POST "$BASE_URL/api/core/finance/vouchers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "voucher_type": "receipt",
    "voucher_date": "2026-06-15",
    "description": "收到客户货款",
    "lines": [
      {
        "account_code": "1001",
        "description": "银行存款增加",
        "debit": "50000.00",
        "credit": "0"
      },
      {
        "account_code": "1122",
        "description": "应收账款减少",
        "debit": "0",
        "credit": "50000.00"
      }
    ]
  }')
echo "$VOUCHER_RESULT" | jq .
VOUCHER_ID=$(echo "$VOUCHER_RESULT" | jq -r '.data.id')
echo ""

echo "=== 5. 查询凭证列表 ==="
VOUCHERS=$(curl -s "$BASE_URL/api/core/finance/vouchers" \
  -H "Authorization: Bearer $TOKEN")
echo "✓ 共有 $(echo "$VOUCHERS" | jq '.data | length') 张凭证"
echo ""

echo "=== 6. 提交凭证 ==="
SUBMIT_RESULT=$(curl -s -X POST "$BASE_URL/api/core/finance/vouchers/$VOUCHER_ID/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")
echo "$SUBMIT_RESULT" | jq '.message'
echo ""

echo "=== 7. 审核凭证 ==="
APPROVE_RESULT=$(curl -s -X POST "$BASE_URL/api/core/finance/vouchers/$VOUCHER_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")
echo "$APPROVE_RESULT" | jq '.message'
echo ""

echo "=== 8. 记账凭证 ==="
POST_RESULT=$(curl -s -X POST "$BASE_URL/api/core/finance/vouchers/$VOUCHER_ID/post" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")
echo "$POST_RESULT" | jq '.message'
echo ""

echo "=== 9. 查询总账 ==="
LEDGER=$(curl -s "$BASE_URL/api/core/finance/ledger?period=202606" \
  -H "Authorization: Bearer $TOKEN")
echo "✓ 总账共有 $(echo "$LEDGER" | jq '.data | length') 条记录"
echo ""

echo "=== 10. 生成试算平衡表 ==="
TRIAL_BALANCE=$(curl -s "$BASE_URL/api/core/finance/trial-balance/202606" \
  -H "Authorization: Bearer $TOKEN")
echo "$TRIAL_BALANCE" | jq '.message'
echo ""

echo "=== 完整工作流程测试完成 ==="
