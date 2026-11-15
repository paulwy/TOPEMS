-- 20261115140300 family_erp_connections_to_integration
-- 16 列同名；api_url varchar(512)→text 无损；目标多 5 列可空
-- 幂等：ON CONFLICT (id) DO NOTHING；事务由 apply-forward.sh 包裹（文件内禁止 BEGIN/COMMIT）。
INSERT INTO integration.erp_connections (id,tenant_id,name,type,api_url,api_version,app_key,app_secret,sync_direction,sync_mode,sync_interval,status,isactive,last_sync_at,created_at,updated_at)
SELECT id,
       tenant_id,
       name,
       type,
       api_url,
       api_version,
       app_key,
       app_secret,
       sync_direction,
       sync_mode,
       sync_interval,
       status,
       isactive,
       last_sync_at,
       created_at,
       updated_at
FROM public.erp_connections
ON CONFLICT (id) DO NOTHING;
