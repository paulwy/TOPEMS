-- TOPEMS Portal Service - Add tenant_id for multi-tenant support

SET search_path TO portal;

-- ============================================
-- 1. Portal Configs
-- ============================================
ALTER TABLE IF EXISTS portal_configs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE portal_configs SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE portal_configs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_configs_tenant_id ON portal_configs(tenant_id);

-- ============================================
-- 2. Portal Menus
-- ============================================
ALTER TABLE IF EXISTS portal_menus ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE portal_menus SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE portal_menus ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_menus_tenant_id ON portal_menus(tenant_id);

-- ============================================
-- 3. Portal Layouts
-- ============================================
ALTER TABLE IF EXISTS portal_layouts ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE portal_layouts SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE portal_layouts ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_layouts_tenant_id ON portal_layouts(tenant_id);

-- ============================================
-- 4. User Preferences
-- ============================================
ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE user_preferences SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE user_preferences ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_preferences_tenant_id ON user_preferences(tenant_id);

-- ============================================
-- 5. Portal Announcements
-- ============================================
ALTER TABLE IF EXISTS portal_announcements ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE portal_announcements SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE portal_announcements ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_announcements_tenant_id ON portal_announcements(tenant_id);

-- ============================================
-- 6. Portal Access Logs
-- ============================================
ALTER TABLE IF EXISTS portal_access_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE portal_access_logs SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE portal_access_logs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_access_logs_tenant_id ON portal_access_logs(tenant_id);

-- ============================================
-- Enable Row Level Security for all tables
-- ============================================
ALTER TABLE portal_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_access_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Create tenant isolation policies
-- ============================================
CREATE POLICY "portal_configs_tenant_isolation" ON portal_configs
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "portal_menus_tenant_isolation" ON portal_menus
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "portal_layouts_tenant_isolation" ON portal_layouts
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "user_preferences_tenant_isolation" ON user_preferences
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "portal_announcements_tenant_isolation" ON portal_announcements
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "portal_access_logs_tenant_isolation" ON portal_access_logs
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Reset search path
RESET search_path;