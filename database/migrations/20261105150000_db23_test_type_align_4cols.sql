-- ============================================================
-- DB-23: test 侧类型收敛（4 列，向代码契约对齐）
--
-- 仅 test 执行；禁止在 prod 运行。
--
-- 判定依据（2026-11-05 逐列核查，代码契约为准）：
--
-- 1) mes.process_flow_steps.wait_time  numeric → double precision
--    代码 FlowsStep 字段为 Option<f64>（process_flow.rs），查列类型契约脚本
--    check_migration_column_types.py：f64 ⇒ FLOAT8/DOUBLE PRECISION；
--    迁移 20260923000014_mes_column_type_fixes.sql 明文“代码契约为准”目标 FLOAT8。
--
-- 2) mes.process_flow_steps.transfer_time  numeric → text
--    代码字段 Option<String>，同迁移约定目标 TEXT；
--    语义为文本型转运时间，不是数值度量。
--
-- 3) crm.rfm_results.recency_days  double precision → integer
-- 4) crm.rfm_results.frequency     double precision → integer
--    代码 RfmRecord/RfmResultRow 为 i32，聚合 SQL 显式 ::float8 后再 as i32；
--    迁移 20261029200000_schema_defense_type_align.sql 明文目标 INTEGER
--    （ROUND(recency_days)::integer / ROUND(frequency)::integer）。
--
-- 安全性（收窄前置校验）：
--   - process_flow_steps 在 test 为 0 行，无数据风险；
--   - rfm_results test 37 行：recency_days 全 9999（整数）、frequency 全 0（整数），
--     无 NaN/±Infinity、无小数、在 int4 范围 [-2147483648, 2147483647] 内；
--     守卫仍逐列复算，若出现非整数/越界/非有限值则 NOTICE 跳过并保持原类型。
--
-- 幂等：当前类型已为目标类型时跳过；表/列不存在时 NOTICE 跳过。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

-- 1) mes.process_flow_steps.wait_time: numeric -> double precision
DO $$
DECLARE
    cur text;
BEGIN
    IF to_regclass('mes.process_flow_steps') IS NULL THEN
        RAISE NOTICE 'SKIP wait_time: table mes.process_flow_steps missing';
        RETURN;
    END IF;

    SELECT format_type(a.atttypid, a.atttypmod) INTO cur
    FROM pg_attribute a
    WHERE a.attrelid = to_regclass('mes.process_flow_steps')
      AND a.attname = 'wait_time' AND NOT a.attisdropped AND a.attnum > 0;

    IF cur IS NULL THEN
        RAISE NOTICE 'SKIP wait_time: column missing';
        RETURN;
    ELSIF cur = 'double precision' THEN
        RAISE NOTICE 'NOOP wait_time: already double precision';
        RETURN;
    ELSIF cur = 'numeric' THEN
        ALTER TABLE mes.process_flow_steps
            ALTER COLUMN wait_time TYPE double precision
            USING wait_time::double precision;
        RAISE NOTICE 'ALTERED wait_time: numeric -> double precision';
    ELSE
        RAISE NOTICE 'SKIP wait_time: unexpected current type %', cur;
    END IF;
END $$;

-- 2) mes.process_flow_steps.transfer_time: numeric -> text
DO $$
DECLARE
    cur text;
BEGIN
    IF to_regclass('mes.process_flow_steps') IS NULL THEN
        RAISE NOTICE 'SKIP transfer_time: table mes.process_flow_steps missing';
        RETURN;
    END IF;

    SELECT format_type(a.atttypid, a.atttypmod) INTO cur
    FROM pg_attribute a
    WHERE a.attrelid = to_regclass('mes.process_flow_steps')
      AND a.attname = 'transfer_time' AND NOT a.attisdropped AND a.attnum > 0;

    IF cur IS NULL THEN
        RAISE NOTICE 'SKIP transfer_time: column missing';
        RETURN;
    ELSIF cur = 'text' THEN
        RAISE NOTICE 'NOOP transfer_time: already text';
        RETURN;
    ELSIF cur = 'numeric' THEN
        ALTER TABLE mes.process_flow_steps
            ALTER COLUMN transfer_time TYPE text
            USING transfer_time::text;
        RAISE NOTICE 'ALTERED transfer_time: numeric -> text';
    ELSE
        RAISE NOTICE 'SKIP transfer_time: unexpected current type %', cur;
    END IF;
END $$;

-- 3) crm.rfm_results.recency_days: double precision -> integer（含值域守卫）
DO $$
DECLARE
    cur    text;
    bad    bigint;
    vmin   double precision;
    vmax   double precision;
BEGIN
    IF to_regclass('crm.rfm_results') IS NULL THEN
        RAISE NOTICE 'SKIP recency_days: table crm.rfm_results missing';
        RETURN;
    END IF;

    SELECT format_type(a.atttypid, a.atttypmod) INTO cur
    FROM pg_attribute a
    WHERE a.attrelid = to_regclass('crm.rfm_results')
      AND a.attname = 'recency_days' AND NOT a.attisdropped AND a.attnum > 0;

    IF cur IS NULL THEN
        RAISE NOTICE 'SKIP recency_days: column missing';
        RETURN;
    ELSIF cur = 'integer' THEN
        RAISE NOTICE 'NOOP recency_days: already integer';
        RETURN;
    ELSIF cur IN ('double precision', 'real') THEN
        SELECT count(*) INTO bad
        FROM crm.rfm_results
        WHERE recency_days IS NOT NULL
          AND (recency_days <> trunc(recency_days)          -- 小数 / NaN
               OR recency_days > 2147483647                 -- 上溢 / +Infinity / NaN
               OR recency_days < -2147483648);              -- 下溢 / -Infinity

        SELECT min(recency_days), max(recency_days) INTO vmin, vmax
        FROM crm.rfm_results WHERE recency_days IS NOT NULL;

        IF bad > 0 THEN
            RAISE NOTICE 'SKIP recency_days: % non-integral/out-of-range rows (min=%, max=%)',
                         bad, vmin, vmax;
            RETURN;
        END IF;

        ALTER TABLE crm.rfm_results
            ALTER COLUMN recency_days TYPE integer
            USING ROUND(recency_days)::integer;
        RAISE NOTICE 'ALTERED recency_days: % -> integer (range %..%)', cur, vmin, vmax;
    ELSE
        RAISE NOTICE 'SKIP recency_days: unexpected current type %', cur;
    END IF;
END $$;

-- 4) crm.rfm_results.frequency: double precision -> integer（含值域守卫）
DO $$
DECLARE
    cur    text;
    bad    bigint;
    vmin   double precision;
    vmax   double precision;
BEGIN
    IF to_regclass('crm.rfm_results') IS NULL THEN
        RAISE NOTICE 'SKIP frequency: table crm.rfm_results missing';
        RETURN;
    END IF;

    SELECT format_type(a.atttypid, a.atttypmod) INTO cur
    FROM pg_attribute a
    WHERE a.attrelid = to_regclass('crm.rfm_results')
      AND a.attname = 'frequency' AND NOT a.attisdropped AND a.attnum > 0;

    IF cur IS NULL THEN
        RAISE NOTICE 'SKIP frequency: column missing';
        RETURN;
    ELSIF cur = 'integer' THEN
        RAISE NOTICE 'NOOP frequency: already integer';
        RETURN;
    ELSIF cur IN ('double precision', 'real') THEN
        SELECT count(*) INTO bad
        FROM crm.rfm_results
        WHERE frequency IS NOT NULL
          AND (frequency <> trunc(frequency)
               OR frequency > 2147483647
               OR frequency < -2147483648);

        SELECT min(frequency), max(frequency) INTO vmin, vmax
        FROM crm.rfm_results WHERE frequency IS NOT NULL;

        IF bad > 0 THEN
            RAISE NOTICE 'SKIP frequency: % non-integral/out-of-range rows (min=%, max=%)',
                         bad, vmin, vmax;
            RETURN;
        END IF;

        ALTER TABLE crm.rfm_results
            ALTER COLUMN frequency TYPE integer
            USING ROUND(frequency)::integer;
        RAISE NOTICE 'ALTERED frequency: % -> integer (range %..%)', cur, vmin, vmax;
    ELSE
        RAISE NOTICE 'SKIP frequency: unexpected current type %', cur;
    END IF;
END $$;

-- 终态复核：仅提示，不阻断（跳过场景需人工列入待办）
DO $$
DECLARE
    bad text;
BEGIN
    SELECT string_agg(x, ', ') INTO bad FROM (
        SELECT 'wait_time=' || format_type(a.atttypid, a.atttypmod) AS x
        FROM pg_attribute a
        WHERE a.attrelid = to_regclass('mes.process_flow_steps')
          AND a.attname = 'wait_time' AND NOT a.attisdropped
          AND format_type(a.atttypid, a.atttypmod) <> 'double precision'
        UNION ALL
        SELECT 'transfer_time=' || format_type(a.atttypid, a.atttypmod)
        FROM pg_attribute a
        WHERE a.attrelid = to_regclass('mes.process_flow_steps')
          AND a.attname = 'transfer_time' AND NOT a.attisdropped
          AND format_type(a.atttypid, a.atttypmod) <> 'text'
        UNION ALL
        SELECT 'recency_days=' || format_type(a.atttypid, a.atttypmod)
        FROM pg_attribute a
        WHERE a.attrelid = to_regclass('crm.rfm_results')
          AND a.attname = 'recency_days' AND NOT a.attisdropped
          AND format_type(a.atttypid, a.atttypmod) <> 'integer'
        UNION ALL
        SELECT 'frequency=' || format_type(a.atttypid, a.atttypmod)
        FROM pg_attribute a
        WHERE a.attrelid = to_regclass('crm.rfm_results')
          AND a.attname = 'frequency' AND NOT a.attisdropped
          AND format_type(a.atttypid, a.atttypmod) <> 'integer'
    ) s;

    IF bad IS NULL THEN
        RAISE NOTICE 'VERIFY OK: 4 columns match target types';
    ELSE
        RAISE WARNING 'VERIFY MISMATCH: %', bad;
    END IF;
END $$;
