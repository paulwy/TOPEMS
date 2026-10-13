-- 清理 mobile schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS audio_recordings_tenant_policy ON mobile.audio_recordings;
DROP POLICY IF EXISTS mobile_tasks_tenant_policy ON mobile.mobile_tasks;
DROP POLICY IF EXISTS patrol_records_tenant_policy ON mobile.patrol_records;
DROP POLICY IF EXISTS scan_records_tenant_policy ON mobile.scan_records;
DROP POLICY IF EXISTS video_recordings_tenant_policy ON mobile.video_recordings;
DROP POLICY IF EXISTS photo_evidences_tenant_policy ON mobile.photo_evidences;
DROP POLICY IF EXISTS barcode_scans_tenant_policy ON mobile.barcode_scans;
DROP POLICY IF EXISTS devices_tenant_policy ON mobile.devices;
DROP POLICY IF EXISTS media_files_tenant_policy ON mobile.media_files;
DROP POLICY IF EXISTS mobile_scan_records_tenant_policy ON mobile.mobile_scan_records;
DROP POLICY IF EXISTS mobile_users_tenant_policy ON mobile.mobile_users;
DROP POLICY IF EXISTS offline_operations_tenant_policy ON mobile.offline_operations;
DROP POLICY IF EXISTS offline_sync_records_tenant_policy ON mobile.offline_sync_records;
DROP POLICY IF EXISTS photo_uploads_tenant_policy ON mobile.photo_uploads;
DROP POLICY IF EXISTS push_devices_tenant_policy ON mobile.push_devices;
DROP POLICY IF EXISTS push_templates_tenant_policy ON mobile.push_templates;
DROP POLICY IF EXISTS push_notifications_tenant_policy ON mobile.push_notifications;
DROP POLICY IF EXISTS sync_policies_tenant_policy ON mobile.sync_policies;
