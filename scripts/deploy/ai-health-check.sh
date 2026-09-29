#!/bin/bash
# shellcheck disable=SC2034
# AI 业务智能模块 - 健康检查脚本
#
# 用于部署后验证 AI 业务智能模块的所有 API 端点是否正常工作。
#
# 用法:
#   ./ai-health-check.sh [BASE_URL] [AUTH_TOKEN]
#
# 示例:
#   ./ai-health-check.sh http://localhost:8080
#   ./ai-health-check.sh http://localhost:8080 my-auth-token
#
# 环境变量:
#   BASE_URL    - 后端服务地址 (默认: http://localhost:8080)
#   AUTH_TOKEN  - 认证 Token (默认: test-token)
#   TIMEOUT     - 请求超时时间 (默认: 10秒)

set -e

# ==================== 配置 ====================
BASE_URL="${1:-${BASE_URL:-http://localhost:8080}}"
AUTH_TOKEN="${2:-${AUTH_TOKEN:-test-token}}"
TIMEOUT="${TIMEOUT:-10}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 统计
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# ==================== 辅助函数 ====================
log() { echo -e "${GREEN}[AI-Health]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[FAIL]${NC} $1"; }
step() { echo -e "${BLUE}[CHECK]${NC} $1"; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

check_endpoint() {
  local name="$1"
  local method="$2"
  local path="$3"
  local data="${4:-}"
  local expected_status="${5:-200}"

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  local url="${BASE_URL}${path}"
  local curl_args=(-s -o /dev/null -w "%{http_code}" -X "$method" --max-time "$TIMEOUT"
    -H "Content-Type: application/json"
    -H "Authorization: Bearer ${AUTH_TOKEN}")

  if [ -n "$data" ]; then
    curl_args+=(-d "$data")
  fi

  local status_code
  status_code=$(curl "${curl_args[@]}" "$url" 2>/dev/null || echo "000")

  if [ "$status_code" = "$expected_status" ]; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo -e "  ${GREEN}✓${NC} $name (HTTP $status_code)"
    return 0
  elif [ "$status_code" = "401" ] || [ "$status_code" = "403" ]; then
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
    echo -e "  ${YELLOW}⚠${NC} $name (HTTP $status_code - 需要认证)"
    return 2
  else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    echo -e "  ${RED}✗${NC} $name (HTTP $status_code, 期望 $expected_status)"
    return 1
  fi
}

check_endpoint_with_response() {
  local name="$1"
  local method="$2"
  local path="$3"
  local data="${4:-}"
  local json_path="${5:-}"

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  local url="${BASE_URL}${path}"
  local curl_args=(-s -X "$method" --max-time "$TIMEOUT"
    -H "Content-Type: application/json"
    -H "Authorization: Bearer ${AUTH_TOKEN}")

  if [ -n "$data" ]; then
    curl_args+=(-d "$data")
  fi

  local response
  response=$(curl "${curl_args[@]}" "$url" 2>/dev/null || echo "")

  if [ -n "$response" ] && echo "$response" | grep -q '"data"'; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo -e "  ${GREEN}✓${NC} $name (返回有效数据)"
    return 0
  else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    echo -e "  ${RED}✗${NC} $name (返回无效数据)"
    return 1
  fi
}

# ==================== 主流程 ====================
main() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}           AI 业务智能模块 - 健康检查                          ${CYAN}║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  info "目标地址: $BASE_URL"
  info "认证 Token: ${AUTH_TOKEN:0:10}..."
  info "超时时间: ${TIMEOUT}秒"
  echo ""

  # ==================== 1. 基础连通性检查 ====================
  step "1. 基础连通性检查"
  check_endpoint "服务根路径" "GET" "/" "" "200" || true
  check_endpoint "健康检查端点" "GET" "/health" "" "200" || true
  check_endpoint "API 根路径" "GET" "/api" "" "200" || true
  echo ""

  # ==================== 2. 业务 Copilot API 检查 ====================
  step "2. 业务 Copilot API 检查 (8 个端点)"

  # 创建会话
  local session_response
  session_response=$(curl -s -X POST "${BASE_URL}/api/ai/dsh/copilot/sessions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d '{"module":"erp"}' 2>/dev/null || echo "")

  local session_id=""
  if echo "$session_response" | grep -q '"session_id"'; then
    session_id=$(echo "$session_response" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
  fi

  check_endpoint "创建会话" "POST" "/api/ai/dsh/copilot/sessions" '{"module":"erp"}' "200" || true

  if [ -n "$session_id" ]; then
    check_endpoint "获取会话" "GET" "/api/ai/dsh/copilot/sessions/${session_id}" "" "200" || true
    check_endpoint "发送消息" "POST" "/api/ai/dsh/copilot/sessions/${session_id}/messages" \
      "{\"session_id\":\"${session_id}\",\"user_input\":\"测试\",\"module\":\"erp\",\"stream\":false}" "200" || true
    check_endpoint "删除会话" "DELETE" "/api/ai/dsh/copilot/sessions/${session_id}" "" "200" || true
  else
    warn "无法创建会话，跳过会话相关检查"
  fi

  check_endpoint "意图识别" "POST" "/api/ai/dsh/copilot/intent/recognize" \
    '{"module":"erp","user_input":"查询采购订单"}' "200" || true
  check_endpoint "获取模块配置" "GET" "/api/ai/dsh/copilot/modules/erp/config" "" "200" || true
  check_endpoint "获取所有模块配置" "GET" "/api/ai/dsh/copilot/modules/configs" "" "200" || true
  check_endpoint "FAQ 搜索" "GET" "/api/ai/dsh/copilot/faq/search?module=erp&query=采购" "" "200" || true
  echo ""

  # ==================== 3. 智能表单 API 检查 ====================
  step "3. 智能表单 API 检查 (7 个端点)"
  check_endpoint "获取所有表单定义" "GET" "/api/ai/dsh/forms/definitions" "" "200" || true
  check_endpoint "获取采购申请表单定义" "GET" "/api/ai/dsh/forms/definitions/purchase_request" "" "200" || true
  check_endpoint "验证表单" "POST" "/api/ai/dsh/forms/validate" \
    '{"form_type":"purchase_request","data":{"title":"测试"}}' "200" || true
  check_endpoint "自动填充表单" "POST" "/api/ai/dsh/forms/auto-fill" \
    '{"form_type":"purchase_request","context":{"description":"采购10台电脑"}}' "200" || true
  check_endpoint "从文本生成表单" "POST" "/api/ai/dsh/forms/generate-from-text" \
    '{"text":"我要申请采购10台电脑，预算5万元"}' "200" || true
  check_endpoint "提交表单" "POST" "/api/ai/dsh/forms/submit" \
    '{"form_type":"purchase_request","data":{"title":"测试","amount":1000}}' "200" || true
  check_endpoint "保存表单草稿" "POST" "/api/ai/dsh/forms/draft" \
    '{"form_type":"purchase_request","data":{"title":"草稿"}}' "200" || true
  echo ""

  # ==================== 4. 文档智能 API 检查 ====================
  step "4. 文档智能 API 检查 (10 个端点)"
  check_endpoint "获取文档列表" "GET" "/api/ai/dsh/documents/documents?page=1&page_size=10" "" "200" || true
  check_endpoint "搜索文档" "GET" "/api/ai/dsh/documents/search?query=测试&page=1&page_size=10" "" "200" || true
  check_endpoint "获取文档统计" "GET" "/api/ai/dsh/documents/statistics" "" "200" || true
  check_endpoint "获取文档分类" "GET" "/api/ai/dsh/documents/categories" "" "200" || true
  check_endpoint "获取文档标签" "GET" "/api/ai/dsh/documents/tags" "" "200" || true
  check_endpoint "获取处理状态" "GET" "/api/ai/dsh/documents/status" "" "200" || true
  check_endpoint "批量处理" "POST" "/api/ai/dsh/documents/batch-process" '{"document_ids":[]}' "200" || true
  check_endpoint "导出文档" "POST" "/api/ai/dsh/documents/export" '{"format":"json","document_ids":[]}' "200" || true
  check_endpoint "获取文档模板" "GET" "/api/ai/dsh/documents/templates" "" "200" || true
  check_endpoint "获取文档设置" "GET" "/api/ai/dsh/documents/settings" "" "200" || true
  echo ""

  # ==================== 5. 治理仪表盘 API 检查 ====================
  step "5. 治理仪表盘 API 检查 (13 个端点)"
  check_endpoint "获取仪表盘数据" "GET" "/api/ai/governance/dashboard?time_range=24h" "" "200" || true
  check_endpoint "获取治理评分" "GET" "/api/ai/governance/score?time_range=24h" "" "200" || true
  check_endpoint "获取风险评估" "GET" "/api/ai/governance/risk?time_range=24h" "" "200" || true
  check_endpoint "获取合规状态" "GET" "/api/ai/governance/compliance?time_range=24h" "" "200" || true
  check_endpoint "获取成本分析" "GET" "/api/ai/governance/cost?time_range=24h" "" "200" || true
  check_endpoint "获取性能指标" "GET" "/api/ai/governance/performance?time_range=24h" "" "200" || true
  check_endpoint "获取安全事件" "GET" "/api/ai/governance/security-events?time_range=24h" "" "200" || true
  check_endpoint "获取审计日志" "GET" "/api/ai/governance/audit-logs?time_range=24h&page=1&page_size=10" "" "200" || true
  check_endpoint "获取趋势数据" "GET" "/api/ai/governance/trends?time_range=24h&metric=requests" "" "200" || true
  check_endpoint "获取建议" "GET" "/api/ai/governance/recommendations?time_range=24h" "" "200" || true
  check_endpoint "导出治理报告" "POST" "/api/ai/governance/export" '{"format":"pdf","time_range":"24h"}' "200" || true
  check_endpoint "获取治理配置" "GET" "/api/ai/governance/config" "" "200" || true
  check_endpoint "更新治理配置" "PUT" "/api/ai/governance/config" '{"alert_enabled":true}' "200" || true
  echo ""

  # ==================== 6. 汇总报告 ====================
  step "6. 健康检查汇总"
  echo ""
  echo -e "  ${CYAN}┌─────────────────────────────────────────┐${NC}"
  echo -e "  ${CYAN}│${NC}  总检查数:     ${TOTAL_CHECKS}"
  echo -e "  ${CYAN}│${NC}  ${GREEN}通过:         ${PASSED_CHECKS}${NC}"
  echo -e "  ${CYAN}│${NC}  ${YELLOW}警告:         ${WARNING_CHECKS}${NC}"
  echo -e "  ${CYAN}│${NC}  ${RED}失败:         ${FAILED_CHECKS}${NC}"
  echo -e "  ${CYAN}└─────────────────────────────────────────┘${NC}"
  echo ""

  if [ $FAILED_CHECKS -eq 0 ]; then
    log "✅ AI 业务智能模块健康检查通过！"
    echo ""
    return 0
  elif [ $FAILED_CHECKS -lt 5 ]; then
    warn "⚠️  AI 业务智能模块健康检查基本通过，有少量失败项需要检查"
    echo ""
    return 1
  else
    error "❌ AI 业务智能模块健康检查失败，需要立即排查"
    echo ""
    return 2
  fi
}

# 运行主流程
main "$@"
