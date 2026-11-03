-- ============================================================
-- DB-11: 5433 varchar → text 24 列对齐 test
--
-- 背景：类型批次——test=text, 5433=varchar，5433 对齐 test。
-- 分布：core.plugins 8 / crm 4 / erp 4 / hrm 2 / public 3 / bi/gis/rs/core_workflow 3。
-- ============================================================

SET lock_timeout = '5s';

ALTER TABLE bi.report_templates ALTER COLUMN output_format TYPE text USING output_format::text;
ALTER TABLE core.core_plugin_instances ALTER COLUMN runtime_url TYPE text USING runtime_url::text;
ALTER TABLE core.core_plugin_versions ALTER COLUMN download_url TYPE text USING download_url::text;
ALTER TABLE core.core_plugins ALTER COLUMN author_url TYPE text USING author_url::text;
ALTER TABLE core.core_plugins ALTER COLUMN checksum TYPE text USING checksum::text;
ALTER TABLE core.core_plugins ALTER COLUMN entry_point TYPE text USING entry_point::text;
ALTER TABLE core.core_plugins ALTER COLUMN homepage_url TYPE text USING homepage_url::text;
ALTER TABLE core.core_plugins ALTER COLUMN remote_url TYPE text USING remote_url::text;
ALTER TABLE crm.contracts ALTER COLUMN title_en TYPE text USING title_en::text;
ALTER TABLE crm.customer_segments ALTER COLUMN name_en TYPE text USING name_en::text;
ALTER TABLE crm.opportunities ALTER COLUMN name_en TYPE text USING name_en::text;
ALTER TABLE crm.tags ALTER COLUMN name_en TYPE text USING name_en::text;
ALTER TABLE erp.customers ALTER COLUMN contact_phone TYPE text USING contact_phone::text;
ALTER TABLE erp.customers ALTER COLUMN email TYPE text USING email::text;
ALTER TABLE erp.suppliers ALTER COLUMN contact_phone TYPE text USING contact_phone::text;
ALTER TABLE erp.suppliers ALTER COLUMN email TYPE text USING email::text;
ALTER TABLE gis.business_locations ALTER COLUMN contact_phone TYPE text USING contact_phone::text;
ALTER TABLE hrm.employees ALTER COLUMN name_en TYPE text USING name_en::text;
ALTER TABLE hrm.positions ALTER COLUMN name_en TYPE text USING name_en::text;
ALTER TABLE public.core_workflow_tasks ALTER COLUMN priority TYPE text USING priority::text;
ALTER TABLE public.core_workflows ALTER COLUMN code TYPE text USING code::text;
ALTER TABLE public.monitor_settings ALTER COLUMN category TYPE text USING category::text;
ALTER TABLE public.monitor_settings ALTER COLUMN key TYPE text USING key::text;
ALTER TABLE rs.formulas ALTER COLUMN approved_by TYPE text USING approved_by::text;
