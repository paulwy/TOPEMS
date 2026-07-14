-- TOPEMS RS Service - Add tenant_id for multi-tenant support

SET search_path TO rs;

-- ============================================
-- 1. RS Projects
-- ============================================
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_projects_tenant_isolation" ON projects
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 2. RS Project Phases
-- ============================================
ALTER TABLE IF EXISTS project_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_project_phases_tenant_isolation" ON project_phases
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 3. RS Project Milestones
-- ============================================
ALTER TABLE IF EXISTS project_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_project_milestones_tenant_isolation" ON project_milestones
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 4. RS Project Members
-- ============================================
ALTER TABLE IF EXISTS project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_project_members_tenant_isolation" ON project_members
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 5. RS Experiments
-- ============================================
ALTER TABLE IF EXISTS experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_experiments_tenant_isolation" ON experiments
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 6. RS Formulas
-- ============================================
ALTER TABLE IF EXISTS formulas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_formulas_tenant_isolation" ON formulas
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 7. RS Formula Versions
-- ============================================
ALTER TABLE IF EXISTS formula_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_formula_versions_tenant_isolation" ON formula_versions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 8. RS Users
-- ============================================
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_users_tenant_isolation" ON users
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 9. RS Audit Logs
-- ============================================
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_audit_logs_tenant_isolation" ON audit_logs
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Reset search path
RESET search_path;