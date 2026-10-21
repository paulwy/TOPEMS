-- 线C1: finance schema 归位 + 科目体系收敛基础
-- 背景: 代码写死 finance.* 引用，但 5432 库无 finance schema（59 张 finance 表滞留 public）→
--       科目类路由实测全部 500（relation "finance.core_finance_accounts" does not exist）。
-- 本迁移: 幂等建 finance schema；public 下 core_finance_*/finance_v5* 表全部归位；
--       core_finance_accounts 补 category 列（financial_reports 分类报表依赖）。
-- 依据: database/migrations/20260901000007_rehome_finance_tables.sql 设计意图（finance 表归位 finance schema）。

BEGIN;

-- 1. 幂等建 finance schema
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'finance') THEN
        CREATE SCHEMA finance;
    END IF;
END $$;

-- 2. public → finance 归位（逐表幂等：public 有且 finance 无同名才搬）
DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND (tablename LIKE 'core_finance\_%' OR tablename LIKE 'finance\_v5%')
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'finance' AND tablename = t
        ) THEN
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA finance', t);
        END IF;
    END LOOP;
END $$;

-- 3. core_finance_accounts 补 category 列（financial_reports 分类报表依赖，幂等）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'finance' AND tablename = 'core_finance_accounts') THEN
        EXECUTE 'ALTER TABLE finance.core_finance_accounts ADD COLUMN IF NOT EXISTS category VARCHAR(100)';
    END IF;
END $$;

COMMIT;
