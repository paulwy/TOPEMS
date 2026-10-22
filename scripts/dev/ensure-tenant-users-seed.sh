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
# core_files 补 tenant_id 列（download.rs 引用致 500）+ 存储种子（35MB 演示级；幂等）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
ALTER TABLE public.core_files ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_core_files_tenant ON public.core_files(tenant_id);
INSERT INTO core_files (id, name, original_name, path, size, mime_type, extension, folder_id, uploader_id, status, tenant_id, created_at)
SELECT id, name, name, '/uploads/'||name, size, mime, ext, NULL, '0d3a14bb-14a7-488e-a3c1-889f0b9c260f', 'active', '${TENANT_ID}', NOW()
FROM (VALUES ('c0000000-0000-0000-0000-000000000001'::uuid, '季度经营报告.pdf', 5242880::bigint, 'application/pdf', 'pdf'),
             ('c0000000-0000-0000-0000-000000000002'::uuid, '产品手册.pdf', 10485760::bigint, 'application/pdf', 'pdf'),
             ('c0000000-0000-0000-0000-000000000003'::uuid, '数据备份.sql', 20971520::bigint, 'application/sql', 'sql')) AS f(id,name,size,mime,ext)
ON CONFLICT (id) DO NOTHING;"
echo "core_files tenant_id 列 + 存储种子就绪（storage 采集真实源）"
# core_tenant_usage 历史期回填（近 5 月，users=2，api_calls 递减近似；幂等 upsert）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
INSERT INTO core_tenant_usage (id, tenant_id, users_count, storage_used_mb, api_calls_count, period_start, period_end, base_cost)
SELECT gen_random_uuid(), t.id, 2, 0, 8 * (6 - i),
       (date_trunc('month', now()) - (i || ' months')::interval)::date,
       (date_trunc('month', now()) - ((i-1) || ' months')::interval - interval '1 day')::date, 0
FROM core_tenants t CROSS JOIN generate_series(1,5) AS i
WHERE t.id = '${TENANT_ID}'
ON CONFLICT (tenant_id, period_start) DO UPDATE SET users_count = EXCLUDED.users_count, api_calls_count = EXCLUDED.api_calls_count;"
# 历史期 storage 近似回填（35/28/21/14/7 递减，与 api_calls 趋势一致；幂等 upsert）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
UPDATE core_tenant_usage SET storage_used_mb = v.mb
FROM (VALUES ('2026-09-01'::date,28),('2026-08-01',21),('2026-07-01',14),('2026-06-01',7),('2026-05-01',0)) AS v(d,mb)
WHERE core_tenant_usage.period_start = v.d AND tenant_id = '${TENANT_ID}';"
echo "core_tenant_usage 历史期回填就绪（trends 6 期，含 storage 近似）"
# core_files RLS 租户隔离（有 tenant_id 的租户表，同域宽松策略格式；幂等）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
ALTER TABLE public.core_files ENABLE ROW LEVEL SECURITY;
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='core_files' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.core_files USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    );
  END IF;
END \$\$;"
echo "core_files RLS 租户隔离就绪"
