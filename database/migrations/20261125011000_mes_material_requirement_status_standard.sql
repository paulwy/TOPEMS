-- B282: mes.material_requirements.status 非空收口
-- 背景：状态值域 CHECK 已存在（draft/confirmed/released/completed/cancelled），
--   但列仍可空；confirm/release/update 入口缺少来源态与并发条件。
-- 处置：NULL 归 draft、默认 draft、SET NOT NULL；值域 CHECK 沿用既有约束。
-- 回滚：database/rollback/20261125011000_mes_material_requirement_status_standard.rollback.sql

ALTER TABLE mes.material_requirements
    ALTER COLUMN status SET DEFAULT 'draft';

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把物料需求空状态补为 draft，随后收紧 NOT NULL
-- destructive-owner: mes-core
-- destructive-ticket: W5-B-B282
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前 pg_dump -t mes.material_requirements
UPDATE mes.material_requirements
SET status = 'draft'
WHERE status IS NULL;

ALTER TABLE mes.material_requirements
    ALTER COLUMN status SET NOT NULL;
