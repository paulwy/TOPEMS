-- B268 rollback: 移除 RD 变更单状态值域约束
ALTER TABLE rs.change_orders
    DROP CONSTRAINT IF EXISTS ck_change_orders_status_standard;

ALTER TABLE rs.change_orders
    ALTER COLUMN status SET DEFAULT 'planned';
