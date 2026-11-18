-- iam.resource_permissions 授权闭环：角色 → 资源批量授予 + 用户显式例外（allow / deny）
--
-- 复用既有表，不新建平行 ACL 表：
--   * role_id 非空 = 角色授予（主路径，只允许 effect='allow'）；
--   * user_id 非空 = 用户例外（effect 可为 allow/deny，判定优先于角色）；
--   * scope=platform：平台级授予，tenant_id 必须为 NULL，只有系统通道可见；
--   * scope=tenant：租户级授予，tenant_id 必须非空，租户通道只看本租户。
--
-- 撤销保留审计：撤销不物理删除，改写 deleted_at；所有判定/读取路径都必须带
-- `deleted_at IS NULL`。既有行全部是 user_id 非空、tenant_id 非空、effect 缺省
-- allow，按 scope='tenant' 处理，语义不变。

ALTER TABLE iam.resource_permissions
    ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.core_roles(id) ON DELETE CASCADE;

ALTER TABLE iam.resource_permissions
    ADD COLUMN IF NOT EXISTS effect VARCHAR(8) NOT NULL DEFAULT 'allow';

-- 授予范围：platform（tenant_id IS NULL）/ tenant（tenant_id 非空）
ALTER TABLE iam.resource_permissions
    ADD COLUMN IF NOT EXISTS scope VARCHAR(16) NOT NULL DEFAULT 'tenant';

-- 与生产对齐：生产该表已有 deleted_at（仅登记在
-- docs/quality/iam-resource-acl-drift-notes-2026-11-19.md，本迁移幂等补齐）。
ALTER TABLE iam.resource_permissions
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 用户例外与角色授予二选一；平台级授予需要 tenant_id 可为 NULL
ALTER TABLE iam.resource_permissions
    ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE iam.resource_permissions
    ALTER COLUMN tenant_id DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_resource_permissions_subject'
          AND conrelid = 'iam.resource_permissions'::regclass
    ) THEN
        ALTER TABLE iam.resource_permissions
            ADD CONSTRAINT ck_resource_permissions_subject
            CHECK (num_nonnulls(user_id, role_id) = 1);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_resource_permissions_effect'
          AND conrelid = 'iam.resource_permissions'::regclass
    ) THEN
        ALTER TABLE iam.resource_permissions
            ADD CONSTRAINT ck_resource_permissions_effect
            CHECK (effect IN ('allow', 'deny'));
    END IF;

    -- 角色授予是主路径，只表达“允许”；拒绝只存在于用户例外
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_resource_permissions_role_effect'
          AND conrelid = 'iam.resource_permissions'::regclass
    ) THEN
        ALTER TABLE iam.resource_permissions
            ADD CONSTRAINT ck_resource_permissions_role_effect
            CHECK (role_id IS NULL OR effect = 'allow');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_resource_permissions_scope'
          AND conrelid = 'iam.resource_permissions'::regclass
    ) THEN
        ALTER TABLE iam.resource_permissions
            ADD CONSTRAINT ck_resource_permissions_scope
            CHECK (scope IN ('platform', 'tenant'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_resource_permissions_scope_tenant'
          AND conrelid = 'iam.resource_permissions'::regclass
    ) THEN
        ALTER TABLE iam.resource_permissions
            ADD CONSTRAINT ck_resource_permissions_scope_tenant
            CHECK (
                (scope = 'platform' AND tenant_id IS NULL)
                OR (scope = 'tenant' AND tenant_id IS NOT NULL)
            );
    END IF;
END
$$;

-- 角色授予的幂等键：平台行 tenant_id 为 NULL，用零 UUID 归一化后再建唯一索引，
-- 避免 NULL 互不相等导致平台授予可重复插入。
CREATE UNIQUE INDEX IF NOT EXISTS uq_resource_permissions_role_scope
    ON iam.resource_permissions (
        resource_type,
        resource_id,
        role_id,
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        permission
    )
    WHERE role_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resource_permissions_role_id
    ON iam.resource_permissions (role_id)
    WHERE role_id IS NOT NULL AND deleted_at IS NULL;

-- 资源级 ACL 独立权限码：租户管理员默认持有，admin/superadmin 维持全量不变量。
INSERT INTO public.core_permissions (code, name, description, resource, action, level)
SELECT v.code, v.name, v.description, v.resource, v.action, 1
FROM (
    VALUES
        ('iam:resource_acl:write',  '资源级 ACL-授予/设置例外', '给角色批量授予资源、为用户设置 allow/deny 例外', 'iam:resource_acl', 'write'),
        ('iam:resource_acl:delete', '资源级 ACL-撤销',         '撤销角色资源授予、移除用户资源例外',             'iam:resource_acl', 'delete')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions p WHERE p.code = v.code
);

INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p
  ON p.code IN ('iam:resource_acl:write', 'iam:resource_acl:delete')
WHERE r.name IN ('tenant_admin', 'admin', 'superadmin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
