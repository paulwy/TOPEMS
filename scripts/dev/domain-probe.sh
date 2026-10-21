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

# BFF 存活探测：在线则严格 5xx 检查；离线（日常 push 无 BFF）输出 SKIP_WARN 不阻断
BFF_OK="$(curl -s -m 5 -o /dev/null -w '%{http_code}' "$BASE/health" 2>/dev/null || echo 000)"
if [[ "$BFF_OK" != "200" ]]; then
  echo "DOMAIN_PROBE_SKIP_WARN（BFF $BASE 不可达，探活跳过——部署/开发机启动后手动 bash scripts/dev/domain-probe.sh 复核）"
  exit 0
fi

# token 检查置于 BFF 探测之后：离线场景不要求 token（SKIP_WARN 不阻断），在线才必须登录 token
TOKEN="$(head -1 "$TOKEN_FILE" 2>/dev/null || true)"
if [[ -z "$TOKEN" ]]; then echo "ERR: BFF 在线但无 token（$TOKEN_FILE 空）——请先登录获取 token 写入后重试" >&2; exit 2; fi

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
FAIL=0

run_probe() {
  python3 - "$REPO" "$BASE" "$TOKEN" "$CURL_TIMEOUT" "$1" <<'PYEOF'
import re, pathlib, sys, urllib.request, urllib.error, json
repo, base, token, timeout, domain = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5]
def probe(p, method='GET'):
    req = urllib.request.Request(base + p, headers={'Authorization': 'Bearer ' + token}, method=method)
    # 瞬时抖动消噪：ERR/5xx 重试 1 次再判定（全量扫描时长内偶发超时不误拦）
    # 盲区补强：HTTP 200 但 body code>=500（业务级错误被包装，如 ehs 缺表时
    # CoreResponse::error(500) 外层 HTTP 200）同样计 5xx——读 body 解析 JSON code
    for _ in range(2):
        try:
            r = urllib.request.urlopen(req, timeout=timeout)
            if r.status >= 500:
                continue
            try:
                body = r.read(512).decode('utf-8', 'ignore')
                code = json.loads(body).get('code')
                if isinstance(code, int) and code >= 500:
                    return f'{r.status}+body{code}'
            except Exception:
                pass
            return r.status
        except urllib.error.HTTPError as e:
            if e.code >= 500:
                continue
            return e.code
        except Exception:
            continue
    return 'ERR'
def is_bad(c):
    return c in (500, 501, 'ERR') or (isinstance(c, int) and c >= 500)
skip = {'master-data','analytics','ai','plugin-registry','unified-core','server'}
d = pathlib.Path(repo) / 'svc' / domain
ps = set()
for f in d.rglob('*.rs'):
    try: s = f.read_text()
    except Exception: continue
    for m in re.findall(r'path\s*=\s*"(/[^"]+)"', s):
        ps.add(m if m.startswith('/api') else '/api' + m)
bad = []
warn = []
for p in sorted(ps):
    c = probe(p)
    if is_bad(c):
        bad.append((p, str(c)))
    if not is_bad(c) and isinstance(c, int) and 200 <= c < 300:
        # 写探针：空 body POST，5xx/body500 计 FAIL（服务端错误）；
        # 2xx 意外可写记 WARN 不拦（提示人工关注，避免误伤宽容 handler）
        w = probe(p, 'POST')
        if is_bad(w):
            bad.append((p, 'POST ' + str(w)))
        elif isinstance(w, int) and 200 <= w < 300:
            warn.append((p, str(w)))
for p, c in bad:
    print(f"  {c} {p}")
for p, c in warn:
    print(f"  WARN POST {c} {p}（空 body 可写，需人工确认）")
print(f"[{domain}] total={len(ps)} 5xx={len(bad)} write_warn={len(warn)}")
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
  n="$(echo "$out" | grep -c '^  [0-9]' || true)"   # 5xx/超时明细（数字开头）；WARN 提示行不置 FAIL
  if [[ "${n:-0}" -gt 0 ]]; then
    echo "$out" | grep '^  [0-9]' || true   # 5xx/超时明细（失败必显，便于定位修复）
    FAIL=1
  fi
  echo "$out" | grep '^  WARN' || true      # 意外可写提示（不 FAIL）
  echo "$out" | grep -v '^  ' || true
done

if [[ "$FAIL" -eq 0 ]]; then echo "DOMAIN_PROBE_OK（全部域 0 个 5xx）"; else echo "DOMAIN_PROBE_FAIL（存在 5xx，见上）"; fi
exit $FAIL
