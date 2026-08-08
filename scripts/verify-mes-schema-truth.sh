#!/usr/bin/env bash
# =============================================================================
# verify-mes-schema-truth.sh — CI 缓存包装脚本
# =============================================================================
#
# 缓存层: cache_layer_mes_schema
#   - svc/mes/migrations/
#   - docs/architecture/mes-schema-truth.md
#
# 被包装脚本: scripts/verify-mes-schema-truth.mjs
#
# 行为:
#   1. 计算缓存层 hash
#   2. 命中缓存 → 重放上次 stdout + 相同 exit code，跳过 node 执行
#   3. 未命中   → 执行 node 脚本，捕获 stdout 和 exit code，写入缓存
#
# 参数:
#   所有参数原样透传给 .mjs 脚本（例如 --regen）
#
# 注意:
#   - 传了 --regen 时跳过缓存（重新生成真相源文档本身不应被缓存）
#   - 缓存目录可通过 TOPEMS_CI_CACHE_DIR 环境变量覆盖
# =============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UTILS_FILE="${SCRIPT_DIR}/ci-cache-utils.sh"

if [[ ! -f "$UTILS_FILE" ]]; then
  echo "[verify-mes-schema-truth] ERROR: ci-cache-utils.sh not found at $UTILS_FILE" >&2
  exit 2
fi

# shellcheck source=./ci-cache-utils.sh
source "$UTILS_FILE"

SCRIPT_NAME="verify-mes-schema-truth"
NODE_SCRIPT="${SCRIPT_DIR}/verify-mes-schema-truth.mjs"

# --regen 模式绕过缓存（文档更新操作不应该被缓存）
REGEN_MODE=0
for arg in "$@"; do
  if [[ "$arg" == "--regen" ]]; then
    REGEN_MODE=1
    break
  fi
done

if [[ "$REGEN_MODE" -eq 1 ]]; then
  exec node "$NODE_SCRIPT" "$@"
fi

# 1. 计算分层 hash
_HASH=$(cache_layer_mes_schema "$SCRIPT_NAME")
_LAST_CACHE_HASH="$_HASH"

# 2. 尝试命中缓存
_CACHE_TMP="$(mktemp -t topems-cache-XXXXXX)"
trap 'rm -f "$_CACHE_TMP"' EXIT

set +e
check_cache "$SCRIPT_NAME" "$_HASH" > "$_CACHE_TMP" 2>&1
_CACHE_HIT=$?
set -e

if [[ "$_CACHE_HIT" -eq 0 ]]; then
  # 缓存命中: 提取 [CACHE:EXIT:N] 行作为退出码，其他行原样输出
  _LAST_LINE=""
  while IFS= read -r _line; do
    if [[ -n "$_LAST_LINE" ]]; then
      printf '%s\n' "$_LAST_LINE"
    fi
    _LAST_LINE="$_line"
  done < "$_CACHE_TMP"
  # 处理最后一行: 若是 CACHE:EXIT 标记则解析退出码，否则也打印出来
  if [[ "$_LAST_LINE" =~ ^\[CACHE:EXIT:([0-9]+)\]$ ]]; then
    _exit_code="${BASH_REMATCH[1]}"
    printf '[CACHE HIT] %s (hash=%.12s) replay exit=%s\n' "$SCRIPT_NAME" "$_HASH" "$_exit_code" >&2
    exit "$_exit_code"
  else
    printf '%s\n' "$_LAST_LINE"
    printf '[CACHE HIT] %s (hash=%.12s) replay (fallback exit=0)\n' "$SCRIPT_NAME" "$_HASH" >&2
    exit 0
  fi
fi

# 3. 缓存未命中 → 执行实际脚本并捕获
_STDOUT_TMP="$(mktemp -t topems-stdout-XXXXXX)"
trap 'rm -f "$_CACHE_TMP" "$_STDOUT_TMP"' EXIT

set +e
node "$NODE_SCRIPT" "$@" > "$_STDOUT_TMP" 2>&1
_REAL_EXIT=$?
set -e

# 同时打给调用方看
cat "$_STDOUT_TMP"

# 4. 写入缓存（无论成功失败都缓存，避免重复跑失败用例）
write_cache "$SCRIPT_NAME" "$_HASH" "$_REAL_EXIT" "$_STDOUT_TMP"

printf '[CACHE WRITE] %s (hash=%.12s) exit=%s\n' "$SCRIPT_NAME" "$_HASH" "$_REAL_EXIT" >&2

exit "$_REAL_EXIT"
