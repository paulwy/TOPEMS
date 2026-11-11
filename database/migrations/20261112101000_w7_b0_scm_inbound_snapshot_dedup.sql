-- ============================================================
-- W7 · B0：采购单 → 入库单快照防重（数据库级硬约束）
-- 版本：20261112101000
--
-- 背景：POST /api/scm/sync/purchase-to-inbound 的判重比较了
--       snapshot.order_number = purchase_order.po_no，而实际写入的是
--       'INB-' || po_no，永不相等 → 判重分支是死分支，并发/重复调用会重复建快照。
--       代码侧已修为按 purchase_order_id 判重 + 对采购单行 SELECT ... FOR UPDATE；
--       本笔补数据库级兜底：同一 (tenant, purchase_order_id) 只允许一条未删除快照。
--
-- 约束：
--   * 只对 purchase_order_id IS NOT NULL 且 deleted_at IS NULL 的行生效（部分唯一索引）；
--   * tenant_id 为 NULL 的历史行按零 UUID 归一（与中间件超管 nil 语义一致）；
--   * 建索引前预检重复，存在重复直接 RAISE EXCEPTION 中止，不自动删数据；
--   * 可重复执行（IF NOT EXISTS）。
--
-- 回滚（急停）：
--   DROP INDEX IF EXISTS scm.ux_scm_inbound_snapshot_tenant_po;
-- ============================================================

SET lock_timeout = '5s';

DO $w7b0_dedup$
DECLARE
    v_dup bigint;
BEGIN
    IF to_regclass('scm.wms_inbound_order_snapshots') IS NULL THEN
        RAISE EXCEPTION 'scm.wms_inbound_order_snapshots 不存在，B0 防重索引无从建立';
    END IF;

    SELECT count(*) INTO v_dup
    FROM (
        SELECT 1
        FROM scm.wms_inbound_order_snapshots
        WHERE purchase_order_id IS NOT NULL
          AND deleted_at IS NULL
        GROUP BY COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
                 purchase_order_id
        HAVING count(*) > 1
    ) d;

    IF v_dup > 0 THEN
        RAISE EXCEPTION
            '存在 % 组重复入库单快照（同一租户 + 同一采购单），请先人工核对后再建唯一索引', v_dup;
    END IF;
END
$w7b0_dedup$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_scm_inbound_snapshot_tenant_po
    ON scm.wms_inbound_order_snapshots
       (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), purchase_order_id)
    WHERE purchase_order_id IS NOT NULL
      AND deleted_at IS NULL;

COMMENT ON INDEX scm.ux_scm_inbound_snapshot_tenant_po IS
    'W7-B0：同一租户+采购单只允许一条未删除的入库单快照（purchase-to-inbound 防重兜底）';
