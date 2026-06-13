-- 为用户表添加角色和权限字段
-- 这些字段用于缓存用户的角色和权限信息，提高查询性能

ALTER TABLE IF EXISTS iam.users
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['user']::TEXT[],
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 为现有用户更新角色和权限信息
-- 根据用户角色关联表更新用户的角色
UPDATE iam.users u
SET roles = ARRAY(
    SELECT r.name
    FROM iam.user_roles ur
    JOIN iam.roles r ON ur.role_id = r.id
    WHERE ur.user_id = u.id
),
role = COALESCE(
    (SELECT r.name
     FROM iam.user_roles ur
     JOIN iam.roles r ON ur.role_id = r.id
     WHERE ur.user_id = u.id
     ORDER BY r.name
     LIMIT 1),
    'user'
)
WHERE EXISTS (
    SELECT 1 FROM iam.user_roles ur WHERE ur.user_id = u.id
);

-- 为管理员用户设置超级用户权限
UPDATE iam.users
SET is_superuser = true,
    role = 'admin',
    roles = ARRAY['admin']
WHERE username = 'admin';

-- 为超级用户添加所有权限
UPDATE iam.users u
SET permissions = ARRAY(
    SELECT DISTINCT p.name
    FROM iam.role_permissions rp
    JOIN iam.permissions p ON rp.permission_id = p.id
    JOIN iam.user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = u.id
)
WHERE EXISTS (
    SELECT 1 FROM iam.user_roles ur WHERE ur.user_id = u.id
);

-- 为没有角色的用户设置默认角色
UPDATE iam.users
SET role = 'user',
    roles = ARRAY['user']
WHERE role IS NULL OR roles IS NULL OR array_length(roles, 1) IS NULL;