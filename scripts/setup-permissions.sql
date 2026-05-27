-- 为 admin 角色分配所有权限
INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'rs_read', 'rs', 'read', 'RS模块读取权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'rs_read');
INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'rs_write', 'rs', 'write', 'RS模块写入权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'rs_write');
INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'rs_delete', 'rs', 'delete', 'RS模块删除权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'rs_delete');
INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'rs_admin', 'rs', 'admin', 'RS模块管理权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'rs_admin');

INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'lims_read', 'lims', 'read', 'LIMS模块读取权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'lims_read');
INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'lims_write', 'lims', 'write', 'LIMS模块写入权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'lims_write');
INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'lims_delete', 'lims', 'delete', 'LIMS模块删除权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'lims_delete');
INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'lims_admin', 'lims', 'admin', 'LIMS模块管理权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'lims_admin');

INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'ai_read', 'ai', 'read', 'AI模块读取权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'ai_read');
INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'ai_write', 'ai', 'write', 'AI模块写入权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'ai_write');
INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'ai_delete', 'ai', 'delete', 'AI模块删除权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'ai_delete');
INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'ai_admin', 'ai', 'admin', 'AI模块管理权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'ai_admin');

INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'doc_read', 'doc', 'read', '文档模块读取权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'doc_read');
INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'doc_write', 'doc', 'write', '文档模块写入权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'doc_write');
INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'doc_delete', 'doc', 'delete', '文档模块删除权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'doc_delete');
INSERT INTO iam.permissions (name, resource, action, description) 
SELECT 'doc_admin', 'doc', 'admin', '文档模块管理权限' WHERE NOT EXISTS (SELECT 1 FROM iam.permissions WHERE name = 'doc_admin');

-- 为 admin 角色分配所有权限
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM iam.roles r, iam.permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
