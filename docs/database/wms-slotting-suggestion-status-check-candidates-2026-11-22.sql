-- WMS 库位优化建议状态收敛候选（2026-11-22）
-- 唯一状态集合：pending / applied / rejected
-- 优化任务生成 pending；人工应用 applied；人工拒绝 rejected；applied / rejected 均为终态。

BEGIN;

ALTER TABLE wms.slotting_suggestions
    DROP CONSTRAINT IF EXISTS ck_slotting_suggestions_status_standard;

ALTER TABLE wms.slotting_suggestions
    ADD CONSTRAINT ck_slotting_suggestions_status_standard
    CHECK (status IN ('pending', 'applied', 'rejected'))
    NOT VALID;

COMMIT;

-- 列默认值已是 pending，与 SlottingSuggestionStatus::DEFAULT 一致。

-- 窗口内：
-- ALTER TABLE wms.slotting_suggestions VALIDATE CONSTRAINT ck_slotting_suggestions_status_standard;
-- 回滚：
-- ALTER TABLE wms.slotting_suggestions DROP CONSTRAINT IF EXISTS ck_slotting_suggestions_status_standard;
