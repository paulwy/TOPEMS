-- =============================================================================
-- mes 列精度（typmod）对齐兜底（2026-11-20）
-- =============================================================================
-- 背景：
--   `20260928120000_mes_schema_type_align.sql` 的对齐判据是
--   information_schema.columns.data_type <> 'numeric'。
--   PostgreSQL 中 `numeric`（无精度）与 `numeric(12,2)` 的 data_type 同为
--   'numeric'，因此当列被建成无 typmod 的 numeric 时，该迁移判定为「已对齐」
--   并跳过 ALTER —— 这正是 DRIFT-01「本地为 numeric、契约要求 numeric(12,2)」
--   无法被自动修复的根因。
--
-- 本迁移不改历史迁移（已应用迁移文本不可变），只做前向兜底：
--   以 format_type 的完整输出（含 typmod）为判据，与权威定义不一致才 ALTER。
--
-- 覆盖 4 列（与 20260928120000 相同范围）：
--   mes.production_orders.completed_quantity  -> numeric(12,2)
--   mes.production_records.completed_quantity -> numeric(12,2)
--   mes.process_flows.version                 -> integer
--   mes.quality_standards.version             -> integer
--
-- 幂等：列已对齐时不执行任何 ALTER；表/列不存在时跳过（历史库局部缺表）。
-- 数据转换：numeric 无 typmod -> numeric(12,2) 按 scale 四舍五入；
--   version 非数字字符串回退 1（沿用 20260928120000 的既有口径）。
-- 文件内无 BEGIN/COMMIT：由外层 --single-transaction 统一提交。
-- =============================================================================

DO $$
DECLARE
  r record;
  v_actual text;
BEGIN
  FOR r IN
    SELECT *
    FROM (VALUES
      ('mes.production_orders',  'completed_quantity', 'numeric', 'numeric(12,2)'),
      ('mes.production_records', 'completed_quantity', 'numeric', 'numeric(12,2)'),
      ('mes.process_flows',      'version',            'integer', 'integer'),
      ('mes.quality_standards',  'version',            'integer', 'integer')
    ) AS t(rel, col, kind, target)
  LOOP
    -- to_regclass 对不存在的表返回 NULL（不抛错），配合 attnum/attisdropped 过滤
    v_actual := (
      SELECT format_type(a.atttypid, a.atttypmod)
      FROM pg_attribute a
      WHERE a.attrelid = to_regclass(r.rel)
        AND a.attname = r.col
        AND a.attnum > 0
        AND NOT a.attisdropped
    );

    IF v_actual IS NOT NULL AND v_actual <> r.target THEN
      IF r.kind = 'numeric' THEN
        EXECUTE format(
          'ALTER TABLE %s ALTER COLUMN %I TYPE %s USING %I::%s',
          r.rel, r.col, r.target, r.col, r.target
        );
      ELSE
        EXECUTE format(
          'ALTER TABLE %s ALTER COLUMN %I TYPE %s USING CASE WHEN %I::text ~ ''^[0-9]+$'' THEN %I::text::integer ELSE 1 END',
          r.rel, r.col, r.target, r.col, r.col
        );
      END IF;
    END IF;
  END LOOP;
END
$$;
