-- ============================================================================
-- mes.production_processes 兼容列治理（2026-09-18）
-- 代码已迁移真实列（process_code/process_name/standard_time_minutes）
-- 删除 000011 引入的兼容列（process_no/name/estimated_duration）
-- equipment_required 保留（无真实 1:1 列，后续随 required_tools 语义演进）
-- ============================================================================
ALTER TABLE mes.production_processes DROP COLUMN IF EXISTS process_no;
ALTER TABLE mes.production_processes DROP COLUMN IF EXISTS name;
ALTER TABLE mes.production_processes DROP COLUMN IF EXISTS estimated_duration;
