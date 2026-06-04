-- 权限管理初始化数据
-- 插入默认权限和角色

-- 插入默认角色
INSERT INTO roles (code, name, description, is_system, is_active)
VALUES 
    ('admin', '系统管理员', '拥有系统所有权限的管理员角色', TRUE, TRUE),
    ('developer', '开发人员', '开发人员角色', FALSE, TRUE),
    ('manager', '部门经理', '部门经理角色', FALSE, TRUE),
    ('user', '普通用户', '普通用户角色', FALSE, TRUE),
    ('guest', '访客', '访客角色', FALSE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 插入项目管理模块权限
INSERT INTO permissions (code, name, description, category, module)
VALUES 
    ('projects.read', '项目查看', '查看项目信息', '项目管理', 'projects'),
    ('projects.create', '项目创建', '创建新项目', '项目管理', 'projects'),
    ('projects.update', '项目更新', '更新项目信息', '项目管理', 'projects'),
    ('projects.delete', '项目删除', '删除项目', '项目管理', 'projects'),
    ('projects.admin', '项目管理', '项目全部管理权限', '项目管理', 'projects')
ON CONFLICT (code) DO NOTHING;

-- 插入RS模块权限
INSERT INTO permissions (code, name, description, category, module)
VALUES 
    ('rs.read', 'RS查看', 'RS模块读取权限', 'RS模块', 'rs'),
    ('rs.create', 'RS创建', 'RS模块创建权限', 'RS模块', 'rs'),
    ('rs.update', 'RS更新', 'RS模块更新权限', 'RS模块', 'rs'),
    ('rs.delete', 'RS删除', 'RS模块删除权限', 'RS模块', 'rs'),
    ('rs.admin', 'RS管理', 'RS模块管理权限', 'RS模块', 'rs')
ON CONFLICT (code) DO NOTHING;

-- 插入LIMS模块权限
INSERT INTO permissions (code, name, description, category, module)
VALUES 
    ('lims.read', 'LIMS查看', 'LIMS模块读取权限', 'LIMS模块', 'lims'),
    ('lims.create', 'LIMS创建', 'LIMS模块创建权限', 'LIMS模块', 'lims'),
    ('lims.update', 'LIMS更新', 'LIMS模块更新权限', 'LIMS模块', 'lims'),
    ('lims.delete', 'LIMS删除', 'LIMS模块删除权限', 'LIMS模块', 'lims'),
    ('lims.admin', 'LIMS管理', 'LIMS模块管理权限', 'LIMS模块', 'lims')
ON CONFLICT (code) DO NOTHING;

-- 插入QMS模块权限
INSERT INTO permissions (code, name, description, category, module)
VALUES 
    ('qms.read', 'QMS查看', 'QMS模块读取权限', 'QMS模块', 'qms'),
    ('qms.create', 'QMS创建', 'QMS模块创建权限', 'QMS模块', 'qms'),
    ('qms.update', 'QMS更新', 'QMS模块更新权限', 'QMS模块', 'qms'),
    ('qms.delete', 'QMS删除', 'QMS模块删除权限', 'QMS模块', 'qms'),
    ('qms.admin', 'QMS管理', 'QMS模块管理权限', 'QMS模块', 'qms')
ON CONFLICT (code) DO NOTHING;

-- 插入EHS模块权限
INSERT INTO permissions (code, name, description, category, module)
VALUES 
    ('ehs.read', 'EHS查看', 'EHS模块读取权限', 'EHS模块', 'ehs'),
    ('ehs.create', 'EHS创建', 'EHS模块创建权限', 'EHS模块', 'ehs'),
    ('ehs.update', 'EHS更新', 'EHS模块更新权限', 'EHS模块', 'ehs'),
    ('ehs.delete', 'EHS删除', 'EHS模块删除权限', 'EHS模块', 'ehs'),
    ('ehs.admin', 'EHS管理', 'EHS模块管理权限', 'EHS模块', 'ehs')
ON CONFLICT (code) DO NOTHING;

-- 插入SRM模块权限
INSERT INTO permissions (code, name, description, category, module)
VALUES 
    ('srm.read', 'SRM查看', 'SRM模块读取权限', 'SRM模块', 'srm'),
    ('srm.create', 'SRM创建', 'SRM模块创建权限', 'SRM模块', 'srm'),
    ('srm.update', 'SRM更新', 'SRM模块更新权限', 'SRM模块', 'srm'),
    ('srm.delete', 'SRM删除', 'SRM模块删除权限', 'SRM模块', 'srm'),
    ('srm.admin', 'SRM管理', 'SRM模块管理权限', 'SRM模块', 'srm')
ON CONFLICT (code) DO NOTHING;

-- 插入PDM模块权限
INSERT INTO permissions (code, name, description, category, module)
VALUES 
    ('pdm.read', 'PDM查看', 'PDM模块读取权限', 'PDM模块', 'pdm'),
    ('pdm.create', 'PDM创建', 'PDM模块创建权限', 'PDM模块', 'pdm'),
    ('pdm.update', 'PDM更新', 'PDM模块更新权限', 'PDM模块', 'pdm'),
    ('pdm.delete', 'PDM删除', 'PDM模块删除权限', 'PDM模块', 'pdm'),
    ('pdm.admin', 'PDM管理', 'PDM模块管理权限', 'PDM模块', 'pdm')
ON CONFLICT (code) DO NOTHING;

-- 插入Workflow模块权限
INSERT INTO permissions (code, name, description, category, module)
VALUES 
    ('workflow.read', 'Workflow查看', 'Workflow模块读取权限', 'Workflow模块', 'workflow'),
    ('workflow.create', 'Workflow创建', 'Workflow模块创建权限', 'Workflow模块', 'workflow'),
    ('workflow.update', 'Workflow更新', 'Workflow模块更新权限', 'Workflow模块', 'workflow'),
    ('workflow.delete', 'Workflow删除', 'Workflow模块删除权限', 'Workflow模块', 'workflow'),
    ('workflow.admin', 'Workflow管理', 'Workflow模块管理权限', 'Workflow模块', 'workflow')
ON CONFLICT (code) DO NOTHING;

-- 插入文档模块权限
INSERT INTO permissions (code, name, description, category, module)
VALUES 
    ('doc.read', '文档查看', '文档模块读取权限', '文档管理', 'doc'),
    ('doc.create', '文档创建', '文档模块创建权限', '文档管理', 'doc'),
    ('doc.update', '文档更新', '文档模块更新权限', '文档管理', 'doc'),
    ('doc.delete', '文档删除', '文档模块删除权限', '文档管理', 'doc'),
    ('doc.admin', '文档管理', '文档模块管理权限', '文档管理', 'doc')
ON CONFLICT (code) DO NOTHING;

-- 插入AI模块权限
INSERT INTO permissions (code, name, description, category, module)
VALUES 
    ('ai.read', 'AI查看', 'AI模块读取权限', 'AI模块', 'ai'),
    ('ai.create', 'AI创建', 'AI模块创建权限', 'AI模块', 'ai'),
    ('ai.update', 'AI更新', 'AI模块更新权限', 'AI模块', 'ai'),
    ('ai.delete', 'AI删除', 'AI模块删除权限', 'AI模块', 'ai'),
    ('ai.admin', 'AI管理', 'AI模块管理权限', 'AI模块', 'ai')
ON CONFLICT (code) DO NOTHING;

-- 插入邮件模块权限
INSERT INTO permissions (code, name, description, category, module)
VALUES 
    ('mail.read', '邮件查看', '邮件模块读取权限', '邮件管理', 'mail'),
    ('mail.create', '邮件创建', '邮件模块创建权限', '邮件管理', 'mail'),
    ('mail.update', '邮件更新', '邮件模块更新权限', '邮件管理', 'mail'),
    ('mail.delete', '邮件删除', '邮件模块删除权限', '邮件管理', 'mail'),
    ('mail.admin', '邮件管理', '邮件模块管理权限', '邮件管理', 'mail')
ON CONFLICT (code) DO NOTHING;

-- 插入用户管理模块权限
INSERT INTO permissions (code, name, description, category, module)
VALUES 
    ('users.read', '用户查看', '用户查看权限', '用户管理', 'users'),
    ('users.create', '用户创建', '用户创建权限', '用户管理', 'users'),
    ('users.update', '用户更新', '用户更新权限', '用户管理', 'users'),
    ('users.delete', '用户删除', '用户删除权限', '用户管理', 'users'),
    ('users.admin', '用户管理', '用户管理权限', '用户管理', 'users')
ON CONFLICT (code) DO NOTHING;

-- 插入角色管理模块权限
INSERT INTO permissions (code, name, description, category, module)
VALUES 
    ('roles.read', '角色查看', '角色查看权限', '角色管理', 'roles'),
    ('roles.create', '角色创建', '角色创建权限', '角色管理', 'roles'),
    ('roles.update', '角色更新', '角色更新权限', '角色管理', 'roles'),
    ('roles.delete', '角色删除', '角色删除权限', '角色管理', 'roles'),
    ('roles.admin', '角色管理', '角色管理权限', '角色管理', 'roles')
ON CONFLICT (code) DO NOTHING;

-- 插入系统管理模块权限
INSERT INTO permissions (code, name, description, category, module)
VALUES 
    ('system.settings', '系统设置', '系统设置权限', '系统管理', 'system'),
    ('system.logs', '系统日志', '系统日志查看权限', '系统管理', 'system'),
    ('system.backup', '系统备份', '系统备份权限', '系统管理', 'system'),
    ('system.restore', '系统恢复', '系统恢复权限', '系统管理', 'system'),
    ('system.admin', '系统管理', '系统全部管理权限', '系统管理', 'system')
ON CONFLICT (code) DO NOTHING;

-- 为管理员角色分配所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;

-- 为开发人员角色分配读写权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'developer' 
  AND p.code LIKE '%.read' OR p.code LIKE '%.create' OR p.code LIKE '%.update'
ON CONFLICT DO NOTHING;

-- 为经理角色分配读写权限和项目管理权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'manager' 
  AND (p.code LIKE '%.read' OR p.code LIKE '%.create' OR p.code LIKE '%.update' OR p.code LIKE 'projects.%')
ON CONFLICT DO NOTHING;

-- 为普通用户角色分配只读权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'user' 
  AND p.code LIKE '%.read'
ON CONFLICT DO NOTHING;

-- 为访客角色分配部分只读权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'guest' 
  AND p.code LIKE '%.read'
  AND p.module IN ('projects', 'rs', 'lims', 'qms', 'ehs', 'srm', 'pdm')
ON CONFLICT DO NOTHING;
