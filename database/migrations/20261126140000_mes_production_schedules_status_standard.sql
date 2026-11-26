-- ============================================================
-- 20261126140000: mes.production_schedules.status 标准态（B347）
--
-- 现状（本机 2026-11-26）：
--   · 9678 行全部 status = 'scheduled'，NULL 0 行；
--   · status 可空（is_nullable=YES），默认 'pending'；
--   · 约束名 production_schedules_status_check，六态 CHECK 已 VALIDATE。
-- 问题：列可空 → 绕过 handler 的写入可留下 NULL，读路径（B345 已按
--   Option<String> fail-closed 返回 409）仍只能靠应用层兜底。
-- 处置：默认固定 'pending'、NULL 回填后 SET NOT NULL、CHECK 重建为
--   命名规范的四/六态标准约束并 VALIDATE。
-- 六态来源：svc/mes/src/modules/production_schedule_status.rs::DB_VALUES。
-- ============================================================

ALTER TABLE mes.production_schedules
    ALTER COLUMN status SET DEFAULT 'pending';

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 回填历史 NULL 状态为默认待排产态，避免 SET NOT NULL 失败；本机实测 0 行命中
-- destructive-owner: mes
-- destructive-ticket: MES-SCHED-STATUS-20261126
-- destructive-expires: 2027-05-20
-- destructive-max-rows: 0
-- destructive-backup: 开窗前 pg_dump -t mes.production_schedules（9678 行，status 全 scheduled）
UPDATE mes.production_schedules
   SET status = 'pending'
 WHERE status IS NULL;

ALTER TABLE mes.production_schedules
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE mes.production_schedules
    DROP CONSTRAINT IF EXISTS production_schedules_status_check;

ALTER TABLE mes.production_schedules
    ADD CONSTRAINT ck_mes_production_schedules_status_standard
    CHECK (status IN ('pending', 'scheduled', 'released', 'running', 'completed', 'cancelled'))
    NOT VALID;

ALTER TABLE mes.production_schedules
    VALIDATE CONSTRAINT ck_mes_production_schedules_status_standard;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'mes' AND table_name = 'production_schedules'
       AND column_name = 'status' AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'mes.production_schedules.status 仍可空，收口未生效';
  END IF;
  RAISE NOTICE 'mes.production_schedules.status 已收口：NOT NULL + 六态标准约束';
END $$;
