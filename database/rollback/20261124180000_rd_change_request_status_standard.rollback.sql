-- B263 回滚：撤销约束并恢复默认值；别名归一不可逆。
DO $$
BEGIN
    IF to_regclass('rs.change_requests') IS NULL THEN
        RETURN;
    END IF;
    ALTER TABLE rs.change_requests DROP CONSTRAINT IF EXISTS ck_change_requests_status_standard;
    ALTER TABLE rs.change_requests ALTER COLUMN status SET DEFAULT 'submitted';
END $$;
