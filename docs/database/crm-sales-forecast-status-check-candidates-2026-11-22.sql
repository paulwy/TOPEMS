-- B131 · crm.sales_forecasts.status 状态收敛候选 DDL
-- 值集来源：svc/crm/src/modules/sales_forecast_status.rs（SalesForecastStatus）
-- draft：手工创建；generated：系统自动生成；archived：归档终态。
-- 本地：0 行，status NOT NULL DEFAULT 'draft'，无 CHECK。
-- 生产快照：0 行，status nullable、默认 'draft'、无 CHECK。

UPDATE crm.sales_forecasts SET status = 'draft' WHERE status IS NULL;
ALTER TABLE crm.sales_forecasts ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE crm.sales_forecasts ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'crm.sales_forecasts'::regclass
      AND conname = 'ck_sales_forecasts_status_standard'
  ) THEN
    ALTER TABLE crm.sales_forecasts
      ADD CONSTRAINT ck_sales_forecasts_status_standard
      CHECK (status = ANY (ARRAY['draft','generated','archived']))
      NOT VALID;
  END IF;
END $$;

-- 窗口内验证：
-- ALTER TABLE crm.sales_forecasts VALIDATE CONSTRAINT ck_sales_forecasts_status_standard;
-- 回滚：
-- ALTER TABLE crm.sales_forecasts DROP CONSTRAINT IF EXISTS ck_sales_forecasts_status_standard;
-- ALTER TABLE crm.sales_forecasts ALTER COLUMN status DROP NOT NULL;
-- ALTER TABLE crm.sales_forecasts ALTER COLUMN status DROP DEFAULT;
