-- =============================================================================
-- 20261007204301_create_qa_approval_events.sql
-- =============================================================================
-- 修复 DB-06（审计 P3）：将 QMS 运行期自动建表（CREATE TABLE IF NOT EXISTS
--   在 log_approval_event() 内）移入迁移链。
--
-- 证据：svc/qms/src/models/audit_log.rs:24（CREATE TABLE）+ :41（INSERT）。
--   12 处活跃调用路径：
--     quality_inspection.rs:630/824/901（3 处）
--     quality_issue.rs:687/764/841（3 处）
--     eight_d.rs:746/827/903（3 处）
--     apqp.rs:1426/1503/1575（3 处）
--   QMS search_path = qms, public → 非限定表名 qa_approval_events 解析到 qms schema。
--
-- 决策：(a) 业务必需 —— 补建表入链。
--   该表统一跟踪 4 类审批工作流（inspection/issue/eight_d/apqp）的状态流转，
--   属活跃写入路径；此前依赖运行期首次调用时自动建表，未入迁移链，
--   导致 5433 空库重放时表缺失（与 BE-01 同类问题）。
--
-- 列对齐 svc/qms/src/models/audit_log.rs:24-35 的 CREATE TABLE 定义。
-- 幂等：CREATE TABLE IF NOT EXISTS。
-- =============================================================================

CREATE TABLE IF NOT EXISTS qms.qa_approval_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(32) NOT NULL,
    operator VARCHAR(64),
    status_from VARCHAR(32),
    status_to VARCHAR(32),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
