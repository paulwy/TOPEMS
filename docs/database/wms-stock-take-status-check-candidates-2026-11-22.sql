-- WMS 盘点单状态 / 审批状态 CHECK 候选（B113）
--
-- 目标：
--   wms.stock_takes.status             planned/in_progress/completed/cancelled
--   wms.stock_takes.approval_status    NULL/pending/approved/rejected
--
-- 上线前只读预检：期望两行都返回 0。
-- SELECT count(*) FROM wms.stock_takes
-- WHERE status NOT IN ('planned','in_progress','completed','cancelled');
-- SELECT count(*) FROM wms.stock_takes
-- WHERE approval_status IS NOT NULL
--   AND approval_status NOT IN ('pending','approved','rejected');

ALTER TABLE wms.stock_takes
    ADD CONSTRAINT ck_stock_takes_status_standard
    CHECK (
        status::text = ANY (
            ARRAY['planned', 'in_progress', 'completed', 'cancelled']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_stock_takes_status_standard ON wms.stock_takes
    IS 'B113 盘点单状态：planned/in_progress/completed/cancelled';

ALTER TABLE wms.stock_takes
    ADD CONSTRAINT ck_stock_takes_approval_status_standard
    CHECK (
        approval_status IS NULL
        OR approval_status::text = ANY (
            ARRAY['pending', 'approved', 'rejected']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_stock_takes_approval_status_standard ON wms.stock_takes
    IS 'B113 盘点审批状态：NULL/pending/approved/rejected';
