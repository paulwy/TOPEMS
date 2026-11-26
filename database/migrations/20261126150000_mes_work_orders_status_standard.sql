-- ============================================================
-- 20261126150000: mes.work_orders.status 标准态（B348）
--
-- 现状（本机 2026-11-26）：
--   · 56 行全部 status = 'completed'，且 56 行全部已软删（deleted_at 非空）；
--   · NULL 0 行；status 可空（is_nullable=YES），默认 'pending'；
--   · 旧约束 work_orders_status_check 五态已 VALIDATE。
-- 问题：列可空 → 绕过 handler 的写入可留下 NULL，读路径只能靠应用层兜底。
-- 处置：默认固定 'pending'、NULL 回填（max-rows=0 fail-closed）、SET NOT NULL、
--   CHECK 重建为命名规范的五态标准约束并 VALIDATE。
-- 五态来源：svc/mes/src/modules/work_order_status.rs::WorkOrderStatus::DB_VALUES。
-- 注意：本机 56 行均为软删的历史完工工单，本迁移不改其 status 值，只改列约束。
-- ============================================================

ALTER TABLE mes.work_orders
    ALTER COLUMN status SET DEFAULT 'pending';

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 回填历史 NULL 工单状态为默认待开工态，避免 SET NOT NULL 失败；本机实测 0 行命中
-- destructive-owner: mes
-- destructive-ticket: MES-WO-STATUS-20261126
-- destructive-expires: 2027-05-20
-- destructive-max-rows: 0
-- destructive-backup: 开窗前 pg_dump -t mes.work_orders（56 行，status 全 completed 且全软删）
UPDATE mes.work_orders
   SET status = 'pending'
 WHERE status IS NULL;

ALTER TABLE mes.work_orders
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE mes.work_orders
    DROP CONSTRAINT IF EXISTS work_orders_status_check;

ALTER TABLE mes.work_orders
    ADD CONSTRAINT ck_mes_work_orders_status_standard
    CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled'))
    NOT VALID;

ALTER TABLE mes.work_orders
    VALIDATE CONSTRAINT ck_mes_work_orders_status_standard;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'mes' AND table_name = 'work_orders'
       AND column_name = 'status' AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'mes.work_orders.status 仍可空，收口未生效';
  END IF;
  RAISE NOTICE 'mes.work_orders.status 已收口：NOT NULL + 五态标准约束';
END $$;
