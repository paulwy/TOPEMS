-- P1-10 财务主数据：币种主表（public.core_finance_currencies，与现有 core_finance_* 表同 schema）
-- 幂等：CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS，可安全重放
CREATE TABLE IF NOT EXISTS "public"."core_finance_currencies" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE "public"."core_finance_currencies" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE "public"."core_finance_currencies" ADD COLUMN IF NOT EXISTS "code" VARCHAR(10) NOT NULL;
ALTER TABLE "public"."core_finance_currencies" ADD COLUMN IF NOT EXISTS "name" VARCHAR(100) NOT NULL;
ALTER TABLE "public"."core_finance_currencies" ADD COLUMN IF NOT EXISTS "symbol" VARCHAR(10);
ALTER TABLE "public"."core_finance_currencies" ADD COLUMN IF NOT EXISTS "exchange_rate" NUMERIC(18, 8) NOT NULL DEFAULT 1;
ALTER TABLE "public"."core_finance_currencies" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "public"."core_finance_currencies" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."core_finance_currencies" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 唯一约束（幂等）：(tenant_id, code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uk_core_finance_currencies_tenant_code'
  ) THEN
    ALTER TABLE "public"."core_finance_currencies" ADD CONSTRAINT "uk_core_finance_currencies_tenant_code" UNIQUE (tenant_id, code);
  END IF;
END $$;

-- 常用币种种子（default org 与 null tenant 各播一份，开箱即用）
INSERT INTO "public"."core_finance_currencies" (tenant_id, code, name, symbol, exchange_rate, is_active)
SELECT NULL, c.code, c.name, c.symbol, c.rate, true
FROM (VALUES
  ('CNY', '人民币', '¥', 1.00000000),
  ('USD', '美元', '$', 7.10000000),
  ('EUR', '欧元', '€', 7.80000000),
  ('JPY', '日元', '¥', 0.04700000),
  ('HKD', '港币', 'HK$', 0.91000000),
  ('GBP', '英镑', '£', 9.30000000),
  ('AUD', '澳元', 'A$', 4.70000000),
  ('SGD', '新加坡元', 'S$', 5.30000000)
) AS c(code, name, symbol, rate)
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."core_finance_currencies" WHERE tenant_id IS NULL AND code = c.code
);

INSERT INTO "public"."core_finance_currencies" (tenant_id, code, name, symbol, exchange_rate, is_active)
SELECT '00000000-0000-0000-0000-000000000001', c.code, c.name, c.symbol, c.rate, true
FROM (VALUES
  ('CNY', '人民币', '¥', 1.00000000),
  ('USD', '美元', '$', 7.10000000),
  ('EUR', '欧元', '€', 7.80000000),
  ('JPY', '日元', '¥', 0.04700000),
  ('HKD', '港币', 'HK$', 0.91000000),
  ('GBP', '英镑', '£', 9.30000000),
  ('AUD', '澳元', 'A$', 4.70000000),
  ('SGD', '新加坡元', 'S$', 5.30000000)
) AS c(code, name, symbol, rate)
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."core_finance_currencies" WHERE tenant_id = '00000000-0000-0000-0000-000000000001' AND code = c.code
);
