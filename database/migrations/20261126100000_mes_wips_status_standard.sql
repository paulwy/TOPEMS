-- B341: mes.wips.status 标准态收口
-- 背景：status 列可空、默认 'in_progress'，CHECK 只允许四态但 NULL 会通过；
--   update_wip / transfer_wip 已在 B340 对 NULL/未知当前态 fail-closed（409），
--   数据库层仍需禁止脏值写入，避免绕过 handler 的直写路径继续产生 NULL/越界状态。
-- 处置：NULL 归 in_progress、SET NOT NULL、默认值固定为 in_progress、
--   CHECK 重建为 pending/in_progress/completed/transferred 四态并 VALIDATE。
-- 本地 2 行 status 均 in_progress；参考库 0 行；drill 隔离库 0 行，无越界值。
-- 回滚：database/rollback/20261126100000_mes_wips_status_standard.rollback.sql

ALTER TABLE mes.wips
    ALTER COLUMN status SET DEFAULT 'in_progress';

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把历史空状态的在制品补为 in_progress，随后收紧 NOT NULL
-- destructive-owner: mes
-- destructive-ticket: W5-B-B341
-- destructive-expires: 2027-05-20
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前 pg_dump -t mes.wips
UPDATE mes.wips
SET status = 'in_progress'
WHERE status IS NULL;

ALTER TABLE mes.wips
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE mes.wips
    DROP CONSTRAINT IF EXISTS ck_mes_wips_status_standard;

ALTER TABLE mes.wips
    ADD CONSTRAINT ck_mes_wips_status_standard
    CHECK (status IN ('pending', 'in_progress', 'completed', 'transferred'))
    NOT VALID;

ALTER TABLE mes.wips
    VALIDATE CONSTRAINT ck_mes_wips_status_standard;
