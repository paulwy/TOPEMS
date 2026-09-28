-- =============================================================================
-- mes schema 类型对齐（幂等修复迁移）
-- =============================================================================
-- 背景（2026-09-28 全面测试发现）：
--   mes.production_orders / production_records 的 completed_quantity
--   在部分环境中仍为 integer，而迁移权威定义（app_schema_tables）为 numeric(12,2)；
--   mes.process_flows / quality_standards 的 version 在部分环境中仍为 varchar，
--   而迁移权威定义为 integer。
--   该漂移会导致 mes 集成测试（integration_tests.rs）失败，并污染 sqlx 离线缓存
--   （缓存类型与实际库不一致 → 反复出现编译/测试错误）。
-- 本迁移以幂等方式将 4 处列类型对齐到迁移权威定义，可安全重复执行：
--   仅当列类型与目标不一致时才 ALTER（DO 块 + information_schema 检查）。
-- 数据转换：
--   completed_quantity ::numeric        （integer/numeric/varchar 数字值均可无损转换）
--   version            CASE 正则保底     （数字字符串转 int；非数字回退 1，避免脏数据炸迁移）
-- =============================================================================

DO $$
BEGIN
  -- 1) production_orders.completed_quantity -> numeric(12,2)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'mes' AND table_name = 'production_orders'
      AND column_name = 'completed_quantity'
      AND data_type <> 'numeric'
  ) THEN
    ALTER TABLE mes.production_orders
      ALTER COLUMN completed_quantity TYPE numeric(12,2)
      USING completed_quantity::numeric;
  END IF;

  -- 2) production_records.completed_quantity -> numeric(12,2)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'mes' AND table_name = 'production_records'
      AND column_name = 'completed_quantity'
      AND data_type <> 'numeric'
  ) THEN
    ALTER TABLE mes.production_records
      ALTER COLUMN completed_quantity TYPE numeric(12,2)
      USING completed_quantity::numeric;
  END IF;

  -- 3) process_flows.version -> integer（数字字符串转 int，非数字回退 1）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'mes' AND table_name = 'process_flows'
      AND column_name = 'version'
      AND data_type <> 'integer'
  ) THEN
    ALTER TABLE mes.process_flows
      ALTER COLUMN version TYPE integer
      USING CASE WHEN version ~ '^[0-9]+$' THEN version::integer ELSE 1 END;
  END IF;

  -- 4) quality_standards.version -> integer
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'mes' AND table_name = 'quality_standards'
      AND column_name = 'version'
      AND data_type <> 'integer'
  ) THEN
    ALTER TABLE mes.quality_standards
      ALTER COLUMN version TYPE integer
      USING CASE WHEN version ~ '^[0-9]+$' THEN version::integer ELSE 1 END;
  END IF;
END $$;
