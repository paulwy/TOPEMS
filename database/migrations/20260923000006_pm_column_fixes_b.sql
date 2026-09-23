-- PM column fixes (B slice)
-- 对齐 pm.project_expenses / pm.project_resources / pm.quality_checks / pm.settlements
-- 代码 SQL 与真库列的漂移。
-- 改名优先（代码侧改用真库已存在列），补列次之（ADD COLUMN IF NOT EXISTS，全部可空），
-- 非核心路径删代码引用。

-- ============ pm.project_expenses ============
-- 代码改名：incurred_date -> expense_date, paid_date -> approved_date, approved_by -> approver
-- 代码删引用：category / subcategory / reported_date（表无独立列，类型信息由 expense_type 承载）
ALTER TABLE pm.project_expenses ADD COLUMN IF NOT EXISTS phase_id uuid;
ALTER TABLE pm.project_expenses ADD COLUMN IF NOT EXISTS budget_item_id uuid;
ALTER TABLE pm.project_expenses ADD COLUMN IF NOT EXISTS resource_id uuid;
ALTER TABLE pm.project_expenses ADD COLUMN IF NOT EXISTS expense_ref_id varchar;
ALTER TABLE pm.project_expenses ADD COLUMN IF NOT EXISTS approval_workflow_id uuid;
ALTER TABLE pm.project_expenses ADD COLUMN IF NOT EXISTS attachment_ids uuid[];

-- ============ pm.project_resources ============
-- 代码改名：actual_cost -> cost, actual_hours -> quantity, role -> resource_type, resource_id -> resource_name
ALTER TABLE pm.project_resources ADD COLUMN IF NOT EXISTS resource_service varchar;
ALTER TABLE pm.project_resources ADD COLUMN IF NOT EXISTS start_date timestamptz;
ALTER TABLE pm.project_resources ADD COLUMN IF NOT EXISTS end_date timestamptz;
ALTER TABLE pm.project_resources ADD COLUMN IF NOT EXISTS allocation_percent int;
ALTER TABLE pm.project_resources ADD COLUMN IF NOT EXISTS created_by varchar;

-- ============ pm.quality_checks ============
-- 代码改名：check_criteria -> issues, checked_by -> checker, created_by -> checker
-- 代码删引用：check_code（与 check_name 语义重叠，表仅有 check_name）
-- INSERT 补 NOT NULL：check_date=now, checker=created_by, result='pending'
ALTER TABLE pm.quality_checks ADD COLUMN IF NOT EXISTS phase_id uuid;
ALTER TABLE pm.quality_checks ADD COLUMN IF NOT EXISTS milestone_id uuid;
ALTER TABLE pm.quality_checks ADD COLUMN IF NOT EXISTS acceptance_standard text;
ALTER TABLE pm.quality_checks ADD COLUMN IF NOT EXISTS result_details jsonb;
ALTER TABLE pm.quality_checks ADD COLUMN IF NOT EXISTS nonconformities jsonb;
ALTER TABLE pm.quality_checks ADD COLUMN IF NOT EXISTS corrective_actions jsonb;
ALTER TABLE pm.quality_checks ADD COLUMN IF NOT EXISTS follow_up_date timestamptz;

-- ============ pm.settlements ============
-- 代码改名：settlement_code -> settlement_no, description -> remarks, actual_amount -> amount
-- INSERT 补 NOT NULL：settlement_date=now, amount=0, currency='CNY'
ALTER TABLE pm.settlements ADD COLUMN IF NOT EXISTS settlement_name varchar;
ALTER TABLE pm.settlements ADD COLUMN IF NOT EXISTS settlement_period_start timestamptz;
ALTER TABLE pm.settlements ADD COLUMN IF NOT EXISTS settlement_period_end timestamptz;
ALTER TABLE pm.settlements ADD COLUMN IF NOT EXISTS approved_at timestamptz;
