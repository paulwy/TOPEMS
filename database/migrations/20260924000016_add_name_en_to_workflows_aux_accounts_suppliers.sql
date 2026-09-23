-- 为三张已存在 name 列的表补 name_en（英文名称）列，用于 SQL 层 CASE WHEN 双语切换。
-- 幂等：列已存在则跳过。
-- 影响表：
--   flow.core_workflows            （工作流定义名）
--   finance.core_finance_aux_accounts（辅助核算账户名）
--   srm.suppliers                  （供应商名）
ALTER TABLE flow.core_workflows ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE finance.core_finance_aux_accounts ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE srm.suppliers ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
