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
