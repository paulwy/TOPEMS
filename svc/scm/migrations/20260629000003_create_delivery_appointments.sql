CREATE TABLE IF NOT EXISTS scm.supplier_delivery_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_no VARCHAR(50) NOT NULL UNIQUE,
    purchase_order_id UUID,
    purchase_order_no VARCHAR(100),
    supplier_id UUID NOT NULL,
    supplier_name VARCHAR(255),
    delivery_date DATE NOT NULL,
    delivery_time TIME,
    delivery_method VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(50),
    driver_name VARCHAR(100),
    driver_phone TEXT,
    cargo_description TEXT,
    total_quantity NUMERIC(15,2),
    total_weight NUMERIC(15,2),
    destination_warehouse VARCHAR(100),
    expected_arrival_time TIME,
    actual_arrival_time TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    applicant VARCHAR(100),
    approver VARCHAR(100),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_no ON scm.purchase_orders(po_no);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON scm.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON scm.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON scm.purchase_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_delivery_appointments_appointment_no ON scm.supplier_delivery_appointments(appointment_no);
CREATE INDEX IF NOT EXISTS idx_delivery_appointments_supplier_id ON scm.supplier_delivery_appointments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_appointments_status ON scm.supplier_delivery_appointments(status);
CREATE INDEX IF NOT EXISTS idx_delivery_appointments_delivery_date ON scm.supplier_delivery_appointments(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_appointments_purchase_order_id ON scm.supplier_delivery_appointments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_appointments_created_at ON scm.supplier_delivery_appointments(created_at);