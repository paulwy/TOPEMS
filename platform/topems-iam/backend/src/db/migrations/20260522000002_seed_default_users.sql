-- 插入默认超级管理员用户 (密码: admin123)
-- 注意：这是系统唯一的默认用户，其他用户需要通过正常流程创建
INSERT INTO iam.users (username, email, password_hash, full_name, is_superuser, is_active) 
VALUES (
    'admin', 
    'admin@topems.com', 
    '$2b$12$kPgIpcGnsFZp4FpVV2sMT.1A3ZNlDnEJhQ9cTrzGcu/dBUQm/FKqu', 
    '系统管理员', 
    TRUE,
    TRUE
)
ON CONFLICT (username) DO UPDATE SET 
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_superuser = EXCLUDED.is_superuser,
    is_active = EXCLUDED.is_active;

-- 为超级管理员分配管理员角色
INSERT INTO iam.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM iam.users u, iam.roles r
WHERE u.username = 'admin' AND r.name = '管理员'
ON CONFLICT DO NOTHING;