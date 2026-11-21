-- ============================================================
-- 回滚 20261122160000_mes_erp_sync_mes_order_id_nullable
--
-- 回滚后形态（务必与发布说明一致）：
--   列：integration.mes_erp_sync.mes_order_id 恢复 NOT NULL；
--   约束：删除本迁移新增的 ck_mes_erp_sync_success_requires_mes_order
--         （迁移前不存在该约束）。
--
-- 恢复 NOT NULL 前必须断言不存在 mes_order_id IS NULL 的行：
--   * 存在则 RAISE EXCEPTION 明确失败并给出计数，不静默跳过、不自动删除数据；
--   * 需先人工处理这些 pending/失败记录（补 MES 单号或归档），再重跑本回滚。
--
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- ------------------------------------------------------------
-- 1. 前置断言：不能有 NULL 行
-- ------------------------------------------------------------
DO $guard$
DECLARE
    v_null bigint;
    v_prev text;
BEGIN
    IF to_regclass('integration.mes_erp_sync') IS NULL THEN
        RAISE EXCEPTION '回滚失败：integration.mes_erp_sync 不存在，无法恢复列形态';
    END IF;

    -- 该表启用 FORCE RLS；临时走系统通道，确保统计覆盖全部租户（事务结束自动还原）。
    v_prev := current_setting('app.rls_system', true);
    PERFORM set_config('app.rls_system', 'on', true);

    SELECT count(*) INTO v_null
      FROM integration.mes_erp_sync
     WHERE mes_order_id IS NULL;

    PERFORM set_config('app.rls_system', coalesce(v_prev, 'off'), true);

    IF v_null > 0 THEN
        RAISE EXCEPTION
            '回滚失败：存在 % 条 mes_order_id IS NULL 的同步记录，不能恢复 NOT NULL；请先人工处理（补 MES 单号或归档）后重跑，本回滚不会自动删除数据',
            v_null;
    END IF;
END
$guard$;

-- ------------------------------------------------------------
-- 2. 恢复 NOT NULL
-- ------------------------------------------------------------
ALTER TABLE integration.mes_erp_sync
    ALTER COLUMN mes_order_id SET NOT NULL;

-- ------------------------------------------------------------
-- 3. 删除本迁移新增的成功约束
-- ------------------------------------------------------------
ALTER TABLE integration.mes_erp_sync
    DROP CONSTRAINT IF EXISTS ck_mes_erp_sync_success_requires_mes_order;

-- ------------------------------------------------------------
-- 4. 后置断言：恢复到迁移前形态
-- ------------------------------------------------------------
DO $verify$
DECLARE
    v_nullable text;
    v_constraint bigint;
BEGIN
    SELECT is_nullable INTO v_nullable
      FROM information_schema.columns
     WHERE table_schema = 'integration'
       AND table_name = 'mes_erp_sync'
       AND column_name = 'mes_order_id';
    IF v_nullable IS DISTINCT FROM 'NO' THEN
        RAISE EXCEPTION '回滚断言失败：mes_order_id 期望 NOT NULL，实际 is_nullable=%', coalesce(v_nullable, '缺失');
    END IF;

    SELECT count(*) INTO v_constraint
      FROM pg_constraint
     WHERE conrelid = 'integration.mes_erp_sync'::regclass
       AND conname = 'ck_mes_erp_sync_success_requires_mes_order';
    IF v_constraint <> 0 THEN
        RAISE EXCEPTION '回滚断言失败：约束 ck_mes_erp_sync_success_requires_mes_order 仍存在';
    END IF;

    RAISE NOTICE '回滚完成：mes_order_id 已恢复 NOT NULL，成功约束已删除';
END
$verify$;

-- ------------------------------------------------------------
-- 5. 清理本迁移在账本中的登记行（幂等；按 version 精确匹配）
-- ------------------------------------------------------------
DELETE FROM public._sqlx_migrations WHERE version = 20261122160000;
