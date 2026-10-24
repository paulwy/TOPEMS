#!/usr/bin/env bash
# traffic-observe.sh —— 8099 网关 access log 流量观测（P-8 · none 级流量观测立项）
#
# 目标：对 nginx access log（/api/ 直代 8099 网关）做 ≥30 天观测，识别 none 级
#      （观测窗口内 0 请求）端点/服务，作为下线/冻结决策依据。
#
# 用法：
#   scripts/audit/traffic-observe.sh --daily                # 解析今日 access log → 台账（幂等）
#   scripts/audit/traffic-observe.sh --report               # 基于台账生成 30 天观测报告
#   scripts/audit/traffic-observe.sh                        # 默认：daily + report
#   TRAFFIC_LEDGER=/var/lib/topems/audit/traffic_daily.tsv  # 台账路径（生产建议绝对路径）
#   --log /var/log/nginx/access.log                         # 日志文件（默认自动探测）
#   --days 30                                               # 观测窗口天数（默认 30）
#
# 台账格式（TSV）：
#   <YYYY-MM-DD> \t <HTTP_STATUS> \t <PATH> \t <COUNT>
#   同一 (日期,状态,路径) 重复运行只计一次（幂等：追加前检查已有记录）。
#
# 生产 crontab 条目（部署机照抄；01:00 每日，幂等范式同 collect-usage-daily.sh）：
#   TRAFFIC_LEDGER=/var/lib/topems/audit/traffic_daily.tsv
#   0 1 * * * TRAFFIC_LEDGER=/var/lib/topems/audit/traffic_daily.tsv \
#     /opt/topems/scripts/audit/traffic-observe.sh --daily \
#     --log /var/log/nginx/access.log >> /var/log/topems/traffic-observe.log 2>&1
#   观测期 ≥30 天后运行一次 --report，报告落 artifacts/audit/traffic-observation-30d.md。
#
# 报告输出：artifacts/audit/traffic-observation-30d.md（每日增量追加，30 天窗口 none 级清单）
set -uo pipefail

LEDGER="${TRAFFIC_LEDGER:-$HOME/.topems-audit/traffic_daily.tsv}"
DAYS=30
MODE_BOTH=1
LOG_FILE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --daily) MODE_DAILY=1; MODE_BOTH=0; shift ;;
    --report) MODE_REPORT=1; MODE_BOTH=0; shift ;;
    --log) LOG_FILE="$2"; shift 2 ;;
    --days) DAYS="$2"; shift 2 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done
: "${MODE_DAILY:=0}" "${MODE_REPORT:=0}"
[ "$MODE_BOTH" = "1" ] && { MODE_DAILY=1; MODE_REPORT=1; }

# ---- 1. 日志文件探测 -------------------------------------------------
if [ -z "$LOG_FILE" ]; then
  for cand in /var/log/nginx/access.log /var/log/nginx/topems_access.log /opt/topems/logs/nginx_access.log /usr/local/var/log/nginx/access.log; do
    [ -f "$cand" ] && { LOG_FILE="$cand"; break; }
  done
fi
if [ -z "$LOG_FILE" ] || [ ! -r "$LOG_FILE" ]; then
  echo "[traffic-observe] 未找到可读 access log（--log 指定，或默认路径探测失败）。跳过 daily。"
  MODE_DAILY=0
fi

mkdir -p "$(dirname "$LEDGER")" 2>/dev/null || true

# ---- 2. daily：解析日志 → 台账（幂等） ------------------------------
if [ "$MODE_DAILY" = "1" ]; then
  TODAY=$(date +%F)
  # nginx combined：$remote_addr $ident [$time_local] "$request" $status ...
  # 引号内含空格，默认 FS 会拆开 URL → 用 -F '"' 切分：
  #   $1 = 前段（含 [date）、$2 = "GET /path HTTP/1.1"、$3 = 状态段、$4 = UA
  awk -F '"' -v today="$TODAY" -v ledger="$LEDGER" '
    # 预载已有 (date,status,path) 去重
    BEGIN { n=0 }
    {
      # $1 = IP - - [10/Oct/2026:08:00:01 (时区)
      if (match($1, /\[[0-9]{2}\/[A-Za-z]{3}\/[0-9]{4}/)) {
        d = substr($1, RSTART+1, RLENGTH-1);  # 10/Oct/2026
        # 转 YYYY-MM-DD
        split(d, t, "/");
        m = (index("JanFebMarAprMayJunJulAugSepOctNovDec", t[2]) + 2) / 3;
        if (m < 10) m = "0" m;
        date = t[3] "-" m "-" t[1];
        if (date != today) next;  # 只处理今天
      } else next;
      # $2 = "GET /api/x?y=1 HTTP/1.1"；取 path（第 2 段，去 query）
      nf = split($2, rq, " ");
      if (nf < 2) next;
      path = rq[2];
      # 去 query
      if (index(path, "?") > 0) path = substr(path, 1, index(path, "?") - 1);
      # $3 = " HTTP/1.1" 200 123 "-" → 状态为 $3 中第一个数字段
      nst = split($3, st, " ");
      status = "";
      for (i = 1; i <= nst; i++) if (st[i] ~ /^[0-9]+$/) { status = st[i]; break; }
      if (status == "") status = "-";
      key = date SUBSEP status SUBSEP path;
      cnt[key] += 1;
    }
    END {
      # 读现有台账去重（跳过与今天同键已存在的行）
      while ((getline line < ledger) > 0) {
        split(line, f, "\t");
        if (f[1] == today) seen[f[1] SUBSEP f[2] SUBSEP f[3]] = 1;
      }
      close(ledger);
      out = ledger ".tmp." today;
      # 追加新记录
      for (k in cnt) {
        if (!(k in seen)) {
          split(k, g, SUBSEP);
          print g[1] "\t" g[2] "\t" g[3] "\t" cnt[k] >> out;
        }
      }
      close(out);
      # 合并回台账
      cmd = "cat " out " >> " ledger;
      system(cmd);
      system("rm -f " out);
    }
  ' "$LOG_FILE" 2>/dev/null
  echo "[traffic-observe] daily 采集完成：${TODAY}（日志 ${LOG_FILE}）"
fi

# ---- 3. report：30 天窗口 none 级清单 ----------------------------------
if [ "$MODE_REPORT" = "1" ]; then
  REPORT="artifacts/audit/traffic-observation-30d.md"
  mkdir -p "$(dirname "$REPORT")" 2>/dev/null || true
  CUTOFF=$(date -v-${DAYS}d +%F 2>/dev/null || date -d "-${DAYS} days" +%F)

  python3 - "$LEDGER" "$DAYS" "$CUTOFF" "$REPORT" <<'PYEOF'
import sys, collections, datetime, os
ledger, days, cutoff, report = sys.argv[1:5]
rows_all = []
rows = []
if os.path.exists(ledger):
    for ln in open(ledger, encoding='utf-8'):
        p = ln.rstrip('\n').split('\t')
        if len(p) == 4:
            rows_all.append((p[0], p[1], p[2], int(p[3])))
            if p[0] >= cutoff:
                rows.append((p[0], p[1], p[2], int(p[3])))
by_path = collections.defaultdict(int)
by_path_status = collections.defaultdict(lambda: collections.Counter())
for d, st, path, c in rows:
    by_path[path] += c
    by_path_status[path][st] += c
dates = sorted({d for d, *_ in rows})
active = sorted(((c, p) for p, c in by_path.items() if c > 0), reverse=True)
# none 级：台账全史出现过、但窗口内 0 请求（旧流量归零 → 下线/冻结候选）
all_paths = {p for _, _, p, _ in rows_all}
none_lvl = sorted(p for p in all_paths if by_path.get(p, 0) == 0)

lines = []
lines.append(f"# 8099 网关流量观测报告（{days} 天窗口）")
lines.append("")
lines.append(f"- **观测期**：{cutoff} 至 {dates[-1] if dates else cutoff}（窗口 {days} 天）")
lines.append(f"- **数据来源**：nginx access log → 台账 `{ledger}`")
lines.append(f"- **台账行数**：{len(rows)}（{len(dates)} 个有效观测日）")
lines.append("")
lines.append("## none 级端点清单（窗口内 0 请求）")
lines.append("")
if none_lvl:
    lines.append(f"共 {len(none_lvl)} 个端点观测窗口内 0 请求：")
    lines.append("")
    lines.append("| path | 建议处置 | 依据 |")
    lines.append("|---|---|---|")
    for p in none_lvl:
        lines.append(f"| `{p}` | 待评估 | 30 天 0 请求（需人工核对路由注册/前端引用后定：下线/冻结/保留） |")
else:
    lines.append("观测窗口内无 0 请求端点（全部 path 均有流量）。")
lines.append("")
lines.append("## 活跃端点 TOP（按请求量）")
lines.append("")
lines.append("| path | 请求数 | 状态分布 |")
lines.append("|---|---|---|")
for c, p in active[:40]:
    st = " ".join(f"{s}:{n}" for s, n in by_path_status[p].most_common(4))
    lines.append(f"| `{p}` | {c} | {st} |")
lines.append("")
lines.append(f"## 每日采样（{len(dates)} 天）")
lines.append("")
for d in dates:
    total = sum(c for dd, st, p, c in rows if dd == d)
    lines.append(f"- `{d}`：{total} 条请求")
lines.append("")
lines.append("> 本报告由 `scripts/audit/traffic-observe.sh --report` 增量生成；原始台账保留每日明细。")

# 只保留最近 90 天历史，避免无限膨胀（保留原始台账由运维决定）
open(report, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print(f"[traffic-observe] 报告已生成：{report}（窗口 {cutoff}~{dates[-1] if dates else '-'}，none 级 {len(none_lvl)} 个）")
PYEOF
fi
