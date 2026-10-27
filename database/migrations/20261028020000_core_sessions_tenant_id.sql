-- core_sessions 补 tenant_id（login 事务 INSERT 引用但表缺失 → 事务 abort → refresh token 从未落库）
ALTER TABLE public.core_sessions ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.core_sessions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.core_sessions ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
-- 若 RLS 启用则绑定（无策略时不生效）
ALTER TABLE public.core_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_sessions_tenant_isolation ON public.core_sessions;
CREATE POLICY core_sessions_tenant_isolation ON public.core_sessions
  USING (tenant_id = COALESCE(current_setting('app.tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000001'));
