-- tenant_admin 平台层权限码兜底收回（2026-11-08）
--
-- 目的：
--   让 tenant_admin 在任何历史状态下都只能停留在租户域。若该角色因历史遗留或
--   人工误授仍持有 iam:/admin:/system:/migration:/plugin:/subscription:/monitor:
--   或平台侧 tenant:*（tenant:iam:* 除外）权限码，本迁移一律收回。
--
-- 与 20261108110000 的关系：
--   110000 负责“加法”（新增 tenant:iam:* 并授予）；本迁移负责“减法”（清掉平台层
--   遗留码）。两者顺序执行，tenant:iam:* 不会被本迁移删除。
--
-- 幂等：DELETE 无匹配即为 no-op；可重复执行。
--
-- ROLLBACK：本迁移只删除历史误授行，无法也不应自动恢复。如需回滚，请从变更前
--           的备份恢复 core_role_permissions 中 tenant_admin 的对应行。

DELETE FROM public.core_role_permissions rp
USING public.core_roles r, public.core_permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'tenant_admin'
  AND (
      p.code LIKE 'iam:%'
      OR p.code LIKE 'admin:%'
      OR p.code LIKE 'system:%'
      OR p.code LIKE 'migration:%'
      OR p.code LIKE 'plugin:%'
      OR p.code LIKE 'subscription:%'
      OR p.code LIKE 'monitor:%'
      OR (p.code LIKE 'tenant:%' AND p.code NOT LIKE 'tenant:iam:%')
  );

-- 证据：迁移后 tenant_admin 不应再持有任何平台层码（用于人工核对，不改变数据）
-- SELECT p.code
--   FROM public.core_role_permissions rp
--   JOIN public.core_roles r ON r.id = rp.role_id
--   JOIN public.core_permissions p ON p.id = rp.permission_id
--  WHERE r.name = 'tenant_admin'
--    AND (p.code LIKE 'iam:%' OR p.code LIKE 'admin:%' OR p.code LIKE 'system:%'
--         OR p.code LIKE 'migration:%' OR p.code LIKE 'plugin:%'
--         OR p.code LIKE 'subscription:%' OR p.code LIKE 'monitor:%'
--         OR (p.code LIKE 'tenant:%' AND p.code NOT LIKE 'tenant:iam:%'));
