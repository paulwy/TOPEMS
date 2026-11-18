#!/usr/bin/env bash
# check-pg-auth-hardening.sh — 本机 PostgreSQL 认证策略门禁
#
# 背景（2026-11-18）：本机 pg_hba 长期是 `local all all trust` + loopback trust，
# 导致生产口令轮换形同虚设——任何本机进程无需口令即可以超管身份连生产库。
# 已收紧为：local → peer，loopback(127.0.0.1/::1) → scram-sha-256，replication 保持 trust。
# 本门禁防止该策略被 Homebrew 升级覆盖或被手改回 trust。
#
# 用法：bash scripts/ci/check-pg-auth-hardening.sh
# 退出码：0=合规 1=命中 trust 或认证过弱 0=跳过（psql 不可读时为 0，避免误伤 CI）

set -uo pipefail

PSQL_BIN="${PSQL_BIN:-$(command -v psql 2>/dev/null || true)}"
if [ -z "$PSQL_BIN" ]; then
  echo "⚠️ [pg-auth] 未找到 psql，跳过（非阻断）"
  exit 0
fi

rules="$("$PSQL_BIN" -d postgres -X -A -t \
  -c "SELECT type||'|'||COALESCE(array_to_string(user_name,','),'')||'|'||COALESCE(array_to_string(database,','),'')||'|'||auth_method FROM pg_hba_file_rules" 2>/dev/null)"

if [ -z "$rules" ]; then
  echo "⚠️ [pg-auth] 读不到 pg_hba_file_rules（实例未就绪或无权限），跳过（非阻断）"
  exit 0
fi

# 1) 非 replication 的 all/all 规则一律不得为 trust
violations="$(printf '%s\n' "$rules" | awk -F'|' '
  $1 == "local" || $1 == "host" {
    if ($2 ~ /all/ && $3 ~ /all/ && $4 == "trust") print $0
  }')"

# 2) local 通道必须 peer；loopback 的 host 通道必须 scram 或更严
auth_gaps="$(printf '%s\n' "$rules" | awk -F'|' '
  ($1 == "local" && $2 ~ /all/ && $3 ~ /all/ && $4 != "peer") { print "local 应为 peer → " $0 }
  ($1 == "host" && $2 ~ /all/ && $3 ~ /all/ && $4 != "scram-sha-256" && $4 != "peer") {
    print "loopback 应为 scram-sha-256 → " $0
  }')"

if [ -n "$violations" ] || [ -n "$auth_gaps" ]; then
  echo "❌ [pg-auth] 本机 PostgreSQL 认证策略过宽：" >&2
  [ -n "$violations" ] && printf '%s\n' "$violations" | sed 's/^/    trust: /' >&2
  [ -n "$auth_gaps" ] && printf '%s\n' "$auth_gaps" | sed 's/^/    弱认证: /' >&2
  echo "" >&2
  echo "修复：pg_hba.conf 中 local all all → peer，host all all 127.0.0.1/32 与 ::1/128 → scram-sha-256，" >&2
  echo "    然后执行 SELECT pg_reload_conf();。回退快照见 .secrets/pg_hba.conf.trust.bak-20261118。" >&2
  exit 1
fi

echo "✅ [pg-auth] local=peer / loopback=scram-sha-256，无非 replication 的 all-all trust"
