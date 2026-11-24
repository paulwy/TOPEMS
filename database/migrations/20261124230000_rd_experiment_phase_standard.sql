-- B265：RD 试验阶段词表收口（2026-11-24）
--
-- 背景：rs.experiments.phase 无 CHECK、无默认值且可空；后端创建原样落 req.phase，
--   前端表单提交中文/展示名（小试/中试/放大/生产验证、Lab Trial/Pilot Run/Scale-up/
--   Production Validation），推进接口只硬编码下一阶段，任意其他值可被写入。
--
-- 本次：旧别名/中文/展示名归一为 lab/pilot/scaleup/production 四态 →
--   默认值固定 'lab' → phase NOT NULL → ADD CHECK + VALIDATE。
-- fail-closed：归一后仍存在四态之外的值则 RAISE EXCEPTION。

DO $$
DECLARE
    n_bad bigint;
    exists_already boolean;
BEGIN
    IF to_regclass('rs.experiments') IS NULL THEN
        RAISE NOTICE '跳过：rs.experiments 不存在';
        RETURN;
    END IF;

    UPDATE rs.experiments
       SET phase = CASE lower(btrim(coalesce(phase, '')))
           WHEN '' THEN 'lab'
           WHEN 'lab' THEN 'lab'
           WHEN 'lab_trial' THEN 'lab'
           WHEN 'laboratory' THEN 'lab'
           WHEN 'small_trial' THEN 'lab'
           WHEN '小试' THEN 'lab'
           WHEN '实验室' THEN 'lab'
           WHEN 'pilot' THEN 'pilot'
           WHEN 'pilot_run' THEN 'pilot'
           WHEN 'pilot_test' THEN 'pilot'
           WHEN '中试' THEN 'pilot'
           WHEN 'scaleup' THEN 'scaleup'
           WHEN 'scale_up' THEN 'scaleup'
           WHEN 'scale-up' THEN 'scaleup'
           WHEN '扩试' THEN 'scaleup'
           WHEN '放大' THEN 'scaleup'
           WHEN 'production' THEN 'production'
           WHEN 'production_validation' THEN 'production'
           WHEN 'production_trial' THEN 'production'
           WHEN '生产验证' THEN 'production'
           WHEN '量产' THEN 'production'
           WHEN '生产' THEN 'production'
           ELSE lower(btrim(coalesce(phase, '')))
       END
     WHERE phase IS NULL
        OR phase <> CASE lower(btrim(coalesce(phase, '')))
           WHEN '' THEN 'lab'
           WHEN 'lab' THEN 'lab'
           WHEN 'lab_trial' THEN 'lab'
           WHEN 'laboratory' THEN 'lab'
           WHEN 'small_trial' THEN 'lab'
           WHEN '小试' THEN 'lab'
           WHEN '实验室' THEN 'lab'
           WHEN 'pilot' THEN 'pilot'
           WHEN 'pilot_run' THEN 'pilot'
           WHEN 'pilot_test' THEN 'pilot'
           WHEN '中试' THEN 'pilot'
           WHEN 'scaleup' THEN 'scaleup'
           WHEN 'scale_up' THEN 'scaleup'
           WHEN 'scale-up' THEN 'scaleup'
           WHEN '扩试' THEN 'scaleup'
           WHEN '放大' THEN 'scaleup'
           WHEN 'production' THEN 'production'
           WHEN 'production_validation' THEN 'production'
           WHEN 'production_trial' THEN 'production'
           WHEN '生产验证' THEN 'production'
           WHEN '量产' THEN 'production'
           WHEN '生产' THEN 'production'
           ELSE lower(btrim(coalesce(phase, '')))
       END;

    SELECT count(*) FROM rs.experiments
     WHERE phase IS NULL
        OR phase NOT IN ('lab', 'pilot', 'scaleup', 'production')
      INTO n_bad;

    IF n_bad > 0 THEN
        RAISE EXCEPTION 'B265 前置断言失败：% 行 phase 落在 lab/pilot/scaleup/production 之外', n_bad;
    END IF;

    ALTER TABLE rs.experiments
        ALTER COLUMN phase SET DEFAULT 'lab';
    ALTER TABLE rs.experiments
        ALTER COLUMN phase SET NOT NULL;

    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'rs.experiments'::regclass
           AND conname = 'ck_experiments_phase_standard'
    ) INTO exists_already;

    IF exists_already THEN
        ALTER TABLE rs.experiments
            VALIDATE CONSTRAINT ck_experiments_phase_standard;
        RAISE NOTICE '跳过 ADD：约束已存在，已重新 VALIDATE';
        RETURN;
    END IF;

    ALTER TABLE rs.experiments
        ADD CONSTRAINT ck_experiments_phase_standard
        CHECK (phase IN ('lab', 'pilot', 'scaleup', 'production')) NOT VALID;
    ALTER TABLE rs.experiments
        VALIDATE CONSTRAINT ck_experiments_phase_standard;

    RAISE NOTICE 'B265 完成：rs.experiments.phase 已建立四态约束';
END $$;
