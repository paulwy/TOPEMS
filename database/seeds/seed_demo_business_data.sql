-- ============================================================================
-- 演示种子数据：erp 供应商 + 采购订单 + 库存（dashboard stats 真值化展示用）
-- 幂等可重放：按业务键 WHERE NOT EXISTS 判断，重复执行不产生重复行
-- 租户：00000000-0000-0000-0000-000000000001（dashboard 默认 x-tenant-id）
-- 执行：psql -h localhost -p 5433 -U topems -d topems -f database/seeds/seed_demo_business_data.sql
-- ============================================================================

-- 0) 供应商（3 家，采购订单外键引用）
INSERT INTO erp.suppliers (code, name, short_name, contact_person, contact_phone, city, tenant_id)
SELECT 'SUP-2026-01', '华东精密零部件有限公司', '华东精密', '王工', '13800000001', '上海',
       '00000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM erp.suppliers WHERE code = 'SUP-2026-01');

INSERT INTO erp.suppliers (code, name, short_name, contact_person, contact_phone, city, tenant_id)
SELECT 'SUP-2026-02', '苏州钣金加工厂', '苏州钣金', '李工', '13800000002', '苏州',
       '00000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM erp.suppliers WHERE code = 'SUP-2026-02');

INSERT INTO erp.suppliers (code, name, short_name, contact_person, contact_phone, city, tenant_id)
SELECT 'SUP-2026-03', '东莞线缆供应有限公司', '东莞线缆', '陈工', '13800000003', '东莞',
       '00000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM erp.suppliers WHERE code = 'SUP-2026-03');

-- 1) 物料（5 种，库存条目外键引用）
INSERT INTO erp.materials (code, name, unit, category, tenant_id)
SELECT 'MAT-BRG-001', '主轴承 6205-2RS', '件', '标准件', '00000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM erp.materials WHERE code = 'MAT-BRG-001');

INSERT INTO erp.materials (code, name, unit, category, tenant_id)
SELECT 'MAT-CAB-004', '控制线缆 4×1.5mm²', '米', '线缆', '00000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM erp.materials WHERE code = 'MAT-CAB-004');

INSERT INTO erp.materials (code, name, unit, category, tenant_id)
SELECT 'MAT-SHT-009', '机柜钣金壳体', '套', '结构件', '00000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM erp.materials WHERE code = 'MAT-SHT-009');

INSERT INTO erp.materials (code, name, unit, category, tenant_id)
SELECT 'MAT-PLC-002', 'PLC 控制器 S7-1200', '台', '电气', '00000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM erp.materials WHERE code = 'MAT-PLC-002');

INSERT INTO erp.materials (code, name, unit, category, tenant_id)
SELECT 'MAT-FLT-003', '液压油滤芯 HF-60', '只', '易耗件', '00000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM erp.materials WHERE code = 'MAT-FLT-003');

-- 2) 采购订单（3 条：pending / approved / completed 覆盖状态流转；order_date 列已对齐代码为 TIMESTAMPTZ）
INSERT INTO erp.purchase_orders
  (order_no, supplier_id, supplier_name, order_date, delivery_date, status, total_amount,
   tax_amount, discount_amount, payable_amount, remark, tenant_id)
SELECT 'PO-2026-0001', s.id, '华东精密零部件有限公司', '2026-09-01', '2026-09-20',
       'pending', 128500.00, 12850.00, 0.00, 141350.00,
       '演示数据：主轴承采购在途', '00000000-0000-0000-0000-000000000001'
FROM erp.suppliers s WHERE s.code = 'SUP-2026-01'
AND NOT EXISTS (SELECT 1 FROM erp.purchase_orders WHERE order_no = 'PO-2026-0001');

INSERT INTO erp.purchase_orders
  (order_no, supplier_id, supplier_name, order_date, delivery_date, status, total_amount,
   tax_amount, discount_amount, payable_amount, remark, tenant_id)
SELECT 'PO-2026-0002', s.id, '苏州钣金加工厂', '2026-09-03', '2026-09-25',
       'approved', 86500.00, 8650.00, 2000.00, 93150.00,
       '演示数据：机柜壳体已审批', '00000000-0000-0000-0000-000000000001'
FROM erp.suppliers s WHERE s.code = 'SUP-2026-02'
AND NOT EXISTS (SELECT 1 FROM erp.purchase_orders WHERE order_no = 'PO-2026-0002');

INSERT INTO erp.purchase_orders
  (order_no, supplier_id, supplier_name, order_date, delivery_date, status, total_amount,
   tax_amount, discount_amount, payable_amount, remark, tenant_id)
SELECT 'PO-2026-0003', s.id, '东莞线缆供应有限公司', '2026-08-20', '2026-09-05',
       'completed', 45200.00, 4520.00, 0.00, 49720.00,
       '演示数据：控制线缆已到货', '00000000-0000-0000-0000-000000000001'
FROM erp.suppliers s WHERE s.code = 'SUP-2026-03'
AND NOT EXISTS (SELECT 1 FROM erp.purchase_orders WHERE order_no = 'PO-2026-0003');

-- 回填历史种子行（首次版本未带 supplier_id，重复执行无副作用）
UPDATE erp.purchase_orders po
SET supplier_id = s.id
FROM erp.suppliers s
WHERE po.supplier_id IS NULL AND po.supplier_name = s.name;

-- 回填库存的物料外键（material_id 关联 materials 表，重复执行无副作用）
UPDATE erp.inventory i
SET material_id = m.id
FROM erp.materials m
WHERE i.material_id IS NULL AND i.material_code = m.code;

-- 2) 库存条目（5 条：不同物料/仓库/批次，available/reserved 区分在途与占用）
INSERT INTO erp.inventory
  (tenant_id, material_code, material_name, warehouse_name, location_code,
   quantity, available_quantity, reserved_quantity, unit, unit_price,
   total_amount, batch_no, status)
SELECT '00000000-0000-0000-0000-000000000001', 'MAT-BRG-001', '主轴承 6205-2RS',
       '华东一号库', 'A-01-03', 120, 100, 20, '件', 850.00, 102000.00,
       'B20260801', 'active'
WHERE NOT EXISTS (SELECT 1 FROM erp.inventory WHERE material_code = 'MAT-BRG-001');

INSERT INTO erp.inventory
  (tenant_id, material_code, material_name, warehouse_name, location_code,
   quantity, available_quantity, reserved_quantity, unit, unit_price,
   total_amount, batch_no, status)
SELECT '00000000-0000-0000-0000-000000000001', 'MAT-CAB-004', '控制线缆 4×1.5mm²',
       '华东一号库', 'B-02-11', 5000, 4800, 200, '米', 3.50, 17500.00,
       'B20260715', 'active'
WHERE NOT EXISTS (SELECT 1 FROM erp.inventory WHERE material_code = 'MAT-CAB-004');

INSERT INTO erp.inventory
  (tenant_id, material_code, material_name, warehouse_name, location_code,
   quantity, available_quantity, reserved_quantity, unit, unit_price,
   total_amount, batch_no, status)
SELECT '00000000-0000-0000-0000-000000000001', 'MAT-SHT-009', '机柜钣金壳体',
       '苏州二库', 'C-01-01', 45, 45, 0, '套', 680.00, 30600.00,
       'B20260901', 'active'
WHERE NOT EXISTS (SELECT 1 FROM erp.inventory WHERE material_code = 'MAT-SHT-009');

INSERT INTO erp.inventory
  (tenant_id, material_code, material_name, warehouse_name, location_code,
   quantity, available_quantity, reserved_quantity, unit, unit_price,
   total_amount, batch_no, status)
SELECT '00000000-0000-0000-0000-000000000001', 'MAT-PLC-002', 'PLC 控制器 S7-1200',
       '苏州二库', 'C-02-05', 18, 12, 6, '台', 4200.00, 75600.00,
       'B20260720', 'active'
WHERE NOT EXISTS (SELECT 1 FROM erp.inventory WHERE material_code = 'MAT-PLC-002');

INSERT INTO erp.inventory
  (tenant_id, material_code, material_name, warehouse_name, location_code,
   quantity, available_quantity, reserved_quantity, unit, unit_price,
   total_amount, batch_no, status)
SELECT '00000000-0000-0000-0000-000000000001', 'MAT-FLT-003', '液压油滤芯 HF-60',
       '华南三库', 'D-03-08', 300, 260, 40, '只', 95.00, 28500.00,
       'B20260810', 'active'
WHERE NOT EXISTS (SELECT 1 FROM erp.inventory WHERE material_code = 'MAT-FLT-003');
