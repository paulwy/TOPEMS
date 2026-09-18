-- 补 approval_records.deleted_at（2026-09-18）
-- 背景：svc/unified-core/src/modules/flow/instance.rs 带用户过滤查询以
--       ar.deleted_at IS NULL 过滤审批记录，但 approval_records（5433 由
--       000017 前身结构/20260917000005 补列、5432 由 000017 补建）均无
--       deleted_at 列 → 该查询路径 500（双库同缺）。
-- 处理（幂等）：ADD COLUMN IF NOT EXISTS，对齐 approvals.deleted_at 语义。

ALTER TABLE public.approval_records ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
