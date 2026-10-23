-- =====================================================================
-- 20261023000020: Phase D / DB-02 业务唯一约束补强（erp 域）
-- 背景：审计报告《TOPEMS全项目测试与审计报告-2026-10-23》§4.7 DB-02
--       实测 erp.suppliers.code / erp.materials.code / erp.purchase_orders.order_no
--       仅有 PK(id)，无任何唯一约束/唯一索引，业务单号与编码可重号。
-- 范围：仅补 3 个「无争议高价值」项，均为租户内自然唯一键。
--       erp.vouchers.voucher_no 已是主键（全局唯一），本迁移不重复处理。
--       erp.financial_vouchers.voucher_number 按会计期间(period)重号，
--       唯一键应为 (tenant_id, period, voucher_number)，口径待财务确认，列入候选报告不补。
-- 幂等：①pg_constraint 已存在则跳过；②存在存量 (tenant_id,code) 重复则
--       RAISE NOTICE 跳过，绝不在生产硬失败（数据需先清洗）。
-- 注意：三表 tenant_id 可空；Postgres 唯一约束视 NULL 为互不相同，
--       故多 NULL 租户 + 同 code 共存不受影响，与现网可空设计兼容。
-- =====================================================================

-- 1) erp.suppliers：租户内供应商编码唯一
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'erp.suppliers'::regclass
          AND conname = 'suppliers_tenant_id_code_key'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM erp.suppliers
            GROUP BY tenant_id, code HAVING count(*) > 1
        ) THEN
            ALTER TABLE erp.suppliers
                ADD CONSTRAINT suppliers_tenant_id_code_key UNIQUE (tenant_id, code);
        ELSE
            RAISE NOTICE 'erp.suppliers: 存在重复 (tenant_id, code)，跳过唯一约束，待清洗后重放本迁移';
        END IF;
    END IF;
END $$;

-- 2) erp.materials：租户内物料编码唯一
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'erp.materials'::regclass
          AND conname = 'materials_tenant_id_code_key'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM erp.materials
            GROUP BY tenant_id, code HAVING count(*) > 1
        ) THEN
            ALTER TABLE erp.materials
                ADD CONSTRAINT materials_tenant_id_code_key UNIQUE (tenant_id, code);
        ELSE
            RAISE NOTICE 'erp.materials: 存在重复 (tenant_id, code)，跳过唯一约束，待清洗后重放本迁移';
        END IF;
    END IF;
END $$;

-- 3) erp.purchase_orders：租户内采购订单号唯一
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'erp.purchase_orders'::regclass
          AND conname = 'purchase_orders_tenant_id_order_no_key'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM erp.purchase_orders
            GROUP BY tenant_id, order_no HAVING count(*) > 1
        ) THEN
            ALTER TABLE erp.purchase_orders
                ADD CONSTRAINT purchase_orders_tenant_id_order_no_key UNIQUE (tenant_id, order_no);
        ELSE
            RAISE NOTICE 'erp.purchase_orders: 存在重复 (tenant_id, order_no)，跳过唯一约束，待清洗后重放本迁移';
        END IF;
    END IF;
END $$;
