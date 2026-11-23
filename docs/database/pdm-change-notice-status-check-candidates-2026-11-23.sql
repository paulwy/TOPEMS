-- B225 · pdm.pdm_change_notices.status 候选约束（NOT VALID）
--
-- 值集来源：
--   svc/pdm/src/modules/change_notice_status.rs
--     ChangeNoticeStatus::DB_VALUES =
--       draft / pending / approved / rejected / implemented / closed / cancelled / withdrawn
--   与 svc/pdm/src/modules/state_machine.rs::ecn_transitions() 的 8 态 ECN 生命周期一致；
--   默认 draft（列默认值）。
--
-- 历史别名：submitted → pending、canceled → cancelled（仅读取侧兼容，新写入统一落规范值）。
--
-- 本地 topems 已应用（0 行存量；bogus 被拒，approved 正常写入回滚）。
-- 无迁移，已登记 prod-only 待回迁清单（total 392→393）。

ALTER TABLE pdm.pdm_change_notices
  ADD CONSTRAINT ck_pdm_change_notices_status_standard
  CHECK (status IN
    ('draft', 'pending', 'approved', 'rejected',
     'implemented', 'closed', 'cancelled', 'withdrawn'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE pdm.pdm_change_notices DROP CONSTRAINT IF EXISTS ck_pdm_change_notices_status_standard;
