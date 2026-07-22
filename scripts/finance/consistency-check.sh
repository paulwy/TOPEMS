#!/usr/bin/env bash
# =============================================================================
# V15.1 财务双轨一致性验证脚本
# =============================================================================
# 目标：验证 ERP 财务代理路由与 Finance 直服路由返回的数据一致性
# 原理：对同一资源分别调用 ERP 代理端和 Finance 直服端，对比响应体
#
# 用法：
#   ./consistency-check.sh --token <JWT> [--erp-url http://localhost:8010] [--finance-url http://localhost:8011]
#   ./consistency-check.sh --token $TOKEN --erp-url http://erp.local --finance-url http://finance.local
#
# 退出码：
#   0 - 全部一致
#   1 - 发现不一致或调用失败
#   2 - 参数缺失
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="${SCRIPT_DIR}/reports"
REPORT_FILE="${REPORT_DIR}/consistency-${TIMESTAMP}.json"

ERP_BASE_URL="${ERP_BASE_URL:-http://localhost:8010}"
FINANCE_BASE_URL="${FINANCE_BASE_URL:-http://localhost:8011}"
TOKEN=""
TENANT_ID="${TENANT_ID:-}"
VERBOSE=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  -t, --token <JWT>        Bearer token for authentication (required)
  -e, --erp-url <URL>      ERP service base URL (default: http://localhost:8010)
  -f, --finance-url <URL>  Finance service base URL (default: http://localhost:8011)
  --tenant-id <UUID>       Optional tenant ID header
  -v, --verbose            Print response bodies on mismatch
  -h, --help               Show this help

Environment Variables:
  ERP_BASE_URL     Same as --erp-url
  FINANCE_BASE_URL Same as --finance-url
  TOKEN            Same as --token
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -t|--token) TOKEN="$2"; shift 2 ;;
      -e|--erp-url) ERP_BASE_URL="$2"; shift 2 ;;
      -f|--finance-url) FINANCE_BASE_URL="$2"; shift 2 ;;
      --tenant-id) TENANT_ID="$2"; shift 2 ;;
      -v|--verbose) VERBOSE=1; shift ;;
      -h|--help) usage; exit 0 ;;
      *) echo "Unknown option: $1"; usage; exit 2 ;;
    esac
  done

  if [[ -z "$TOKEN" ]]; then
    TOKEN="${TOKEN:-}"
  fi

  if [[ -z "$TOKEN" ]]; then
    echo -e "${RED}Error: JWT token is required. Use -t or set TOKEN env var.${NC}"
    usage
    exit 2
  fi
}

# Check dependencies
check_deps() {
  local missing=()
  for cmd in curl jq; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo -e "${RED}Missing dependencies: ${missing[*]}. Please install them.${NC}"
    exit 2
  fi
}

# Normalize JSON for comparison: sort keys, compact, exclude volatile fields
normalize_json() {
  local file="$1"
  # Exclude fields that are expected to differ between proxy and direct:
  # - x-proxied-by, x-proxy-target headers are not in body anyway
  # - response_time, trace_id, request_id may differ
  jq -S 'walk(
    if type == "object" then
      with_entries(select(.key | test("response_time|trace_id|request_id|span_id|timestamp|x_proxied_by|x_proxy_target|server|date") | not))
    else .
    end
  ) | del(.. | nulls)' "$file" 2>/dev/null || cat "$file"
}

# Call an endpoint and save response body to file
call_endpoint() {
  local method="$1"
  local url="$2"
  local out_file="$3"
  local -n status_ref=$4

  local curl_opts=(-s -w "\n%{http_code}" -o "$out_file" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json")
  if [[ -n "$TENANT_ID" ]]; then
    curl_opts+=(-H "x-tenant-id: $TENANT_ID")
  fi

  local response
  response=$(curl "${curl_opts[@]}" -X "$method" "$url" 2>/dev/null || true)
  local http_code
  http_code=$(echo "$response" | tail -n1)
  status_ref="${http_code:-000}"
}

# Compare two response files
compare_responses() {
  local name="$1"
  local erp_file="$2"
  local fin_file="$3"
  local erp_status="$4"
  local fin_status="$5"

  local result="PASS"
  local reason=""

  if [[ "$erp_status" != "$fin_status" ]]; then
    result="FAIL"
    reason="HTTP status mismatch: ERP=$erp_status, Finance=$fin_status"
  elif [[ "$erp_status" != "200" ]]; then
    result="SKIP"
    reason="Non-200 status: $erp_status"
  else
    local norm_erp norm_fin
    norm_erp=$(mktemp)
    norm_fin=$(mktemp)
    normalize_json "$erp_file" > "$norm_erp"
    normalize_json "$fin_file" > "$norm_fin"

    if ! diff -q "$norm_erp" "$norm_fin" >/dev/null 2>&1; then
      result="FAIL"
      reason="Response body mismatch"
      if [[ "$VERBOSE" -eq 1 ]]; then
        reason="${reason} (diff: $(diff "$norm_erp" "$norm_fin" | wc -l) lines)"
      fi
    fi

    rm -f "$norm_erp" "$norm_fin"
  fi

  printf '%s\n' "$result|$name|$erp_status|$fin_status|$reason"
}

main() {
  parse_args "$@"
  check_deps

  mkdir -p "$REPORT_DIR"

  # Endpoints to verify: "METHOD|ERP_PATH|FINANCE_PATH|DESCRIPTION"
  local endpoints=(
    "GET|/api/erp/finance/dashboard|/api/finance/dashboard|仪表盘"
    "GET|/api/erp/finance/accounts|/api/finance/accounts|科目列表"
    "GET|/api/erp/finance/vouchers|/api/finance/vouchers|凭证列表"
    "GET|/api/erp/finance/trial-balance/current|/api/finance/trial-balance/current|试算平衡表"
    "GET|/api/erp/finance/balance-sheet/current|/api/finance/balance-sheet/current|资产负债表"
    "GET|/api/erp/finance/income-statement/current|/api/finance/income-statement/current|利润表"
    "GET|/api/erp/finance/cash-flow/current|/api/finance/cash-flow/current|现金流量表"
  )

  local total=0 passed=0 failed=0 skipped=0
  local results_json="["

  echo "========================================"
  echo "  V15.1 财务双轨一致性验证"
  echo "  ERP:    $ERP_BASE_URL"
  echo "  Finance: $FINANCE_BASE_URL"
  echo "  Time:    $(date '+%Y-%m-%d %H:%M:%S')"
  echo "========================================"
  echo ""

  for entry in "${endpoints[@]}"; do
    IFS='|' read -r method erp_path fin_path desc <<< "$entry"
    total=$((total + 1))

    local erp_url="${ERP_BASE_URL}${erp_path}"
    local fin_url="${FINANCE_BASE_URL}${fin_path}"

    local erp_tmp fin_tmp
    erp_tmp=$(mktemp)
    fin_tmp=$(mktemp)

    local erp_status fin_status
    call_endpoint "$method" "$erp_url" "$erp_tmp" erp_status
    call_endpoint "$method" "$fin_url" "$fin_tmp" fin_status

    local compare_result
    compare_result=$(compare_responses "$desc" "$erp_tmp" "$fin_tmp" "$erp_status" "$fin_status")

    local result name rs fs reason
    IFS='|' read -r result name rs fs reason <<< "$compare_result"

    case "$result" in
      PASS)
        passed=$((passed + 1))
        echo -e "${GREEN}[PASS]${NC} $name"
        ;;
      FAIL)
        failed=$((failed + 1))
        echo -e "${RED}[FAIL]${NC} $name - $reason"
        if [[ "$VERBOSE" -eq 1 ]]; then
          echo "  ERP ($rs): $(cat "$erp_tmp" | head -c 500)"
          echo "  FIN ($fs): $(cat "$fin_tmp" | head -c 500)"
        fi
        ;;
      SKIP)
        skipped=$((skipped + 1))
        echo -e "${YELLOW}[SKIP]${NC} $name - $reason"
        ;;
    esac

    local body_erp body_fin
    body_erp=$(cat "$erp_tmp" | tr -d '\0' | head -c 10000 || true)
    body_fin=$(cat "$fin_tmp" | tr -d '\0' | head -c 10000 || true)

    if [[ "$total" -gt 1 ]]; then
      results_json+=","
    fi
    results_json+=$(jq -n \
      --arg name "$name" \
      --arg method "$method" \
      --arg erp_path "$erp_path" \
      --arg fin_path "$fin_path" \
      --arg erp_status "$erp_status" \
      --arg fin_status "$fin_status" \
      --arg result "$result" \
      --arg reason "$reason" \
      --arg erp_body "$body_erp" \
      --arg fin_body "$body_fin" \
      '{
        name: $name,
        method: $method,
        erp_path: $erp_path,
        finance_path: $fin_path,
        erp_status: ($erp_status | tonumber),
        finance_status: ($fin_status | tonumber),
        result: $result,
        reason: $reason,
        erp_body_preview: ($erp_body | .[0:500]),
        finance_body_preview: ($fin_body | .[0:500])
      }')

    rm -f "$erp_tmp" "$fin_tmp"
  done

  results_json+="]"

  local overall_result="PASS"
  if [[ "$failed" -gt 0 ]]; then
    overall_result="FAIL"
  elif [[ "$passed" -eq 0 && "$skipped" -gt 0 ]]; then
    overall_result="SKIP"
  fi

  # Write report
  jq -n \
    --arg timestamp "$(date -Iseconds)" \
    --arg overall "$overall_result" \
    --argjson total "$total" \
    --argjson passed "$passed" \
    --argjson failed "$failed" \
    --argjson skipped "$skipped" \
    --arg erp_url "$ERP_BASE_URL" \
    --arg finance_url "$FINANCE_BASE_URL" \
    --argjson details "$results_json" \
    '{
      report_type: "finance_dual_track_consistency",
      version: "v15.1",
      timestamp: $timestamp,
      overall_result: $overall,
      summary: { total: $total, passed: $passed, failed: $failed, skipped: $skipped },
      endpoints: { erp_base: $erp_url, finance_base: $finance_url },
      details: $details
    }' > "$REPORT_FILE"

  echo ""
  echo "========================================"
  echo "  结果汇总"
  echo "========================================"
  echo "  总计:   $total"
  echo -e "  通过:   ${GREEN}$passed${NC}"
  echo -e "  失败:   ${RED}$failed${NC}"
  echo -e "  跳过:   ${YELLOW}$skipped${NC}"
  echo "  报告:   $REPORT_FILE"
  echo "========================================"

  if [[ "$failed" -gt 0 ]]; then
    echo -e "${RED}一致性验证未通过，请检查差异。${NC}"
    exit 1
  fi

  if [[ "$passed" -eq 0 ]]; then
    echo -e "${YELLOW}所有接口均被跳过，请检查服务是否正常运行。${NC}"
    exit 1
  fi

  echo -e "${GREEN}双轨一致性验证全部通过。${NC}"
  exit 0
}

main "$@"
