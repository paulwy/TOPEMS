-- TOPEMS SCM Service - Add tenant_id for multi-tenant support

-- ============================================
-- 1. SCM Suppliers
-- ============================================
ALTER TABLE IF EXISTS scm_suppliers ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_suppliers SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE scm_suppliers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_suppliers_tenant_id ON scm_suppliers(tenant_id);

-- ============================================
-- 2. SCM Supplier Contacts
-- ============================================
ALTER TABLE IF EXISTS scm_supplier_contacts ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_supplier_contacts ssc SET tenant_id = (SELECT ss.tenant_id FROM scm_suppliers ss WHERE ss.id = ssc.supplier_id);
ALTER TABLE scm_supplier_contacts ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_supplier_contacts_tenant_id ON scm_supplier_contacts(tenant_id);

-- ============================================
-- 3. SCM Supplier Ratings
-- ============================================
ALTER TABLE IF EXISTS scm_supplier_ratings ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_supplier_ratings ssr SET tenant_id = (SELECT ss.tenant_id FROM scm_suppliers ss WHERE ss.id = ssr.supplier_id);
ALTER TABLE scm_supplier_ratings ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_supplier_ratings_tenant_id ON scm_supplier_ratings(tenant_id);

-- ============================================
-- 4. SCM Purchase Orders
-- ============================================
ALTER TABLE IF EXISTS scm_purchase_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_purchase_orders spo SET tenant_id = (SELECT ss.tenant_id FROM scm_suppliers ss WHERE ss.id = spo.supplier_id);
UPDATE scm_purchase_orders SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE scm_purchase_orders ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_purchase_orders_tenant_id ON scm_purchase_orders(tenant_id);

-- ============================================
-- 5. SCM Purchase Order Items
-- ============================================
ALTER TABLE IF EXISTS scm_purchase_order_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_purchase_order_items spoi SET tenant_id = (SELECT spo.tenant_id FROM scm_purchase_orders spo WHERE spo.id = spoi.purchase_order_id);
ALTER TABLE scm_purchase_order_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_purchase_order_items_tenant_id ON scm_purchase_order_items(tenant_id);

-- ============================================
-- 6. SCM Purchase Order Receipts
-- ============================================
ALTER TABLE IF EXISTS scm_purchase_order_receipts ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_purchase_order_receipts spor SET tenant_id = (SELECT spo.tenant_id FROM scm_purchase_orders spo WHERE spo.id = spor.purchase_order_id);
ALTER TABLE scm_purchase_order_receipts ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_purchase_order_receipts_tenant_id ON scm_purchase_order_receipts(tenant_id);

-- ============================================
-- 7. SCM Purchase Order Receipt Items
-- ============================================
ALTER TABLE IF EXISTS scm_purchase_order_receipt_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_purchase_order_receipt_items spori SET tenant_id = (SELECT spor.tenant_id FROM scm_purchase_order_receipts spor WHERE spor.id = spori.receipt_id);
ALTER TABLE scm_purchase_order_receipt_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_purchase_order_receipt_items_tenant_id ON scm_purchase_order_receipt_items(tenant_id);

-- ============================================
-- 8. SCM Sales Orders
-- ============================================
ALTER TABLE IF EXISTS scm_sales_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_sales_orders SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE scm_sales_orders ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_sales_orders_tenant_id ON scm_sales_orders(tenant_id);

-- ============================================
-- 9. SCM Sales Order Items
-- ============================================
ALTER TABLE IF EXISTS scm_sales_order_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_sales_order_items ssoi SET tenant_id = (SELECT sso.tenant_id FROM scm_sales_orders sso WHERE sso.id = ssoi.sales_order_id);
ALTER TABLE scm_sales_order_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_sales_order_items_tenant_id ON scm_sales_order_items(tenant_id);

-- ============================================
-- 10. SCM Sales Deliveries
-- ============================================
ALTER TABLE IF EXISTS scm_sales_deliveries ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_sales_deliveries ssd SET tenant_id = (SELECT sso.tenant_id FROM scm_sales_orders sso WHERE sso.id = ssd.sales_order_id);
ALTER TABLE scm_sales_deliveries ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_sales_deliveries_tenant_id ON scm_sales_deliveries(tenant_id);

-- ============================================
-- 11. SCM Sales Delivery Items
-- ============================================
ALTER TABLE IF EXISTS scm_sales_delivery_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_sales_delivery_items ssdi SET tenant_id = (SELECT ssd.tenant_id FROM scm_sales_deliveries ssd WHERE ssd.id = ssdi.delivery_id);
ALTER TABLE scm_sales_delivery_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_sales_delivery_items_tenant_id ON scm_sales_delivery_items(tenant_id);

-- ============================================
-- 12. SCM Customers
-- ============================================
ALTER TABLE IF EXISTS scm_customers ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_customers SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE scm_customers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_customers_tenant_id ON scm_customers(tenant_id);

-- ============================================
-- 13. SCM Customer Contacts
-- ============================================
ALTER TABLE IF EXISTS scm_customer_contacts ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_customer_contacts scc SET tenant_id = (SELECT sc.tenant_id FROM scm_customers sc WHERE sc.id = scc.customer_id);
ALTER TABLE scm_customer_contacts ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_customer_contacts_tenant_id ON scm_customer_contacts(tenant_id);

-- ============================================
-- 14. SCM Customer Ratings
-- ============================================
ALTER TABLE IF EXISTS scm_customer_ratings ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_customer_ratings scr SET tenant_id = (SELECT sc.tenant_id FROM scm_customers sc WHERE sc.id = scr.customer_id);
ALTER TABLE scm_customer_ratings ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_customer_ratings_tenant_id ON scm_customer_ratings(tenant_id);

-- ============================================
-- 15. SCM Inventory Items
-- ============================================
ALTER TABLE IF EXISTS scm_inventory_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_inventory_items SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE scm_inventory_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_inventory_items_tenant_id ON scm_inventory_items(tenant_id);

-- ============================================
-- 16. SCM Inventory Transactions
-- ============================================
ALTER TABLE IF EXISTS scm_inventory_transactions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_inventory_transactions sit SET tenant_id = (SELECT sii.tenant_id FROM scm_inventory_items sii WHERE sii.id = sit.inventory_item_id);
UPDATE scm_inventory_transactions SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE scm_inventory_transactions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_inventory_transactions_tenant_id ON scm_inventory_transactions(tenant_id);

-- ============================================
-- 17. SCM Warehouses
-- ============================================
ALTER TABLE IF EXISTS scm_warehouses ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_warehouses SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE scm_warehouses ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_warehouses_tenant_id ON scm_warehouses(tenant_id);

-- ============================================
-- 18. SCM Warehouse Locations
-- ============================================
ALTER TABLE IF EXISTS scm_warehouse_locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_warehouse_locations swl SET tenant_id = (SELECT sw.tenant_id FROM scm_warehouses sw WHERE sw.id = swl.warehouse_id);
ALTER TABLE scm_warehouse_locations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_warehouse_locations_tenant_id ON scm_warehouse_locations(tenant_id);

-- ============================================
-- 19. SCM Transportation Routes
-- ============================================
ALTER TABLE IF EXISTS scm_transportation_routes ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_transportation_routes SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE scm_transportation_routes ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_transportation_routes_tenant_id ON scm_transportation_routes(tenant_id);

-- ============================================
-- 20. SCM Transportation Shipments
-- ============================================
ALTER TABLE IF EXISTS scm_transportation_shipments ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scm_transportation_shipments sts SET tenant_id = (SELECT str.tenant_id FROM scm_transportation_routes str WHERE str.id = sts.route_id);
ALTER TABLE scm_transportation_shipments ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_transportation_shipments_tenant_id ON scm_transportation_shipments(tenant_id);

-- ============================================
-- Enable Row Level Security for all tables
-- ============================================
ALTER TABLE scm_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_supplier_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_purchase_order_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_purchase_order_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_sales_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_sales_delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_customer_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_transportation_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm_transportation_shipments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Create tenant isolation policies
-- ============================================
CREATE POLICY "scm_suppliers_tenant_isolation" ON scm_suppliers
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_supplier_contacts_tenant_isolation" ON scm_supplier_contacts
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_supplier_ratings_tenant_isolation" ON scm_supplier_ratings
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_purchase_orders_tenant_isolation" ON scm_purchase_orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_purchase_order_items_tenant_isolation" ON scm_purchase_order_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_purchase_order_receipts_tenant_isolation" ON scm_purchase_order_receipts
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_purchase_order_receipt_items_tenant_isolation" ON scm_purchase_order_receipt_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_sales_orders_tenant_isolation" ON scm_sales_orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_sales_order_items_tenant_isolation" ON scm_sales_order_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_sales_deliveries_tenant_isolation" ON scm_sales_deliveries
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_sales_delivery_items_tenant_isolation" ON scm_sales_delivery_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_customers_tenant_isolation" ON scm_customers
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_customer_contacts_tenant_isolation" ON scm_customer_contacts
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_customer_ratings_tenant_isolation" ON scm_customer_ratings
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_inventory_items_tenant_isolation" ON scm_inventory_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_inventory_transactions_tenant_isolation" ON scm_inventory_transactions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_warehouses_tenant_isolation" ON scm_warehouses
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_warehouse_locations_tenant_isolation" ON scm_warehouse_locations
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_transportation_routes_tenant_isolation" ON scm_transportation_routes
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scm_transportation_shipments_tenant_isolation" ON scm_transportation_shipments
    USING (tenant_id = current_setting('app.tenant_id')::uuid);