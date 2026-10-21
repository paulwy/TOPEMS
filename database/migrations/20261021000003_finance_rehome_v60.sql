-- 线C1 补: finance_v60_* 8 张表归位（v5 模式未覆盖 v6，补充归位）
-- 背景: 20261021000002 的 LIKE 模式 'finance\_v5%' 未匹配 finance_v60_*，本迁移补齐。
-- 幂等: 逐表 public 有且 finance 无同名才搬。

BEGIN;

DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename LIKE 'finance\_v6%'
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'finance' AND tablename = t
        ) THEN
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA finance', t);
        END IF;
    END LOOP;
END $$;

COMMIT;
