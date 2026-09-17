-- ============================================================================
-- rd/pm 冒烟缺口修复（2026-09-18）
-- rd.bugs 无 created_at（通用 list_typed ORDER BY created_at）——补列回填 create_time
-- pm.contracts 缺 tax_rate（SELECT 引用）——补 numeric 列
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rd' AND table_name='bugs' AND column_name='created_at') THEN
    ALTER TABLE rd.bugs ADD COLUMN created_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='pm' AND table_name='contracts' AND column_name='tax_rate') THEN
    ALTER TABLE pm.contracts ADD COLUMN tax_rate numeric(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='pm' AND table_name='contracts' AND column_name='description') THEN
    ALTER TABLE pm.contracts ADD COLUMN description text;
  END IF;
END $$;

UPDATE rd.bugs SET created_at = create_time WHERE created_at IS NULL AND create_time IS NOT NULL;
