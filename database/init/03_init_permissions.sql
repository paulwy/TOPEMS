-- ============================================================
-- TOPEMS 权限系统初始化脚本
-- 文件: database/init/03_init_permissions.sql
-- 说明: 完整的权限系统初始化，包括所有模块权限、角色和On-Premise模式配置
-- 适用: 首次部署或全新安装
-- ============================================================

-- ============================================================
-- 第一部分：租户表（On-Premise 模式）
-- ============================================================

-- 创建 tenants 表（如果不存在）
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
    name VARCHAR(128) NOT NULL DEFAULT 'Default Tenant',
    slug VARCHAR(64) NOT NULL DEFAULT 'default',
    status VARCHAR(32) DEFAULT 'active',
    plan VARCHAR(32) DEFAULT 'enterprise',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 插入默认租户（On-Premise 模式）
INSERT INTO tenants (id, name, slug, status, plan)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Tenant',
    'default',
    'active',
    'enterprise'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 第二部分：IAM 表结构
-- ============================================================

-- 用户表
CREATE TABLE IF NOT EXISTS core_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(128),
    phone VARCHAR(32),
    avatar_url VARCHAR(512),
    status VARCHAR(32) DEFAULT 'active',
    is_superuser BOOLEAN DEFAULT FALSE,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

-- 角色表
CREATE TABLE IF NOT EXISTS core_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 权限表
CREATE TABLE IF NOT EXISTS core_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(128) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    resource VARCHAR(64),
    action VARCHAR(32),
    level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS core_user_roles (
    user_id UUID NOT NULL REFERENCES core_users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES core_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS core_role_permissions (
    role_id UUID NOT NULL REFERENCES core_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES core_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- 第三部分：创建索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_core_users_username ON core_users(username);
CREATE INDEX IF NOT EXISTS idx_core_users_email ON core_users(email);
CREATE INDEX IF NOT EXISTS idx_core_users_tenant_id ON core_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_roles_name ON core_roles(name);
CREATE INDEX IF NOT EXISTS idx_core_roles_tenant_id ON core_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_permissions_code ON core_permissions(code);
CREATE INDEX IF NOT EXISTS idx_core_permissions_resource ON core_permissions(resource);

-- ============================================================
-- 第四部分：插入所有模块权限
-- ============================================================

-- Dashboard 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('dashboard:read', '仪表盘-只读', '查看仪表盘和首页数据', 'dashboard', 'read', 1),
('dashboard:write', '仪表盘-写入', '自定义仪表盘配置', 'dashboard', 'write', 2),
('dashboard:admin', '仪表盘-管理', '管理所有仪表盘配置', 'dashboard', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- IAM 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('iam:read', '身份管理-只读', '查看用户、角色和权限', 'iam', 'read', 1),
('iam:write', '身份管理-写入', '创建和修改用户、角色', 'iam', 'write', 2),
('iam:delete', '身份管理-删除', '删除用户和角色', 'iam', 'delete', 3),
('iam:admin', '身份管理-管理', '完整管理身份认证和访问控制', 'iam', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- HRM 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('hrm:read', '人力资源-只读', '查看员工、公司、部门信息', 'hrm', 'read', 1),
('hrm:write', '人力资源-写入', '创建和修改员工、部门', 'hrm', 'write', 2),
('hrm:delete', '人力资源-删除', '删除员工和部门', 'hrm', 'delete', 3),
('hrm:admin', '人力资源-管理', '完整管理人力资源模块', 'hrm', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- ERP 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('erp:read', '企业资源-只读', '查看企业资源信息', 'erp', 'read', 1),
('erp:write', '企业资源-写入', '创建和修改企业资源', 'erp', 'write', 2),
('erp:delete', '企业资源-删除', '删除企业资源', 'erp', 'delete', 3),
('erp:admin', '企业资源-管理', '完整管理企业资源模块', 'erp', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- Finance 财务管理模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('finance:read', '财务管理-只读', '查看财务数据', 'finance', 'read', 1),
('finance:write', '财务管理-写入', '创建和修改财务数据', 'finance', 'write', 2),
('finance:delete', '财务管理-删除', '删除财务数据', 'finance', 'delete', 3),
('finance:admin', '财务管理-管理', '完整管理财务管理模块', 'finance', 'admin', 4),
('finance:voucher:read', '财务凭证-只读', '查看凭证', 'finance', 'voucher_read', 1),
('finance:voucher:create', '财务凭证-创建', '创建凭证', 'finance', 'voucher_create', 2),
('finance:voucher:update', '财务凭证-更新', '更新凭证', 'finance', 'voucher_update', 2),
('finance:voucher:delete', '财务凭证-删除', '删除凭证', 'finance', 'voucher_delete', 3),
('finance:account:read', '账户管理-只读', '查看账户', 'finance', 'account_read', 1),
('finance:account:write', '账户管理-写入', '创建和修改账户', 'finance', 'account_write', 2),
('finance:counterparty:read', '往来单位-只读', '查看往来单位', 'finance', 'counterparty_read', 1),
('finance:counterparty:write', '往来单位-写入', '创建和修改往来单位', 'finance', 'counterparty_write', 2),
('finance:receivable:read', '应收账款-只读', '查看应收账款', 'finance', 'receivable_read', 1),
('finance:receivable:write', '应收账款-写入', '创建和修改应收账款', 'finance', 'receivable_write', 2),
('finance:payable:read', '应付账款-只读', '查看应付账款', 'finance', 'payable_read', 1),
('finance:payable:write', '应付账款-写入', '创建和修改应付账款', 'finance', 'payable_write', 2),
('finance:period:read', '会计期间-只读', '查看会计期间', 'finance', 'period_read', 1),
('finance:period:write', '会计期间-写入', '创建和修改会计期间', 'finance', 'period_write', 2),
('finance:budget:read', '预算管理-只读', '查看预算', 'finance', 'budget_read', 1),
('finance:budget:write', '预算管理-写入', '创建和修改预算', 'finance', 'budget_write', 2),
('finance:budget:approve', '预算管理-审批', '审批预算', 'finance', 'budget_approve', 3),
('finance:tax:read', '税务管理-只读', '查看税务数据', 'finance', 'tax_read', 1),
('finance:tax:write', '税务管理-写入', '创建和修改税务数据', 'finance', 'tax_write', 2),
('finance:cost:read', '成本管理-只读', '查看成本数据', 'finance', 'cost_read', 1),
('finance:cost:write', '成本管理-写入', '创建和修改成本数据', 'finance', 'cost_write', 2),
('finance:template:read', '凭证模板-只读', '查看凭证模板', 'finance', 'template_read', 1),
('finance:template:write', '凭证模板-写入', '创建和修改凭证模板', 'finance', 'template_write', 2),
('finance:report:read', '财务报表-只读', '查看财务报表', 'finance', 'report_read', 1),
('finance:report:write', '财务报表-写入', '创建和修改财务报表', 'finance', 'report_write', 2),
('finance:analysis:read', '财务分析-只读', '查看财务分析', 'finance', 'analysis_read', 1),
('finance:cash:read', '现金流分析-只读', '查看现金流分析', 'finance', 'cash_read', 1),
('finance:dictionary:read', '数据字典-只读', '查看数据字典', 'finance', 'dictionary_read', 1),
('finance:dictionary:write', '数据字典-写入', '创建和修改数据字典', 'finance', 'dictionary_write', 2),
('finance:workflow:read', '流程配置-只读', '查看流程配置', 'finance', 'workflow_read', 1),
('finance:workflow:write', '流程配置-写入', '创建和修改流程配置', 'finance', 'workflow_write', 2),
('finance:integration:read', '系统集成-只读', '查看系统集成', 'finance', 'integration_read', 1),
('finance:integration:write', '系统集成-写入', '配置系统集成', 'finance', 'integration_write', 2)
ON CONFLICT (code) DO NOTHING;

-- PM 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('pm:read', '项目管理-只读', '查看项目信息', 'pm', 'read', 1),
('pm:write', '项目管理-写入', '创建和修改项目', 'pm', 'write', 2),
('pm:delete', '项目管理-删除', '删除项目', 'pm', 'delete', 3),
('pm:admin', '项目管理-管理', '完整管理项目模块', 'pm', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- RS 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('rs:read', '研发管理-只读', '查看研发项目信息', 'rs', 'read', 1),
('rs:write', '研发管理-写入', '创建和修改研发项目', 'rs', 'write', 2),
('rs:delete', '研发管理-删除', '删除研发项目', 'rs', 'delete', 3),
('rs:admin', '研发管理-管理', '完整管理研发模块', 'rs', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- SCM 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('scm:read', '供应链-只读', '查看供应链信息', 'scm', 'read', 1),
('scm:write', '供应链-写入', '创建和修改供应链数据', 'scm', 'write', 2),
('scm:delete', '供应链-删除', '删除供应链数据', 'scm', 'delete', 3),
('scm:admin', '供应链-管理', '完整管理供应链模块', 'scm', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- CRM 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('crm:read', '客户关系-只读', '查看客户和商机信息', 'crm', 'read', 1),
('crm:write', '客户关系-写入', '创建和修改客户和商机', 'crm', 'write', 2),
('crm:delete', '客户关系-删除', '删除客户和商机', 'crm', 'delete', 3),
('crm:admin', '客户关系-管理', '完整管理客户关系模块', 'crm', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- AI 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('ai:read', 'AI助手-只读', '使用AI对话和查询', 'ai', 'read', 1),
('ai:write', 'AI助手-写入', '创建和管理AI会话', 'ai', 'write', 2),
('ai:delete', 'AI助手-删除', '删除AI会话', 'ai', 'delete', 3),
('ai:admin', 'AI助手-管理', '完整管理AI模块', 'ai', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- GIS 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('gis:read', '地理信息-只读', '查看地图和位置信息', 'gis', 'read', 1),
('gis:write', '地理信息-写入', '创建和修改地图数据', 'gis', 'write', 2),
('gis:delete', '地理信息-删除', '删除地图数据', 'gis', 'delete', 3),
('gis:admin', '地理信息-管理', '完整管理地理信息模块', 'gis', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- QMS 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('qms:read', '质量管理-只读', '查看质量标准和审核记录', 'qms', 'read', 1),
('qms:write', '质量管理-写入', '创建和修改质量标准', 'qms', 'write', 2),
('qms:delete', '质量管理-删除', '删除质量标准', 'qms', 'delete', 3),
('qms:admin', '质量管理-管理', '完整管理质量模块', 'qms', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- EHS 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('ehs:read', '环境健康安全-只读', '查看环境和安全信息', 'ehs', 'read', 1),
('ehs:write', '环境健康安全-写入', '创建和修改环境和安全记录', 'ehs', 'write', 2),
('ehs:delete', '环境健康安全-删除', '删除环境和安全记录', 'ehs', 'delete', 3),
('ehs:admin', '环境健康安全-管理', '完整管理EHS模块', 'ehs', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- MES 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('mes:read', '制造执行-只读', '查看生产执行数据', 'mes', 'read', 1),
('mes:write', '制造执行-写入', '创建和修改生产任务', 'mes', 'write', 2),
('mes:delete', '制造执行-删除', '删除生产任务', 'mes', 'delete', 3),
('mes:admin', '制造执行-管理', '完整管理MES模块', 'mes', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- WMS 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('wms:read', '仓储管理-只读', '查看仓储和库存信息', 'wms', 'read', 1),
('wms:write', '仓储管理-写入', '创建和修改仓储数据', 'wms', 'write', 2),
('wms:delete', '仓储管理-删除', '删除仓储数据', 'wms', 'delete', 3),
('wms:admin', '仓储管理-管理', '完整管理WMS模块', 'wms', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- Workflow 模块权限（特殊模块，支持 approve 操作）
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('workflow:read', '工作流-只读', '查看工作流定义和实例', 'workflow', 'read', 1),
('workflow:write', '工作流-写入', '创建和修改工作流', 'workflow', 'write', 2),
('workflow:delete', '工作流-删除', '删除工作流', 'workflow', 'delete', 3),
('workflow:approve', '工作流-审批', '审批工作流任务', 'workflow', 'approve', 3),
('workflow:admin', '工作流-管理', '完整管理工作流模块', 'workflow', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- Doc 模块权限（基础设施，与 IAM 联动）
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('doc:read', '文档管理-只读', '查看文档', 'doc', 'read', 1),
('doc:write', '文档管理-写入', '创建和修改文档', 'doc', 'write', 2),
('doc:delete', '文档管理-删除', '删除文档', 'doc', 'delete', 3),
('doc:admin', '文档管理-管理', '完整管理文档模块', 'doc', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- File 模块权限（基础设施，与 IAM 联动）
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('file:read', '文件服务-只读', '查看文件', 'file', 'read', 1),
('file:write', '文件服务-写入', '上传和管理文件', 'file', 'write', 2),
('file:delete', '文件服务-删除', '删除文件', 'file', 'delete', 3),
('file:admin', '文件服务-管理', '完整管理文件模块', 'file', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- Notification 模块权限（基础设施，与 IAM 联动）
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('notification:read', '通知服务-只读', '查看通知', 'notification', 'read', 1),
('notification:write', '通知服务-写入', '发送通知', 'notification', 'write', 2),
('notification:delete', '通知服务-删除', '删除通知', 'notification', 'delete', 3),
('notification:admin', '通知服务-管理', '完整管理通知模块', 'notification', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- IM 模块权限（基础设施，与 IAM 联动）
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('im:read', '即时通讯-只读', '查看消息', 'im', 'read', 1),
('im:write', '即时通讯-写入', '发送消息', 'im', 'write', 2),
('im:delete', '即时通讯-删除', '删除消息', 'im', 'delete', 3),
('im:admin', '即时通讯-管理', '完整管理即时通讯模块', 'im', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- Integration 模块权限（基础设施，与 IAM 联动）
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('integration:read', '系统集成-只读', '查看集成配置', 'integration', 'read', 1),
('integration:write', '系统集成-写入', '配置系统集成', 'integration', 'write', 2),
('integration:delete', '系统集成-删除', '删除集成配置', 'integration', 'delete', 3),
('integration:admin', '系统集成-管理', '完整管理系统集成', 'integration', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- System 设置权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('system:settings', '系统设置', '修改系统配置', 'system', 'settings', 4),
('system:monitor', '系统监控', '查看系统监控', 'system', 'monitor', 1),
('system:audit', '审计日志', '查看审计日志', 'system', 'audit', 1),
('system:dictionary', '字典管理', '管理系统字典', 'system', 'dictionary', 3),
('system:plugin', '插件管理', '管理插件', 'system', 'plugin', 4),
('system:migration', '数据迁移', '执行数据迁移', 'system', 'migration', 4)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 第五部分：创建默认角色
-- ============================================================

-- 超级管理员
INSERT INTO core_roles (name, description, tenant_id)
VALUES ('superadmin', '超级管理员 - 拥有所有权限', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (name) DO NOTHING;

-- 管理员
INSERT INTO core_roles (name, description, tenant_id)
VALUES ('admin', '管理员 - 拥有大部分管理权限', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (name) DO NOTHING;

-- HR 管理员
INSERT INTO core_roles (name, description, tenant_id)
VALUES ('hr_admin', 'HR管理员 - 人力资源管理权限', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (name) DO NOTHING;

-- 项目经理
INSERT INTO core_roles (name, description, tenant_id)
VALUES ('project_manager', '项目经理 - 项目管理权限', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (name) DO NOTHING;

-- 普通员工
INSERT INTO core_roles (name, description, tenant_id)
VALUES ('employee', '普通员工 - 基础访问权限', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 第六部分：分配角色权限
-- ============================================================

-- 超级管理员：拥有所有权限
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r, core_permissions p 
WHERE r.name = 'superadmin'
ON CONFLICT DO NOTHING;

-- 管理员：IAM读写 + 基础设施 + 系统设置 + 财务管理
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r, core_permissions p 
WHERE r.name = 'admin' 
AND (
    p.code LIKE 'iam:%' 
    OR p.code LIKE 'doc:%'
    OR p.code LIKE 'file:%'
    OR p.code LIKE 'notification:%'
    OR p.code LIKE 'im:%'
    OR p.code LIKE 'integration:%'
    OR p.code LIKE 'system:%'
    OR p.code LIKE 'finance:%'
    OR p.resource IN ('dashboard', 'hrm', 'erp', 'pm', 'rs', 'scm', 'crm', 'ai', 'gis', 'qms', 'ehs', 'mes', 'wms', 'workflow')
)
ON CONFLICT DO NOTHING;

-- HR 管理员：HRM 全部 + IAM 只读
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r, core_permissions p 
WHERE r.name = 'hr_admin' 
AND (
    p.code LIKE 'hrm:%'
    OR p.code LIKE 'iam:read'
    OR p.code LIKE 'doc:read'
    OR p.code LIKE 'file:read'
    OR p.code LIKE 'im:read'
)
ON CONFLICT DO NOTHING;

-- 项目经理：PM 全部 + Workflow 审批
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r, core_permissions p 
WHERE r.name = 'project_manager' 
AND (
    p.code LIKE 'pm:%'
    OR p.code LIKE 'workflow:read'
    OR p.code LIKE 'workflow:approve'
    OR p.code LIKE 'doc:read'
    OR p.code LIKE 'doc:write'
)
ON CONFLICT DO NOTHING;

-- 普通员工：基础只读
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r, core_permissions p 
WHERE r.name = 'employee' 
AND (
    p.action = 'read'
    OR p.code IN ('doc:write', 'file:write', 'im:write')
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 第七部分：创建默认管理员用户
-- ============================================================

-- 注意：密码是 'admin123' 的 bcrypt 哈希值
-- 生产环境请使用更强的密码
INSERT INTO core_users (username, email, password_hash, full_name, is_superuser, tenant_id)
VALUES (
    'admin',
    'admin@topems.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.TH2wTw7P6OqE1.',
    '系统管理员',
    TRUE,
    '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (username) DO NOTHING;

-- 关联管理员到超级管理员角色
INSERT INTO core_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM core_users u, core_roles r
WHERE u.username = 'admin' AND r.name = 'superadmin'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 第八部分：显示初始化结果
-- ============================================================

SELECT '=== 权限系统初始化完成 ===' AS status;

SELECT '租户数量:' AS info, COUNT(*)::TEXT AS count FROM tenants;
SELECT '用户数量:' AS info, COUNT(*)::TEXT AS count FROM core_users;
SELECT '角色数量:' AS info, COUNT(*)::TEXT AS count FROM core_roles;
SELECT '权限数量:' AS info, COUNT(*)::TEXT AS count FROM core_permissions;

SELECT '默认角色:' AS info;
SELECT name, description FROM core_roles ORDER BY name;

SELECT '权限统计:' AS info;
SELECT resource, action, COUNT(*)::TEXT AS count 
FROM core_permissions 
GROUP BY resource, action 
ORDER BY resource, action;
