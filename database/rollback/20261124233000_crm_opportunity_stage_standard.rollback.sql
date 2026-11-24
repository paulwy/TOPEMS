-- B266 回滚：撤销约束并恢复 legacy 默认值；别名归一不可逆。
DO $$
BEGIN
    IF to_regclass('crm.opportunities') IS NULL THEN
        RETURN;
    END IF;
    ALTER TABLE crm.opportunities DROP CONSTRAINT IF EXISTS ck_opportunities_stage_standard;
    ALTER TABLE crm.opportunities ALTER COLUMN stage SET DEFAULT 'prospecting';
END $$;
