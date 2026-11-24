-- B264 回滚：撤销约束并恢复旧默认 planning；别名归一不可逆。
DO $$
BEGIN
    IF to_regclass('rs.experiments') IS NULL THEN
        RETURN;
    END IF;
    ALTER TABLE rs.experiments DROP CONSTRAINT IF EXISTS ck_experiments_status_standard;
    ALTER TABLE rs.experiments ALTER COLUMN status SET DEFAULT 'planning';
END $$;
