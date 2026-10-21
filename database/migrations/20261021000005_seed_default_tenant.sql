-- =============================================================
-- 遗留修复（批6 后续）：补默认租户种子（00000000-0000-0000-0000-000000000001）
--
-- 背景：
--   测试/会话 token 的默认 tenant_id 恒为 00000000-0000-0000-0000-000000000001，
--   但 public.core_tenants（finance 各表 tenant_id FK 的引用目标）无该行，导致
--   以会话租户落库的 finance 写动作违反 FK 约束 500：
--     - POST /api/finance/periods/open（core_finance_periods_tenant_id_fkey）
--     - POST /api/finance/bootstrap 无 body 走会话租户（core_finance_accounts_tenant_id_fkey）
--   本迁移幂等补插该默认租户（缺失才插，不覆盖既有）。
-- =============================================================

INSERT INTO public.core_tenants
    (id, name, code, tenant_type, plan, status, created_at, updated_at)
SELECT
    '00000000-0000-0000-0000-000000000001',
    '默认租户',
    'default',
    'shared',
    'basic',
    'active',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_tenants
    WHERE id = '00000000-0000-0000-0000-000000000001'
);
