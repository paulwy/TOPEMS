-- ============================================================
-- 创建招聘模块规范化表：job_openings / candidates / interviews
-- 与 recruitment.rs 代码 SELECT/INSERT 列对齐
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. 职位空缺表 (job_openings)
-- ============================================================
CREATE TABLE IF NOT EXISTS hrm.job_openings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    tenant_id UUID,
    title VARCHAR(255) NOT NULL,
    code VARCHAR(128),
    department_id UUID,
    position_id UUID,
    employment_type VARCHAR(50),
    location VARCHAR(255),
    description TEXT,
    requirements TEXT,
    salary_min NUMERIC(15, 2),
    salary_max NUMERIC(15, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    publish_date TIMESTAMPTZ,
    close_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_job_openings_tenant_id        ON hrm.job_openings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_organization_id  ON hrm.job_openings(organization_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_department_id    ON hrm.job_openings(department_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_position_id      ON hrm.job_openings(position_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_status           ON hrm.job_openings(status);
CREATE INDEX IF NOT EXISTS idx_job_openings_employment_type  ON hrm.job_openings(employment_type);
CREATE INDEX IF NOT EXISTS idx_job_openings_title_code       ON hrm.job_openings(title, code);
CREATE INDEX IF NOT EXISTS idx_job_openings_created_at       ON hrm.job_openings(created_at DESC);

COMMENT ON TABLE hrm.job_openings IS '招聘职位空缺表';
COMMENT ON COLUMN hrm.job_openings.status IS '状态: draft/published/closed';
COMMENT ON COLUMN hrm.job_openings.employment_type IS '雇佣类型: full_time/part_time/intern/contract';

-- ============================================================
-- 2. 候选人表 (candidates)
-- ============================================================
CREATE TABLE IF NOT EXISTS hrm.candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    tenant_id UUID,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(128),
    phone VARCHAR(64),
    position_id UUID,
    job_opening_id UUID REFERENCES hrm.job_openings(id) ON DELETE SET NULL,
    resume_path TEXT,
    source VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_candidates_tenant_id       ON hrm.candidates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_candidates_organization_id ON hrm.candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_candidates_job_opening_id  ON hrm.candidates(job_opening_id);
CREATE INDEX IF NOT EXISTS idx_candidates_position_id     ON hrm.candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status          ON hrm.candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_name_email      ON hrm.candidates(name, email);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at      ON hrm.candidates(created_at DESC);

COMMENT ON TABLE hrm.candidates IS '招聘候选人表';
COMMENT ON COLUMN hrm.candidates.status IS '状态: new/screening/interview/offered/hired/rejected';

-- ============================================================
-- 3. 面试表 (interviews)
-- ============================================================
CREATE TABLE IF NOT EXISTS hrm.interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    tenant_id UUID,
    candidate_id UUID NOT NULL REFERENCES hrm.candidates(id) ON DELETE CASCADE,
    interviewer_id UUID,
    round INTEGER NOT NULL DEFAULT 1,
    scheduled_at TIMESTAMPTZ,
    actual_at TIMESTAMPTZ,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    result VARCHAR(50),
    notes TEXT,
    score NUMERIC(5, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_interviews_tenant_id       ON hrm.interviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interviews_organization_id ON hrm.interviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id    ON hrm.interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id  ON hrm.interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status          ON hrm.interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at    ON hrm.interviews(scheduled_at DESC);

COMMENT ON TABLE hrm.interviews IS '招聘面试表';
COMMENT ON COLUMN hrm.interviews.round IS '第几轮面试';
COMMENT ON COLUMN hrm.interviews.status IS '状态: scheduled/in_progress/completed/cancelled/no_show';
COMMENT ON COLUMN hrm.interviews.result IS '结果: pass/fail/pending';
COMMENT ON COLUMN hrm.interviews.score IS '评分 0-100';
