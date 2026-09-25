-- ai 服务后端补齐（known_gap A 组，2026-09-09）：
-- AiDashboardPage / AiModelSettingsPage / AiPromptLibraryPage 在役消费，后端补 /dashboard /models /prompts 路由支撑表
-- 模型表（含配置列）+ 提示词模板表；RLS 启用 + 租户隔离策略 + FORCE（配合 topems NOSUPERUSER）

-- 2026-09-18 防御化（空库重建链卡点）：若 ai.ai_models 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='ai' AND table_name='ai_models')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ai' AND table_name='ai_models' AND column_name='tenant_id')
  THEN
    DROP TABLE ai.ai_models;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS ai.ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'chat' CHECK (type IN ('chat', 'embedding', 'image', 'audio')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    description TEXT,
    max_tokens INTEGER,
    pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    temperature NUMERIC(4, 2) NOT NULL DEFAULT 0.70,
    top_p NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    frequency_penalty NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    presence_penalty NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    system_prompt TEXT,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- 2026-09-18 防御化（空库重建链卡点）：若 ai.ai_prompt_templates 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='ai' AND table_name='ai_prompt_templates')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ai' AND table_name='ai_prompt_templates' AND column_name='tenant_id')
  THEN
    DROP TABLE ai.ai_prompt_templates;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS ai.ai_prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '通用',
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    prompt_template TEXT NOT NULL,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_models_tenant ON ai.ai_models (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_templates_tenant ON ai.ai_prompt_templates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_templates_category ON ai.ai_prompt_templates (category);

-- ========== RLS：启用 + 租户隔离策略（对齐 20260908000016 现有模式）+ FORCE ==========
ALTER TABLE ai.ai_models ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'ai' AND tablename = 'ai_models' AND policyname = 'rls_tenant_isolation'
    ) THEN
        EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON ai.ai_models USING (
            current_setting('app.current_tenant_id', true) IS NULL
            OR current_setting('app.current_tenant_id', true) = ''
            OR tenant_id IS NULL
            OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        ) WITH CHECK (
            current_setting('app.current_tenant_id', true) IS NULL
            OR current_setting('app.current_tenant_id', true) = ''
            OR tenant_id IS NULL
            OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )$policy$;
    END IF;
END $$;
ALTER TABLE ai.ai_models FORCE ROW LEVEL SECURITY;

ALTER TABLE ai.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'ai' AND tablename = 'ai_prompt_templates' AND policyname = 'rls_tenant_isolation'
    ) THEN
        EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON ai.ai_prompt_templates USING (
            current_setting('app.current_tenant_id', true) IS NULL
            OR current_setting('app.current_tenant_id', true) = ''
            OR tenant_id IS NULL
            OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        ) WITH CHECK (
            current_setting('app.current_tenant_id', true) IS NULL
            OR current_setting('app.current_tenant_id', true) = ''
            OR tenant_id IS NULL
            OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )$policy$;
    END IF;
END $$;
ALTER TABLE ai.ai_prompt_templates FORCE ROW LEVEL SECURITY;

-- ========== 种子数据（tenant_id NULL = 全局共享，RLS 策略放行）==========
INSERT INTO ai.ai_models (id, name, provider, type, status, description, max_tokens, pricing, capabilities, temperature, top_p, system_prompt)
VALUES
    (gen_random_uuid(), 'DeepSeek Chat', 'deepseek', 'chat', 'active', '通用对话模型（DeepSeek V3 系）', 8192, '{"input_per_1k": 0.001, "output_per_1k": 0.002}'::jsonb, '["chat", "function_calling"]'::jsonb, 0.70, 1.00, NULL),
    (gen_random_uuid(), 'DeepSeek Reasoner', 'deepseek', 'chat', 'active', '深度推理模型（DeepSeek R1 系）', 65536, '{"input_per_1k": 0.002, "output_per_1k": 0.008}'::jsonb, '["chat", "reasoning"]'::jsonb, 0.60, 1.00, NULL),
    (gen_random_uuid(), 'Text Embedding', 'topems', 'embedding', 'active', '本地向量嵌入模型', 2048, '{}'::jsonb, '["embedding"]'::jsonb, 0.00, 1.00, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ai.ai_prompt_templates (name, description, category, fields, prompt_template)
VALUES
    ('会议纪要', '自动生成专业的会议纪要', '文档', '[{"name":"title","type":"text","label":"会议标题","required":true,"options":null},{"name":"time","type":"text","label":"会议时间","required":true,"options":null},{"name":"participants","type":"textarea","label":"参会人员","required":false,"options":null}]'::jsonb, '请根据以下信息生成专业的会议纪要：\n会议标题：{title}\n会议时间：{time}\n参会人员：{participants}\n\n请按以下结构输出：一、会议概况 二、议题讨论 三、决议事项 四、后续行动项。'),
    ('职位描述', '生成标准的职位描述', '人力资源', '[{"name":"position","type":"text","label":"职位名称","required":true,"options":null},{"name":"department","type":"text","label":"所属部门","required":true,"options":null},{"name":"responsibilities","type":"textarea","label":"岗位职责","required":false,"options":null}]'::jsonb, '请根据以下信息生成标准职位描述：\n职位：{position}\n部门：{department}\n职责要点：{responsibilities}\n\n输出格式：岗位概述 / 岗位职责 / 任职要求 / 加分项。'),
    ('SQL 优化', 'SQL 语句性能分析与优化建议', '技术', '[{"name":"sql","type":"textarea","label":"SQL 语句","required":true,"options":null},{"name":"db_type","type":"select","label":"数据库类型","required":false,"options":[{"label":"PostgreSQL","value":"postgres"},{"label":"MySQL","value":"mysql"}]}]'::jsonb, '请分析以下 SQL 并给出优化建议：\n数据库：{db_type}\nSQL：{sql}\n\n请从执行计划、索引、查询重写三个维度分析。')
ON CONFLICT DO NOTHING;
