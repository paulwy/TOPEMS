-- B262 回滚：仅撤销约束与默认值；历史中文/released 值归一不可逆，需业务侧确认。
DO $$
BEGIN
    IF to_regclass('rs.formulas') IS NULL THEN
        RETURN;
    END IF;
    ALTER TABLE rs.formulas DROP CONSTRAINT IF EXISTS ck_formulas_status_standard;
    ALTER TABLE rs.formulas ALTER COLUMN status SET DEFAULT 'draft';
END $$;
