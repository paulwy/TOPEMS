-- TOPEMS database migration 20260918000065
-- scm 询价/报价写路径深层冒烟暴露：
-- 1) ck_purchase_inquiries_status_standard 仅允许 active/inactive/archived，
--    代码 INSERT 硬编码 'draft' → 违反；扩展枚举。
-- 2) supplier_quotes.inquiry_id NOT NULL，但 CreateSupplierQuoteRequest 无该字段
--    （报价单可不关联询价单）→ DROP NOT NULL。
-- 幂等且双库安全（5433 无这些表时跳过）。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='purchase_inquiries') THEN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_purchase_inquiries_status_standard') THEN
            ALTER TABLE scm.purchase_inquiries DROP CONSTRAINT ck_purchase_inquiries_status_standard;
        END IF;
        ALTER TABLE scm.purchase_inquiries ADD CONSTRAINT ck_purchase_inquiries_status_standard
            CHECK (status IS NULL OR status IN
                ('active','inactive','archived','draft','pending','completed','cancelled'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='supplier_quotes') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='scm' AND table_name='supplier_quotes'
                     AND column_name='inquiry_id' AND is_nullable='NO') THEN
            ALTER TABLE scm.supplier_quotes ALTER COLUMN inquiry_id DROP NOT NULL;
        END IF;
    END IF;
END $$;
