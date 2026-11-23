-- B205：HRM 招聘三态列值域收敛（候选约束，全部 NOT VALID）
--
-- 权威值源：svc/hrm/src/modules/recruitment_status.rs
--   JobOpeningStatus  draft / published / in_progress / closed / filled     （默认 draft，对齐前端 recruitment.ts）
--   CandidateStatus   new / screening / interviewing / offered / hired / rejected / withdrawn（默认 new）
--   InterviewStatus   scheduled / in_progress / completed / cancelled       （默认 scheduled）
--
-- 三列均为 varchar(20) NOT NULL，DB 默认与枚举默认一致，无需改默认值或回填。
-- NOT VALID 只约束新写入；存量（本地三表均为 0 行）由后续窗口 VALIDATE。
-- 禁止对生产库直接执行本文件。

BEGIN;

ALTER TABLE hrm.job_openings
    ADD CONSTRAINT ck_hrm_job_openings_status_standard
    CHECK (
        status IN ('draft', 'published', 'in_progress', 'closed', 'filled')
    ) NOT VALID;

ALTER TABLE hrm.candidates
    ADD CONSTRAINT ck_hrm_candidates_status_standard
    CHECK (
        status IN ('new', 'screening', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn')
    ) NOT VALID;

ALTER TABLE hrm.interviews
    ADD CONSTRAINT ck_hrm_interviews_status_standard
    CHECK (
        status IN ('scheduled', 'in_progress', 'completed', 'cancelled')
    ) NOT VALID;

COMMENT ON CONSTRAINT ck_hrm_job_openings_status_standard ON hrm.job_openings
    IS '状态值域由 svc/hrm/src/modules/recruitment_status.rs 定义（B205）';
COMMENT ON CONSTRAINT ck_hrm_candidates_status_standard ON hrm.candidates
    IS '状态值域由 svc/hrm/src/modules/recruitment_status.rs 定义（B205）';
COMMENT ON CONSTRAINT ck_hrm_interviews_status_standard ON hrm.interviews
    IS '状态值域由 svc/hrm/src/modules/recruitment_status.rs 定义（B205）';

COMMIT;
