-- WMS 波次拣货主状态 / 明细状态 CHECK 候选（B114）
--
-- 目标：
--   wms.wave_picks.status        created/assigned/picking/completed/cancelled，默认 created
--   wms.wave_pick_items.status   pending/picked/short_picked，默认 pending
--
-- 旧数据兼容：历史 `pending` 仅作为只读别名映射为 `created`，不写入新数据。
-- 上线前只读预检：期望两行都返回 0（本地与生产快照当前均 0 行）。
-- SELECT count(*) FROM wms.wave_picks
-- WHERE status NOT IN ('created','assigned','picking','completed','cancelled')
--   AND status <> 'pending';
-- SELECT count(*) FROM wms.wave_pick_items
-- WHERE status NOT IN ('pending','picked','short_picked');

ALTER TABLE wms.wave_picks
    ALTER COLUMN status SET DEFAULT 'created';

ALTER TABLE wms.wave_picks
    ADD CONSTRAINT ck_wave_picks_status_standard
    CHECK (
        status::text = ANY (
            ARRAY['created', 'assigned', 'picking', 'completed', 'cancelled']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_wave_picks_status_standard ON wms.wave_picks
    IS 'B114 波次拣货状态：created/assigned/picking/completed/cancelled';

ALTER TABLE wms.wave_pick_items
    ADD CONSTRAINT ck_wave_pick_items_status_standard
    CHECK (
        status::text = ANY (
            ARRAY['pending', 'picked', 'short_picked']::text[]
        )
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_wave_pick_items_status_standard ON wms.wave_pick_items
    IS 'B114 波次拣货明细状态：pending/picked/short_picked';
