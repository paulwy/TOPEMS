-- ============================================================
-- P7: prod 侧类型修复（4 列，向代码契约对齐，仅 prod 执行）
--
-- 判定依据（2026-11-05 逐列核查，“谁破损改谁”）：
--
-- 1) mes.production_records.completed_quantity  integer → numeric(12,2)
--    代码 production_record.rs 以 BigDecimal 解码（try_get::<Option<BigDecimal>> /
--    BigDecimal::from(result.quantity_produced)），.sqlx 缓存 5 条 query 的
--    quantity_produced 亦为 Numeric；prod int4 无法被 BigDecimal 解码
--    （列表路径 .ok() 静默成 0.0）。迁移 20260928120000_mes_schema_type_align.sql
--    明文权威定义 numeric(12,2)，且注明 integer→numeric 为无损转换。
--
-- 2) mes.process_flow_steps.standard_time  integer → double precision
-- 3) mes.process_flow_steps.wait_time      integer → double precision
--    代码字段 Option<f64>；迁移 20260923000014_mes_column_type_fixes.sql 明文
--    “代码契约为准”，目标 FLOAT8。prod int4 无法被 f64 解码
--    （query_as FlowStepRow 与 query! 缓存均按浮点契约）。
--
-- 4) mes.process_flow_steps.transfer_time  integer → text
--    代码字段 Option<String>，同迁移目标 TEXT；UPDATE 语句原先
--    NULLIF($6,'')::int4 与文本契约冲突，已同步移除该 cast（见代码改动）。
--
-- 数据安全：production_records / process_flow_steps 在 prod 均为 0 行；
-- 仅 completed_quantity 有 NOT NULL DEFAULT 0（ALTER TYPE 自动重广播型）。
-- 4 列均无索引、无生成列、无视图依赖；仅表级 RLS 策略依赖 tenant_id 列，不受影响。
--
-- 幂等：当前类型已为目标类型时跳过；表/列不存在时 NOTICE 跳过。
-- 仅加宽/放宽语义，不收窄。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

-- 1) mes.production_records.completed_quantity: integer -> numeric(12,2)
DO $$
DECLARE
    cur text;
BEGIN
    IF to_regclass('mes.production_records') IS NULL THEN
        RAISE NOTICE 'SKIP completed_quantity: table mes.production_records missing';
        RETURN;
    END IF;

    SELECT format_type(a.atttypid, a.atttypmod) INTO cur
    FROM pg_attribute a
    WHERE a.attrelid = to_regclass('mes.production_records')
      AND a.attname = 'completed_quantity' AND NOT a.attisdropped AND a.attnum > 0;

    IF cur IS NULL THEN
        RAISE NOTICE 'SKIP completed_quantity: column missing';
        RETURN;
    ELSIF cur = 'numeric(12,2)' THEN
        RAISE NOTICE 'NOOP completed_quantity: already numeric(12,2)';
        RETURN;
    ELSIF cur IN ('integer', 'smallint', 'bigint') THEN
        ALTER TABLE mes.production_records
            ALTER COLUMN completed_quantity TYPE numeric(12,2)
            USING completed_quantity::numeric(12,2);
        RAISE NOTICE 'ALTERED completed_quantity: % -> numeric(12,2)', cur;
    ELSE
        RAISE NOTICE 'SKIP completed_quantity: unexpected current type %', cur;
    END IF;
END $$;

-- 2) mes.process_flow_steps.standard_time: integer -> double precision
DO $$
DECLARE
    cur text;
BEGIN
    IF to_regclass('mes.process_flow_steps') IS NULL THEN
        RAISE NOTICE 'SKIP standard_time: table mes.process_flow_steps missing';
        RETURN;
    END IF;

    SELECT format_type(a.atttypid, a.atttypmod) INTO cur
    FROM pg_attribute a
    WHERE a.attrelid = to_regclass('mes.process_flow_steps')
      AND a.attname = 'standard_time' AND NOT a.attisdropped AND a.attnum > 0;

    IF cur IS NULL THEN
        RAISE NOTICE 'SKIP standard_time: column missing';
        RETURN;
    ELSIF cur = 'double precision' THEN
        RAISE NOTICE 'NOOP standard_time: already double precision';
        RETURN;
    ELSIF cur IN ('integer', 'smallint', 'bigint', 'real') THEN
        ALTER TABLE mes.process_flow_steps
            ALTER COLUMN standard_time TYPE double precision
            USING standard_time::double precision;
        RAISE NOTICE 'ALTERED standard_time: % -> double precision', cur;
    ELSE
        RAISE NOTICE 'SKIP standard_time: unexpected current type %', cur;
    END IF;
END $$;

-- 3) mes.process_flow_steps.wait_time: integer -> double precision
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
    ELSIF cur IN ('integer', 'smallint', 'bigint', 'real') THEN
        ALTER TABLE mes.process_flow_steps
            ALTER COLUMN wait_time TYPE double precision
            USING wait_time::double precision;
        RAISE NOTICE 'ALTERED wait_time: % -> double precision', cur;
    ELSE
        RAISE NOTICE 'SKIP wait_time: unexpected current type %', cur;
    END IF;
END $$;

-- 4) mes.process_flow_steps.transfer_time: integer -> text
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
    ELSIF cur IN ('integer', 'smallint', 'bigint', 'numeric', 'real', 'double precision') THEN
        ALTER TABLE mes.process_flow_steps
            ALTER COLUMN transfer_time TYPE text
            USING transfer_time::text;
        RAISE NOTICE 'ALTERED transfer_time: % -> text', cur;
    ELSE
        RAISE NOTICE 'SKIP transfer_time: unexpected current type %', cur;
    END IF;
END $$;

-- 终态复核：仅提示，不阻断（跳过场景需人工列入待办）
DO $$
DECLARE
    bad text;
BEGIN
    SELECT string_agg(x, ', ') INTO bad FROM (
        SELECT 'production_records.completed_quantity=' || format_type(a.atttypid, a.atttypmod) AS x
        FROM pg_attribute a
        WHERE a.attrelid = to_regclass('mes.production_records')
          AND a.attname = 'completed_quantity' AND NOT a.attisdropped
          AND format_type(a.atttypid, a.atttypmod) <> 'numeric(12,2)'
        UNION ALL
        SELECT 'process_flow_steps.standard_time=' || format_type(a.atttypid, a.atttypmod)
        FROM pg_attribute a
        WHERE a.attrelid = to_regclass('mes.process_flow_steps')
          AND a.attname = 'standard_time' AND NOT a.attisdropped
          AND format_type(a.atttypid, a.atttypmod) <> 'double precision'
        UNION ALL
        SELECT 'process_flow_steps.wait_time=' || format_type(a.atttypid, a.atttypmod)
        FROM pg_attribute a
        WHERE a.attrelid = to_regclass('mes.process_flow_steps')
          AND a.attname = 'wait_time' AND NOT a.attisdropped
          AND format_type(a.atttypid, a.atttypmod) <> 'double precision'
        UNION ALL
        SELECT 'process_flow_steps.transfer_time=' || format_type(a.atttypid, a.atttypmod)
        FROM pg_attribute a
        WHERE a.attrelid = to_regclass('mes.process_flow_steps')
          AND a.attname = 'transfer_time' AND NOT a.attisdropped
          AND format_type(a.atttypid, a.atttypmod) <> 'text'
    ) s;

    IF bad IS NULL THEN
        RAISE NOTICE 'VERIFY OK: 4 columns match target types';
    ELSE
        RAISE WARNING 'VERIFY MISMATCH: %', bad;
    END IF;
END $$;
