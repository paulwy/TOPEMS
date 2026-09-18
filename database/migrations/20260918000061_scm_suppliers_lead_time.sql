-- TOPEMS database migration 20260918000061
-- scm.suppliers 补 lead_time_days integer（MRP 计算 SELECT s.lead_time_days）
-- 幂等且双库安全。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='suppliers')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='scm' AND table_name='suppliers' AND column_name='lead_time_days') THEN
        ALTER TABLE scm.suppliers ADD COLUMN lead_time_days integer;
    END IF;
END $$;
