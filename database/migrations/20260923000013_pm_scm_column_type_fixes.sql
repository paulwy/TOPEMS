-- 类型漂移修复（check_migration_column_types.py 扫描确认，真库为准）：
-- 1. pm.budgets: total_amount/allocated_amount/spent_amount NUMERIC → FLOAT8（代码 f64）
-- 2. pm.budgets: start_date/end_date DATE → TIMESTAMPTZ（代码 Option<DateTime<Utc>>）
-- 3. scm.purchase_items.amount NUMERIC → FLOAT8（代码 f64）
-- 4. scm.supplier_evaluations.total_score NUMERIC → FLOAT8（代码 f64）
-- 幂等：仅当列当前为错误类型时转换。
DO $$
DECLARE
    c record;
BEGIN
    FOR c IN
        SELECT table_schema AS sch, table_name AS tbl, column_name AS col
        FROM information_schema.columns
        WHERE (table_schema='pm' AND table_name='budgets'
               AND column_name IN ('total_amount','allocated_amount','spent_amount') AND data_type='numeric')
           OR (table_schema='scm' AND table_name='purchase_items'
               AND column_name='amount' AND data_type='numeric')
           OR (table_schema='scm' AND table_name='supplier_evaluations'
               AND column_name='total_score' AND data_type='numeric')
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE FLOAT8 USING %I::FLOAT8',
                       c.sch, c.tbl, c.col, c.col);
    END LOOP;

    FOR c IN
        SELECT table_schema AS sch, table_name AS tbl, column_name AS col
        FROM information_schema.columns
        WHERE table_schema='pm' AND table_name='budgets'
          AND column_name IN ('start_date','end_date') AND data_type='date'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I::TIMESTAMPTZ',
                       c.sch, c.tbl, c.col, c.col);
    END LOOP;
END $$;
