-- WMS 订单模型扩展字段
-- 为 outbound_order 和 inbound_order 添加业务扩展字段

-- outbound_orders 扩展字段
ALTER TABLE wms.outbound_orders
ADD COLUMN IF NOT EXISTS carrier VARCHAR(100),
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS picked_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS packed_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipped_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- inbound_orders 扩展字段
ALTER TABLE wms.inbound_orders
ADD COLUMN IF NOT EXISTS total_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS received_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 注释
COMMENT ON COLUMN wms.outbound_orders.carrier IS '承运商名称';
COMMENT ON COLUMN wms.outbound_orders.tracking_number IS '物流运单号';
COMMENT ON COLUMN wms.outbound_orders.picked_quantity IS '已拣货数量';
COMMENT ON COLUMN wms.outbound_orders.packed_quantity IS '已打包数量';
COMMENT ON COLUMN wms.outbound_orders.shipped_quantity IS '已发货数量';
COMMENT ON COLUMN wms.outbound_orders.created_by IS '创建人用户ID';
COMMENT ON COLUMN wms.outbound_orders.approved_by IS '审批人用户ID';
COMMENT ON COLUMN wms.outbound_orders.approved_at IS '审批时间';

COMMENT ON COLUMN wms.inbound_orders.total_quantity IS '订单总数量';
COMMENT ON COLUMN wms.inbound_orders.received_quantity IS '已收货数量';
COMMENT ON COLUMN wms.inbound_orders.created_by IS '创建人用户ID';
COMMENT ON COLUMN wms.inbound_orders.approved_by IS '审批人用户ID';
COMMENT ON COLUMN wms.inbound_orders.approved_at IS '审批时间';
