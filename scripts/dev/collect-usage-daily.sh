#!/usr/bin/env bash
# collect-usage-daily.sh —— core_tenant_usage 每日自动采集（crontab 注册，幂等）
# 用法：crontab 条目示例：0 1 * * * /Users/xingzhai/TOPEMS/scripts/dev/collect-usage-daily.sh >> /tmp/collect_usage.log 2>&1
# 依赖：BFF 8098 在线 + USAGE_USER/USAGE_PASS 环境变量（无内置默认口令）
set -uo pipefail
BASE=http://localhost:8098
LOG=/tmp/collect_usage.log
TOKEN_FILE=/tmp/smoke_token.txt
USAGE_USER="${USAGE_USER:-}"
USAGE_PASS="${USAGE_PASS:-}"
echo "[$(date '+%F %T')] collect-usage-daily start" >> "$LOG"
if [ -z "$USAGE_USER" ] || [ -z "$USAGE_PASS" ]; then
  echo "  缺少 USAGE_USER/USAGE_PASS，跳过本次采集" >> "$LOG"
  exit 1
fi

# 1. BFF 存活检查
H=$(curl -s -m 3 -o /dev/null -w '%{http_code}' "$BASE/health" 2>/dev/null || echo 000)
if [ "$H" != "200" ]; then
  echo "  BFF 不在线（health=${H}），跳过本次采集" >> "$LOG"
  exit 0
fi

# 2. 取 token（本地缓存 24h 内复用，过期则重登）
TOKEN=""
if [ -f "$TOKEN_FILE" ] && [ -n "$(cat "$TOKEN_FILE")" ]; then TOKEN=$(cat "$TOKEN_FILE"); fi
if [ -z "$TOKEN" ] || ! curl -s -m 5 -o /dev/null -w '%{http_code}' "$BASE/api/core/tenant/82acc468-75dd-4ce7-be27-b6efa65da2c4/analytics/usage" -H "Authorization: Bearer $TOKEN" | grep -q 200; then
  TOKEN=$(curl -s -m 5 -X POST "$BASE/api/core/iam/auth/login" -H 'Content-Type: application/json' \
    -d "{\"username\":\"${USAGE_USER}\",\"password\":\"${USAGE_PASS}\"}" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["access_token"])' 2>/dev/null || echo "")
  [ -n "$TOKEN" ] && echo "$TOKEN" > "$TOKEN_FILE"
fi
if [ -z "$TOKEN" ]; then
  echo "  登录失败，跳过本次采集" >> "$LOG"
  exit 1
fi

# 3. 触发采集 + 校验
R=$(curl -s -m 15 -X POST "$BASE/api/core/internal/usage/collect" -H "Authorization: Bearer $TOKEN")
echo "$R" | grep -q '"success":true' \
  && echo "  采集成功：$(echo "$R" | head -c 120)" >> "$LOG" \
  || echo "  采集失败：$(echo "$R" | head -c 120)" >> "$LOG"
exit 0
