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
# core_audit_logs 表自愈（请求审计中间件写库依赖；幂等）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS public.core_audit_logs (
    id UUID PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    entity_ids JSONB,
    user_id TEXT,
    user_name TEXT,
    request_details JSONB,
    response_details JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    error_message TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_core_audit_logs_time ON public.core_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_core_audit_logs_user ON public.core_audit_logs(user_id);"
echo "core_audit_logs 表就绪（请求审计写库）"
# erp_master_data_audit_trail 补表（消 erp 审计查询 warn；幂等）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS erp.erp_master_data_audit_trail (
    id UUID PRIMARY KEY,
    master_data_id UUID,
    domain VARCHAR(100),
    action VARCHAR(50),
    source_service VARCHAR(50),
    target_service VARCHAR(50),
    changed_by TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);"
echo "erp_master_data_audit_trail 表就绪"
# core_tenant_usage 历史期回填（近 5 月，users=2，api_calls 递减近似；幂等 upsert）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
INSERT INTO core_tenant_usage (id, tenant_id, users_count, storage_used_mb, api_calls_count, period_start, period_end, base_cost)
SELECT gen_random_uuid(), t.id, 2, 0, 8 * (6 - i),
       (date_trunc('month', now()) - (i || ' months')::interval)::date,
       (date_trunc('month', now()) - ((i-1) || ' months')::interval - interval '1 day')::date, 0
FROM core_tenants t CROSS JOIN generate_series(1,5) AS i
WHERE t.id = '${TENANT_ID}'
ON CONFLICT (tenant_id, period_start) DO UPDATE SET users_count = EXCLUDED.users_count, api_calls_count = EXCLUDED.api_calls_count;"
echo "core_tenant_usage 历史期回填就绪（trends 6 期）"
