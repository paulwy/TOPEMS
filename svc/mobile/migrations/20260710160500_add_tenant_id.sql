-- TOPEMS Mobile Service - Add tenant_id for multi-tenant support

-- ============================================
-- 1. Mobile Users
-- ============================================
ALTER TABLE IF EXISTS mobile_users ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mobile_users SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE mobile_users ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mobile_users_tenant_id ON mobile_users(tenant_id);

-- ============================================
-- 2. Refresh Tokens
-- ============================================
ALTER TABLE IF EXISTS refresh_tokens ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE refresh_tokens rt SET tenant_id = (SELECT mu.tenant_id FROM mobile_users mu WHERE mu.id = rt.user_id) WHERE tenant_id IS NULL;
ALTER TABLE refresh_tokens ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_tenant_id ON refresh_tokens(tenant_id);

-- ============================================
-- 3. Notifications
-- ============================================
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE notifications n SET tenant_id = (SELECT mu.tenant_id FROM mobile_users mu WHERE mu.id = n.user_id) WHERE tenant_id IS NULL;
ALTER TABLE notifications ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);

-- ============================================
-- 4. Devices
-- ============================================
ALTER TABLE IF EXISTS devices ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE devices d SET tenant_id = (SELECT mu.tenant_id FROM mobile_users mu WHERE mu.id = d.user_id) WHERE tenant_id IS NULL;
ALTER TABLE devices ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_tenant_id ON devices(tenant_id);

-- ============================================
-- 5. Mobile Scan Records
-- ============================================
ALTER TABLE IF EXISTS mobile_scan_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mobile_scan_records msr SET tenant_id = (SELECT mu.tenant_id FROM mobile_users mu WHERE mu.id = msr.user_id) WHERE tenant_id IS NULL;
ALTER TABLE mobile_scan_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mobile_scan_records_tenant_id ON mobile_scan_records(tenant_id);

-- ============================================
-- 6. Offline Sync Records
-- ============================================
ALTER TABLE IF EXISTS offline_sync_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE offline_sync_records osr SET tenant_id = (SELECT mu.tenant_id FROM mobile_users mu WHERE mu.id = osr.user_id) WHERE tenant_id IS NULL;
ALTER TABLE offline_sync_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offline_sync_records_tenant_id ON offline_sync_records(tenant_id);

-- ============================================
-- 7. Shortcuts
-- ============================================
ALTER TABLE IF EXISTS shortcuts ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE shortcuts s SET tenant_id = (SELECT mu.tenant_id FROM mobile_users mu WHERE mu.id = s.user_id) WHERE tenant_id IS NULL;
ALTER TABLE shortcuts ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shortcuts_tenant_id ON shortcuts(tenant_id);

-- ============================================
-- 8. User Settings
-- ============================================
ALTER TABLE IF EXISTS user_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE user_settings us SET tenant_id = (SELECT mu.tenant_id FROM mobile_users mu WHERE mu.id = us.user_id) WHERE tenant_id IS NULL;
ALTER TABLE user_settings ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_settings_tenant_id ON user_settings(tenant_id);

-- ============================================
-- 9. Patrol Records (Legacy)
-- ============================================
ALTER TABLE IF EXISTS patrol_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE patrol_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE patrol_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patrol_records_tenant_id ON patrol_records(tenant_id);

-- ============================================
-- 10. Scan Records (Legacy)
-- ============================================
ALTER TABLE IF EXISTS scan_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE scan_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE scan_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scan_records_tenant_id ON scan_records(tenant_id);

-- ============================================
-- 11. Photo Evidences (Legacy)
-- ============================================
ALTER TABLE IF EXISTS photo_evidences ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE photo_evidences SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE photo_evidences ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photo_evidences_tenant_id ON photo_evidences(tenant_id);

-- ============================================
-- 12. Audio Recordings (Legacy)
-- ============================================
ALTER TABLE IF EXISTS audio_recordings ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE audio_recordings SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE audio_recordings ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audio_recordings_tenant_id ON audio_recordings(tenant_id);

-- ============================================
-- 13. Video Recordings (Legacy)
-- ============================================
ALTER TABLE IF EXISTS video_recordings ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE video_recordings SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE video_recordings ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_video_recordings_tenant_id ON video_recordings(tenant_id);

-- ============================================
-- 14. Mobile Tasks
-- ============================================
ALTER TABLE IF EXISTS mobile_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mobile_tasks SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE mobile_tasks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mobile_tasks_tenant_id ON mobile_tasks(tenant_id);

-- ============================================
-- 15. Offline Operations
-- ============================================
ALTER TABLE IF EXISTS offline_operations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE offline_operations oo SET tenant_id = (SELECT mu.tenant_id FROM mobile_users mu WHERE mu.id = oo.user_id) WHERE tenant_id IS NULL;
ALTER TABLE offline_operations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offline_operations_tenant_id ON offline_operations(tenant_id);

-- ============================================
-- 16. Sync Policies
-- ============================================
ALTER TABLE IF EXISTS sync_policies ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE sync_policies sp SET tenant_id = (SELECT mu.tenant_id FROM mobile_users mu WHERE mu.id = sp.user_id) WHERE tenant_id IS NULL;
ALTER TABLE sync_policies ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sync_policies_tenant_id ON sync_policies(tenant_id);

-- ============================================
-- 17. Push Devices
-- ============================================
ALTER TABLE IF EXISTS push_devices ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE push_devices pd SET tenant_id = (SELECT mu.tenant_id FROM mobile_users mu WHERE mu.id = pd.user_id) WHERE tenant_id IS NULL;
ALTER TABLE push_devices ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_devices_tenant_id ON push_devices(tenant_id);

-- ============================================
-- 18. Push Notifications
-- ============================================
ALTER TABLE IF EXISTS push_notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE push_notifications SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE push_notifications ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_notifications_tenant_id ON push_notifications(tenant_id);

-- ============================================
-- 19. Push Templates
-- ============================================
ALTER TABLE IF EXISTS push_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE push_templates SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE push_templates ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_templates_tenant_id ON push_templates(tenant_id);

-- ============================================
-- 20. Barcode Scans
-- ============================================
ALTER TABLE IF EXISTS barcode_scans ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE barcode_scans bs SET tenant_id = (SELECT mu.tenant_id FROM mobile_users mu WHERE mu.id = bs.user_id) WHERE tenant_id IS NULL;
ALTER TABLE barcode_scans ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_barcode_scans_tenant_id ON barcode_scans(tenant_id);

-- ============================================
-- 21. Photo Uploads
-- ============================================
ALTER TABLE IF EXISTS photo_uploads ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE photo_uploads pu SET tenant_id = (SELECT mu.tenant_id FROM mobile_users mu WHERE mu.id = pu.user_id) WHERE tenant_id IS NULL;
ALTER TABLE photo_uploads ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photo_uploads_tenant_id ON photo_uploads(tenant_id);

-- ============================================
-- 22. Mobile Approvals
-- ============================================
ALTER TABLE IF EXISTS mobile_approvals ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE mobile_approvals SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE mobile_approvals ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mobile_approvals_tenant_id ON mobile_approvals(tenant_id);

-- ============================================
-- 23. Media Files
-- ============================================
ALTER TABLE IF EXISTS media_files ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE media_files SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE media_files ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_files_tenant_id ON media_files(tenant_id);

-- ============================================
-- 24. Inventory Items
-- ============================================
ALTER TABLE IF EXISTS inventory_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE inventory_items SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE inventory_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_id ON inventory_items(tenant_id);

-- ============================================
-- 25. Stocktake Tasks
-- ============================================
ALTER TABLE IF EXISTS stocktake_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE stocktake_tasks SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE stocktake_tasks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocktake_tasks_tenant_id ON stocktake_tasks(tenant_id);

-- ============================================
-- 26. Stocktake Records
-- ============================================
ALTER TABLE IF EXISTS stocktake_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE stocktake_records sr SET tenant_id = (SELECT st.tenant_id FROM stocktake_tasks st WHERE st.id = sr.task_id) WHERE tenant_id IS NULL;
ALTER TABLE stocktake_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocktake_records_tenant_id ON stocktake_records(tenant_id);

-- ============================================
-- 27. Inbound Orders
-- ============================================
ALTER TABLE IF EXISTS inbound_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE inbound_orders SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE inbound_orders ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inbound_orders_tenant_id ON inbound_orders(tenant_id);

-- ============================================
-- 28. Outbound Orders
-- ============================================
ALTER TABLE IF EXISTS outbound_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE outbound_orders SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE outbound_orders ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outbound_orders_tenant_id ON outbound_orders(tenant_id);

-- ============================================
-- 29. Quality Tasks
-- ============================================
ALTER TABLE IF EXISTS quality_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE quality_tasks SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE quality_tasks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quality_tasks_tenant_id ON quality_tasks(tenant_id);

-- ============================================
-- 30. Defect Records
-- ============================================
ALTER TABLE IF EXISTS defect_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE defect_records dr SET tenant_id = (SELECT qt.tenant_id FROM quality_tasks qt WHERE qt.id = dr.task_id) WHERE tenant_id IS NULL;
ALTER TABLE defect_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_defect_records_tenant_id ON defect_records(tenant_id);

-- ============================================
-- 31. Production Orders
-- ============================================
ALTER TABLE IF EXISTS production_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE production_orders SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE production_orders ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_production_orders_tenant_id ON production_orders(tenant_id);

-- ============================================
-- 32. Work Reports
-- ============================================
ALTER TABLE IF EXISTS work_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE work_reports wr SET tenant_id = (SELECT po.tenant_id FROM production_orders po WHERE po.id = wr.order_id) WHERE tenant_id IS NULL;
ALTER TABLE work_reports ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_reports_tenant_id ON work_reports(tenant_id);

-- ============================================
-- 33. Equipment
-- ============================================
ALTER TABLE IF EXISTS equipment ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE equipment SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE equipment ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_tenant_id ON equipment(tenant_id);

-- ============================================
-- Enable Row Level Security for all tables
-- ============================================
ALTER TABLE mobile_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_scan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocktake_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocktake_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Create tenant isolation policies
-- ============================================
CREATE POLICY "mobile_users_tenant_isolation" ON mobile_users
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "refresh_tokens_tenant_isolation" ON refresh_tokens
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "notifications_tenant_isolation" ON notifications
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "devices_tenant_isolation" ON devices
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mobile_scan_records_tenant_isolation" ON mobile_scan_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "offline_sync_records_tenant_isolation" ON offline_sync_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "shortcuts_tenant_isolation" ON shortcuts
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "user_settings_tenant_isolation" ON user_settings
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "patrol_records_tenant_isolation" ON patrol_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "scan_records_tenant_isolation" ON scan_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "photo_evidences_tenant_isolation" ON photo_evidences
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "audio_recordings_tenant_isolation" ON audio_recordings
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "video_recordings_tenant_isolation" ON video_recordings
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mobile_tasks_tenant_isolation" ON mobile_tasks
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "offline_operations_tenant_isolation" ON offline_operations
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "sync_policies_tenant_isolation" ON sync_policies
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "push_devices_tenant_isolation" ON push_devices
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "push_notifications_tenant_isolation" ON push_notifications
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "push_templates_tenant_isolation" ON push_templates
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "barcode_scans_tenant_isolation" ON barcode_scans
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "photo_uploads_tenant_isolation" ON photo_uploads
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "mobile_approvals_tenant_isolation" ON mobile_approvals
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "media_files_tenant_isolation" ON media_files
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "inventory_items_tenant_isolation" ON inventory_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "stocktake_tasks_tenant_isolation" ON stocktake_tasks
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "stocktake_records_tenant_isolation" ON stocktake_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "inbound_orders_tenant_isolation" ON inbound_orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "outbound_orders_tenant_isolation" ON outbound_orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "quality_tasks_tenant_isolation" ON quality_tasks
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "defect_records_tenant_isolation" ON defect_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "production_orders_tenant_isolation" ON production_orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "work_reports_tenant_isolation" ON work_reports
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "equipment_tenant_isolation" ON equipment
    USING (tenant_id = current_setting('app.tenant_id')::uuid);