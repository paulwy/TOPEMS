-- ============================================================
-- TOPEMS 权限系统初始化脚本
-- 文件: database/init/03_init_permissions.sql
-- 说明: 完整的权限系统初始化，包括所有模块权限、角色和On-Premise模式配置
-- 适用: 首次部署或全新安装
-- ============================================================
--
-- ⚠️ 已废弃 / 未接入（P2-9，2026-10-21）：
-- 本脚本不在 sqlx 迁移链（database/migrations/）与任何部署/CI 流程中，不会自动执行；
-- 原面向已删除的 public.core_users（2026-11-26 物理删除），与现行 iam.users 权威源不一致。请勿对生产库手动执行。
-- 默认超管由服务启动自举（modules/iam/mod.rs init_database）创建，初始口令由
-- ADMIN_INITIAL_PASSWORD 提供，首登强制改密。脚本内原 admin/admin123 弱口令播种
-- 已停用（见第七部分注释块），避免误跑在生产造出弱口令账号。
-- 2026-11-26：public.core_users / iam.core_users / iam.core_user_roles 三张身份副本表
-- 已由 database/migrations/20261126110000_drop_legacy_core_users.sql 物理删除，
-- 本脚本对应建表/索引/外键/统计段落已一并移除。
-- ============================================================

-- ============================================================
-- 第一部分：租户表（On-Premise 模式）
-- ============================================================

-- 创建 tenants 表（如果不存在）
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    name character varying(128) DEFAULT 'Default Tenant'::character varying NOT NULL,
    slug character varying(64) DEFAULT 'default'::character varying NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying,
    plan character varying(32) DEFAULT 'enterprise'::character varying,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT ck_tenants_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT tenants_pkey PRIMARY KEY (id)
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

-- 用户表：public.core_users 已于 2026-11-26 随迁移 20261126110000 物理删除。
-- 身份权威表是 iam.users（认证代码只读该表），此处不再创建副本表。


-- 角色表
CREATE TABLE IF NOT EXISTS public.core_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    description text,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_roles_name_key UNIQUE (name),
    CONSTRAINT core_roles_pkey PRIMARY KEY (id)
);

-- 权限表
CREATE TABLE IF NOT EXISTS public.core_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    resource character varying(64),
    action character varying(32),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    level integer DEFAULT 1,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT core_permissions_code_key UNIQUE (code),
    CONSTRAINT core_permissions_pkey PRIMARY KEY (id)
);

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS public.core_user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    CONSTRAINT core_user_roles_pkey PRIMARY KEY (user_id, role_id)
);

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS public.core_role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    CONSTRAINT core_role_permissions_pkey PRIMARY KEY (role_id, permission_id),
    CONSTRAINT core_role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.core_roles(id)
);

-- ============================================================
-- 第三部分：创建索引
-- ============================================================

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
('finance:receivable:read', '应收账款-只读', '查看应收账款', 'finance', 'receivable_read', 1),
('finance:period:read', '会计期间-只读', '查看会计期间', 'finance', 'period_read', 1),
('finance:budget:read', '预算管理-只读', '查看预算', 'finance', 'budget_read', 1),
('finance:budget:write', '预算管理-写入', '创建和修改预算', 'finance', 'budget_write', 2),
('finance:tax:read', '税务管理-只读', '查看税务数据', 'finance', 'tax_read', 1),
('finance:cost:read', '成本管理-只读', '查看成本数据', 'finance', 'cost_read', 1),
('finance:report:read', '财务报表-只读', '查看财务报表', 'finance', 'report_read', 1)
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

-- P2-9 / 2026-11-26：admin/admin123 弱口令播种已彻底移除（原 SQL 针对已删除的
-- public.core_users 与 iam.core_user_roles，保留可复制片段易被误执行，故不再保留）。
-- 权威超管由服务启动自举创建（ADMIN_INITIAL_PASSWORD + 首登强制改密），本脚本不播种任何账号。

-- ============================================================
-- 第八部分：显示初始化结果
-- ============================================================

SELECT '=== 权限系统初始化完成 ===' AS status;

SELECT '租户数量:' AS info, COUNT(*)::TEXT AS count FROM tenants;
SELECT '角色数量:' AS info, COUNT(*)::TEXT AS count FROM core_roles;
SELECT '权限数量:' AS info, COUNT(*)::TEXT AS count FROM core_permissions;

SELECT '默认角色:' AS info;
SELECT name, description FROM core_roles ORDER BY name;

SELECT '权限统计:' AS info;
SELECT resource, action, COUNT(*)::TEXT AS count 
FROM core_permissions 
GROUP BY resource, action 
ORDER BY resource, action;
