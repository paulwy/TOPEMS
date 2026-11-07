-- 批 35 · 标记 mdm_suppliers.category 自由文本列已废弃
--
-- 取证（2026-11-07，全量 287 行 deleted_at IS NULL）：
--   * 287/287 行同时有 category_code 与 category；仅自由文本无 code 的行 = 0。
--   * category 实际是反向同步镜像：scm 来源写 'raw_material'（195 行），
--     srm 来源写 '原材料'（92 行），category_code 均为 'raw_material'。
--   * 数据库侧无索引/视图/触发器依赖 category；RLS 只依赖 tenant_id。
--   * 前端展示 fallback 永不触发（所有行 category_code 非 NULL）。
--
-- 处置（走向 B：仍有消费 → 统一走 category_code）：
--   * list filter 已从 `category = $2` 改为 `category_code = $2`（修复漏数据 bug）。
--   * category 列不删除：删列需独立迁移，且要先把 srm.suppliers.category NOT NULL
--     兜底改由同步管道内部生成，风险大；当前保留写兼容（前端 fillCategoryFromCode
--     会从字典补 name_zh；后端 supplier_sync.rs 翻译 srm 侧时用 category 作兜底）。
--
-- 下一步（待拍板）：若确认零读零写，可在后续批次 DROP COLUMN。

COMMENT ON COLUMN master_data.mdm_suppliers.category IS
  'DEPRECATED (batch 35, 2026-11-07): free-text category mirror from scm/srm reverse sync. Use category_code as the authoritative source. Kept for display fallback and srm.suppliers.category NOT NULL compatibility; do not use for business logic or filtering.';
