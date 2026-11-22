-- WMS 批次主状态与质量状态 CHECK 候选（B115）
-- 目标：wms.batches.status 只允许 in_stock / reserved / out_stock / frozen / scrapped；
--      wms.batches.quality_status 只允许 pending / inspecting / qualified / unqualified；
--      并把 status 默认值由 active 改为 in_stock。
--
-- 重要前置：本地与既有迁移已存在约束 ck_batches_status_standard，
-- 只允许 active / inactive / archived。仅新增约束会继续被旧约束拒绝，
-- 所以这里必须先替换旧约束。
--
-- 上线前只读预检：期望每行都返回 0。
-- SELECT count(*) FROM wms.batches WHERE status IS DISTINCT FROM 'active' AND status NOT IN ('in_stock', 'reserved', 'out_stock', 'frozen', 'scrapped');
-- SELECT count(*) FROM wms.batches WHERE status IS NOT NULL AND status NOT IN ('in_stock', 'reserved', 'out_stock', 'frozen', 'scrapped');
-- SELECT count(*) FROM wms.batches WHERE quality_status IS NOT NULL AND quality_status NOT IN ('pending', 'inspecting', 'qualified', 'unqualified');

ALTER TABLE wms.batches
    DROP CONSTRAINT IF EXISTS ck_batches_status_standard;

ALTER TABLE wms.batches
    ALTER COLUMN status SET DEFAULT 'in_stock';

ALTER TABLE wms.batches
    ADD CONSTRAINT ck_batches_status_standard
    CHECK (
        status::text = ANY (
            ARRAY['in_stock', 'reserved', 'out_stock', 'frozen', 'scrapped']::text[]
        )
    ) NOT VALID;

ALTER TABLE wms.batches
    ADD CONSTRAINT ck_batches_quality_status_standard
    CHECK (
        quality_status::text = ANY (
            ARRAY['pending', 'inspecting', 'qualified', 'unqualified']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_batches_status_standard ON wms.batches
    IS 'B115 批次主状态：in_stock/reserved/out_stock/frozen/scrapped';

COMMENT ON CONSTRAINT ck_batches_quality_status_standard ON wms.batches
    IS 'B115 批次质量状态：pending/inspecting/qualified/unqualified';
