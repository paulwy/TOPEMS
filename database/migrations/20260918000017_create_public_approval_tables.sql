-- 旧库结构缺口补齐：public.approvals / approval_records 补建（2026-09-18）
-- 背景：svc/unified-core/src/modules/flow/instance.rs 的带用户过滤查询以无前缀
--       SQL 引用 approvals/approval_records（EXISTS 子查询）；5433 重建链已含
--       business_base_tables 骨架 + 20260917000005 补列（14/10 列完整），
--       而 5432 活跃库从未存在这两张表 → 查询报 relation does not exist。
-- 处理（幂等）：CREATE TABLE IF NOT EXISTS，结构与 5433 现状一致（无 PK/约束，
--       与重建路径表形态对齐）；5433 已有 → 无操作，5432 缺失 → 建表。
-- 仅查询引用（grep 确认无 INSERT/UPDATE/DELETE 写入路径）。

CREATE TABLE IF NOT EXISTS public.approvals (
    id uuid NOT NULL,
    workflow_instance_id uuid,
    status text,
    created_at timestamptz,
    deleted_at timestamptz,
    node_id uuid,
    task_name text,
    assignee_id uuid,
    approved_by uuid,
    approval_type text,
    comment text,
    approved_at timestamptz,
    timeout_at timestamptz,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.approval_records (
    id uuid NOT NULL,
    approval_id uuid,
    action text,
    actor_name text,
    comment text,
    previous_status text,
    new_status text,
    created_at timestamptz,
    actor_id uuid,
    tenant_id uuid
);
