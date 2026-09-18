-- ============================================================================
-- 异步任务队列表
-- 用于 external-erp 同步等异步任务的持久化队列
-- ============================================================================

-- 2026-09-18 防御化（空库重建链卡点）：若 integration.async_tasks 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='integration' AND table_name='async_tasks')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='integration' AND table_name='async_tasks' AND column_name='tenant_id')
  THEN
    DROP TABLE integration.async_tasks;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS integration.async_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,

    -- 任务标识
    task_type VARCHAR(64) NOT NULL,
    source_service VARCHAR(64),
    target_service VARCHAR(64),

    -- 任务数据
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_payload JSONB,

    -- 状态管理
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 5,
    priority INTEGER NOT NULL DEFAULT 0,

    -- 时间戳
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_error TEXT,

    -- 元数据
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 索引：用于出队查询（按状态和计划时间排序）
CREATE INDEX IF NOT EXISTS idx_async_tasks_status_scheduled
    ON integration.async_tasks (status, scheduled_at, priority)
    WHERE deleted_at IS NULL;

-- 索引：租户隔离
CREATE INDEX IF NOT EXISTS idx_async_tasks_tenant
    ON integration.async_tasks (tenant_id)
    WHERE deleted_at IS NULL;

-- 索引：任务类型
CREATE INDEX IF NOT EXISTS idx_async_tasks_type
    ON integration.async_tasks (task_type)
    WHERE deleted_at IS NULL;

-- 索引：创建时间
CREATE INDEX IF NOT EXISTS idx_async_tasks_created
    ON integration.async_tasks (created_at DESC)
    WHERE deleted_at IS NULL;

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION integration.update_async_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_async_tasks_updated_at ON integration.async_tasks;
CREATE TRIGGER trg_async_tasks_updated_at
    BEFORE UPDATE ON integration.async_tasks
    FOR EACH ROW
    EXECUTE FUNCTION integration.update_async_tasks_updated_at();

-- 启用 RLS
ALTER TABLE integration.async_tasks ENABLE ROW LEVEL SECURITY;

-- RLS 策略：租户隔离
DROP POLICY IF EXISTS rls_tenant_isolation ON integration.async_tasks;
CREATE POLICY rls_tenant_isolation ON integration.async_tasks
    FOR ALL
    USING (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
    );
