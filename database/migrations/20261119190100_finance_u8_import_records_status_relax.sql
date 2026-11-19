-- ================================================================================
-- finance.finance_u8_import_records：放宽 ck_finance_u8_import_records_status_standard 窄约束
-- 前置：20261119190000_finance_u8_import_records_create.sql（建表，CHECK 逐字取自 dev dump）
--
-- 根因：
--   P3-2（20260809000002）给带 status 列的表统一加了窄约束
--   ck_*_status_standard（仅允许 active/inactive/archived）。dev dump 原样保留了该窄约束，
--   但 U8 导入路径实际写入的生命周期状态是：
--     processing（导入中，INSERT，u8_import.rs:346）
--     completed （全部成功，u8_import.rs:128/329）
--     failed    （存在失败行，u8_import.rs:128）
--     rolled_back（回滚，u8_import.rs:281）
--   建表后该路径的失败码会从 42P01（undefined_table）变成 23514（check_violation），仍然写入失败。
--
-- 本迁移：DROP 窄约束 + ADD 放宽约束（保留通用三态，追加 U8 导入业务状态）。
-- 与 database/migrations-wip/20261006000001_scm_sync_records_status_relax.sql 同一处置模式。
-- 幂等：IF EXISTS 守卫；表不存在则跳过。不吞错。
-- ================================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='finance' AND table_name='finance_u8_import_records') THEN
        ALTER TABLE finance.finance_u8_import_records
            DROP CONSTRAINT IF EXISTS ck_finance_u8_import_records_status_standard;
        ALTER TABLE finance.finance_u8_import_records
            ADD CONSTRAINT ck_finance_u8_import_records_status_standard
            CHECK (status IS NULL OR status IN (
                'active','inactive','archived',
                'processing','completed','failed','rolled_back'
            ));
    ELSE
        RAISE EXCEPTION '前置断言失败：finance.finance_u8_import_records 不存在，需先应用 20261119190000';
    END IF;
END $$;
