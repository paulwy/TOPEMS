-- ============================================================
-- DB-22: finance.core_finance_currencies 表固化（test 手工建表补迁移）
--
-- 背景：该表为 P1-10 财务主数据活表（svc/finance/src/modules/currencies.rs 明确使用），
--       prod/prepare/5433 均存在，但 test 缺失（迁移未固化），已按 5433 结构手工补建。
-- 本迁移将该表结构与币种基础数据固化为可重放迁移（幂等），保证空库重建不丢表。
-- 关键实测（2026-11-05）：5433 该表 16 行（8 币种 × 无 tenant + default tenant）。
-- ============================================================

SET lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS finance.core_finance_currencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    symbol character varying(10),
    exchange_rate numeric(18,8) DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'core_finance_currencies_pkey'
          AND conrelid = to_regclass('finance.core_finance_currencies')
    ) THEN
        ALTER TABLE finance.core_finance_currencies
            ADD CONSTRAINT core_finance_currencies_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uk_core_finance_currencies_tenant_code'
          AND conrelid = to_regclass('finance.core_finance_currencies')
    ) THEN
        ALTER TABLE finance.core_finance_currencies
            ADD CONSTRAINT uk_core_finance_currencies_tenant_code UNIQUE (tenant_id, code);
    END IF;
END $$;

-- 币种基础数据（幂等：主键/UQ 冲突则跳过）
INSERT INTO finance.core_finance_currencies (id, tenant_id, code, name, symbol, exchange_rate, is_active)
VALUES
    ('8438c5fb-8d3c-408d-b4a6-836e0838403e', NULL, 'CNY', '人民币',   '¥',   1.00000000, true),
    ('066c98e5-ff39-4e24-b98f-670cf4900dbe', NULL, 'USD', '美元',     '$',   7.10000000, true),
    ('85782643-8049-4863-b3bd-0dd562b9247e', NULL, 'EUR', '欧元',     '€',   7.80000000, true),
    ('8791c15c-f762-422d-8dc8-a56a40dff891', NULL, 'JPY', '日元',     '¥',   0.04700000, true),
    ('65a19ed2-b6ce-440d-86ff-a4d216c7865f', NULL, 'HKD', '港币',     'HK$', 0.91000000, true),
    ('85826354-bbd7-45df-9c71-36ad38bb6277', NULL, 'GBP', '英镑',     '£',   9.30000000, true),
    ('4b7be06e-d7e5-48d9-83c9-298149643de1', NULL, 'AUD', '澳元',     'A$',  4.70000000, true),
    ('129eae12-7736-496a-a5e5-d0c5a3b292c6', NULL, 'SGD', '新加坡元', 'S$',  5.30000000, true),
    ('fb54bead-cab7-47e7-b4b2-44077ebf2c0b', '00000000-0000-0000-0000-000000000001', 'CNY', '人民币',   '¥',   1.00000000, true),
    ('27844dba-bab9-46a0-ba28-f35ea4fb5ead', '00000000-0000-0000-0000-000000000001', 'USD', '美元',     '$',   7.10000000, true),
    ('901bc82c-47e6-4ec8-ba7e-c6be8495af30', '00000000-0000-0000-0000-000000000001', 'EUR', '欧元',     '€',   7.80000000, true),
    ('05afc86e-110d-4b27-9f84-07e5ccd9cba9', '00000000-0000-0000-0000-000000000001', 'JPY', '日元',     '¥',   0.04700000, true),
    ('58842990-bc0d-4bfe-9ebd-4849655f3777', '00000000-0000-0000-0000-000000000001', 'HKD', '港币',     'HK$', 0.91000000, true),
    ('62de095c-3ef6-4554-a512-2ee13d8a622a', '00000000-0000-0000-0000-000000000001', 'GBP', '英镑',     '£',   9.30000000, true),
    ('629ed5f4-c9f1-4b88-ba12-1a519b93abe5', '00000000-0000-0000-0000-000000000001', 'AUD', '澳元',     'A$',  4.70000000, true),
    ('c6883477-8894-4777-8126-a15a783c0f9b', '00000000-0000-0000-0000-000000000001', 'SGD', '新加坡元', 'S$',  5.30000000, true)
ON CONFLICT DO NOTHING;
