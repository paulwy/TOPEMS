#!/usr/bin/env bash
# hrm 主数据最小种子：iam.users → core_tenant_users（幂等，可重复跑）
# 绑定首租户 82acc468-75dd-4ce7-be27-b6efa65da2c4，role=owner/active
set -euo pipefail
TENANT_ID="${TENANT_ID:-82acc468-75dd-4ce7-be27-b6efa65da2c4}"
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
INSERT INTO public.core_tenant_users (id, tenant_id, user_id, email, role, status, created_at)
SELECT gen_random_uuid(), '${TENANT_ID}', u.id, u.email, 'owner', 'active', NOW()
FROM iam.users u WHERE u.username IN ('admin','test_admin') AND u.deleted_at IS NULL
ON CONFLICT DO NOTHING;"
echo "core_tenant_users 种子就绪（tenant ${TENANT_ID}）"
# core_tenant_modules 种子：首租户启用 5 模块（overview active_modules 真实化）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
INSERT INTO public.core_tenant_modules (id, tenant_id, module_code, module_name, tier, is_active, activated_at)
SELECT gen_random_uuid(), '${TENANT_ID}', m.code, m.name, 'enterprise', true, NOW()
FROM (VALUES ('iam','身份与权限'),('crm','客户管理'),('mes','生产执行'),('erp','企业资源'),('bi','商业智能')) AS m(code,name)
ON CONFLICT DO NOTHING;"
echo "core_tenant_modules 种子就绪（tenant ${TENANT_ID}）"
