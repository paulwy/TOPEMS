-- ERP purchase_orders 表建表迁移
-- 补齐之前缺失的建表脚本（代码和事件处理器引用此表但无迁移文件）

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    order_date DATE NOT NULL,
    delivery_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    payable_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    remark TEXT,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_no ON purchase_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_id ON purchase_orders(tenant_id);

-- 更新时间触发器
CREATE OR REPLACE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
