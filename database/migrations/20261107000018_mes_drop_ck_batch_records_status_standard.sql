-- ============================================================
-- P10：删除 mes.batch_records 上误用的模板约束 ck_batch_records_status_standard
-- 版本：20261107000018
-- ============================================================
-- 事实（2026-11-06 实测）：
--   * 约束定义：CHECK (status IS NULL OR status = ANY('{active,inactive,archived}'))
--   * 三处环境：本地/test 存在该约束（mes.batch_records 0 行）；prod 无该约束（0 行）
--   * 表定义 database/migrations/20260926120000_app_schema_tables.sql 创建
--     mes.batch_records 时并未声明任何 status CHECK
--
-- 为什么是“删除误用模板”，不是“扩约束补值”：
--   * 来源 database/migrations/20260809000002_add_status_check_constraints.sql
--     是全库模板，仅当“现有数据都在 active/inactive/archived 内”才加约束；
--     mes.batch_records 当时 0 行 → 空集会通过，属于模板误加。
--   * 该表的业务状态机为 in_stock → partially_used → exhausted
--     （svc/mes/tests/integration_tests.rs:1594-1618 的创建/领用/耗尽生命周期）。
--   * 既有处置先例：20261103000002 与 20261104110000 明确认定这类模板约束是
--     “误用”，处置方式为 DROP；本约束不在 20261103000002 的 327 表清单内，属遗留。
--   * 三处环境数据量均为 0，删除无数据风险。
--
-- 幂等：表/约束不存在时仅 NOTICE，不报错；重复执行 = 0 次操作。
-- ============================================================

SET lock_timeout = '5s';

DO $$
BEGIN
  IF to_regclass('mes.batch_records') IS NULL THEN
    RAISE NOTICE 'P10：mes.batch_records 不存在，跳过';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'mes.batch_records'::regclass
      AND conname = 'ck_batch_records_status_standard'
  ) THEN
    ALTER TABLE mes.batch_records DROP CONSTRAINT ck_batch_records_status_standard;
    RAISE NOTICE 'P10：已删除误用模板约束 ck_batch_records_status_standard';
  ELSE
    RAISE NOTICE 'P10：ck_batch_records_status_standard 不存在（已清理）';
  END IF;
END $$;
