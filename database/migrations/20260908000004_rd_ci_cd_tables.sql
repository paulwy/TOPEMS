-- =============================================================
-- 20260908000004: RD CI/CD 子模块表（第一批-② 前后端对应性修复）
-- =============================================================
-- 背景：前端 rd/bug.ts、build.ts、deploy.ts、test.ts 契约完整
--       （bugs/builds/deploys/tests 各 5-6 方法），后端无路由（审计 P0）。
-- 本迁移建立 rd.bugs / rd.builds / rd.deploys / rd.test_cases 四张表，
-- 供 svc/rd modules/rd_ci_cd.rs 使用。
-- =============================================================

CREATE SCHEMA IF NOT EXISTS rd;

-- 缺陷（Bug）
CREATE TABLE IF NOT EXISTS rd.bugs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_no TEXT NOT NULL UNIQUE,
    bug_title TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'open',
    assignee TEXT,
    create_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rd_bugs_status ON rd.bugs (status);
CREATE INDEX IF NOT EXISTS idx_rd_bugs_assignee ON rd.bugs (assignee);

-- 构建（Build）
CREATE TABLE IF NOT EXISTS rd.builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_no TEXT NOT NULL UNIQUE,
    project_id UUID,
    project_name TEXT,
    branch TEXT,
    commit_hash TEXT,
    build_type TEXT DEFAULT 'ci',
    trigger_type TEXT DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'pending',
    duration INTEGER NOT NULL DEFAULT 0,
    build_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logs TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rd_builds_project ON rd.builds (project_id);
CREATE INDEX IF NOT EXISTS idx_rd_builds_status ON rd.builds (status);

-- 部署（Deploy）
CREATE TABLE IF NOT EXISTS rd.deploys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deploy_no TEXT NOT NULL UNIQUE,
    project_id UUID,
    project_name TEXT,
    build_id UUID,
    env TEXT,
    deploy_type TEXT DEFAULT 'rolling',
    environment TEXT,
    app_name TEXT,
    version TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    deploy_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deployer TEXT,
    operator TEXT,
    target_url TEXT,
    logs TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rd_deploys_project ON rd.deploys (project_id);
CREATE INDEX IF NOT EXISTS idx_rd_deploys_status ON rd.deploys (status);

-- 测试用例（TestCase）
CREATE TABLE IF NOT EXISTS rd.test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_no TEXT NOT NULL UNIQUE,
    case_name TEXT NOT NULL,
    case_type TEXT NOT NULL DEFAULT 'function',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'active',
    related_requirement TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rd_test_cases_status ON rd.test_cases (status);
CREATE INDEX IF NOT EXISTS idx_rd_test_cases_type ON rd.test_cases (case_type);
