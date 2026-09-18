-- ai usage 采集表（token 用量 / 单次调用延迟），配合 dashboard/stats 与 activity-trend 真实取值
-- 说明：调用/活跃用户维度由 public.audit_logs（log_qa_operation，action='ask*'）承担；
--       本表专门承接 shared-ai 暴露的真实 token（tokens_in/out）与调用延迟（duration_ms），
--       QA 主流程（qa.rs ask/ask_with_context）每次问答落一行；tokens 在 provider 未返回时保持 NULL（诚实，不填 0）。
-- RLS 启用 + 租户隔离策略 + FORCE（配合 topems_app NOSUPERUSER 受限落地）

-- 2026-09-18 防御化（空库重建链卡点）：若 ai.usage_logs 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='ai' AND table_name='usage_logs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ai' AND table_name='usage_logs' AND column_name='tenant_id')
  THEN
    DROP TABLE ai.usage_logs;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS ai.usage_logs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid,
    qa_id       uuid,
    user_id     uuid,
    user_name   text,
    status      varchar(20) NOT NULL DEFAULT 'success',
    duration_ms integer,
    tokens_in   integer,
    tokens_out  integer,
    created_at  timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_tenant ON ai.usage_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai.usage_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_qa_id ON ai.usage_logs (qa_id);

-- ========== RLS：启用 + 租户隔离策略（对齐 20260908000016 现有模式）+ FORCE ==========
ALTER TABLE ai.usage_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'ai' AND tablename = 'usage_logs' AND policyname = 'rls_tenant_isolation'
    ) THEN
        EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON ai.usage_logs USING (
            current_setting('app.tenant_id', true) IS NULL
            OR current_setting('app.tenant_id', true) = ''
            OR tenant_id IS NULL
            OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        ) WITH CHECK (
            current_setting('app.tenant_id', true) IS NULL
            OR current_setting('app.tenant_id', true) = ''
            OR tenant_id IS NULL
            OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )$policy$;
    END IF;
END $$;
ALTER TABLE ai.usage_logs FORCE ROW LEVEL SECURITY;
