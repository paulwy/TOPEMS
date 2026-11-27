-- 回滚 20261127120000：把 mes 基础资料 code 唯一性恢复为「全局唯一」
-- 注意：若已出现跨租户同 code 数据，重建全局唯一约束会失败（属预期，需先清理数据）。
SET search_path = pg_catalog, public, pg_temp;
DO $mig$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('mes','production_lines','production_lines_code_key'),
      ('mes','shifts','shifts_code_key'),
      ('mes','work_calendars','work_calendars_code_key'),
      ('mes','workshops','workshops_code_key')
    ) AS v(sch,tbl,con)
  LOOP
    IF to_regclass(r.sch||'.'||r.tbl) IS NULL THEN CONTINUE; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = format('%I.%I', r.sch, r.tbl)::regclass AND conname = r.con) THEN
      EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I UNIQUE (code)', r.sch, r.tbl, r.con);
    END IF;
  END LOOP;
END
$mig$;
