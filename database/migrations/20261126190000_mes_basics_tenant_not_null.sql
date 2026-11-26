-- ============================================================
-- 20261126190000: mes 基础资料 tenant_id 收敛为 NOT NULL（B352）
--
-- 范围：mes.workshops / mes.production_lines / mes.shifts / mes.work_calendars
--
-- 现状（本机 2026-11-26）：
--   · 四张表均为 0 行，tenant_id 可空（is_nullable=YES），各 1 条 rls_tenant_isolation；
--   · Rust 写路径（create/update/delete/get/list）自 B352 起全部带严格租户 + 显式谓词。
-- 问题：列可空 → 绕过 handler 的任何写入都能留下 tenant_id IS NULL 的行，
--   而 RLS 策略对 NULL 恒不匹配，这类行对任何租户都不可见，只能靠运维手工捞。
-- 处置：先 fail-closed 断言“零 NULL 行”，再对四列 SET NOT NULL。
--   不提供猜测式回填：基础资料无父行可继承租户，NULL 行的归属只能人工判定。
-- 若不满足前置条件，本迁移在 preflight 处显式报错并整体回滚，不静默改数据。
-- ============================================================

SET LOCAL lock_timeout = '5s';
SET LOCAL app.rls_system = 'on';
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000000';

DO $$
DECLARE
    v_workshops bigint;
    v_lines bigint;
    v_shifts bigint;
    v_calendars bigint;
BEGIN
    SELECT count(*) INTO v_workshops FROM mes.workshops WHERE tenant_id IS NULL;
    SELECT count(*) INTO v_lines FROM mes.production_lines WHERE tenant_id IS NULL;
    SELECT count(*) INTO v_shifts FROM mes.shifts WHERE tenant_id IS NULL;
    SELECT count(*) INTO v_calendars FROM mes.work_calendars WHERE tenant_id IS NULL;

    IF v_workshops + v_lines + v_shifts + v_calendars > 0 THEN
        RAISE EXCEPTION
            'B352 preflight 失败：存在无租户基础资料（workshops=%, lines=%, shifts=%, calendars=%）。请先人工确认归属并回填 tenant_id 后重跑。',
            v_workshops, v_lines, v_shifts, v_calendars
            USING ERRCODE = '23502';
    END IF;
END $$;

ALTER TABLE mes.workshops
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE mes.production_lines
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE mes.shifts
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE mes.work_calendars
    ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'mes'
          AND table_name IN ('workshops', 'production_lines', 'shifts', 'work_calendars')
          AND column_name = 'tenant_id'
          AND is_nullable = 'YES'
    ) THEN
        RAISE EXCEPTION 'B352 后置断言失败：仍有基础资料表 tenant_id 可空';
    END IF;
END $$;
