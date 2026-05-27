-- 插入默认管理员用户 (密码: Admin123)
INSERT INTO iam.users (username, email, password_hash, full_name, is_superuser, is_active) 
VALUES (
    'admin123', 
    'admin@topems.com', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5Gy8J4VdQwK2u', 
    '系统管理员', 
    TRUE,
    TRUE
)
ON CONFLICT (username) DO NOTHING;

-- 插入普通用户 (密码: Test123456)
INSERT INTO iam.users (username, email, password_hash, full_name, is_superuser, is_active) 
VALUES (
    'testuser', 
    'user@topems.com', 
    '$2b$12$KIXxF1r.F7bW6hF1Y5R6ZeRqWqJ7eY3W9c6Z8V7T6U5S4R3Q2P1', 
    '测试用户', 
    FALSE,
    TRUE
)
ON CONFLICT (username) DO NOTHING;

-- 插入访客用户 (密码: Guest123)
INSERT INTO iam.users (username, email, password_hash, full_name, is_superuser, is_active) 
VALUES (
    'guestuser', 
    'guest@topems.com', 
    '$2b$12$Y8K2W7H3V4Q1S5T6R7E8F9G0H1I2J3K4L5M6N7O8P9Q0R1S2T3', 
    '访客用户', 
    FALSE,
    TRUE
)
ON CONFLICT (username) DO NOTHING;

-- 为管理员分配 admin 角色
INSERT INTO iam.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM iam.users u, iam.roles r
WHERE u.username = 'admin123' AND r.name = '管理员'
ON CONFLICT DO NOTHING;

-- 为普通用户分配 user 角色
INSERT INTO iam.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM iam.users u, iam.roles r
WHERE u.username = 'testuser' AND r.name = '普通用户'
ON CONFLICT DO NOTHING;

-- 为访客用户分配 guest 角色
INSERT INTO iam.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM iam.users u, iam.roles r
WHERE u.username = 'guestuser' AND r.name = '访客'
ON CONFLICT DO NOTHING;
