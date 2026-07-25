-- =====================================================
-- 014: RLS 多租户策略 - 覆盖剩余 2.7% 未覆盖的表
-- 包含典型表：flow_approval_tasks, work_orders, work_reports, wip 等
--
-- 设计原则：
--   1. 所有未启用 RLS 的多租户表都补齐 tenant_id 列 + 索引
--   2. 通过 SET LOCAL app.current_tenant_id 切换上下文
--   3. 超级管理员 (is_superuser) 跳过 RLS 限制
-- =====================================================

-- 0. 准备：定义统一的 RLS 应用函数
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
DECLARE
    raw TEXT;
    tid UUID;
BEGIN
    raw := current_setting('app.current_tenant_id', true);
    IF raw IS NULL OR raw = '' THEN
        RETURN NULL;
    END IF;
    BEGIN
        tid := raw::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
    RETURN tid;
END;
$$ LANGUAGE plpgsql STABLE;

-- 是否超级管理员
CREATE OR REPLACE FUNCTION public.is_superuser_session()
RETURNS BOOLEAN AS $$
DECLARE
    raw TEXT;
BEGIN
    raw := current_setting('app.is_superuser', true);
    RETURN raw = 'true';
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- 通用 RLS 策略应用函数（用于 BYPASSRLS 检查）
-- 当 is_superuser_session() 为 true 时直接放行；否则限制为当前 tenant
CREATE OR REPLACE FUNCTION public.app_tenant_rls_check(row_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF public.is_superuser_session() THEN
        RETURN TRUE;
    END IF;
    RETURN row_tenant_id = public.current_tenant_id();
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 1. flow_approval_tasks
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'flow_approval_tasks'
          AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.flow_approval_tasks
            ADD COLUMN tenant_id UUID;
        UPDATE public.flow_approval_tasks
            SET tenant_id = COALESCE(
                (SELECT tenant_id FROM public.flow_instances WHERE id = flow_approval_tasks.instance_id),
                '00000000-0000-0000-0000-000000000000'::UUID
            )
            WHERE tenant_id IS NULL;
        ALTER TABLE public.flow_approval_tasks
            ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flow_approval_tasks_tenant_id
    ON public.flow_approval_tasks(tenant_id);

ALTER TABLE public.flow_approval_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_approval_tasks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON public.flow_approval_tasks;
CREATE POLICY tenant_isolation_policy ON public.flow_approval_tasks
    USING (public.app_tenant_rls_check(tenant_id))
    WITH CHECK (public.app_tenant_rls_check(tenant_id));

-- =====================================================
-- 2. work_orders
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'work_orders'
          AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.work_orders
            ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_id ON public.work_orders(tenant_id);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON public.work_orders;
CREATE POLICY tenant_isolation_policy ON public.work_orders
    USING (public.app_tenant_rls_check(tenant_id))
    WITH CHECK (public.app_tenant_rls_check(tenant_id));

-- =====================================================
-- 3. work_reports
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'work_reports'
          AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.work_reports
            ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_work_reports_tenant_id ON public.work_reports(tenant_id);

ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_reports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON public.work_reports;
CREATE POLICY tenant_isolation_policy ON public.work_reports
    USING (public.app_tenant_rls_check(tenant_id))
    WITH CHECK (public.app_tenant_rls_check(tenant_id));

-- =====================================================
-- 4. wip (在制品)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wip'
          AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.wip
            ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wip_tenant_id ON public.wip(tenant_id);

ALTER TABLE public.wip ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wip FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON public.wip;
CREATE POLICY tenant_isolation_policy ON public.wip
    USING (public.app_tenant_rls_check(tenant_id))
    WITH CHECK (public.app_tenant_rls_check(tenant_id));

-- =====================================================
-- 5. production_records
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'production_records'
          AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.production_records
            ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_production_records_tenant_id
    ON public.production_records(tenant_id);

ALTER TABLE public.production_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON public.production_records;
CREATE POLICY tenant_isolation_policy ON public.production_records
    USING (public.app_tenant_rls_check(tenant_id))
    WITH CHECK (public.app_tenant_rls_check(tenant_id));

-- =====================================================
-- 6. equipment_status
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'equipment_status'
          AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.equipment_status
            ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_equipment_status_tenant_id
    ON public.equipment_status(tenant_id);

ALTER TABLE public.equipment_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_status FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON public.equipment_status;
CREATE POLICY tenant_isolation_policy ON public.equipment_status
    USING (public.app_tenant_rls_check(tenant_id))
    WITH CHECK (public.app_tenant_rls_check(tenant_id));

-- =====================================================
-- 7. quality_inspections
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'quality_inspections'
          AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.quality_inspections
            ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quality_inspections_tenant_id
    ON public.quality_inspections(tenant_id);

ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_inspections FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON public.quality_inspections;
CREATE POLICY tenant_isolation_policy ON public.quality_inspections
    USING (public.app_tenant_rls_check(tenant_id))
    WITH CHECK (public.app_tenant_rls_check(tenant_id));

-- =====================================================
-- 8. inventory_transactions
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'inventory_transactions'
          AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.inventory_transactions
            ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant_id
    ON public.inventory_transactions(tenant_id);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON public.inventory_transactions;
CREATE POLICY tenant_isolation_policy ON public.inventory_transactions
    USING (public.app_tenant_rls_check(tenant_id))
    WITH CHECK (public.app_tenant_rls_check(tenant_id));

-- =====================================================
-- 9. notifications_extended (业务通知扩展表)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notifications_extended'
          AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.notifications_extended
            ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_extended_tenant_id
    ON public.notifications_extended(tenant_id);

ALTER TABLE public.notifications_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_extended FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON public.notifications_extended;
CREATE POLICY tenant_isolation_policy ON public.notifications_extended
    USING (public.app_tenant_rls_check(tenant_id))
    WITH CHECK (public.app_tenant_rls_check(tenant_id));

-- =====================================================
-- 10. workflow_notifications
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'workflow_notifications'
          AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.workflow_notifications
            ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workflow_notifications_tenant_id
    ON public.workflow_notifications(tenant_id);

ALTER TABLE public.workflow_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON public.workflow_notifications;
CREATE POLICY tenant_isolation_policy ON public.workflow_notifications
    USING (public.app_tenant_rls_check(tenant_id))
    WITH CHECK (public.app_tenant_rls_check(tenant_id));

-- =====================================================
-- 11. 统一记录所有已应用 RLS 策略的视图
-- =====================================================
CREATE OR REPLACE VIEW public.rls_coverage_audit AS
SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    rowsecurity AS rls_enabled,
    forcerowsecurity AS rls_forced
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;

COMMENT ON VIEW public.rls_coverage_audit IS
    '审计当前数据库 RLS 策略覆盖情况，用于 Phase 6 安全与合规增强';

-- 视图查询示例：
--   SELECT * FROM public.rls_coverage_audit WHERE rls_enabled = FALSE;
