-- WMS 序列号主状态与质量状态 CHECK 候选（B116）
-- 目标：wms.serial_numbers.status 只允许 in_stock / reserved / out_stock / frozen / scrapped；
--      wms.serial_numbers.quality_status 只允许 pending / inspecting / qualified / unqualified。
--
-- 前置核对：本地与生产快照 wms.serial_numbers 均 0 行，且当前没有状态 CHECK。
-- 上线前只读预检：期望每行都返回 0。
-- SELECT count(*) FROM wms.serial_numbers WHERE status IS NOT NULL AND status NOT IN ('in_stock', 'reserved', 'out_stock', 'frozen', 'scrapped');
-- SELECT count(*) FROM wms.serial_numbers WHERE quality_status IS NOT NULL AND quality_status NOT IN ('pending', 'inspecting', 'qualified', 'unqualified');

ALTER TABLE wms.serial_numbers
    ALTER COLUMN status SET DEFAULT 'in_stock';

ALTER TABLE wms.serial_numbers
    ALTER COLUMN quality_status SET DEFAULT 'pending';

ALTER TABLE wms.serial_numbers
    ADD CONSTRAINT ck_serial_numbers_status_standard
    CHECK (
        status::text = ANY (
            ARRAY['in_stock', 'reserved', 'out_stock', 'frozen', 'scrapped']::text[]
        )
    ) NOT VALID;

ALTER TABLE wms.serial_numbers
    ADD CONSTRAINT ck_serial_numbers_quality_status_standard
    CHECK (
        quality_status::text = ANY (
            ARRAY['pending', 'inspecting', 'qualified', 'unqualified']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_serial_numbers_status_standard ON wms.serial_numbers
    IS 'B116 序列号主状态：in_stock/reserved/out_stock/frozen/scrapped';

COMMENT ON CONSTRAINT ck_serial_numbers_quality_status_standard ON wms.serial_numbers
    IS 'B116 序列号质量状态：pending/inspecting/qualified/unqualified';
