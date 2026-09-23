-- mes 类型漂移修复（check_migration_column_types.py 扫描确认，代码契约为准）：
-- 1. mes.process_flows.capacity NUMERIC → FLOAT8（代码 Option<f64>）
-- 2. mes.process_flow_steps.standard_time NUMERIC → FLOAT8（代码 Option<f64>）
-- 3. mes.process_flow_steps.wait_time NUMERIC → FLOAT8（代码 Option<f64>）
-- 4. mes.process_flow_steps.transfer_time NUMERIC → TEXT（代码 Option<String>）
-- 注：public.process_flows / public.process_flow_steps 在 5432 不存在（历史残留，
--     代码 search_path=mes,public 实际用 mes schema），仅处理 mes schema。
-- 幂等：仅当列当前为错误类型时转换。
DO $$
DECLARE
    c record;
BEGIN
    FOR c IN
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='mes' AND table_name='process_flows'
          AND column_name='capacity' AND data_type='numeric'
    LOOP
        EXECUTE format('ALTER TABLE mes.process_flows ALTER COLUMN %I TYPE FLOAT8 USING %I::FLOAT8', c.column_name, c.column_name);
    END LOOP;

    FOR c IN
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='mes' AND table_name='process_flow_steps'
          AND data_type='numeric' AND column_name IN ('standard_time','wait_time')
    LOOP
        EXECUTE format('ALTER TABLE mes.process_flow_steps ALTER COLUMN %I TYPE FLOAT8 USING %I::FLOAT8', c.column_name, c.column_name);
    END LOOP;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='mes' AND table_name='process_flow_steps'
                 AND column_name='transfer_time' AND data_type='numeric') THEN
        ALTER TABLE mes.process_flow_steps ALTER COLUMN transfer_time TYPE TEXT USING transfer_time::TEXT;
    END IF;
END $$;
