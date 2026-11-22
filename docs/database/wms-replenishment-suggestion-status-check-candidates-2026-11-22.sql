-- WMS 补货建议状态收敛候选（2026-11-22）
-- 唯一状态集合：draft / active / confirmed
-- draft：历史待清理态；active：系统计算生成的待确认建议；confirmed：已确认终态。
-- 约束一律 NOT VALID，先在本地事务内演练，通过后再由发布窗口单独 VALIDATE。

BEGIN;

-- 列默认值与后端 ReplenishmentSuggestionStatus::DEFAULT = Active 对齐。
-- 原默认 draft 会生成前端不可操作的历史草稿态。
ALTER TABLE wms.replenishment_suggestions
    ALTER COLUMN status SET DEFAULT 'active';

-- 本地当前无状态 CHECK；先 DROP IF EXISTS 保证重复执行安全。
ALTER TABLE wms.replenishment_suggestions
    DROP CONSTRAINT IF EXISTS ck_replenishment_suggestions_status_standard;

ALTER TABLE wms.replenishment_suggestions
    ADD CONSTRAINT ck_replenishment_suggestions_status_standard
    CHECK (status IN ('draft', 'active', 'confirmed'))
    NOT VALID;

COMMIT;

-- 可选数据修复（默认注释，需业务确认后单独执行）：
-- compute_replenishment 旧 SQL 的括号优先级缺陷会在“不按仓库过滤”时短路阈值条件，
-- 为全部库存生成建议。本地 7332 条 active 建议全部 suggested_quantity = 0，属于该缺陷产物。
-- 修复 SQL 后不会自动清理存量；确认无需保留后可软删：
-- UPDATE wms.replenishment_suggestions
--    SET deleted_at = NOW(), updated_at = NOW()
--  WHERE deleted_at IS NULL
--    AND status = 'active'
--    AND suggested_quantity <= 0;
