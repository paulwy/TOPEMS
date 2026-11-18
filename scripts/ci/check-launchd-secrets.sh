#!/usr/bin/env bash
# check-launchd-secrets.sh — launchd 单元里不得出现明文密钥
#
# 背景（2026-11-18）：com.topems.server.plist 曾把 DATABASE_URL（生产口令）、
# JWT_SECRET、JWT_REFRESH_SECRET、ENCRYPTION_KEY、ENCRYPTION_MASTER_KEY、SMTP_PASSWORD
# 全部明文写在 EnvironmentVariables 里。已迁到 macOS System Keychain，
# 由 scripts/deploy/launch-with-keychain.sh 启动时注入。
#
# 本门禁防止后续手改把密钥又写回 plist（Keychain 锁定时排查问题很容易这么干）。
#
# 用法：bash scripts/ci/check-launchd-secrets.sh
# 退出码：0=合规 1=发现明文密钥 0=跳过（目录不存在时）

set -uo pipefail

DIR="${HOME}/Library/LaunchAgents"
if [ ! -d "$DIR" ]; then
  echo "⚠️ [launchd-secrets] 无 ${DIR}，跳过（非阻断）"
  exit 0
fi

files="$(find "$DIR" -maxdepth 1 -name 'com.topems*.plist' 2>/dev/null)"
if [ -z "$files" ]; then
  echo "⚠️ [launchd-secrets] 未找到 com.topems*.plist，跳过（非阻断）"
  exit 0
fi

issues=""
for f in $files; do
  # 1) 连接串内嵌口令：scheme://user:pass@
  dsn="$(grep -nE '://[^<:@/ ]+:[^<@/ ]{6,}@' "$f" 2>/dev/null || true)"
  # 2) 敏感键的值非空（值在下一行 <string>...</string>）
  keys="$(grep -nA1 -E '<key>(DATABASE_URL|MIGRATE_URL|JWT_SECRET|JWT_REFRESH_SECRET|ENCRYPTION_KEY|ENCRYPTION_MASTER_KEY|SMTP_PASSWORD)</key>' "$f" 2>/dev/null \
    | grep -E '<string>.+</string>' || true)"
  if [ -n "$dsn" ] || [ -n "$keys" ]; then
    issues="${issues}
[$(basename "$f")]
${dsn}${keys}"
  fi
done

if [ -n "$issues" ]; then
  echo "❌ [launchd-secrets] 单元里出现明文密钥：" >&2
  # 输出前统一遮蔽口令段，避免门禁本身泄露密钥
  printf '%s\n' "$issues" | sed -E 's#(:)[^@/<>[:space:]]{4,}@#\1***@#g' | sed 's/^/    /' >&2
  echo "" >&2
  echo "修复：把密钥存入 System Keychain（service=topems-<变量名小写短横线>），" >&2
  echo "     plist 只保留 TOPEMS_KEYCHAIN_KEYS，启动命令前置 scripts/deploy/launch-with-keychain.sh。" >&2
  exit 1
fi

echo "✅ [launchd-secrets] $(printf '%s\n' "$files" | wc -l | tr -d ' ') 个 topems 单元无明文密钥"
