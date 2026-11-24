-- B268: 收口 RD 变更单状态值域
-- 现状：rs.change_orders.status 无 CHECK，创建入口硬编码 planned，且没有状态流转入口。
-- 规范四态：planned / in_progress / completed / cancelled；默认 planned。
-- 约束先行 NOT VALID，避免历史异常值阻断生产迁移；本地库随后 VALIDATE。

ALTER TABLE rs.change_orders
    ALTER COLUMN status SET DEFAULT 'planned';

ALTER TABLE rs.change_orders
    ADD CONSTRAINT ck_change_orders_status_standard
    CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled'))
    NOT VALID;

COMMENT ON COLUMN rs.change_orders.status IS
    '状态：planned, in_progress, completed, cancelled';
