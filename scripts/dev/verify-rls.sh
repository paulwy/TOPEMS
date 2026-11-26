#!/usr/bin/env bash
# verify-rls.sh —— RLS 租户隔离定期验证（全量动态校验，幂等）
# 校验口径：① 有策略的表必须 RLS 启用（relrowsecurity=true）；② 输出未启用 RLS 的策略表缺口
# 用法：bash scripts/dev/verify-rls.sh
# 连接口径：$DB_DSN 显式覆盖 > $DATABASE_URL > 仓库根 .env（不再硬编码 -U topems，该角色已不存在）
# 生产示例：DB_DSN="postgresql:///topems_prod?user=xingzhai" bash scripts/dev/verify-rls.sh
set -uo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/../.." 2>/dev/null && pwd)"
ROOT_DIR="${ROOT_DIR:-$(pwd)}"
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ROOT_DIR/.env" ]; then
  set -a; . "$ROOT_DIR/.env"; set +a
fi
DB_DSN="${DB_DSN:-${DATABASE_URL:-}}"
if [ -z "$DB_DSN" ]; then
  echo "❌ 未解析到 DATABASE_URL（环境变量与 .env 均为空）" >&2
  exit 2
fi
# psql 发现：非交互 shell（生产 Mac mini 的 LaunchAgent/ssh）PATH 里通常没有 /opt/homebrew/bin
PSQL_BIN="$(command -v psql 2>/dev/null || true)"
if [ -z "$PSQL_BIN" ]; then
  for cand in /opt/homebrew/bin/psql /opt/homebrew/opt/postgresql@18/bin/psql /opt/homebrew/opt/postgresql@17/bin/psql /usr/local/bin/psql; do
    [ -x "$cand" ] && PSQL_BIN="$cand" && break
  done
fi
if [ -z "$PSQL_BIN" ]; then
  echo "❌ 找不到 psql（PATH 与 /opt/homebrew/bin 均无），无法校验；不给出成功的假结论" >&2
  exit 1
fi
echo "使用 psql: $PSQL_BIN"

echo "== RLS 租户隔离验证 $(date '+%F %T') =="
# 1. 策略覆盖总量
TOTAL=$("$PSQL_BIN" "$DB_DSN" -tAc "SELECT COUNT(DISTINCT schemaname||'.'||tablename) FROM pg_policies") || {
  echo "❌ 查询失败（连接或权限问题，不给出成功的假结论）" >&2
  exit 1
}
echo "策略覆盖表总数：$TOTAL"
# 2. 有策略但 RLS 未启用的表（缺口）
GAPS=$("$PSQL_BIN" "$DB_DSN" -tAc "
SELECT p.schemaname||'.'||p.tablename
FROM pg_policies p
JOIN pg_class c ON c.relname = p.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = p.schemaname
WHERE NOT c.relrowsecurity
GROUP BY 1")
if [ -z "$GAPS" ]; then
  echo "缺口：0（全部策略表 RLS 已启用）"
else
  echo "缺口（有策略但 RLS 未启用）："
  echo "$GAPS" | while read -r t; do echo "  - $t"; done
fi
# 3. 关键域抽样（每域代表表必须有策略）
# 关键域抽样（每域代表表必须有策略）
# 平台级系统表（core_tenant_usage/core_audit_logs 跨租户聚合）与 RBAC 表（iam_roles/iam_permissions 全局角色权限）不按租户隔离，不纳入强制清单
# 2026-11-26 校准：身份表 public.core_users 已废弃（权威表 iam.users，全局目录无 tenant_id/不适用租户 RLS），
# 抽样改指向真正按租户隔离的 public.core_tenant_users；iam.core_* 副本早已不存在。
KEY_TABLES="public.core_files public.core_roles public.core_tenant_users ehs.qa_ehs_hazards"
MISS=0
for t in $KEY_TABLES; do
  CNT=$("$PSQL_BIN" "$DB_DSN" -tAc "SELECT COUNT(*) FROM pg_policies WHERE schemaname||'.'||tablename='$t'" ) || CNT=""
  if [ -z "$CNT" ]; then echo "  ⚠ 关键表查询失败：$t"; MISS=$((MISS+1)); continue; fi
  if [ "$CNT" -eq 0 ]; then echo "  ⚠ 关键表缺策略：$t"; MISS=$((MISS+1)); fi
done
[ "$MISS" -eq 0 ] && echo "关键表抽样：全部有策略"
echo "== 完成 =="
