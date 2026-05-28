-- 插入默认管理员用户 (密码: admin123)
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

-- 插入普通用户 (密码: user123)
INSERT INTO iam.users (username, email, password_hash, full_name, is_superuser, is_active) 
VALUES (
    'user', 
    'user@topems.com', 
    '$2b$12$7nmt/XD86CSiSOgkUSA1cOWgpZtn5hcuYib3HPJkKqqQOKE9h5vDy', 
    '普通用户', 
    FALSE,
    TRUE
)
ON CONFLICT (username) DO UPDATE SET 
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_superuser = EXCLUDED.is_superuser,
    is_active = EXCLUDED.is_active;

-- 插入访客用户 (密码: guest123)
INSERT INTO iam.users (username, email, password_hash, full_name, is_superuser, is_active) 
VALUES (
    'guest', 
    'guest@topems.com', 
    '$2b$12$2m1Y6kIoi4rmqXUk1x6pbuVp.QGamoL6spZ1pok29BnwC0T5zCCki', 
    '访客用户', 
    FALSE,
    TRUE
)
ON CONFLICT (username) DO UPDATE SET 
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_superuser = EXCLUDED.is_superuser,
    is_active = EXCLUDED.is_active;

-- 为管理员分配 admin 角色
INSERT INTO iam.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM iam.users u, iam.roles r
WHERE u.username = 'admin' AND r.name = '管理员'
ON CONFLICT DO NOTHING;

-- 为普通用户分配 user 角色
INSERT INTO iam.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM iam.users u, iam.roles r
WHERE u.username = 'user' AND r.name = '普通用户'
ON CONFLICT DO NOTHING;

-- 为访客用户分配 guest 角色
INSERT INTO iam.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM iam.users u, iam.roles r
WHERE u.username = 'guest' AND r.name = '访客'
ON CONFLICT DO NOTHING;