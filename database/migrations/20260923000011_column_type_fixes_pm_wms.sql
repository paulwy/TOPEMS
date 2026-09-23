-- 补列迁移类型修正（组织者迁移按错误规则 "f64→numeric" 建列，与代码契约不符）
-- 1. pm.project_benefits: EVM 金额列 numeric → FLOAT8（代码 f64）
-- 2. pm.notifications: due_date date → TIMESTAMPTZ（代码 DateTime<Utc>）
-- 3. wms.transfer_items: quantity numeric → FLOAT8（代码 f64）
-- 幂等：仅当目标列当前为错误类型时转换；均为空表或空值列，无数据迁移负担。
DO $$
DECLARE
    c record;
BEGIN
    -- 1. pm.project_benefits 金额列
    FOR c IN
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='pm' AND table_name='project_benefits'
          AND data_type='numeric'
          AND column_name IN ('planned_cost','actual_cost','planned_value','earned_value',
                              'actual_cost_eva','cpi','spi','cv','sv','eac','etc','roi')
    LOOP
        EXECUTE format('ALTER TABLE pm.project_benefits ALTER COLUMN %I TYPE FLOAT8 USING %I::FLOAT8', c.column_name, c.column_name);
    END LOOP;

    -- 2. pm.notifications.due_date
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='pm' AND table_name='notifications'
                 AND column_name='due_date' AND data_type='date') THEN
        ALTER TABLE pm.notifications ALTER COLUMN due_date TYPE TIMESTAMPTZ USING due_date::TIMESTAMPTZ;
    END IF;

    -- 3. wms.transfer_items.quantity
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='wms' AND table_name='transfer_items'
                 AND column_name='quantity' AND data_type='numeric') THEN
        ALTER TABLE wms.transfer_items ALTER COLUMN quantity TYPE FLOAT8 USING quantity::FLOAT8;
    END IF;
END $$;
