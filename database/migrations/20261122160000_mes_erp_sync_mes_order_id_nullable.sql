-- ============================================================
-- integration.mes_erp_sync 成功路径契约修复
-- 版本：20261122160000
-- ============================================================
-- 问题（2026-11-22 本地实测 + 代码核对）：
--   * sync_erp_to_mes 在 ERP→MES 方向「先建同步记录、成功后再回填」：
--     create_sync_record 时 MES 订单尚未创建，mes_order_id 传 NULL；
--     直到 MES 返回后才由 update_sync_success 回填。
--   * 但 integration.mes_erp_sync.mes_order_id 是 NOT NULL，首条 INSERT 即报
--     23502，成功分支永远不可达。
--
-- 修复：
--   1) mes_order_id 放宽为可空（pending/失败记录允许尚无 MES 单号）；
--   2) 用 CHECK (sync_status <> 'success' OR mes_order_id IS NOT NULL) 把
--      「成功必有 MES 单号」下沉到数据库，防止代码再次漏回填。
--
-- 同族核查结论（2026-11-22，integration schema）：
--   * crm_erp_sync / crm_scm_sync / erp_wms_sync / mes_qms_sync / hrm_finance_sync
--     的对端 id 列本就可空，不存在同类 NOT NULL 冲突，无需随本迁移改动；
--   * wms_scm_sync.wms_inventory_id、lims_qms_sync.lims_sample_id 虽为 NOT NULL，
--     但创建时必须已持有对端 id（请求先解析校验），不是「先建后回填」模式；
--   * 其余 NOT NULL 的 *_id 列（tenant_id / connection_id / rule_id /
--     source_record_id / sync_record_id / source_id / trace_id）语义上都必须存在。
--
-- 安全与幂等：
--   * 放宽前断言不存在 sync_status='success' AND mes_order_id IS NULL 的行，
--     有则 RAISE EXCEPTION 停止；
--   * DROP NOT NULL 对已可空列为 no-op；
--   * 约束先 NOT VALID 再 VALIDATE，已存在时跳过 ADD、只做 VALIDATE；
--   * 后置断言列必须可空、约束必须已校验。
--
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 或 sqlx 事务包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

-- ------------------------------------------------------------
-- 1. 前置断言：表与列存在
-- ------------------------------------------------------------
DO $pre$
DECLARE
    v_nullable text;
BEGIN
    IF to_regclass('integration.mes_erp_sync') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：integration.mes_erp_sync 不存在';
    END IF;

    SELECT is_nullable INTO v_nullable
      FROM information_schema.columns
     WHERE table_schema = 'integration'
       AND table_name = 'mes_erp_sync'
       AND column_name = 'mes_order_id';

    IF v_nullable IS NULL THEN
        RAISE EXCEPTION '前置断言失败：integration.mes_erp_sync.mes_order_id 不存在';
    END IF;

    RAISE NOTICE '前置检查：mes_order_id 当前 is_nullable=%', v_nullable;
END
$pre$;

-- ------------------------------------------------------------
-- 2. 迁移前断言：不允许已有「成功但无 MES 单号」的行
-- ------------------------------------------------------------
DO $guard$
DECLARE
    v_bad bigint;
    v_prev text;
BEGIN
    -- 该表启用 FORCE RLS；临时走系统通道，确保统计覆盖全部租户（事务结束自动还原）。
    v_prev := current_setting('app.rls_system', true);
    PERFORM set_config('app.rls_system', 'on', true);

    SELECT count(*) INTO v_bad
      FROM integration.mes_erp_sync
     WHERE sync_status = 'success'
       AND mes_order_id IS NULL;

    PERFORM set_config('app.rls_system', coalesce(v_prev, 'off'), true);

    IF v_bad > 0 THEN
        RAISE EXCEPTION
            '前置断言失败：存在 % 条 sync_status=success 且 mes_order_id IS NULL 的记录，拒绝放宽列约束（需先人工核对）',
            v_bad;
    END IF;
END
$guard$;

-- ------------------------------------------------------------
-- 3. 放宽 mes_order_id 为可空
-- ------------------------------------------------------------
ALTER TABLE integration.mes_erp_sync
    ALTER COLUMN mes_order_id DROP NOT NULL;

-- ------------------------------------------------------------
-- 4. 成功必有 MES 单号（先 NOT VALID，再 VALIDATE，避免长锁）
-- ------------------------------------------------------------
DO $constraint$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conrelid = 'integration.mes_erp_sync'::regclass
           AND conname = 'ck_mes_erp_sync_success_requires_mes_order'
    ) THEN
        ALTER TABLE integration.mes_erp_sync
            ADD CONSTRAINT ck_mes_erp_sync_success_requires_mes_order
            CHECK (sync_status <> 'success' OR mes_order_id IS NOT NULL)
            NOT VALID;
    END IF;
END
$constraint$;

ALTER TABLE integration.mes_erp_sync
    VALIDATE CONSTRAINT ck_mes_erp_sync_success_requires_mes_order;

-- ------------------------------------------------------------
-- 5. 后置断言
-- ------------------------------------------------------------
DO $verify$
DECLARE
    v_nullable text;
    v_validated boolean;
BEGIN
    SELECT is_nullable INTO v_nullable
      FROM information_schema.columns
     WHERE table_schema = 'integration'
       AND table_name = 'mes_erp_sync'
       AND column_name = 'mes_order_id';
    IF v_nullable IS DISTINCT FROM 'YES' THEN
        RAISE EXCEPTION '后置断言失败：mes_order_id 期望可空，实际 is_nullable=%', coalesce(v_nullable, '缺失');
    END IF;

    SELECT convalidated INTO v_validated
      FROM pg_constraint
     WHERE conrelid = 'integration.mes_erp_sync'::regclass
       AND conname = 'ck_mes_erp_sync_success_requires_mes_order';
    IF v_validated IS DISTINCT FROM true THEN
        RAISE EXCEPTION
            '后置断言失败：约束 ck_mes_erp_sync_success_requires_mes_order 不存在或未校验（convalidated=%）',
            coalesce(v_validated::text, '缺失');
    END IF;

    RAISE NOTICE '后置检查通过：mes_order_id 可空，success 必有 MES 单号';
END
$verify$;
