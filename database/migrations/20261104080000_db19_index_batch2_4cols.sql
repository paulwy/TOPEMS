-- ============================================================
-- DB-19: 无二级索引非空表补索引（终态收敛为 1 条）
--
-- 背景：索引二批——无二级索引且非空表的业务列。
-- 2026-11-05 核查（prod/test 双向实测）后收敛：
--   1) idx_core_sessions_user_id（public.core_sessions.user_id）保留：
--      认证路径按 user_id 查/删/更新 session（auth.rs），已有且等价。
--   2) idx_core_sessions_expires_at 不建：唯一查询为 user_id + expires_at 组合过滤，
--      user_id 已有索引；无独立按 expires_at 的清理任务；表仅 11 行，索引收益为零。
--   3) idx_bi_reports_tenant_id 不建：bi.reports 仅 1 行，RLS 的 tenant_id 谓词
--      由顺序扫描即可，建索引属纯冗余。
--   4) idx_bi_reports_status 不建：代码无按 status 过滤 bi.reports 的查询
--      （scheduler 的 status='active' 针对 report_schedules），1 行表无需索引。
--
-- 本文件所有应生效 DDL（user_id 索引）在 prod 已存在且等价，登记账本时不重放。
-- ============================================================

SET lock_timeout = '5s';

-- public.core_sessions：按用户查 session 列表
CREATE INDEX IF NOT EXISTS idx_core_sessions_user_id ON public.core_sessions(user_id);
