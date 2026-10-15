-- 修复迁移链时序缺陷：20260918000016 删除 flow 侧 4 张骨架影子表后，
-- 20261006000000（flow_schema_rls_guard_fix）引用 flow.core_workflow_tasks / instances /
-- approvals / approval_records 执行 DROP POLICY IF EXISTS 与 ADD COLUMN，
-- 空库重建链在 20261006000000 必然失败（relation does not exist）。
-- 依据：20261007140000（align_stub_tables_handler_contract）仍在给 flow.core_workflow_tasks
-- 补列，证明最终设计为 flow 版权威；09-18 的"收敛 public 单份"仅为其时中间态。
-- 本补丁重建与 09-18 删除前特征一致的骨架（无 FK、无运行时依赖，仅提供 DROP POLICY 目标表），
-- 后续 20261006000000 / 20261007140000 的 ADD COLUMN IF NOT EXISTS 将幂等补齐列。
-- 版本 20260919000000 位于 20260918000016 与 20261006000000 之间：已应用环境 IF NOT EXISTS 跳过零副作用。
CREATE TABLE IF NOT EXISTS flow.core_workflow_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID,
    node_id VARCHAR(64),
    assignee_id UUID,
    status VARCHAR(32) DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS flow.core_workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID,
    title VARCHAR(256),
    initiator_id UUID,
    status VARCHAR(32) DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS flow.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID,
    actor_id UUID,
    deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS flow.approval_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID,
    actor_id UUID,
    deleted_at TIMESTAMPTZ
);
