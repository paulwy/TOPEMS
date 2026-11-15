-- 20261115140500 family_external_erp_sync_logs_to_integration
-- 13 列同名；目标多 deleted_at(可空)
-- 幂等：ON CONFLICT (id) DO NOTHING；事务由 apply-forward.sh 包裹（文件内禁止 BEGIN/COMMIT）。
INSERT INTO integration.external_erp_sync_logs (id,tenant_id,connection_id,entity,direction,status,total_records,success_count,failed_count,error_message,started_at,completed_at,created_at)
SELECT id,
       tenant_id,
       connection_id,
       entity,
       direction,
       status,
       total_records,
       success_count,
       failed_count,
       error_message,
       started_at,
       completed_at,
       created_at
FROM public.external_erp_sync_logs
ON CONFLICT (id) DO NOTHING;
