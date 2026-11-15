-- 回滚 20261115141000 family_core_workflows_to_public
-- 只删除本迁移插入的行：这些 id 在源表存在；执行前已核验目标侧无同 id 既有行。
DELETE FROM public.core_workflows WHERE id IN (SELECT id FROM flow.core_workflows);
