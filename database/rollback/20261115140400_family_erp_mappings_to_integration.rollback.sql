-- 回滚 20261115140400 family_erp_mappings_to_integration
-- 只删除本迁移插入的行：这些 id 在源表存在；执行前已核验目标侧无同 id 既有行。
DELETE FROM integration.erp_mappings WHERE id IN (SELECT id FROM public.erp_mappings);
