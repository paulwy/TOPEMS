-- B265 回滚：撤销约束并恢复可空/无默认；别名归一不可逆。
DO $$
BEGIN
    IF to_regclass('rs.experiments') IS NULL THEN
        RETURN;
    END IF;
    ALTER TABLE rs.experiments DROP CONSTRAINT IF EXISTS ck_experiments_phase_standard;
    ALTER TABLE rs.experiments ALTER COLUMN phase DROP NOT NULL;
    ALTER TABLE rs.experiments ALTER COLUMN phase DROP DEFAULT;
END $$;
