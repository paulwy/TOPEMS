-- crm.customer_finance.risklevel 候选 CHECK（NOT VALID，未在生产执行）
SELECT 'crm.customer_finance', risklevel, count(*) FROM crm.customer_finance GROUP BY risklevel;

ALTER TABLE crm.customer_finance
  ADD CONSTRAINT crm_customer_finance_risklevel_check
  CHECK (risklevel IN ('low','medium','high','critical')) NOT VALID;

-- 回滚
-- ALTER TABLE crm.customer_finance DROP CONSTRAINT IF EXISTS crm_customer_finance_risklevel_check;
