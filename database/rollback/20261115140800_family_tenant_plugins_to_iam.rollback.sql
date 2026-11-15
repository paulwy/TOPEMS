-- 回滚 20261115140800 family_tenant_plugins_to_iam
-- 只删除本迁移插入的行：这些 id 在源表存在；执行前已核验目标侧无同 id 既有行。
DELETE FROM iam.core_tenant_plugins WHERE id IN (SELECT id FROM core.core_tenant_plugins);
