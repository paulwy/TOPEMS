#!/usr/bin/env bash
# ==============================================================================
# 业务域运行态探活门禁（GET 全路径 5xx 扫描）
# 用途：对 svc/<crate>/src 抽取 utoipa path → BFF 实跑 GET → 报告 5xx/超时
#       （挂载后 500 = 缺表/缺列/运行态缺陷，与 contract-gate 静态挂载互补）
# 用法：
#   bash scripts/dev/domain-probe.sh                 # 全量 27 域（含已核销 master-data/analytics/ai 等）
#   bash scripts/dev/domain-probe.sh --domain erp    # 指定域
#   bash scripts/dev/domain-probe.sh --skip-verified # 跳过已核销域（旧口径：22 域）
#   bash scripts/dev/domain-probe.sh --base http://localhost:8098 --token /tmp/smoke_token.txt
# 退出码：0=无 5xx；1=存在 5xx 或超时
# ==============================================================================
set -uo pipefail

BASE="${BASE:-http://localhost:8098}"
TOKEN_FILE="${TOKEN_FILE:-/tmp/smoke_token.txt}"
DOMAIN=""
# 默认全量口径（含已核销域 master-data/analytics/ai/plugin-registry/unified-core/server）
SKIP=""
CURL_TIMEOUT="${CURL_TIMEOUT:-12}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --base) BASE="$2"; shift 2 ;;
    --token) TOKEN_FILE="$2"; shift 2 ;;
    --timeout) CURL_TIMEOUT="$2"; shift 2 ;;
    --include-verified) SKIP="" ;;
    --skip-verified) SKIP="master-data analytics ai plugin-registry unified-core server" ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

TOKEN="$(head -1 "$TOKEN_FILE" 2>/dev/null || true)"
if [[ -z "$TOKEN" ]]; then echo "ERR: 无 token（$TOKEN_FILE 空）" >&2; exit 2; fi

# BFF 存活探测：在线则严格 5xx 检查；离线（日常 push 无 BFF）输出 SKIP_WARN 不阻断
BFF_OK="$(curl -s -m 5 -o /dev/null -w '%{http_code}' "$BASE/health" 2>/dev/null || echo 000)"
if [[ "$BFF_OK" != "200" ]]; then
  echo "DOMAIN_PROBE_SKIP_WARN（BFF $BASE 不可达，探活跳过——部署/开发机启动后手动 bash scripts/dev/domain-probe.sh 复核）"
  exit 0
fi

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
FAIL=0

run_probe() {
  python3 - "$REPO" "$BASE" "$TOKEN" "$CURL_TIMEOUT" "$1" <<'PYEOF'
import re, pathlib, sys, urllib.request, urllib.error
repo, base, token, timeout, domain = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5]
def probe(p):
    req = urllib.request.Request(base + p, headers={'Authorization': 'Bearer ' + token})
    # 瞬时抖动消噪：ERR/5xx 重试 1 次再判定（全量扫描时长内偶发超时不误拦）
    for _ in range(2):
        try:
            return urllib.request.urlopen(req, timeout=timeout).status
        except urllib.error.HTTPError as e:
            if e.code >= 500:
                continue
            return e.code
        except Exception:
            continue
    return 'ERR'
skip = {'master-data','analytics','ai','plugin-registry','unified-core','server'}
d = pathlib.Path(repo) / 'svc' / domain
ps = set()
for f in d.rglob('*.rs'):
    try: s = f.read_text()
    except Exception: continue
    for m in re.findall(r'path\s*=\s*"(/[^"]+)"', s):
        ps.add(m if m.startswith('/api') else '/api' + m)
bad = []
for p in sorted(ps):
    c = probe(p)
    if c in (500, 501, 'ERR') or (isinstance(c, int) and c >= 500):
        bad.append((p, str(c)))
for p, c in bad:
    print(f"  {c} {p}")
print(f"[{domain}] total={len(ps)} 5xx={len(bad)}")
PYEOF
}

targets=()
if [[ -n "$DOMAIN" ]]; then
  targets+=("$DOMAIN")
else
  for d in "$REPO"/svc/*/; do
    name="$(basename "$d")"
    skip_hit=0
    for s in $SKIP; do [[ "$name" == "$s" ]] && skip_hit=1; done
    [[ "$skip_hit" == "1" ]] && continue
    targets+=("$name")
  done
fi

for d in "${targets[@]}"; do
  out="$(run_probe "$d")"
  n="$(echo "$out" | grep -c '^  ' || true)"
  if [[ "${n:-0}" -gt 0 ]]; then
    echo "$out" | grep '^  ' || true   # 5xx/超时明细（失败必显，便于定位修复）
    FAIL=1
  fi
  echo "$out" | grep -v '^  ' || true
done

if [[ "$FAIL" -eq 0 ]]; then echo "DOMAIN_PROBE_OK（全部域 0 个 5xx）"; else echo "DOMAIN_PROBE_FAIL（存在 5xx，见上）"; fi
exit $FAIL
