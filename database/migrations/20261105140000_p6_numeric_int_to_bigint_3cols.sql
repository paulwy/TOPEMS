-- ============================================================
-- P6: prod 数值族安全加宽（integer → bigint，3 列）
--
-- 依据（2026-11-05 逐列核查）：
--   - mes.production_orders.quantity / completed_quantity
--     prod integer vs test bigint；代码以 ::float8 读出（f64），类型加宽不影响解码。
--   - mobile.documents.file_size
--     prod integer vs test bigint；MobileDocument.file_size 为 i64，int4 解码存在契约缺口，
--     bigint 与代码契约一致（该列为文件字节数，无小数语义）。
-- 三表在 prod 均为 0 行；无索引/RLS 策略/视图/生成列引用这三列；仅 completed_quantity 有默认 0
-- （ALTER TYPE 时 PostgreSQL 自动重写默认表达式）。
-- 只加宽，不收窄；已为 bigint 时幂等跳过。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

DO $$
BEGIN
  IF to_regclass('mes.production_orders') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM pg_attribute
       WHERE attrelid = to_regclass('mes.production_orders')
         AND attname = 'quantity' AND attnum > 0 AND NOT attisdropped
         AND atttypid IN ('integer'::regtype, 'smallint'::regtype)
     ) THEN
    ALTER TABLE mes.production_orders ALTER COLUMN quantity TYPE bigint USING quantity::bigint;
  END IF;

  IF to_regclass('mes.production_orders') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM pg_attribute
       WHERE attrelid = to_regclass('mes.production_orders')
         AND attname = 'completed_quantity' AND attnum > 0 AND NOT attisdropped
         AND atttypid IN ('integer'::regtype, 'smallint'::regtype)
     ) THEN
    ALTER TABLE mes.production_orders ALTER COLUMN completed_quantity TYPE bigint USING completed_quantity::bigint;
  END IF;

  IF to_regclass('mobile.documents') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM pg_attribute
       WHERE attrelid = to_regclass('mobile.documents')
         AND attname = 'file_size' AND attnum > 0 AND NOT attisdropped
         AND atttypid IN ('integer'::regtype, 'smallint'::regtype)
     ) THEN
    ALTER TABLE mobile.documents ALTER COLUMN file_size TYPE bigint USING file_size::bigint;
  END IF;
END $$;

-- 终态校验：目标存在时类型必须为 bigint
DO $$
BEGIN
  IF to_regclass('mes.production_orders') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_attribute
      WHERE attrelid = to_regclass('mes.production_orders')
        AND attname IN ('quantity', 'completed_quantity') AND attnum > 0 AND NOT attisdropped
        AND format_type(atttypid, atttypmod) <> 'bigint'
    ) THEN
      RAISE EXCEPTION 'P6 ABORT: mes.production_orders quantity columns not bigint';
    END IF;
  END IF;

  IF to_regclass('mobile.documents') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_attribute
      WHERE attrelid = to_regclass('mobile.documents')
        AND attname = 'file_size' AND attnum > 0 AND NOT attisdropped
        AND format_type(atttypid, atttypmod) <> 'bigint'
    ) THEN
      RAISE EXCEPTION 'P6 ABORT: mobile.documents.file_size not bigint';
    END IF;
  END IF;
END $$;
