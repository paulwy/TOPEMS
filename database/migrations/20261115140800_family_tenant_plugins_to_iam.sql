-- 20261115140800 family_tenant_plugins_to_iam
-- 14 列；purchase_order_id uuid→varchar(128) 转 text；版本/许可类型实测长度 0/4，无截断
-- 幂等：ON CONFLICT (id) DO NOTHING；事务由 apply-forward.sh 包裹（文件内禁止 BEGIN/COMMIT）。
INSERT INTO iam.core_tenant_plugins (id,tenant_id,plugin_id,installed_version,is_active,license_type,license_expires_at,purchase_order_id,activated_at,last_used_at,usage_count,created_at,updated_at,deleted_at)
SELECT id,
       tenant_id,
       plugin_id,
       installed_version,
       is_active,
       license_type,
       license_expires_at,
       purchase_order_id::text,
       activated_at,
       last_used_at,
       usage_count,
       created_at,
       updated_at,
       deleted_at
FROM core.core_tenant_plugins
ON CONFLICT (id) DO NOTHING;
