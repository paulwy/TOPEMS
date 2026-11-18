#!/usr/bin/env bash
# launch-with-keychain.sh — 从 macOS Keychain 注入敏感环境变量后 exec 目标进程
#
# 目的：让 launchd 单元（com.topems.server 等）不再把口令写进 plist 或 .env，
#       明文只存在于 Keychain（系统加密存储），运行时以进程环境变量注入。
#
# 约定：
#   - Keychain service 名 = ${TOPEMS_KEYCHAIN_PREFIX:-topems}-<变量名转小写短横线>
#     例：SMTP_PASSWORD → topems-smtp-password
#   - 需要注入哪些变量由 TOPEMS_KEYCHAIN_KEYS 指定（空格分隔，默认 SMTP_PASSWORD）
#   - 环境中已有的值优先（dotenv / 手动导出不会被覆盖），取不到则跳过不报错，
#     保证 Keychain 锁定时服务仍能启动（仅依赖该密钥的功能降级）
#
# 用法（plist 的 ProgramArguments 首项即为本脚本，其后是真正的启动命令）：
#   launch-with-keychain.sh /Users/xingzhai/topems/bin/topems-server

set -uo pipefail

PREFIX="${TOPEMS_KEYCHAIN_PREFIX:-topems}"
KEYS="${TOPEMS_KEYCHAIN_KEYS:-SMTP_PASSWORD}"

for key in $KEYS; do
  if [ -n "${!key:-}" ]; then
    continue  # 已有值，不覆盖
  fi
  svc="${PREFIX}-$(printf '%s' "$key" | tr '[:upper:]_' '[:lower:]-')"
  value=""
  # 优先 System Keychain（开机即已解锁，满足 launchd 早启动场景），回退登录钥匙串
  for kc in /Library/Keychains/System.keychain ""; do
    if value="$(security find-generic-password -s "$svc" -w ${kc:+"$kc"} 2>/dev/null)" && [ -n "$value" ]; then
      break
    fi
    value=""
  done
  if [ -n "$value" ]; then
    export "${key}=${value}"
    echo "[keychain] 已注入 ${key}（来源 ${svc}）"
  else
    echo "[keychain] 未取到 ${svc}，跳过 ${key}（服务继续启动）"
  fi
  unset value
done

if [ "$#" -eq 0 ]; then
  echo "用法: $0 <command> [args...]" >&2
  exit 64
fi

exec "$@"
