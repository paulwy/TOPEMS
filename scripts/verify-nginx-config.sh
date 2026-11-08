#!/usr/bin/env bash
# =============================================================================
# nginx 配置零告警门禁
# =============================================================================
# 用法：
#   bash scripts/verify-nginx-config.sh [--conf <nginx.conf>] [--require]
#
# 行为：
#   - 找不到 nginx：默认 SKIP 并退出 0（本地/CI 无 nginx 不阻断）；--require 时失败
#   - 运行 nginx -t，同时捕获 stdout 与 stderr（nginx 告警写 stderr）
#   - 语法/加载失败 → 非 0
#   - 输出含 [warn] → 非 0
#
# 白名单策略：
#   当前没有已知合法告警，ALLOWED_WARNINGS 保持为空。
#   若未来确需放行，必须把告警的固定文本逐条加入下面变量并写明原因；
#   禁止用通配/正则整体放宽。
# =============================================================================
set -euo pipefail

NGINX_BIN="${NGINX_BIN:-}"
CONF=""
REQUIRE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --conf)
      CONF="${2:-}"
      shift 2
      ;;
    --require)
      REQUIRE=1
      shift
      ;;
    -h|--help)
      echo "用法: $0 [--conf <nginx.conf>] [--require]"
      exit 0
      ;;
    *)
      echo "未知参数: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$NGINX_BIN" ]]; then
  if command -v nginx >/dev/null 2>&1; then
    NGINX_BIN="$(command -v nginx)"
  elif [[ -x /opt/homebrew/bin/nginx ]]; then
    NGINX_BIN=/opt/homebrew/bin/nginx
  elif [[ -x /usr/sbin/nginx ]]; then
    NGINX_BIN=/usr/sbin/nginx
  fi
fi

if [[ -z "$NGINX_BIN" ]]; then
  if [[ "$REQUIRE" == "1" ]]; then
    echo "NGINX_T_FAIL (nginx not found and --require set)" >&2
    exit 1
  fi
  echo "NGINX_T_SKIP (nginx not found; pass --require to enforce)"
  exit 0
fi

args=(-t)
if [[ -n "$CONF" ]]; then
  args+=(-c "$CONF")
fi

set +e
OUT="$("$NGINX_BIN" "${args[@]}" 2>&1)"
RC=$?
set -e

printf '%s\n' "$OUT"

if [[ $RC -ne 0 ]]; then
  echo "NGINX_T_FAIL (exit=$RC)" >&2
  exit 1
fi

# 已知合法告警白名单：当前为空。
# 如需放行，按下面格式逐条加入固定文本，并在旁边写明原因：
# ALLOWED_WARNINGS=$'nginx: [warn] 示例告警文本（原因：...）\nnginx: [warn] 另一条（原因：...）'
ALLOWED_WARNINGS=""

warn_lines="$(printf '%s\n' "$OUT" | grep '\[warn\]' || true)"
if [[ -z "$warn_lines" ]]; then
  echo "NGINX_T_OK (0 warnings)"
  exit 0
fi

unallowed=""
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  if [[ -n "$ALLOWED_WARNINGS" ]] && printf '%s\n' "$ALLOWED_WARNINGS" | grep -Fq -- "$line"; then
    echo "NGINX_T_ALLOWED_WARN: $line"
  else
    unallowed="${unallowed}${line}"$'\n'
  fi
done <<< "$warn_lines"

if [[ -n "$unallowed" ]]; then
  echo "NGINX_T_WARN_FORBIDDEN:" >&2
  printf '%s' "$unallowed" >&2
  exit 1
fi

echo "NGINX_T_OK (only explicitly allowed warnings)"
exit 0
