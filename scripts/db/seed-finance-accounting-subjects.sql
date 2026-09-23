-- 会计科目字典种子数据（finance.accounting_subjects）
-- 与 finance.core_finance_accounts 的现有 5 个科目保持一致
-- 用途：凭证录入页科目下拉（GET /api/finance/accounting-subjects）依赖本表；
--       此前该表为空导致下拉"没有可用选项"。
-- 执行方式（双库）：
--   psql -h localhost -p 5432 -U topems_app -d topems -f scripts/db/seed-finance-accounting-subjects.sql
--   psql -h localhost -p 5433 -U topems_app -d topems -f scripts/db/seed-finance-accounting-subjects.sql
-- 幂等：先清空默认租户的旧数据再插入。

BEGIN;

DELETE FROM finance.accounting_subjects
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

INSERT INTO finance.accounting_subjects
  (organization_id, code, name, category, level, parent_code, description, is_cash_flow, status, tenant_id)
VALUES
  ('00000000-0000-4000-8000-000000000001', '1001', '库存现金',     'asset',     1, NULL, NULL, false, 'active', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-4000-8000-000000000001', '2001', '短期借款',     'liability', 1, NULL, NULL, false, 'active', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-4000-8000-000000000001', '3101', '本年利润',     'equity',    1, NULL, NULL, false, 'active', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-4000-8000-000000000001', '6001', '主营业务收入', 'income',    1, NULL, NULL, false, 'active', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-4000-8000-000000000001', '6401', '主营业务成本', 'expense',   1, NULL, NULL, false, 'active', '00000000-0000-0000-0000-000000000001');

COMMIT;
