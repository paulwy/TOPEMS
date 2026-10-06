#!/usr/bin/env bash
# ============================================================================
# TopEMS nginx 生产首部署复核校验脚本（A1 固化）
#
# 三步复核：
#   1. nginx -t 语法校验（仅 Linux 执行；macOS 本机 `use epoll` 不可加载 → 跳过并提示）
#   2. map 路由表逐字比对（生产 conf vs 仓库事实源 deploy/nginx/topems.conf）
#   3. 冒烟端点探测（默认 6 域，可 --services 覆盖；每域 probe 路径可配）
#
# 用法：
#   bash scripts/verify-nginx-prod.sh \
#     --conf /etc/nginx/conf.d/topems.conf \
#     --repo-conf ./deploy/nginx/topems.conf \
#     --base http://nginx-host \
#     --services "erp bi hrm portal core wms" \
#     --probe "/health"
# ============================================================================
set -uo pipefail

CONF="/etc/nginx/conf.d/topems.conf"
REPO_CONF="./deploy/nginx/topems.conf"
BASE=""
SERVICES="erp bi hrm portal core wms"
PROBE="/health"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --conf) CONF="$2"; shift 2 ;;
    --repo-conf) REPO_CONF="$2"; shift 2 ;;
    --base) BASE="$2"; shift 2 ;;
    --services) SERVICES="$2"; shift 2 ;;
    --probe) PROBE="$2"; shift 2 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

FAIL=0

echo "== [1/3] nginx 语法校验 =="
if [[ "$(uname -s)" == "Linux" ]]; then
  if command -v nginx >/dev/null 2>&1; then
    if nginx -t -c /etc/nginx/nginx.conf; then echo "NGINX_T_OK"; else echo "NGINX_T_FAIL"; FAIL=1; fi
  else
    echo "NGINX_T_SKIP (未安装 nginx)"; FAIL=1
  fi
else
  # macOS 本机不可加载 use epoll 配置：跳过不计失败（WARN），生产 Linux 必须过
  echo "NGINX_T_SKIP_WARN (非 Linux 环境，use epoll 不可加载——待生产环境执行)"
fi

echo "== [2/3] map 路由表逐字比对 =="
if [[ -f "$CONF" && -f "$REPO_CONF" ]]; then
  extract_map() {
    awk '/^[[:space:]]*map \$request_uri \$api_upstream/,/^[[:space:]]*\}[[:space:]]*$/' "$1" \
      | grep -v '^[[:space:]]*$'
  }
  prod_map="$(extract_map "$CONF")"
  repo_map="$(extract_map "$REPO_CONF")"
  if [[ -z "$prod_map" ]]; then echo "MAP_EMPTY (生产 conf 未找到 map 段——可能不是 topems.conf)"; FAIL=1
  elif [[ "$prod_map" == "$repo_map" ]]; then echo "MAP_OK"
  else
    echo "MAP_DIFF:"; diff <(echo "$repo_map") <(echo "$prod_map") | head -20; FAIL=1
  fi
else
  echo "MAP_SKIP (conf 或仓库基准缺失: $CONF / $REPO_CONF)"; FAIL=1
fi

echo "== [3/3] 冒烟端点 =="
if [[ -z "$BASE" ]]; then echo "SMOKE_SKIP (未传 --base)"; FAIL=1
else
  ok=0; total=0
  for svc in $SERVICES; do
    total=$((total+1))
    code="$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/api/$svc$PROBE" 2>/dev/null || echo 000)"
    if [[ "$code" == "200" ]]; then ok=$((ok+1)); echo "  $svc -> 200 OK"
    else echo "  $svc -> $code FAIL"; fi
  done
  echo "SMOKE $ok/$total 200"
  [[ "$ok" -lt 5 ]] && FAIL=1
fi

echo "== 结果: $([ $FAIL -eq 0 ] && echo PASS || echo FAIL) =="
exit $FAIL
