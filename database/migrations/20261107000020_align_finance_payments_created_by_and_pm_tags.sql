-- ============================================================
-- TEST-ONLY 对齐：db14/db17 把 finance.core_finance_payments.created_by
-- 改成了 uuid，但 prod 该列由 20261020000004 定为 VARCHAR(100) 文本（操作者用户名）。
-- 同时把 pm.projects.tags 从 text[] 对齐为 prod 的 jsonb。
--
-- 目的：让 test/local 库重新与 prod 契约一致，避免按 Uuid 解码的业务路径被
-- 错误的列类型击穿。prod 上这两条分支均为 no-op（守卫先判 data_type 再 ALTER）。
-- 禁止把本文件当作 prod 迁移方案：prod 已经正确，无需任何前向 DDL。
-- ============================================================

SET lock_timeout = '5s';

DO $$
DECLARE
    cur_type text;
BEGIN
    SELECT data_type INTO cur_type
    FROM information_schema.columns
    WHERE table_schema = 'finance'
      AND table_name = 'core_finance_payments'
      AND column_name = 'created_by';

    IF cur_type = 'uuid' THEN
        EXECUTE 'ALTER TABLE finance.core_finance_payments
                 ALTER COLUMN created_by TYPE character varying(100)
                 USING created_by::text';
        RAISE NOTICE 'finance.core_finance_payments.created_by: uuid -> varchar(100)';
    ELSIF cur_type = 'character varying' THEN
        RAISE NOTICE 'finance.core_finance_payments.created_by: 已是 varchar，跳过';
    ELSE
        RAISE EXCEPTION 'finance.core_finance_payments.created_by 意外类型: %', cur_type;
    END IF;
END $$;

DO $$
DECLARE
    cur_type text;
BEGIN
    SELECT data_type INTO cur_type
    FROM information_schema.columns
    WHERE table_schema = 'pm'
      AND table_name = 'projects'
      AND column_name = 'tags';

    IF cur_type = 'ARRAY' THEN
        -- 旧默认值 ''{}''::text[] 无法自动转为 jsonb，先摘除再按 prod 默认值恢复。
        EXECUTE 'ALTER TABLE pm.projects ALTER COLUMN tags DROP DEFAULT';
        EXECUTE 'ALTER TABLE pm.projects
                 ALTER COLUMN tags TYPE jsonb
                 USING to_jsonb(tags)';
        EXECUTE 'ALTER TABLE pm.projects ALTER COLUMN tags SET DEFAULT ''{}''::jsonb';
        RAISE NOTICE 'pm.projects.tags: text[] -> jsonb';
    ELSIF cur_type = 'jsonb' THEN
        RAISE NOTICE 'pm.projects.tags: 已是 jsonb，跳过';
    ELSE
        RAISE EXCEPTION 'pm.projects.tags 意外类型: %', cur_type;
    END IF;
END $$;
