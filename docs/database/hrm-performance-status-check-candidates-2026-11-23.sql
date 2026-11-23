-- B206：HRM 绩效两列值域收敛（候选约束，NOT VALID）
--
-- 权威值源：svc/hrm/src/modules/performance_status.rs
--   PerformanceReviewStatus  draft / pending / submitted / approved /
--                            self_reviewed / manager_reviewed / completed / archived（默认 draft）
--   PerformanceGoalStatus    pending / in_progress / completed / cancelled（默认 pending）
--
-- 两列均 varchar(20) NOT NULL，DB 默认与枚举默认一致，无需改默认或回填。
-- 评核列取「前端展示态 + 后端审批流态」并集，统一口径留作后续专项。
-- NOT VALID 只约束新写入；本地两表 0 行。禁止对生产库直接执行本文件。

BEGIN;

ALTER TABLE hrm.performance_reviews
    ADD CONSTRAINT ck_hrm_performance_reviews_status_standard
    CHECK (
        status IN (
            'draft', 'pending', 'submitted', 'approved',
            'self_reviewed', 'manager_reviewed', 'completed', 'archived'
        )
    ) NOT VALID;

ALTER TABLE hrm.performance_goals
    ADD CONSTRAINT ck_hrm_performance_goals_status_standard
    CHECK (
        status IN ('pending', 'in_progress', 'completed', 'cancelled')
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_hrm_performance_reviews_status_standard ON hrm.performance_reviews
    IS '状态值域由 svc/hrm/src/modules/performance_status.rs 定义（B206）';
COMMENT ON CONSTRAINT ck_hrm_performance_goals_status_standard ON hrm.performance_goals
    IS '状态值域由 svc/hrm/src/modules/performance_status.rs 定义（B206）';

COMMIT;
