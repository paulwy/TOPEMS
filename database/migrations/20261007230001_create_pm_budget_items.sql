-- =============================================================================
-- 20261007230001_create_pm_budget_items.sql
-- =============================================================================
-- 修复 BE-01（审计 P1）：pm 统计模块对不存在的 pm_budget_items 执行聚合查询。
-- 证据：svc/pm/src/modules/statistics.rs:909
--   only_own_schema_query!("pm",
--     "SELECT COALESCE(category, 'uncategorized'),
--             SUM(budget_amount), SUM(spent_amount)
--      FROM pm_budget_items GROUP BY category")
--
-- 决策：(a) 必需 —— 补建表。
--   该查询在项目预算统计视图按 category 汇总预算/支出，属活跃只读路径。
--   运行期 search_path = "pm, public"（svc/pm/src/main.rs），
--   非限定表名 pm_budget_items 解析到 pm schema。
--
-- 列对齐 SELECT：仅需要 category / budget_amount / spent_amount。
--   另补 id/tenant_id/created_at/updated_at 作为常规审计与租户隔离骨架；
--   预算/支出用 NUMERIC(18,2) 与 PM 域金额口径一致。
-- 幂等：CREATE TABLE IF NOT EXISTS + RLS 策略幂等守卫。
-- =============================================================================

CREATE TABLE IF NOT EXISTS pm.pm_budget_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID,
    category      TEXT,
    budget_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    spent_amount  NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pm.pm_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.pm_budget_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON pm.pm_budget_items;
CREATE POLICY tenant_isolation ON pm.pm_budget_items
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
