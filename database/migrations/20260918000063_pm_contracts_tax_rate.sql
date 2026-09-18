-- TOPEMS database migration 20260918000063
-- pm.contracts 补 tax_rate numeric / description text（list/detail SELECT 引用，5433 已有）
-- 幂等且双库安全。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='pm' AND table_name='contracts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='pm' AND table_name='contracts' AND column_name='tax_rate') THEN
            ALTER TABLE pm.contracts ADD COLUMN tax_rate numeric;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='pm' AND table_name='contracts' AND column_name='description') THEN
            ALTER TABLE pm.contracts ADD COLUMN description text;
        END IF;
    END IF;
END $$;
