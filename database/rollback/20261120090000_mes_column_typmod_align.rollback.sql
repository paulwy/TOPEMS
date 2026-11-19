-- 回滚：20261120090000_mes_column_typmod_align.sql
--
-- 性质：本迁移只把 4 列的 typmod 从「无精度/非整数」对齐到权威定义，
--   不改数据语义（numeric 值按 scale 四舍五入；version 非数字回退 1）。
--
-- 回滚能力边界（如实声明）：
--   * 原 typmod 未在迁移中记录，无法精确还原「迁移前是 numeric 无精度还是
--     varchar(n)」。下方只回到「无约束 numeric / varchar」这一较宽松形态，
--     用于确需回退时保证可写；不建议长期保留（会重新引入 DRIFT-01）。
--   * 已按 numeric(12,2) 四舍五入的小数位不可逆，回退不会恢复被舍入的值。
--
-- 用途：仅在确认对齐导致业务不可接受时手工执行。

DO $$
BEGIN
  IF to_regclass('mes.production_orders') IS NOT NULL THEN
    ALTER TABLE mes.production_orders
      ALTER COLUMN completed_quantity TYPE numeric
      USING completed_quantity::numeric;
  END IF;

  IF to_regclass('mes.production_records') IS NOT NULL THEN
    ALTER TABLE mes.production_records
      ALTER COLUMN completed_quantity TYPE numeric
      USING completed_quantity::numeric;
  END IF;

  IF to_regclass('mes.process_flows') IS NOT NULL THEN
    ALTER TABLE mes.process_flows
      ALTER COLUMN version TYPE varchar
      USING version::text;
  END IF;

  IF to_regclass('mes.quality_standards') IS NOT NULL THEN
    ALTER TABLE mes.quality_standards
      ALTER COLUMN version TYPE varchar
      USING version::text;
  END IF;
END
$$;
