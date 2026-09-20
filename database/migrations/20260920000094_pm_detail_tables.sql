-- 20260920000094: pm detail 冒烟修复——补 budget 列、建/补 project_reports、project_risks
-- 背景：GET 冒烟 pm/budgets/{id} 报 column "budget_code" does not exist；
--      pm/reports/{id} 报 relation "pm.project_reports" does not exist；
--      pm/risks/{id} 报 relation "pm.project_risks" does not exist。
-- 5432 缺表，5433 为空壳（仅 id+deleted_at），双库均缺 budget 新列。

-- 1) pm.project_reports（5432 建表 / 5433 已有空壳则跳过建表）
CREATE TABLE IF NOT EXISTS pm.project_reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deleted_at  TIMESTAMPTZ
);
ALTER TABLE pm.project_reports ADD COLUMN IF NOT EXISTS project_id    UUID;
ALTER TABLE pm.project_reports ADD COLUMN IF NOT EXISTS report_code   VARCHAR(64);
ALTER TABLE pm.project_reports ADD COLUMN IF NOT EXISTS report_name   VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE pm.project_reports ADD COLUMN IF NOT EXISTS report_type   VARCHAR(32)  NOT NULL DEFAULT 'summary';
ALTER TABLE pm.project_reports ADD COLUMN IF NOT EXISTS report_period VARCHAR(32);
ALTER TABLE pm.project_reports ADD COLUMN IF NOT EXISTS status        VARCHAR(32)  NOT NULL DEFAULT 'draft';
ALTER TABLE pm.project_reports ADD COLUMN IF NOT EXISTS generated_at  TIMESTAMPTZ;
ALTER TABLE pm.project_reports ADD COLUMN IF NOT EXISTS data          JSONB;
ALTER TABLE pm.project_reports ADD COLUMN IF NOT EXISTS summary       TEXT;
ALTER TABLE pm.project_reports ADD COLUMN IF NOT EXISTS created_by    VARCHAR(64);
ALTER TABLE pm.project_reports ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE pm.project_reports ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2) pm.project_risks（同上）
CREATE TABLE IF NOT EXISTS pm.project_risks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deleted_at  TIMESTAMPTZ
);
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS project_id         UUID;
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS risk_code          VARCHAR(64);
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS risk_name          VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS risk_description   TEXT;
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS risk_category      VARCHAR(64);
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS risk_subcategory   VARCHAR(64);
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS likelihood         VARCHAR(16);
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS impact             VARCHAR(16);
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS risk_score         INT  NOT NULL DEFAULT 0;
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS risk_level         VARCHAR(16);
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS status             VARCHAR(32) NOT NULL DEFAULT 'open';
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS mitigation_plan    TEXT;
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS owner              VARCHAR(64);
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS created_at         TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT now();

-- 3) pm.budgets 补列（代码 SELECT/INSERT 需要）
ALTER TABLE pm.budgets ADD COLUMN IF NOT EXISTS budget_code      VARCHAR(64)  NOT NULL DEFAULT '';
ALTER TABLE pm.budgets ADD COLUMN IF NOT EXISTS budget_name      VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE pm.budgets ADD COLUMN IF NOT EXISTS total_amount     NUMERIC(18,2) NOT NULL DEFAULT 0;
ALTER TABLE pm.budgets ADD COLUMN IF NOT EXISTS allocated_amount NUMERIC(18,2) NOT NULL DEFAULT 0;
ALTER TABLE pm.budgets ADD COLUMN IF NOT EXISTS spent_amount     NUMERIC(18,2) NOT NULL DEFAULT 0;
ALTER TABLE pm.budgets ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(18,2) NOT NULL DEFAULT 0;
ALTER TABLE pm.budgets ADD COLUMN IF NOT EXISTS status           VARCHAR(32)  NOT NULL DEFAULT 'draft';
ALTER TABLE pm.budgets ADD COLUMN IF NOT EXISTS start_date       DATE;
ALTER TABLE pm.budgets ADD COLUMN IF NOT EXISTS end_date         DATE;
ALTER TABLE pm.budgets ADD COLUMN IF NOT EXISTS description      TEXT;
ALTER TABLE pm.budgets ADD COLUMN IF NOT EXISTS created_by       VARCHAR(64);
