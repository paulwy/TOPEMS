-- ============================================================================
-- 20261023000005_analytics_datasets_tenant_rls.sql
--
-- v1.109 归属统一：bi.analytics_datasets 补 tenant_id + RLS（对齐 public/analytics 版）。
--
-- 背景：analytics_datasets 三套并存（public/bi/analytics），BI 连接池 search_path=bi,public
-- 致裸表名解析到 bi 版（16 列无 tenant_id、无 RLS 策略）——list/get 的租户条件列缺失 500
-- （v1.108 暂以读 public 版规避）。本迁移给业务实际写入的 bi 版补 tenant_id 列 + 宽松
-- RLS 策略（与 public/analytics 版同型：tenant_id=上下文 或 NULL 或 nil 租户放行），
-- 读路径随后统一回 bi.analytics_datasets，消除读 public 写 bi 的双套错位。
--
-- 幂等保证：ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / DROP POLICY IF EXISTS
-- + CREATE POLICY；主/测库均可重复执行。prepare 库无 analytics_datasets 表时以 DO 块
-- 跳过（仅主库生效）。
-- ============================================================================

DO $$
BEGIN
    IF to_regclass('bi.analytics_datasets') IS NULL THEN
        RAISE NOTICE 'bi.analytics_datasets 不存在，跳过（仅主库生效）';
        RETURN;
    END IF;

    -- 1. bi 版补 tenant_id 列 + 索引
    EXECUTE 'ALTER TABLE bi.analytics_datasets ADD COLUMN IF NOT EXISTS tenant_id uuid';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_analytics_datasets_tenant_id
        ON bi.analytics_datasets (tenant_id)';

    -- 2. RLS（宽松策略，与 public/analytics 版同型）
    EXECUTE 'ALTER TABLE bi.analytics_datasets ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_analytics_datasets ON bi.analytics_datasets';
    EXECUTE $policy$
        CREATE POLICY tenant_isolation_analytics_datasets ON bi.analytics_datasets FOR ALL
        USING (
            (tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid)
            OR (tenant_id IS NULL)
            OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)
        )
    $policy$;
END $$;
