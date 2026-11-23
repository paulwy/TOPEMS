-- B204：erp.erp_production_orders.status 值域收敛（候选约束，NOT VALID）
--
-- 权威值源：svc/erp/src/modules/production_order_status.rs（ProductionOrderStatus）
-- 值集：pending / approved / released / in_progress / completed / cancelled
--   pending     待审批（新建默认，DB 默认同值）
--   approved    已审批，触发 ErpProductionOrderDispatched 下发事件
--   released    已下达 MES（编辑守卫只允许 pending / released）
--   in_progress 生产中（MES 回写）
--   completed   已完工（MES 回写）
--   cancelled   已取消（删除守卫只允许 pending / cancelled）
-- 不含 paused / closed：那是 mes.production_orders 自己的执行态。
--
-- 执行方式：本地 topems 库按窗口直接执行；NOT VALID 只约束新写入，
-- 存量由 VALIDATE CONSTRAINT 在业务确认后单独执行。禁止对生产库直接跑本文件。

BEGIN;

ALTER TABLE erp.erp_production_orders
    ADD CONSTRAINT ck_erp_erp_production_orders_status_standard
    CHECK (
        status IS NULL
        OR status IN (
            'pending', 'approved', 'released',
            'in_progress', 'completed', 'cancelled'
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_erp_erp_production_orders_status_standard
    ON erp.erp_production_orders
    IS '状态值域由 svc/erp/src/modules/production_order_status.rs 定义（B204）';

COMMIT;
