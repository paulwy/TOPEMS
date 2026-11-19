-- 回滚：20261119190000_finance_u8_import_records_create.sql
-- 空壳表整表对齐（8/8）· finance.finance_u8_import_records 建表
--
-- 规则：空表才 DROP；已有数据则保留并 RAISE NOTICE。
--   「建表」的回滚天然是 DROP TABLE，但该表会累积导入记录；有数据时静默销毁不可接受，
--   由人工确认后再处置。
-- destructive-gate: 允许（本文件为回滚脚本，不在前向链执行）

DO $$
DECLARE
    n bigint;
BEGIN
    IF to_regclass('finance.finance_u8_import_records') IS NULL THEN
        RAISE NOTICE '回滚跳过：finance.finance_u8_import_records 不存在';
        RETURN;
    END IF;

    EXECUTE 'SELECT count(*) FROM finance.finance_u8_import_records' INTO n;
    IF n = 0 THEN
        DROP TABLE finance.finance_u8_import_records;
    ELSE
        RAISE NOTICE '保留表 finance.finance_u8_import_records：存在 % 行导入记录，需人工确认后处置', n;
    END IF;
END $$;
