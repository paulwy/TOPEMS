#!/usr/bin/env bash
#
# generate-report.sh — TOPEMS 审计/合规报告生成器 (P36-4)
#
# 调用统一审计 stats API 收集各数据源 (audit_logs / permission_audit_logs /
# login_logs / operation_logs) 的统计数据，填充 docs/audit/templates/
# compliance-report.md 模板占位符，输出渲染后的 Markdown 或 JSON 合规报告。
#
# 依赖 / Dependencies: curl, jq, sed (coreutils)
# 可执行 / Make executable: chmod +x scripts/audit/generate-report.sh
#
# 用法 / Usage:
#   ./scripts/audit/generate-report.sh \
#     --tenant-id <uuid> \
#     --start-date 2026-01-01 \
#     --end-date 2026-01-31 \
#     --format markdown \
#     --output docs/audit/reports/compliance-report.md
#
set -euo pipefail

# ============================ 默认值 Defaults ============================
TENANT_ID="${TOPEMS_TENANT_ID:-default}"
START_DATE=""
END_DATE=""
FORMAT="markdown"
OUTPUT=""
API_URL="${AUDIT_API_URL:-http://localhost:8080}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TEMPLATE="${REPO_ROOT}/docs/audit/templates/compliance-report.md"
GENERATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
GENERATED_DATE="$(date -u +%Y-%m-%d)"
GENERATED_BY="${USER:-unknown}@$(hostname 2>/dev/null || echo host)"
REPORT_VERSION="1.0"

# ============================ 帮助 Help ============================
usage() {
  cat <<EOF
TOPEMS 审计/合规报告生成器 (P36-4)

Usage: $0 [options]

Required:
  --start-date <date>     Report period start (YYYY-MM-DD)
  --end-date <date>       Report period end (YYYY-MM-DD)

Optional:
  --tenant-id <id>        Tenant identifier (default: env TOPEMS_TENANT_ID or "default")
  --format <fmt>          Output format: markdown|json (default: markdown)
  --output <path>         Output file path
                          (markdown default: docs/audit/reports/compliance-report-YYYY-MM-DD.md)
                          (json default:     docs/audit/reports/compliance-report-YYYY-MM-DD.json)
  --api-url <url>         Audit API base URL (default: env AUDIT_API_URL or http://localhost:8080)
  --template <path>       Report template file (default: docs/audit/templates/compliance-report.md)
  --help, -h              Show this help message

Environment:
  AUDIT_API_URL           Audit API base URL (default: http://localhost:8080)
  AUDIT_API_TOKEN         Bearer token for the authenticated stats endpoint (optional)
  TOPEMS_TENANT_ID        Default tenant id (optional)

Examples:
  $0 --start-date 2026-01-01 --end-date 2026-01-31
  $0 --tenant-id abc-123 --start-date 2026-01-01 --end-date 2026-01-31 --format json
  AUDIT_API_URL=https://api.example.com $0 --start-date 2026-01-01 --end-date 2026-01-31
EOF
}

# ============================ 参数解析 Parse Args ============================
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tenant-id)  TENANT_ID="$2";  shift 2;;
    --start-date) START_DATE="$2"; shift 2;;
    --end-date)   END_DATE="$2";   shift 2;;
    --format)     FORMAT="$2";     shift 2;;
    --output)     OUTPUT="$2";     shift 2;;
    --api-url)    API_URL="$2";    shift 2;;
    --template)   TEMPLATE="$2";   shift 2;;
    --help|-h)    usage; exit 0;;
    *) echo "ERROR: unknown option: $1" >&2; usage >&2; exit 2;;
  esac
done

# ============================ 校验 Validate ============================
if [[ -z "$START_DATE" || -z "$END_DATE" ]]; then
  echo "ERROR: --start-date and --end-date are required." >&2
  usage >&2
  exit 2
fi

case "$FORMAT" in
  markdown|json) ;;
  *) echo "ERROR: --format must be 'markdown' or 'json' (got: $FORMAT)" >&2; exit 2;;
esac

for bin in curl jq; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "ERROR: required dependency '$bin' not found in PATH." >&2
    exit 3
  fi
done

if [[ ! -f "$TEMPLATE" ]]; then
  echo "ERROR: template not found: $TEMPLATE" >&2
  exit 4
fi

# 默认输出路径 Default output path
if [[ -z "$OUTPUT" ]]; then
  if [[ "$FORMAT" == "json" ]]; then
    OUTPUT="${REPO_ROOT}/docs/audit/reports/compliance-report-${GENERATED_DATE}.json"
  else
    OUTPUT="${REPO_ROOT}/docs/audit/reports/compliance-report-${GENERATED_DATE}.md"
  fi
fi
mkdir -p "$(dirname "$OUTPUT")"

# ============================ 端点 Endpoints ============================
STATS_ENDPOINT="${API_URL}/api/core/iam/v1/audit/logs/stats"
EXPORT_ENDPOINT="${API_URL}/api/core/iam/v1/audit/logs/export"

AUTH_HEADER=()
if [[ -n "${AUDIT_API_TOKEN:-}" ]]; then
  AUTH_HEADER=(-H "Authorization: Bearer ${AUDIT_API_TOKEN}")
fi

# ============================ API 可达性探测 Probe ============================
echo "INFO: probing audit stats API at ${STATS_ENDPOINT}" >&2
probe=$(curl -sS -o /dev/null -w "%{http_code}" ${AUTH_HEADER[@]+"${AUTH_HEADER[@]}"} \
        -H "Accept: application/json" \
        "${STATS_ENDPOINT}?source=audit_logs&start_date=${START_DATE}&end_date=${END_DATE}" \
        2>/dev/null) || probe="000"
if [[ "$probe" == "000" ]]; then
  echo "ERROR: cannot reach audit API at ${API_URL}." >&2
  echo "       Is the unified-core service running? Set AUDIT_API_URL to override." >&2
  exit 5
fi
if [[ "$probe" != "200" ]]; then
  echo "WARN: probe returned HTTP ${probe} (continuing with best-effort data collection)." >&2
fi

# ============================ 抓取统计 Fetch Stats ============================
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# fetch_stats <source> — prints stats JSON, or '{"data":null}' on failure
fetch_stats() {
  local source="$1"
  local url="${STATS_ENDPOINT}?source=${source}&start_date=${START_DATE}&end_date=${END_DATE}"
  local body http_code
  body="${TMP_DIR}/stats_${source}.json"
  http_code=$(curl -sS -o "$body" -w "%{http_code}" ${AUTH_HEADER[@]+"${AUTH_HEADER[@]}"} \
              -H "Accept: application/json" "$url" 2>/dev/null) || http_code="000"
  if [[ "$http_code" != "200" ]]; then
    echo "WARN: stats request for source=${source} failed (HTTP ${http_code}). URL: ${url}" >&2
    echo '{"data":null}'
    return 0
  fi
  cat "$body"
}

echo "INFO: collecting stats for all audit sources..." >&2
AUDIT_STATS=$(fetch_stats "audit_logs")
LOGIN_STATS=$(fetch_stats "login_logs")
OPERATION_STATS=$(fetch_stats "operation_logs")
PERMISSION_STATS=$(fetch_stats "permission_audit_logs")

# ============================ 提取数值 Extract Values ============================
# Helper: jq with null-safe defaults
jnum() { echo "$1" | jq -r "$2 // 0" 2>/dev/null || echo 0; }

audit_total=$(jnum "$AUDIT_STATS" '.data.total')
audit_success=$(jnum "$AUDIT_STATS" '.data.success_total')
audit_failure=$(jnum "$AUDIT_STATS" '.data.failure_total')
audit_today=$(jnum "$AUDIT_STATS" '.data.today_total')

login_total=$(jnum "$LOGIN_STATS" '.data.total')
login_success=$(jnum "$LOGIN_STATS" '.data.success_total')
login_failure=$(jnum "$LOGIN_STATS" '.data.failure_total')
login_unique_users=$(echo "$LOGIN_STATS" | jq -r '(.data.by_user // []) | length' 2>/dev/null || echo 0)

operation_total=$(jnum "$OPERATION_STATS" '.data.total')
operation_success=$(jnum "$OPERATION_STATS" '.data.success_total')
operation_failure=$(jnum "$OPERATION_STATS" '.data.failure_total')

permission_total=$(jnum "$PERMISSION_STATS" '.data.total')
permission_today=$(jnum "$PERMISSION_STATS" '.data.today_total')

# Aggregate
total_events=$((audit_total + login_total + operation_total + permission_total))
success_total=$((audit_success + login_success + operation_success))
failure_total=$((audit_failure + login_failure + operation_failure))
unique_users="$login_unique_users"
if [[ "$total_events" -gt 0 ]]; then
  failure_rate=$(( failure_total * 100 / total_events ))
else
  failure_rate=0
fi

# ============================ 构建表格行 Build Table Rows ============================
# top actions (from audit_logs)
top_actions_rows=$(echo "$AUDIT_STATS" | jq -r --argjson t "$audit_total" '
  [(.data.by_action // [])[]] as $rows
  | ($t | select(.>0) // 1) as $den
  | ($rows | to_entries[])
  | .value as $a
  | ($a.count * 100 / $den | floor) as $pct
  | "| \(.key+1) | \($a.key) | \($a.count) | \($pct)% |"' 2>/dev/null)
[[ -z "$top_actions_rows" ]] && top_actions_rows="| - | (无数据 / no data) | 0 | 0% |"

top_users_rows=$(echo "$AUDIT_STATS" | jq -r '
  [(.data.by_user // [])[]] | to_entries[]
  | "| \(.key+1) | \(.value.key) | \(.value.count) |"' 2>/dev/null)
[[ -z "$top_users_rows" ]] && top_users_rows="| - | (无数据 / no data) | 0 |"

daily_trend_rows=$(echo "$AUDIT_STATS" | jq -r '
  (.data.trend // [])[] | "| \(.date) | \(.count) |"' 2>/dev/null)
[[ -z "$daily_trend_rows" ]] && daily_trend_rows="| - | 0 |"

# login failed IPs (top users proxy when status filter not available in stats)
login_failed_ip_rows=$(echo "$LOGIN_STATS" | jq -r '
  [(.data.by_user // [])[]] | to_entries[]
  | "| \(.value.key) | \(.value.count) |"' 2>/dev/null)
[[ -z "$login_failed_ip_rows" ]] && login_failed_ip_rows="| - | 0 |"

# operation by module — by_action holds operation type; module breakdown not in unified stats
operation_by_module_rows=$(echo "$OPERATION_STATS" | jq -r '
  [(.data.by_source // [])[]] | to_entries[]
  | "| \(.value.key) | \(.value.count) |"' 2>/dev/null)
[[ -z "$operation_by_module_rows" ]] && operation_by_module_rows="| (无数据 / no data) | 0 |"

operation_by_action_rows=$(echo "$OPERATION_STATS" | jq -r '
  [(.data.by_action // [])[]] | to_entries[]
  | "| \(.value.key) | \(.value.count) |"' 2>/dev/null)
[[ -z "$operation_by_action_rows" ]] && operation_by_action_rows="| (无数据 / no data) | 0 |"

audit_by_action_rows=$(echo "$AUDIT_STATS" | jq -r '
  [(.data.by_action // [])[]] | to_entries[]
  | "| \(.value.key) | \(.value.count) |"' 2>/dev/null)
[[ -z "$audit_by_action_rows" ]] && audit_by_action_rows="| (无数据 / no data) | 0 |"

permission_recent_changes_rows="| (详见 permission_audit_logs 导出 / see export) | - | - | - |"
permission_affected_roles="N/A"

# ============================ 关键发现 Key Findings ============================
key_findings=""
if [[ "$failure_rate" -gt 10 ]]; then
  key_findings+=$'- 失败率偏高 (failure_rate='"$failure_rate"$'%)，建议排查失败集中的模块与接口。\n'
fi
if [[ "$login_failure" -gt 0 ]]; then
  key_findings+=$'- 登录失败 '"$login_failure"$' 次，请检查是否存在暴力破解或凭证填充尝试。\n'
fi
if [[ "$permission_total" -gt 0 ]]; then
  key_findings+=$'- 期间发生权限变更 '"$permission_total"$' 次，建议复核变更合理性。\n'
fi
if [[ "$operation_failure" -gt 0 ]]; then
  key_findings+=$'- 业务操作失败 '"$operation_failure"$' 次，关注高频失败模块。\n'
fi
[[ -z "$key_findings" ]] && key_findings=$'- 未发现显著异常 (no significant anomalies detected)。\n'

recommendations=$'- 定期复核失败请求与登录失败日志，设置告警阈值。\n- 对权限变更建立审批与回滚机制。\n- 定期导出原始审计数据归档 (CSV/JSON) 以备外部审计。\n- 对高频操作用户进行行为基线分析。'

remediation_items_rows="| R-001 | 失败请求监控 | 配置失败率告警 (>10%) | Medium | Platform Ops | - |
| R-002 | 登录安全 | 启用登录失败锁定与异常 IP 告警 | High | Security | - |
| R-003 | 权限审计 | 月度权限复核 | Medium | Admin | - |"

export_references=$"audit_logs.csv, login_logs.csv, operation_logs.csv, permission_audit_logs.csv (via ${EXPORT_ENDPOINT})"

generation_command="$0 $*"
api_url="${API_URL}"

# ============================ 渲染 Render ============================
if [[ "$FORMAT" == "json" ]]; then
  # JSON 输出：汇总所有统计 + 元数据
  jq -n \
    --arg report_title "Compliance Audit Report" \
    --arg tenant_id "$TENANT_ID" \
    --arg start_date "$START_DATE" \
    --arg end_date "$END_DATE" \
    --arg generated_at "$GENERATED_AT" \
    --arg generated_by "$GENERATED_BY" \
    --arg report_version "$REPORT_VERSION" \
    --argjson total_events "$total_events" \
    --argjson success_total "$success_total" \
    --argjson failure_total "$failure_total" \
    --argjson failure_rate "$failure_rate" \
    --argjson unique_users "$unique_users" \
    --argjson audit_total "$audit_total" \
    --argjson login_total "$login_total" \
    --argjson operation_total "$operation_total" \
    --argjson permission_total "$permission_total" \
    --arg stats_url "$STATS_ENDPOINT" \
    --arg export_url "$EXPORT_ENDPOINT" \
    '{report_title:$report_title, tenant_id:$tenant_id, period:{start:$start_date,end:$end_date},
      generated_at:$generated_at, generated_by:$generated_by, report_version:$report_version,
      summary:{total_events:$total_events, success_total:$success_total, failure_total:$failure_total,
               failure_rate_pct:$failure_rate, unique_users:$unique_users},
      sources:{
        audit_logs:($AUDIT_STATS_INPUT[0] // null),
        login_logs:($LOGIN_STATS_INPUT[0] // null),
        operation_logs:($OPERATION_STATS_INPUT[0] // null),
        permission_audit_logs:($PERMISSION_STATS_INPUT[0] // null)
      },
      endpoints:{stats:$stats_url, export:$export_url}}' \
    --slurpfile AUDIT_STATS_INPUT <(echo "$AUDIT_STATS") \
    --slurpfile LOGIN_STATS_INPUT <(echo "$LOGIN_STATS") \
    --slurpfile OPERATION_STATS_INPUT <(echo "$OPERATION_STATS") \
    --slurpfile PERMISSION_STATS_INPUT <(echo "$PERMISSION_STATS") \
    > "$OUTPUT"
  echo "INFO: JSON report written to ${OUTPUT}" >&2
  exit 0
fi

# Markdown 渲染：读取模板并替换占位符
REPORT="$(cat "$TEMPLATE")"

sub() {
  local key="$1" val="$2"
  # bash parameter expansion: 替换所有 {{key}} 为 val (支持多行)
  REPORT="${REPORT//\{\{$key\}\}/$val}"
}

sub report_title          "Compliance Audit Report"
sub tenant_id             "$TENANT_ID"
sub start_date            "$START_DATE"
sub end_date              "$END_DATE"
sub generated_at          "$GENERATED_AT"
sub generated_by          "$GENERATED_BY"
sub report_version        "$REPORT_VERSION"
sub total_events          "$total_events"
sub success_total         "$success_total"
sub failure_total         "$failure_total"
sub failure_rate          "$failure_rate"
sub today_total           "$audit_today"
sub unique_users          "$unique_users"
sub key_findings          "$key_findings"
sub top_actions_rows      "$top_actions_rows"
sub top_users_rows        "$top_users_rows"
sub daily_trend_rows      "$daily_trend_rows"
sub login_total           "$login_total"
sub login_success         "$login_success"
sub login_failure         "$login_failure"
sub login_unique_users    "$login_unique_users"
sub login_suspicious_activities $'- 见 3.2 登录失败 Top IP 表 (see failed IP table below).\n- 建议结合 SIEM 对短时高频失败进一步分析。'
sub login_failed_ip_rows  "$login_failed_ip_rows"
sub operation_total       "$operation_total"
sub operation_success     "$operation_success"
sub operation_failure     "$operation_failure"
sub operation_by_module_rows "$operation_by_module_rows"
sub operation_by_action_rows "$operation_by_action_rows"
sub permission_total      "$permission_total"
sub permission_affected_roles "$permission_affected_roles"
sub permission_today_total "$permission_today"
sub permission_recent_changes_rows "$permission_recent_changes_rows"
sub audit_total           "$audit_total"
sub audit_success         "$audit_success"
sub audit_failure         "$audit_failure"
sub audit_by_action_rows  "$audit_by_action_rows"
sub recommendations       "$recommendations"
sub remediation_items_rows "$remediation_items_rows"
sub export_references     "$export_references"
sub generation_command    "$generation_command"
sub api_url               "$api_url"

# 清理未被填充的占位符 Clean up any remaining unfilled placeholders
REPORT="${REPORT//\{\{[a-zA-Z0-9_]*\}\}/(n/a)}"

printf '%s\n' "$REPORT" > "$OUTPUT"
echo "INFO: Markdown report written to ${OUTPUT}" >&2
echo "INFO: total_events=${total_events} failure_rate=${failure_rate}% sources_probed=4" >&2
