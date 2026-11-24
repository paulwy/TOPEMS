-- B264：RD 试验状态词表收口（2026-11-24）
--
-- 背景：rs.experiments.status 默认 'planning'，后端创建写 'planned'，前端表单提交中文
--   「进行中/已完成/暂停/失败」，同一状态存在三套写法；更新与推进阶段接受任意状态。
--
-- 本次：旧默认/别名/中文值归一为 planned/in_progress/completed/paused/failed 五态 →
--   默认值固定 'planned' → ADD CHECK + VALIDATE。
-- fail-closed：归一后仍存在五态之外的值则 RAISE EXCEPTION。

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
       SET status = CASE lower(btrim(status))
           WHEN 'planned' THEN 'planned'
           WHEN 'planning' THEN 'planned'
           WHEN '计划中' THEN 'planned'
           WHEN 'in_progress' THEN 'in_progress'
           WHEN 'in-progress' THEN 'in_progress'
           WHEN 'running' THEN 'in_progress'
           WHEN '进行中' THEN 'in_progress'
           WHEN 'completed' THEN 'completed'
           WHEN 'done' THEN 'completed'
           WHEN '已完成' THEN 'completed'
           WHEN 'paused' THEN 'paused'
           WHEN 'on_hold' THEN 'paused'
           WHEN '暂停' THEN 'paused'
           WHEN 'failed' THEN 'failed'
           WHEN 'failure' THEN 'failed'
           WHEN '失败' THEN 'failed'
           ELSE lower(btrim(status))
       END
     WHERE status IS NOT NULL
       AND status <> CASE lower(btrim(status))
           WHEN 'planned' THEN 'planned'
           WHEN 'planning' THEN 'planned'
           WHEN '计划中' THEN 'planned'
           WHEN 'in_progress' THEN 'in_progress'
           WHEN 'in-progress' THEN 'in_progress'
           WHEN 'running' THEN 'in_progress'
           WHEN '进行中' THEN 'in_progress'
           WHEN 'completed' THEN 'completed'
           WHEN 'done' THEN 'completed'
           WHEN '已完成' THEN 'completed'
           WHEN 'paused' THEN 'paused'
           WHEN 'on_hold' THEN 'paused'
           WHEN '暂停' THEN 'paused'
           WHEN 'failed' THEN 'failed'
           WHEN 'failure' THEN 'failed'
           WHEN '失败' THEN 'failed'
           ELSE lower(btrim(status))
       END;

    ALTER TABLE rs.experiments
        ALTER COLUMN status SET DEFAULT 'planned';

    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'rs.experiments'::regclass
           AND conname = 'ck_experiments_status_standard'
    ) INTO exists_already;

    IF exists_already THEN
        ALTER TABLE rs.experiments
            VALIDATE CONSTRAINT ck_experiments_status_standard;
        RAISE NOTICE '跳过 ADD：约束已存在，已重新 VALIDATE';
        RETURN;
    END IF;

    SELECT count(*) FROM rs.experiments
     WHERE status IS NOT NULL
       AND status NOT IN ('planned', 'in_progress', 'completed', 'paused', 'failed')
      INTO n_bad;

    IF n_bad > 0 THEN
        RAISE EXCEPTION 'B264 前置断言失败：% 行 status 落在 planned/in_progress/completed/paused/failed 之外', n_bad;
    END IF;

    ALTER TABLE rs.experiments
        ADD CONSTRAINT ck_experiments_status_standard
        CHECK (status IN ('planned', 'in_progress', 'completed', 'paused', 'failed')) NOT VALID;
    ALTER TABLE rs.experiments
        VALIDATE CONSTRAINT ck_experiments_status_standard;

    RAISE NOTICE 'B264 完成：rs.experiments.status 已建立五态约束';
END $$;
