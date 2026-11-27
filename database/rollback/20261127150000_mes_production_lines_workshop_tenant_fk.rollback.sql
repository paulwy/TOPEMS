-- 回滚 20261127150000：车间外键退回单列口径
SET search_path = pg_catalog, public, pg_temp;
DO $mig$
BEGIN
  IF to_regclass('mes.production_lines') IS NULL THEN RETURN; END IF;
  ALTER TABLE mes.production_lines DROP CONSTRAINT IF EXISTS production_lines_workshop_tenant_fkey;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mes.production_lines'::regclass AND conname='production_lines_workshop_id_fkey') THEN
    ALTER TABLE mes.production_lines
      ADD CONSTRAINT production_lines_workshop_id_fkey
      FOREIGN KEY (workshop_id) REFERENCES mes.workshops(id) ON DELETE SET NULL;
  END IF;
END
$mig$;
