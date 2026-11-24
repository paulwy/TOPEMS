-- 20261124150000: HRM 初始化进度行 (tenant_id, step_name) 唯一索引
--
-- 背景：
--   20261020000025 播种迁移只能用 NOT EXISTS 守幂等，因为当时该表没有唯一索引；
--   setup.rs 读取侧改为「按租户惰性补种」后，需要 INSERT ... ON CONFLICT
--   (tenant_id, step_name) DO NOTHING 才能并发安全，因此必须先有唯一索引。
--
-- 口径：
--   非破坏性变更，只新增索引，不改写/不删除任何行。
--   若历史数据已存在重复 (tenant_id, step_name)，索引会创建失败——此处用守卫
--   先给出明确异常与清理口径，交由人工处理，绝不静默删数据。
--
-- 幂等：
--   若 v69 迁移已创建过同名约束/索引，IF NOT EXISTS 直接跳过。

DO $$
DECLARE
    dup_pairs bigint;
BEGIN
    IF to_regclass('hrm.initialization_status') IS NULL THEN
        RETURN;
    END IF;

    SELECT count(*) INTO dup_pairs
    FROM (
        SELECT tenant_id, step_name
        FROM hrm.initialization_status
        GROUP BY tenant_id, step_name
        HAVING count(*) > 1
    ) d;

    IF dup_pairs > 0 THEN
        RAISE EXCEPTION
            'precheck failed: hrm.initialization_status has % duplicated (tenant_id, step_name) pairs; deduplicate (keep status=completed first, then earliest created_at) before applying 20261124150000',
            dup_pairs;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_init_status_tenant_step_unique
    ON hrm.initialization_status (tenant_id, step_name);
