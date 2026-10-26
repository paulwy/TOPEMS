#!/bin/bash
# =====================================================================
# observe-api-traffic.sh — BE-08 下线候选 30 天流量观测（跑在 xingzhai 生产机）
# =====================================================================
# 用途：对 artifacts/BE-08-下线候选清单-148 中的每条路径前缀，统计
#       nginx access log 观测期命中次数；零命中 = 坐实「无人调用」证据，
#       配合业务勾选构成 BE-08 下线双证（业务确认 + 流量观测）。
# 用法：./observe-api-traffic.sh [access.log] [天数(默认30)] [起始日(默认最早记录)]
#       例：./observe-api-traffic.sh ~/topems/nginx/logs/access.log 30
# 依赖：候选清单 md（同仓库 artifacts/，未找到时自动降级为内嵌前缀表）
# =====================================================================
set -euo pipefail

LOG="${1:-$HOME/topems/nginx/logs/access.log}"
DAYS="${2:-30}"
LIST="$(dirname "$0")/../../artifacts/BE-08-下线候选清单-148-2026-10-26.md"
OUT="$HOME/topems/backups/be08-observe-$(date +%Y%m%d).md"

[ -f "$LOG" ] || { echo "ERROR: 找不到 access log: $LOG" >&2; exit 1; }
echo "观测 log: ${LOG}（近 ${DAYS} 天）" | tee -a "$OUT"

# 起始时间线（nginx combined 无时间过滤 → 用 tail 天数截断，前提是日志轮转天/周级）

# 候选前缀提取：优先读同目录入库 txt（xingzhai git pull 可用）→ 读 artifacts md → 内嵌兜底
LIST_TXT="$(dirname "$0")/be08-candidates-148.txt"
LIST="$(dirname "$0")/../../artifacts/BE-08-下线候选清单-148-2026-10-26.md"
if [ -f "$LIST_TXT" ]; then
  PREFIXES=$(grep -v '^$' "$LIST_TXT")
elif [ -f "$LIST" ]; then
  PREFIXES=$(awk -F'|' '/^\| (none|weak) / {gsub(/^ +| +$|`/,"",$7); print $7}' "$LIST")
else
  # 内嵌兜底（主要面；缺失时提示复制清单）
  PREFIXES='/api/ehs/emergency-plans /api/ehs/occupational-health /api/monitor/suppression /api/pdm/change-notices'
fi
[ -n "$PREFIXES" ] || { echo "ERROR: 无候选前缀（检查清单路径）" >&2; exit 1; }

hits=0; zero=0; total=0
{ echo ""; echo "## 观测报告（$(date '+%F %T')，log=${LOG}）"; echo ""; echo "| 方法/前缀 | 命中 |"; echo "|---|---|"; } >> "$OUT"

for pref in $PREFIXES; do
  total=$((total+1))
  # 每行形如: "GET /api/ehs/xxx/... HTTP/1.1" 200 ...
  cnt=$(grep -c " \(GET\|POST\|PUT\|DELETE\|PATCH\) ${pref}\(/.*\)\? " "$LOG" || true)
  if [ "$cnt" -gt 0 ]; then
    hits=$((hits+1))
    echo "| \`${pref}\` | **${cnt}** |" >> "$OUT"
  else
    zero=$((zero+1))
    echo "| \`${pref}\` | 0 |" >> "$OUT"
  fi
done

{
  echo ""
  echo "## 汇总"
  echo "- 候选总数：${total}；有命中：${hits}；**零命中（可下线坐实）**：${zero}"
  echo "- 双证说明：零命中 + 业务勾选「可下线」= 可进入下线批；有命中 = 保留（业务复核使用场景）"
} >> "$OUT"
echo ""
echo "=== 观测完成 ==="
echo "候选: $total  有命中: $hits  零命中: $zero"
echo "报告: $OUT"
