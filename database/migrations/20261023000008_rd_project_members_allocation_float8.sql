-- rd.project_members.allocation 列类型对齐：NUMERIC(5,2) → FLOAT8（P1-7）
-- 背景：ProjectMember.allocation 为 f64（sqlx 映射 FLOAT8），而建表迁移 20261007000009:3057
--       把该列建成 numeric(5,2)，query_as 运行时直解 f64↔numeric 会解码 mismatched。
-- 协调：与 20261023000007（hourly_rate/cost_rate/budgeted_hours/actual_hours 4 列 NUMERIC→FLOAT8）
--       同表同法治理；allocation 为 0-1 占比，模型 f32 已扩为 f64（API JSON number 契约不变）。
-- 先例：20261023000007_rd_project_members_rate_float8.sql /
--       20260923000009_fixed_assets_numeric_to_float8.sql。
-- 幂等：仅当列当前 data_type='numeric' 时才 ALTER；已转 FLOAT8 后重放为 no-op。
DO $$
DECLARE
    c record;
BEGIN
    FOR c IN
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'rs' AND table_name = 'project_members'
          AND data_type = 'numeric'
          AND column_name = 'allocation'
    LOOP
        EXECUTE format(
            'ALTER TABLE rs.project_members ALTER COLUMN %I TYPE FLOAT8 USING %I::FLOAT8',
            c.column_name, c.column_name
        );
    END LOOP;
END $$;
