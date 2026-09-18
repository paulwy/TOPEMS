-- TOPEMS database migration 20260918000037
-- public/rs 旧表补列：mes 无前缀查询在 prepare/默认 search_path 下解析到 public（部分 schema 为 rs），
-- 旧表结构缺少 mes 模型列（order_number/process_name/equipment_code 等）。
-- DO 块动态判断表存在再 ALTER，幂等且双库安全（5433 无这些旧表时自动跳过）。

DO $$
DECLARE
    s text;
    t text;
    c text;
    typ text;
BEGIN
    FOREACH s IN ARRAY ARRAY['public', 'rs'] LOOP
        -- production_orders
        t := 'production_orders'; c := 'order_number'; typ := 'text';
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = s AND tablename = t) THEN
            EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS %I %s', s, t, c, typ);
        END IF;
        -- production_processes: process_code, process_name, work_station_id
        t := 'production_processes';
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = s AND tablename = t) THEN
            EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS process_code text', s, t);
            EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS process_name text', s, t);
            EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS work_station_id uuid', s, t);
        END IF;
        -- equipment: equipment_code, equipment_name
        t := 'equipment';
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = s AND tablename = t) THEN
            EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS equipment_code text', s, t);
            EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS equipment_name text', s, t);
        END IF;
        -- production_records: completed_quantity
        t := 'production_records';
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = s AND tablename = t) THEN
            EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS completed_quantity double precision', s, t);
        END IF;
        -- work_stations: station_name
        t := 'work_stations';
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = s AND tablename = t) THEN
            EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS station_name text', s, t);
        END IF;
        -- process_routes: route_code, route_name（仅 public 存在）
        t := 'process_routes';
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = s AND tablename = t) THEN
            EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS route_code text', s, t);
            EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS route_name text', s, t);
        END IF;
        -- process_route_steps: estimated_time_minutes（仅 public 存在）
        t := 'process_route_steps';
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = s AND tablename = t) THEN
            EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS estimated_time_minutes double precision', s, t);
        END IF;
    END LOOP;
END $$;
