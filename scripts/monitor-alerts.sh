#!/bin/bash
# =============================================
# TOPEMS 生产机健康检查 + 磁盘告警脚本（P3）
# =============================================
# 用法：
#   ./scripts/monitor-alerts.sh              # 执行一次检查
#   launchd/systemd timer 定时跑（见下方 plist / systemd timer）
#
# systemd 已配置 Restart=on-failure + RestartSec=5，
# 服务挂了自动重启由 systemd 负责；本脚本聚焦**检测+告警**。
#
# 告警渠道：
#   - 必选：写入 ALERT_LOG（默认 /var/log/topems/alerts.log）
#   - 可选：ALERT_WEBHOOK_URL 环境变量（飞书/钉钉 webhook JSON POST）
#
# 支持环境变量覆盖：
#   SERVICES       服务列表（见下方默认值，格式 "name:port" 空格分隔）
#   HEALTH_PATH    健康检查路径（默认 /health）
#   HEALTH_TIMEOUT curl 超时秒数（默认 3）
#   DISK_THRESHOLD 磁盘使用率告警阈值 %（默认 90）
#   CHECK_DISK     是否检查磁盘（true/false，默认 true）
#   ALERT_LOG      告警日志路径（默认 /var/log/topems/alerts.log）
#   ALERT_WEBHOOK_URL 告警 webhook（设置则 POST）
# =============================================

set -e

# ── 配置（可用环境变量覆盖）──
HEALTH_PATH="${HEALTH_PATH:-/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-3}"
DISK_THRESHOLD="${DISK_THRESHOLD:-90}"
CHECK_DISK="${CHECK_DISK:-true}"
ALERT_LOG="${ALERT_LOG:-/var/log/topems/alerts.log}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"

# ── TOPEMS 服务清单（name:port，与 deploy/docker/.env 一致）──
SERVICES="${SERVICES:-topems-unified-core:8000 \
topems-monitor:8095 \
topems-plugin-registry:8096 \
topems-communication:8084 \
topems-search:8082 \
topems-ticket:8086 \
topems-erp:8010 \
topems-finance:8011 \
topems-ai:8013 \
topems-hrm:8020 \
topems-pm:8023 \
topems-crm:8029 \
topems-mes:8030 \
topems-pdm:8031 \
topems-scm:8040 \
topems-wms:8041 \
topems-srm:8042 \
topems-qms:8050 \
topems-lims:8051 \
topems-ehs:8052 \
topems-rd:8053 \
topems-portal:8063 \
topems-mobile:8070 \
topems-gis:8071 \
topems-integration:8072 \
topems-master-data:8090 \
topems-analytics:8060 \
topems-server:8099}"

# ── 确保日志目录存在 ──
mkdir -p "$(dirname "$ALERT_LOG")"

# ── 告警输出函数 ──
alert() {
  local level="$1"    # CRITICAL / WARNING / INFO
  local message="$2"
  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  local line="[${timestamp}] [${level}] ${message}"

  # 1. 写告警日志
  echo "$line" >> "$ALERT_LOG"

  # 2. 可选 webhook
  if [ -n "$ALERT_WEBHOOK_URL" ]; then
    local payload
    payload=$(printf '{"msgtype":"text","text":{"content":"%s"}}' "$line")
    curl -s -X POST "$ALERT_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "$payload" >/dev/null 2>&1 || true
  fi

  echo "$line"
}

# ── 健康检查 ──
check_service() {
  local name="$1"
  local port="$2"
  local url="http://127.0.0.1:${port}${HEALTH_PATH}"
  local http_code exit_code

  http_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time "$HEALTH_TIMEOUT" "$url" 2>/dev/null)
  exit_code=$?
  if [ "$exit_code" -ne 0 ]; then
    http_code="000"
  fi

  if [ "$http_code" = "000" ]; then
    # curl 连不上：超时或连接被拒绝
    alert "CRITICAL" "服务 ${name} (port ${port}) 无响应（健康检查超时或连接被拒绝）"
    return 1
  fi

  if [ "$http_code" = "200" ]; then
    echo "  ✅ ${name} (${port}) -> HTTP ${http_code}"
    return 0
  else
    alert "CRITICAL" "服务 ${name} (port ${port}) 异常 —— 健康检查返回 HTTP ${http_code}"
    return 1
  fi
}

# ── 磁盘检查 ──
check_disk() {
  [ "$CHECK_DISK" = "true" ] || return 0

  # macOS (BSD df)
  local usage
  if df -h / >/dev/null 2>&1; then
    if df -h / | tail -1 | grep -q '%'; then
      usage=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
    else
      usage=$(df -h / | tail -1 | awk '{for(i=1;i<=NF;i++) if($i ~ /%/) {gsub(/%/, "", $i); print $i; exit}}')
    fi
  else
    return 0
  fi

  if [ -n "$usage" ] && [ "$usage" -ge "$DISK_THRESHOLD" ] 2>/dev/null; then
    alert "WARNING" "根分区 / 使用率 ${usage}% 超过阈值 ${DISK_THRESHOLD}%，需清理"
  else
    echo "  ✅ 根分区使用率 ${usage}%（阈值 ${DISK_THRESHOLD}%）"
  fi
}

# ── 主流程 ──
echo "=============================================="
echo " TOPEMS 监控检查 —— $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="

FAILED=0
TOTAL=0

# 1. 健康检查
echo ""
echo "📡 服务健康检查（共 $(echo "$SERVICES" | wc -w | tr -d ' ') 项）..."
for svc in $SERVICES; do
  name="${svc%%:*}"
  port="${svc##*:}"
  TOTAL=$((TOTAL + 1))
  if ! check_service "$name" "$port"; then
    FAILED=$((FAILED + 1))
  fi
done

# 2. 磁盘检查
echo ""
echo "💾 磁盘检查..."
check_disk

# 3. 汇总
echo ""
echo "----------------------------------------------"
echo " 总计: ${TOTAL} 服务 | 正常: $((TOTAL - FAILED)) | 异常: ${FAILED}"
echo " 告警日志: ${ALERT_LOG}"
echo "----------------------------------------------"

if [ "$FAILED" -gt 0 ]; then
  alert "WARNING" "本轮健康检查 ${FAILED}/${TOTAL} 服务异常"
fi

exit 0
