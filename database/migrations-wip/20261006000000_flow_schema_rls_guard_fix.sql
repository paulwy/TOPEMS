-- 修复 flow schema 无防护 RLS 策略导致的 uuid 空串错误
-- 根因：flow schema 多张表上存在历史残留的无防护策略（`*_tenant_policy`）：
--   USING 直接 `tenant_id = (current_setting('app.tenant_id'::text, true))::uuid`，
--   当 BFF 中间件把 app.tenant_id 置为空串 '' 时，''::uuid 报
--   `invalid input syntax for type uuid: ""`，导致这些表上所有 SELECT/UPDATE 500。
-- 同表均有有防护策略（rls_tenant_isolation / tenant_isolation_*，含 NULLIF('') 防护），
-- 故这些无防护策略为冗余，直接 DROP（幂等）。
DROP POLICY IF EXISTS core_workflow_tasks_tenant_policy ON flow.core_workflow_tasks;
DROP POLICY IF EXISTS core_workflow_instances_tenant_policy ON flow.core_workflow_instances;
DROP POLICY IF EXISTS approvals_tenant_policy ON flow.approvals;
DROP POLICY IF EXISTS approval_records_tenant_policy ON flow.approval_records;
DROP POLICY IF EXISTS notifications_tenant_policy ON flow.notifications;
DROP POLICY IF EXISTS workflows_tenant_policy ON flow.workflows;

-- 补充：flow.core_workflow_tasks 缺 updated_at 列（schema_defense 只补 public 副本，
-- BFF flow 池解析到 flow 副本），approve/reject/claim/unclaim 的 UPDATE 引用该列报错。
-- CREATE TABLE IF NOT EXISTS 不会为存量表补列，此处幂等补列。
ALTER TABLE flow.core_workflow_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

