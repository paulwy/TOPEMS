-- B262：RD 配方状态词表收口（2026-11-24）
--
-- 背景：rs.formulas.status 无 CHECK；后端创建默认写中文「草稿」，评审通过写
--   `released`，前端词表却是 draft/testing/approved。本地 7 行中已有 4 行
--   `草稿`、2 行 `draft`、1 行 `released`，同一业务状态出现三套写法。
--
-- 本次：历史值归一（草稿→draft、测试中/待测试→testing、released/已批准/已发布→approved、
--   已归档→archived）→ 默认值固定 'draft' → ADD CHECK + VALIDATE。
-- fail-closed：归一后仍存在四态之外的值则 RAISE EXCEPTION。

DO $$
DECLARE
    n_bad bigint;
    exists_already boolean;
BEGIN
    IF to_regclass('rs.formulas') IS NULL THEN
        RAISE NOTICE '跳过：rs.formulas 不存在';
        RETURN;
    END IF;

    UPDATE rs.formulas
       SET status = CASE lower(btrim(status))
           WHEN 'draft' THEN 'draft'
           WHEN '草稿' THEN 'draft'
           WHEN 'testing' THEN 'testing'
           WHEN '测试中' THEN 'testing'
           WHEN '待测试' THEN 'testing'
           WHEN 'approved' THEN 'approved'
           WHEN 'released' THEN 'approved'
           WHEN '已批准' THEN 'approved'
           WHEN '已发布' THEN 'approved'
           WHEN 'archived' THEN 'archived'
           WHEN '已归档' THEN 'archived'
           ELSE lower(btrim(status))
       END
     WHERE status IS NOT NULL
       AND status <> CASE lower(btrim(status))
           WHEN 'draft' THEN 'draft'
           WHEN '草稿' THEN 'draft'
           WHEN 'testing' THEN 'testing'
           WHEN '测试中' THEN 'testing'
           WHEN '待测试' THEN 'testing'
           WHEN 'approved' THEN 'approved'
           WHEN 'released' THEN 'approved'
           WHEN '已批准' THEN 'approved'
           WHEN '已发布' THEN 'approved'
           WHEN 'archived' THEN 'archived'
           WHEN '已归档' THEN 'archived'
           ELSE lower(btrim(status))
       END;

    ALTER TABLE rs.formulas
        ALTER COLUMN status SET DEFAULT 'draft';

    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'rs.formulas'::regclass
           AND conname = 'ck_formulas_status_standard'
    ) INTO exists_already;

    IF exists_already THEN
        ALTER TABLE rs.formulas
            VALIDATE CONSTRAINT ck_formulas_status_standard;
        RAISE NOTICE '跳过 ADD：约束已存在，已重新 VALIDATE';
        RETURN;
    END IF;

    SELECT count(*) FROM rs.formulas
     WHERE status IS NOT NULL
       AND status NOT IN ('draft', 'testing', 'approved', 'archived')
      INTO n_bad;

    IF n_bad > 0 THEN
        RAISE EXCEPTION 'B262 前置断言失败：% 行 status 落在 draft/testing/approved/archived 之外', n_bad;
    END IF;

    ALTER TABLE rs.formulas
        ADD CONSTRAINT ck_formulas_status_standard
        CHECK (status IN ('draft', 'testing', 'approved', 'archived')) NOT VALID;
    ALTER TABLE rs.formulas
        VALIDATE CONSTRAINT ck_formulas_status_standard;

    RAISE NOTICE 'B262 完成：rs.formulas.status 已归一为四态并建立约束';
END $$;
