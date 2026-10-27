-- core_refresh_tokens 补 tenant_id（与 core_sessions 同款：login 事务 INSERT 引用但表缺失）
ALTER TABLE public.core_refresh_tokens ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.core_refresh_tokens SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.core_refresh_tokens ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.core_refresh_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_refresh_tokens_tenant_isolation ON public.core_refresh_tokens;
CREATE POLICY core_refresh_tokens_tenant_isolation ON public.core_refresh_tokens
  USING (tenant_id = COALESCE(current_setting('app.tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000001'));
