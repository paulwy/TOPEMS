#!/usr/bin/env bash
# verify-rls.sh —— RLS 租户隔离定期验证（全量动态校验，幂等）
# 校验口径：① 有策略的表必须 RLS 启用（relrowsecurity=true）；② 输出未启用 RLS 的策略表缺口
# 用法：bash scripts/dev/verify-rls.sh
set -uo pipefail
echo "== RLS 租户隔离验证 $(date '+%F %T') =="
# 1. 策略覆盖总量
TOTAL=$(psql -U topems -d topems -tAc "SELECT COUNT(DISTINCT schemaname||'.'||tablename) FROM pg_policies")
echo "策略覆盖表总数：$TOTAL"
# 2. 有策略但 RLS 未启用的表（缺口）
GAPS=$(psql -U topems -d topems -tAc "
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
KEY_TABLES="public.core_files iam.core_files ehs.qa_ehs_hazards iam.core_users iam.core_roles"
MISS=0
for t in $KEY_TABLES; do
  CNT=$(psql -U topems -d topems -tAc "SELECT COUNT(*) FROM pg_policies WHERE schemaname||'.'||tablename='$t'" )
  if [ "$CNT" -eq 0 ]; then echo "  ⚠ 关键表缺策略：$t"; MISS=$((MISS+1)); fi
done
[ "$MISS" -eq 0 ] && echo "关键表抽样：全部有策略"
echo "== 完成 =="
