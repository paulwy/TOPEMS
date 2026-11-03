-- =============================================================
-- E2E 核心数据断言 spec 种子（CI 二期）
-- -------------------------------------------------------------
-- 用途：CI 空库（migrate 469 版后无业务种子）下，为「真数据取数型」
--       核心 e2e spec（firstRecord GET 首页首条再断言）提供每资源
--       最少 1 条业务记录；erp-cost 额外需要 fiscal_year=2099 预算
--       与 EXP2099 报销单标记记录。
-- 覆盖资源：srm/suppliers · mes/orders · mes/equipment ·
--           finance/budgets · finance/expenses · finance/vouchers ·
--           erp/assets · scm/suppliers · scm/purchase-orders ·
--           wms/inbound-orders
-- 幂等：固定 UUID id + ON CONFLICT (id) DO NOTHING，可重复执行。
-- 依赖：seed_default_tenant 迁移已建租户 00000000-0000-0000-0000-000000000001。
-- =============================================================

-- 1. srm.suppliers（srm-supplier.spec.ts：列表/详情断言 supplier_no/name）
INSERT INTO srm.suppliers (id, tenant_id, supplier_no, name, category, status, risk_level)
VALUES ('11111111-1111-4111-8111-111111111101',
        '00000000-0000-0000-0000-000000000001',
        'SUP-SEED-001', 'E2E种子供应商', '原材料', 'active', 'medium')
ON CONFLICT (id) DO NOTHING;

-- 2. scm.suppliers（scm-supplier.spec.ts 依赖；scm.purchase_orders 外键父表）
INSERT INTO scm.suppliers (id, name, status)
VALUES ('11111111-1111-4111-8111-111111111102', 'E2E种子供应商SCM', 'active')
ON CONFLICT (id) DO NOTHING;

-- 3. scm.purchase_orders（scm-purchase.spec.ts：列表断言 po_no）
INSERT INTO scm.purchase_orders (id, po_no, supplier_id, status)
VALUES ('11111111-1111-4111-8111-111111111103',
        'PO-SEED-001', '11111111-1111-4111-8111-111111111102', 'draft')
ON CONFLICT (id) DO NOTHING;

-- 4. mes.production_orders（mes-production-order.spec.ts：列表/详情断言 order_no←order_number）
INSERT INTO mes.production_orders (id, order_number, product_name, product_code, quantity, status)
VALUES ('11111111-1111-4111-8111-111111111104',
        'MO20261103001', 'E2E种子订单', 'SEED-001', 10, 'pending')
ON CONFLICT (id) DO NOTHING;

-- 5. mes.equipment（mes-equipment.spec.ts：列表断言 equipment_no←equipment_code）
INSERT INTO mes.equipment (id, equipment_code, equipment_name, status)
VALUES ('11111111-1111-4111-8111-111111111105', 'EQ-SEED-001', 'E2E种子设备', 'available')
ON CONFLICT (id) DO NOTHING;

-- 6. finance.budgets（erp-cost.spec.ts：fiscal_year=2099 标记预算 + 首页分页真值）
INSERT INTO finance.budgets (id, tenant_id, budget_type, fiscal_year, total_budget, status)
VALUES ('11111111-1111-4111-8111-111111111106',
        '00000000-0000-0000-0000-000000000001',
        'department', '2099', '100000', 'active')
ON CONFLICT (id) DO NOTHING;

-- 7. finance.expenses（erp-cost.spec.ts：EXP2099 标记报销单）
INSERT INTO finance.expenses (id, expense_number, expense_no, applicant_name, title, expense_type, amount, status, currency)
VALUES ('11111111-1111-4111-8111-111111111107',
        'EXP2099', 'EXP2099', 'E2E复验人', 'E2E费用报销', '差旅费', '100.00', 'pending', 'CNY')
ON CONFLICT (id) DO NOTHING;

-- 8. finance.vouchers（finance-voucher.spec.ts + erp-finance.spec.ts：详情断言 voucher_no）
INSERT INTO finance.vouchers (id, tenant_id, voucher_no, voucher_date, period)
VALUES ('11111111-1111-4111-8111-111111111108',
        '00000000-0000-0000-0000-000000000001',
        '记2026110001', CURRENT_DATE, '202611')
ON CONFLICT (id) DO NOTHING;

-- 9. erp.assets（erp-asset.spec.ts：列表断言 asset_number）
INSERT INTO erp.assets (id, asset_number, name, status)
VALUES ('11111111-1111-4111-8111-111111111109', 'AST-SEED-001', 'E2E种子资产', 'active')
ON CONFLICT (id) DO NOTHING;

-- 10. wms.inbound_orders（wms-inbound.spec.ts：列表断言 order_number）
INSERT INTO wms.inbound_orders (id, order_number, order_type, supplier_name)
VALUES ('11111111-1111-4111-8111-111111111110', 'IB-SEED-001', 'purchase', 'E2E种子供应商')
ON CONFLICT (id) DO NOTHING;
