-- 20261115140400 family_erp_mappings_to_integration
-- 15 列同名；目标多 deleted_at(可空)
-- 幂等：ON CONFLICT (id) DO NOTHING；事务由 apply-forward.sh 包裹（文件内禁止 BEGIN/COMMIT）。
INSERT INTO integration.erp_mappings (id,tenant_id,connection_id,mapping_type,local_id,local_code,local_name,external_code,external_name,direction,isactive,priority,condition,created_at,updated_at)
SELECT id,
       tenant_id,
       connection_id,
       mapping_type,
       local_id,
       local_code,
       local_name,
       external_code,
       external_name,
       direction,
       isactive,
       priority,
       condition,
       created_at,
       updated_at
FROM public.erp_mappings
ON CONFLICT (id) DO NOTHING;
