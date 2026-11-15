-- ============================================================
-- 回滚：20261115100000_w7_b4_wms_po_snapshot_backfill.sql
--
-- 恢复到生产基线：wms.purchase_order_snapshots 只剩 3 列
-- （id / deleted_at / tenant_id），无 ck_purchase_order_snapshots_status_standard。
-- 索引与策略不在本迁移范围内，回滚不触碰（idx_wms_po_snapshots_tenant 与
-- rls_tenant_isolation 在补列前后都存在）。
--
-- 顺序（不可交换）：
--   1) 先 DROP CONSTRAINT ck_purchase_order_snapshots_status_standard：
--      该 CHECK 引用 status 列，必须先解除依赖，否则删列会连带/报错；
--   2) 再按 ordinal 逆序 DROP COLUMN（updated_at → order_number），
--      逆序只是为了让中间态始终是「前缀 + 尾部」的合法表结构，便于人工中断排查。
--
-- ⚠️ 已知代价 / 保护：
--   表内一旦有数据，删列会丢数据。本回滚在 count(*) > 0 时直接 ABORT，
--   必须先停写、导出/迁移数据后再人工执行。
--
-- 执行方式（文件自带事务，勿叠加 --single-transaction）：
--   psql "$DSN" -v ON_ERROR_STOP=1 -f \
--     database/rollback/20261115100000_w7_b4_wms_po_snapshot_backfill.rollback.sql
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

BEGIN;

DO $po_snapshot_rollback$
DECLARE
    v_rel     regclass;
    v_cnt     bigint;
    v_r       record;
    v_cols    text;
BEGIN
    v_rel := to_regclass('wms.purchase_order_snapshots');
    IF v_rel IS NULL THEN
        RAISE EXCEPTION 'po-snapshot-rollback ABORT: 表 wms.purchase_order_snapshots 不存在';
    END IF;

    EXECUTE format('SELECT count(*) FROM %s', v_rel) INTO v_cnt;
    IF v_cnt > 0 THEN
        RAISE EXCEPTION 'po-snapshot-rollback ABORT: 表内有 % 行，删列会丢数据；请先停写并确认', v_cnt;
    END IF;

    -- 1) 先删约束（引用 status 列）
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',
                   v_rel, 'ck_purchase_order_snapshots_status_standard');

    -- 2) 再逆序删列
    FOR v_r IN
        SELECT *
        FROM (VALUES
            (11, 'order_number'),
            (10, 'supplier_id'),
            (9,  'supplier_name'),
            (8,  'total_amount'),
            (7,  'payable_amount'),
            (6,  'status'),
            (5,  'approved_by'),
            (4,  'approved_at'),
            (3,  'synced_at'),
            (2,  'created_at'),
            (1,  'updated_at')
        ) AS t(ord, col)
        ORDER BY ord DESC
    LOOP
        EXECUTE format('ALTER TABLE %s DROP COLUMN IF EXISTS %I', v_rel, v_r.col);
    END LOOP;

    -- 后置断言：只剩基线 3 列，且约束已不存在
    SELECT string_agg(a.attname, ',' ORDER BY a.attname)
      INTO v_cols
      FROM pg_attribute a
     WHERE a.attrelid = v_rel
       AND a.attnum > 0
       AND NOT a.attisdropped;

    IF v_cols <> 'deleted_at,id,tenant_id' THEN
        RAISE EXCEPTION 'po-snapshot-rollback VERIFY FAIL: 回滚后列集合为 [%]，预期 [deleted_at,id,tenant_id]', v_cols;
    END IF;

    IF EXISTS (SELECT 1
                 FROM pg_constraint k
                WHERE k.conrelid = v_rel
                  AND k.conname  = 'ck_purchase_order_snapshots_status_standard') THEN
        RAISE EXCEPTION 'po-snapshot-rollback VERIFY FAIL: 约束 ck_purchase_order_snapshots_status_standard 仍存在';
    END IF;

    RAISE NOTICE 'po-snapshot-rollback OK: 已恢复基线 3 列，状态约束已删除';
END
$po_snapshot_rollback$;

COMMIT;
