-- ============================================================================
-- C 类收尾：DROP public flow 影子表（2026-09-17）
-- 依据 docs/architecture/duplicate-table-convergence.md（C 类：flow schema 权威）
-- 前置已满足：
--   1) 代码无显式 public.<表> 引用（grep 全量 0 处）
--   2) flow 权威副本列完整（instances 13 列 > public 12；approvals/records 同 14/11）
--   3) SEARCH_PATH 已含 flow（embedded 默认 flow,public + run_monolith flow 开头）
-- 保留 public.core_workflows（流程定义唯一权威，flow 无副本）
-- 幂等：DROP TABLE IF EXISTS。
-- ============================================================================

DROP TABLE IF EXISTS public.approvals;
DROP TABLE IF EXISTS public.approval_records;
DROP TABLE IF EXISTS public.core_workflow_tasks;
DROP TABLE IF EXISTS public.core_workflow_instances;
DROP TABLE IF EXISTS public.core_workflow_versions;
