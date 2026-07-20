-- RD Service Idempotency Migration
-- 为 rs.projects 表添加幂等性支持
-- 通过 (source_type, source_id) 部分唯一索引实现 ON CONFLICT DO NOTHING
--
-- 背景：
-- handle_project_event 处理 PmProjectCreated 事件时，使用 COUNT-then-INSERT 模式
-- 检查同名研发项目是否已存在，存在并发竞态条件（两个相同事件同时通过 COUNT 检查
-- 后都尝试 INSERT，导致重复记录）。
--
-- 解决方案：
-- 1. 在 rs.projects 表添加 source_type / source_id 列（可空，兼容历史数据）
-- 2. 创建部分唯一索引：当 source_type 与 source_id 均非空时强制唯一
-- 3. handler 改用 INSERT ... ON CONFLICT (source_type, source_id) DO NOTHING
--    + fetch_optional 模式，消除竞态
--
-- 注意：
-- - rs.projects 表已存在（见 20260601000000_projects.sql），仅追加列
-- - handle_material_event 与 handle_bom_event 当前仅做 SELECT COUNT 与日志记录，
--   无写入操作，天然幂等，无需索引
-- - handle_project_event 的 PmProjectCompleted 分支为 UPDATE 操作，通过
--   WHERE name = $2 子句天然幂等（同一状态值重复写入不会改变结果），无需调整

-- ============================================================================
-- 1. 为 rs.projects 添加来源追踪列
-- ============================================================================
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS source_type VARCHAR(50);
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS source_id UUID;

-- ============================================================================
-- 2. 创建部分唯一索引以支持 ON CONFLICT (source_type, source_id) DO NOTHING
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_rs_projects_source_unique
ON rs.projects(source_type, source_id)
WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
