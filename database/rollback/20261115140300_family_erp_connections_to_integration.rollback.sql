-- 回滚 20261115140300 family_erp_connections_to_integration
-- 只删除本迁移插入的行：这些 id 在源表存在；执行前已核验目标侧无同 id 既有行。
DELETE FROM integration.erp_connections WHERE id IN (SELECT id FROM public.erp_connections);
