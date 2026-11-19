-- 资源级 ACL 只读权限码：管理台「授权查询 / 按资源查看授权」使用。
--
-- 与 iam:resource_acl:write / delete 对称：
--   * 只新增权限码与角色授权，不改 iam.resource_permissions 表结构，不改 RLS 策略；
--   * tenant_admin 默认持有，但 tenant_scope::is_platform_code 仍判定 iam:* 为平台层，
--     租户管理员不能再把该码授予其它租户角色；
--   * 读取范围由 iam_acl_read_scope 收敛：tenant_admin 只能看本租户，
--     平台管理员（admin/superadmin）看全量。
--
-- 幂等：权限码与角色授权均按 code / (role_id, permission_id) 去重。

INSERT INTO public.core_permissions (code, name, description, resource, action, level)
SELECT v.code, v.name, v.description, v.resource, v.action, 1
FROM (
    VALUES
        (
            'iam:resource_acl:read',
            '资源级 ACL-查询',
            '查询角色/用户持有的资源级授权，以及按资源反查授权主体',
            'iam:resource_acl',
            'read'
        )
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions p WHERE p.code = v.code
);

INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p
  ON p.code = 'iam:resource_acl:read'
WHERE r.name IN ('tenant_admin', 'admin', 'superadmin')
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
