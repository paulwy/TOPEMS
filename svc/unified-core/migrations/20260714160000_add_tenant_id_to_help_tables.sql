-- Help Center - 添加 tenant_id 支持和 RLS 策略

-- 1. FAQ 表
ALTER TABLE core_faqs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_faqs SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_faqs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_faqs_tenant_id ON core_faqs(tenant_id);

-- 2. 操作指南表
ALTER TABLE core_guides ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_guides SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_guides ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_guides_tenant_id ON core_guides(tenant_id);

-- 3. 操作指南课程表
ALTER TABLE core_guide_lessons ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_guide_lessons SET tenant_id = (
    SELECT g.tenant_id FROM core_guides g 
    WHERE g.id = core_guide_lessons.guide_id 
    LIMIT 1
) WHERE tenant_id IS NULL;
UPDATE core_guide_lessons SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_guide_lessons ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_tenant_id ON core_guide_lessons(tenant_id);

-- 4. 学习进度表
ALTER TABLE core_guide_progress ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_guide_progress SET tenant_id = (
    SELECT g.tenant_id FROM core_guides g 
    WHERE g.id = core_guide_progress.guide_id 
    LIMIT 1
) WHERE tenant_id IS NULL;
UPDATE core_guide_progress SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_guide_progress ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_guide_progress_tenant_id ON core_guide_progress(tenant_id);

-- 启用 RLS
ALTER TABLE core_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_guide_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_guide_progress ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略（使用 DO 块实现 IF NOT EXISTS 逻辑）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'core_faqs' 
          AND policyname = 'core_faqs_tenant_policy'
    ) THEN
        CREATE POLICY core_faqs_tenant_policy ON core_faqs
            FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'core_guides' 
          AND policyname = 'core_guides_tenant_policy'
    ) THEN
        CREATE POLICY core_guides_tenant_policy ON core_guides
            FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'core_guide_lessons' 
          AND policyname = 'core_guide_lessons_tenant_policy'
    ) THEN
        CREATE POLICY core_guide_lessons_tenant_policy ON core_guide_lessons
            FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'core_guide_progress' 
          AND policyname = 'core_guide_progress_tenant_policy'
    ) THEN
        CREATE POLICY core_guide_progress_tenant_policy ON core_guide_progress
            FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
    END IF;
END $$;