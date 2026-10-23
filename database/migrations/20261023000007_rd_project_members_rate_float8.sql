-- rd.project_members 费率/工时列类型对齐：NUMERIC(10,2) → FLOAT8（P1-11）
-- 背景：ProjectMember 模型 hourly_rate/cost_rate/budgeted_hours/actual_hours 为 Option<f64>
--       （sqlx 映射 FLOAT8），而建表迁移 20261007000009:3061 把这 4 列建成 numeric(10,2)，
--       query_as 运行时直解 f64↔numeric 会解码 mismatched。
-- 先例：20260923000009_fixed_assets_numeric_to_float8.sql /
--       20260917000003_erp_purchase_orders_type_align.sql（金额 NUMERIC→FLOAT8 治理同法）。
-- 幂等：仅当列当前 data_type='numeric' 时才 ALTER；已转 FLOAT8 后重放为 no-op。
DO $$
DECLARE
    c record;
BEGIN
    FOR c IN
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'rs' AND table_name = 'project_members'
          AND data_type = 'numeric'
          AND column_name IN ('hourly_rate', 'cost_rate', 'budgeted_hours', 'actual_hours')
    LOOP
        EXECUTE format(
            'ALTER TABLE rs.project_members ALTER COLUMN %I TYPE FLOAT8 USING %I::FLOAT8',
            c.column_name, c.column_name
        );
    END LOOP;
END $$;
