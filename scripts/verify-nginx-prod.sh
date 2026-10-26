#!/usr/bin/env bash
# ============================================================================
# TopEMS nginx 生产首部署复核校验脚本（A1 固化）
#
# 三步复核（P0-3 双轨合一后：唯一对外入口 = upstream server_service -> localhost:8099，
# 原 $request_uri -> $api_upstream 前缀 map 路由表已移除，不再做 map 比对）：
#   1. nginx -t 语法校验（仅 Linux 执行；macOS 本机 `use epoll` 不可加载 → 跳过并提示）
#   2. upstream server_service 指向 8099 校验（生产 conf vs 仓库事实源 deploy/nginx/topems.conf，
#      并确认无遗留 map 路由表）
#   3. 冒烟端点探测（默认 6 域，可 --services 覆盖；每域 probe 路径可配；需 --base 真栈）
#
# 用法：
#   bash scripts/verify-nginx-prod.sh \
#     --conf /etc/nginx/conf.d/topems.conf \
#     --repo-conf ./deploy/nginx/topems.conf \
#     --base http://nginx-host \
#     --services "erp bi hrm portal core wms" \
#     --probe "/health" \
#     --insecure   # 自签证书演练环境（生产正式证书不需要）
#     --target deploy@nginx-prod   # 生产目标机 SSH 端点；设值后追加远程 nginx -t + reload
# ============================================================================
set -uo pipefail

CONF="/etc/nginx/conf.d/topems.conf"
REPO_CONF="./deploy/nginx/topems.conf"
BASE=""
SERVICES="erp bi hrm portal core wms"
PROBE="/health"
CURL_INSECURE=0
# 生产目标机（SSH 端点 user@host 或 ~/.ssh/config 别名）。设值后在校验末尾追加
# [4/4] 远程 nginx -t + reload（nginx 语法与 reload 必须在生产 Linux 机上做）。
# 需要：SSH 免密（ssh-key），且该账号可执行 nginx -t / systemctl reload（root 或 NOPASSWD sudo）。
TARGET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --conf) CONF="$2"; shift 2 ;;
    --repo-conf) REPO_CONF="$2"; shift 2 ;;
    --base) BASE="$2"; shift 2 ;;
    --services) SERVICES="$2"; shift 2 ;;
    --probe) PROBE="$2"; shift 2 ;;
    --insecure) CURL_INSECURE=1; shift ;;
    --target) TARGET="$2"; shift 2 ;;
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

echo "== [2/3] upstream server_service -> 8099 校验 =="
if [[ -f "$CONF" && -f "$REPO_CONF" ]]; then
  extract_upstream() {
    awk '/^[[:space:]]*upstream[[:space:]]+server_service[[:space:]]*\{/,/^[[:space:]]*\}[[:space:]]*$/' "$1"
  }
  prod_up="$(extract_upstream "$CONF")"
  repo_up="$(extract_upstream "$REPO_CONF")"
  if [[ -z "$prod_up" ]]; then
    echo "UPSTREAM_MISSING (生产 conf 未找到 upstream server_service——可能不是 topems.conf)"; FAIL=1
  elif ! grep -q 'server localhost:8099' <<<"$prod_up"; then
    echo "UPSTREAM_PORT_MISMATCH (server_service 未指向 localhost:8099)"; FAIL=1
  elif grep -vE '^[[:space:]]*#' "$CONF" | grep -qF "map \$request_uri \$api_upstream"; then
    echo "LEGACY_MAP_PRESENT (P0-3 后应无 \$request_uri -> \$api_upstream 前缀 map 路由表)"; FAIL=1
  elif [[ "$prod_up" == "$repo_up" ]]; then
    echo "UPSTREAM_OK (server_service -> localhost:8099，与仓库事实源一致)"
  else
    echo "UPSTREAM_DIFF:"; diff <(echo "$repo_up") <(echo "$prod_up") | head -20; FAIL=1
  fi
else
  echo "UPSTREAM_SKIP (conf 或仓库基准缺失: $CONF / $REPO_CONF)"; FAIL=1
fi

echo "== [3/3] 冒烟端点 =="
if [[ -z "$BASE" ]]; then echo "SMOKE_SKIP (未传 --base)"; FAIL=1
else
  ok=0; total=0
  for svc in $SERVICES; do
    total=$((total+1))
    curlopts="-s -L -o /dev/null -w %{http_code} --max-time 10"
    [[ "$CURL_INSECURE" == "1" ]] && curlopts="-s -L -k -o /dev/null -w %{http_code} --max-time 10"
    code="$(curl $curlopts "$BASE/api/$svc$PROBE" 2>/dev/null || echo 000)"
    if [[ "$code" == "200" ]]; then ok=$((ok+1)); echo "  $svc -> 200 OK"
    else echo "  $svc -> $code FAIL"; fi
  done
  echo "SMOKE $ok/$total 200"
  # 冒烟须全部 200（生产验收标准：6 域全 200；演练可按可用域收窄）
  [[ "$ok" -ne "$total" ]] && FAIL=1
fi

echo "== [4/4] 目标机 nginx reload =="
if [[ -z "$TARGET" ]]; then
  echo "RELOAD_SKIP (未传 --target，仅本地校验；生产 reload 需在目标机上执行)"
else
  # 先确认目标机可达，再在目标机上做权威 nginx -t + reload。
  # 账号需可执行 nginx -t / systemctl reload nginx（root 或 NOPASSWD sudo）。
  if ! ssh -o BatchMode=yes -o ConnectTimeout=10 "$TARGET" 'echo ok' >/dev/null 2>&1; then
    echo "TARGET_UNREACHABLE ($TARGET——检查 SSH 免密与主机可达性)"; FAIL=1
  else
    if ssh -o BatchMode=yes "$TARGET" 'nginx -t && systemctl reload nginx'; then
      echo "RELOAD_OK ($TARGET nginx -t 通过并已 reload)"
    else
      echo "RELOAD_FAIL ($TARGET——nginx -t 或 systemctl reload 失败，见上方输出)"; FAIL=1
    fi
  fi
fi

echo "== 结果: $([ $FAIL -eq 0 ] && echo PASS || echo FAIL) =="
exit $FAIL
