-- ============================================================
-- pm 服务 SQL 列漂移修复（A 片）
-- 覆盖表：budgets / notifications / pm_tasks / project_approvals
--         project_benefits / project_milestones / project_phases
-- 全部幂等（ADD COLUMN IF NOT EXISTS）
-- ============================================================

-- A. pm.budgets: version 列（INSERT 硬编码 version=1，SELECT ORDER BY version DESC）
ALTER TABLE pm.budgets
    ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- B. pm.notifications: 补列 priority/metadata/due_date/updated_at
--    改名由代码适配：message→content、user_id→recipient（表已有此二列）
ALTER TABLE pm.notifications
    ADD COLUMN IF NOT EXISTS priority text,
    ADD COLUMN IF NOT EXISTS metadata jsonb,
    ADD COLUMN IF NOT EXISTS due_date date,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- C. pm.pm_tasks: title_en 列（5432 已有，5433 缺失，IF NOT EXISTS 幂等）
ALTER TABLE pm.pm_tasks
    ADD COLUMN IF NOT EXISTS title_en varchar(200);

-- D. pm.project_approvals: 补 approvals/created_by/current_step/total_steps
ALTER TABLE pm.project_approvals
    ADD COLUMN IF NOT EXISTS approvals jsonb,
    ADD COLUMN IF NOT EXISTS created_by uuid,
    ADD COLUMN IF NOT EXISTS current_step integer,
    ADD COLUMN IF NOT EXISTS total_steps integer;

-- E. pm.project_benefits: EVM 挣值管理模块已启用，补 17 列
--    类型由 Rust 结构体推导：f64→numeric，i32→integer，Option<String>→text，NaiveDate→date
ALTER TABLE pm.project_benefits
    ADD COLUMN IF NOT EXISTS period_type text,
    ADD COLUMN IF NOT EXISTS period_date date,
    ADD COLUMN IF NOT EXISTS planned_cost numeric,
    ADD COLUMN IF NOT EXISTS actual_cost numeric,
    ADD COLUMN IF NOT EXISTS planned_progress integer,
    ADD COLUMN IF NOT EXISTS actual_progress integer,
    ADD COLUMN IF NOT EXISTS planned_value numeric,
    ADD COLUMN IF NOT EXISTS earned_value numeric,
    ADD COLUMN IF NOT EXISTS actual_cost_eva numeric,
    ADD COLUMN IF NOT EXISTS cpi numeric,
    ADD COLUMN IF NOT EXISTS spi numeric,
    ADD COLUMN IF NOT EXISTS cv numeric,
    ADD COLUMN IF NOT EXISTS sv numeric,
    ADD COLUMN IF NOT EXISTS eac numeric,
    ADD COLUMN IF NOT EXISTS etc numeric,
    ADD COLUMN IF NOT EXISTS roi numeric,
    ADD COLUMN IF NOT EXISTS notes text;

-- F. pm.project_milestones: acceptance_criteria
ALTER TABLE pm.project_milestones
    ADD COLUMN IF NOT EXISTS acceptance_criteria text;

-- G. pm.project_phases: predecessor_ids（结构体 Option<Vec<Uuid>> → uuid[]）
ALTER TABLE pm.project_phases
    ADD COLUMN IF NOT EXISTS predecessor_ids uuid[];
