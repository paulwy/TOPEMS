-- 20261118125000_seed_module_umbrella_permissions.sql
--
-- 背景：2026-10-26 生产首次启动时，运行期自举 iam::init_database
--   （svc/unified-core/src/modules/iam/mod.rs，已于 172abd3f8 / 2026-10-29 整段删除）
--   向 public.core_permissions 写入了 69 条模块级伞码（2 段式，如 ai:write、crm:write），
--   并绑定 admin / tenant_admin，但迁移链中从未登记。
-- 本迁移把这些种入正式收编进迁移链：
--   - 生产已存在的行保持不变（ON CONFLICT (code) DO NOTHING），不改既有 name/description/level；
--   - 空库 / 新克隆可按迁移链完整重建；
--   - level 保持 NULL，与生产现值一致（不为对齐而补值）。
-- 幂等：可重复执行。事务由 sqlx 迁移执行器（--single-transaction）包裹，
-- 文件内不写 BEGIN/COMMIT（validate.sh 会拦截，且文件内 COMMIT 会破坏账本原子性）。

INSERT INTO public.core_permissions (code, name, description, resource, action, level) VALUES
  ('ai:delete', 'AI助手-删除', 'AI助手', 'ai', 'delete', NULL),
  ('ai:read', 'AI助手-只读', 'AI助手', 'ai', 'read', NULL),
  ('ai:write', 'AI助手-写入', 'AI助手', 'ai', 'write', NULL),
  ('crm:admin', '客户关系-管理', '客户关系', 'crm', 'admin', NULL),
  ('crm:delete', '客户关系-删除', '客户关系', 'crm', 'delete', NULL),
  ('crm:write', '客户关系-写入', '客户关系', 'crm', 'write', NULL),
  ('doc:admin', '文档管理-管理', '文档管理', 'doc', 'admin', NULL),
  ('doc:delete', '文档管理-删除', '文档管理', 'doc', 'delete', NULL),
  ('doc:read', '文档管理-只读', '文档管理', 'doc', 'read', NULL),
  ('doc:write', '文档管理-写入', '文档管理', 'doc', 'write', NULL),
  ('ehs:admin', '环境健康安全-管理', '环境健康安全', 'ehs', 'admin', NULL),
  ('ehs:delete', '环境健康安全-删除', '环境健康安全', 'ehs', 'delete', NULL),
  ('ehs:write', '环境健康安全-写入', '环境健康安全', 'ehs', 'write', NULL),
  ('erp:admin', '企业资源-管理', '企业资源', 'erp', 'admin', NULL),
  ('erp:delete', '企业资源-删除', '企业资源', 'erp', 'delete', NULL),
  ('file:admin', '文件服务-管理', '文件服务', 'file', 'admin', NULL),
  ('file:delete', '文件服务-删除', '文件服务', 'file', 'delete', NULL),
  ('file:read', '文件服务-只读', '文件服务', 'file', 'read', NULL),
  ('file:write', '文件服务-写入', '文件服务', 'file', 'write', NULL),
  ('gis:admin', '地理信息-管理', '地理信息', 'gis', 'admin', NULL),
  ('gis:delete', '地理信息-删除', '地理信息', 'gis', 'delete', NULL),
  ('gis:read', '地理信息-只读', '地理信息', 'gis', 'read', NULL),
  ('gis:write', '地理信息-写入', '地理信息', 'gis', 'write', NULL),
  ('hrm:admin', '人力资源-管理', '人力资源', 'hrm', 'admin', NULL),
  ('hrm:delete', '人力资源-删除', '人力资源', 'hrm', 'delete', NULL),
  ('hrm:write', '人力资源-写入', '人力资源', 'hrm', 'write', NULL),
  ('iam:admin', '身份管理-管理', '身份管理', 'iam', 'admin', NULL),
  ('iam:delete', '身份管理-删除', '身份管理', 'iam', 'delete', NULL),
  ('iam:read', '身份管理-只读', '身份管理', 'iam', 'read', NULL),
  ('iam:write', '身份管理-写入', '身份管理', 'iam', 'write', NULL),
  ('im:admin', '即时通讯-管理', '即时通讯', 'im', 'admin', NULL),
  ('im:delete', '即时通讯-删除', '即时通讯', 'im', 'delete', NULL),
  ('im:read', '即时通讯-只读', '即时通讯', 'im', 'read', NULL),
  ('im:write', '即时通讯-写入', '即时通讯', 'im', 'write', NULL),
  ('integration:admin', '系统集成-管理', '系统集成', 'integration', 'admin', NULL),
  ('integration:delete', '系统集成-删除', '系统集成', 'integration', 'delete', NULL),
  ('integration:read', '系统集成-只读', '系统集成', 'integration', 'read', NULL),
  ('integration:write', '系统集成-写入', '系统集成', 'integration', 'write', NULL),
  ('mes:admin', '制造执行-管理', '制造执行', 'mes', 'admin', NULL),
  ('mes:delete', '制造执行-删除', '制造执行', 'mes', 'delete', NULL),
  ('mes:write', '制造执行-写入', '制造执行', 'mes', 'write', NULL),
  ('notification:admin', '通知服务-管理', '通知服务', 'notification', 'admin', NULL),
  ('notification:delete', '通知服务-删除', '通知服务', 'notification', 'delete', NULL),
  ('notification:read', '通知服务-只读', '通知服务', 'notification', 'read', NULL),
  ('notification:write', '通知服务-写入', '通知服务', 'notification', 'write', NULL),
  ('pm:admin', '项目管理-管理', '项目管理', 'pm', 'admin', NULL),
  ('pm:delete', '项目管理-删除', '项目管理', 'pm', 'delete', NULL),
  ('pm:write', '项目管理-写入', '项目管理', 'pm', 'write', NULL),
  ('qms:admin', '质量管理-管理', '质量管理', 'qms', 'admin', NULL),
  ('qms:delete', '质量管理-删除', '质量管理', 'qms', 'delete', NULL),
  ('rs:admin', '研发管理-管理', '研发管理', 'rs', 'admin', NULL),
  ('rs:delete', '研发管理-删除', '研发管理', 'rs', 'delete', NULL),
  ('rs:read', '研发管理-只读', '研发管理', 'rs', 'read', NULL),
  ('rs:write', '研发管理-写入', '研发管理', 'rs', 'write', NULL),
  ('scm:admin', '供应链-管理', '供应链', 'scm', 'admin', NULL),
  ('scm:delete', '供应链-删除', '供应链', 'scm', 'delete', NULL),
  ('system:audit', '审计日志', '系统设置', 'system', 'audit', NULL),
  ('system:dictionary', '字典管理', '系统设置', 'system', 'dictionary', NULL),
  ('system:migration', '数据迁移', '系统设置', 'system', 'migration', NULL),
  ('system:monitor', '系统监控', '系统设置', 'system', 'monitor', NULL),
  ('system:plugin', '插件管理', '系统设置', 'system', 'plugin', NULL),
  ('system:settings', '系统设置', '系统设置', 'system', 'settings', NULL),
  ('wms:admin', '仓储管理-管理', '仓储管理', 'wms', 'admin', NULL),
  ('wms:delete', '仓储管理-删除', '仓储管理', 'wms', 'delete', NULL),
  ('workflow:admin', '工作流-管理', '工作流', 'workflow', 'admin', NULL),
  ('workflow:approve', '工作流-审批', '工作流', 'workflow', 'approve', NULL),
  ('workflow:delete', '工作流-删除', '工作流', 'workflow', 'delete', NULL),
  ('workflow:read', '工作流-只读', '工作流', 'workflow', 'read', NULL),
  ('workflow:write', '工作流-写入', '工作流', 'workflow', 'write', NULL)
ON CONFLICT (code) DO NOTHING;

-- admin：全部 69 条模块级伞码
INSERT INTO public.core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.core_roles r
CROSS JOIN public.core_permissions p
WHERE r.name = 'admin'
  AND p.code IN (
    'ai:delete','ai:read','ai:write',
    'crm:admin','crm:delete','crm:write',
    'doc:admin','doc:delete','doc:read','doc:write',
    'ehs:admin','ehs:delete','ehs:write',
    'erp:admin','erp:delete',
    'file:admin','file:delete','file:read','file:write',
    'gis:admin','gis:delete','gis:read','gis:write',
    'hrm:admin','hrm:delete','hrm:write',
    'iam:admin','iam:delete','iam:read','iam:write',
    'im:admin','im:delete','im:read','im:write',
    'integration:admin','integration:delete','integration:read','integration:write',
    'mes:admin','mes:delete','mes:write',
    'notification:admin','notification:delete','notification:read','notification:write',
    'pm:admin','pm:delete','pm:write',
    'qms:admin','qms:delete',
    'rs:admin','rs:delete','rs:read','rs:write',
    'scm:admin','scm:delete',
    'system:audit','system:dictionary','system:migration','system:monitor','system:plugin','system:settings',
    'wms:admin','wms:delete',
    'workflow:admin','workflow:approve','workflow:delete','workflow:read','workflow:write'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- tenant_admin：59 条，排除 10 条平台级 iam:*/system:* 码
INSERT INTO public.core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.core_roles r
CROSS JOIN public.core_permissions p
WHERE r.name = 'tenant_admin'
  AND p.code IN (
    'ai:delete','ai:read','ai:write',
    'crm:admin','crm:delete','crm:write',
    'doc:admin','doc:delete','doc:read','doc:write',
    'ehs:admin','ehs:delete','ehs:write',
    'erp:admin','erp:delete',
    'file:admin','file:delete','file:read','file:write',
    'gis:admin','gis:delete','gis:read','gis:write',
    'hrm:admin','hrm:delete','hrm:write',
    'im:admin','im:delete','im:read','im:write',
    'integration:admin','integration:delete','integration:read','integration:write',
    'mes:admin','mes:delete','mes:write',
    'notification:admin','notification:delete','notification:read','notification:write',
    'pm:admin','pm:delete','pm:write',
    'qms:admin','qms:delete',
    'rs:admin','rs:delete','rs:read','rs:write',
    'scm:admin','scm:delete',
    'wms:admin','wms:delete',
    'workflow:admin','workflow:approve','workflow:delete','workflow:read','workflow:write'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

DO $$
DECLARE
    perm_count integer;
    admin_bind integer;
    tenant_bind integer;
BEGIN
    SELECT count(*) INTO perm_count FROM public.core_permissions
    WHERE code IN (
        'ai:delete','ai:read','ai:write','crm:admin','crm:delete','crm:write',
        'doc:admin','doc:delete','doc:read','doc:write','ehs:admin','ehs:delete','ehs:write',
        'erp:admin','erp:delete','file:admin','file:delete','file:read','file:write',
        'gis:admin','gis:delete','gis:read','gis:write','hrm:admin','hrm:delete','hrm:write',
        'iam:admin','iam:delete','iam:read','iam:write','im:admin','im:delete','im:read','im:write',
        'integration:admin','integration:delete','integration:read','integration:write',
        'mes:admin','mes:delete','mes:write','notification:admin','notification:delete',
        'notification:read','notification:write','pm:admin','pm:delete','pm:write',
        'qms:admin','qms:delete','rs:admin','rs:delete','rs:read','rs:write','scm:admin','scm:delete',
        'system:audit','system:dictionary','system:migration','system:monitor','system:plugin',
        'system:settings','wms:admin','wms:delete','workflow:admin','workflow:approve',
        'workflow:delete','workflow:read','workflow:write'
    );

    SELECT count(*) INTO admin_bind
    FROM public.core_role_permissions rp
    JOIN public.core_roles r ON r.id = rp.role_id
    JOIN public.core_permissions p ON p.id = rp.permission_id
    WHERE r.name = 'admin' AND p.code IN (
        'ai:delete','ai:read','ai:write','crm:admin','crm:delete','crm:write',
        'doc:admin','doc:delete','doc:read','doc:write','ehs:admin','ehs:delete','ehs:write',
        'erp:admin','erp:delete','file:admin','file:delete','file:read','file:write',
        'gis:admin','gis:delete','gis:read','gis:write','hrm:admin','hrm:delete','hrm:write',
        'iam:admin','iam:delete','iam:read','iam:write','im:admin','im:delete','im:read','im:write',
        'integration:admin','integration:delete','integration:read','integration:write',
        'mes:admin','mes:delete','mes:write','notification:admin','notification:delete',
        'notification:read','notification:write','pm:admin','pm:delete','pm:write',
        'qms:admin','qms:delete','rs:admin','rs:delete','rs:read','rs:write','scm:admin','scm:delete',
        'system:audit','system:dictionary','system:migration','system:monitor','system:plugin',
        'system:settings','wms:admin','wms:delete','workflow:admin','workflow:approve',
        'workflow:delete','workflow:read','workflow:write'
    );

    SELECT count(*) INTO tenant_bind
    FROM public.core_role_permissions rp
    JOIN public.core_roles r ON r.id = rp.role_id
    JOIN public.core_permissions p ON p.id = rp.permission_id
    WHERE r.name = 'tenant_admin' AND p.code IN (
        'ai:delete','ai:read','ai:write','crm:admin','crm:delete','crm:write',
        'doc:admin','doc:delete','doc:read','doc:write','ehs:admin','ehs:delete','ehs:write',
        'erp:admin','erp:delete','file:admin','file:delete','file:read','file:write',
        'gis:admin','gis:delete','gis:read','gis:write','hrm:admin','hrm:delete','hrm:write',
        'im:admin','im:delete','im:read','im:write',
        'integration:admin','integration:delete','integration:read','integration:write',
        'mes:admin','mes:delete','mes:write','notification:admin','notification:delete',
        'notification:read','notification:write','pm:admin','pm:delete','pm:write',
        'qms:admin','qms:delete','rs:admin','rs:delete','rs:read','rs:write','scm:admin','scm:delete',
        'wms:admin','wms:delete','workflow:admin','workflow:approve','workflow:delete',
        'workflow:read','workflow:write'
    );

    IF perm_count <> 69 THEN
        RAISE EXCEPTION '种子断言失败：69 条伞码中仅存在 % 条', perm_count;
    END IF;
    IF admin_bind <> 69 THEN
        RAISE EXCEPTION '种子断言失败：admin 绑定 % 条，期望 69', admin_bind;
    END IF;
    IF tenant_bind <> 59 THEN
        RAISE EXCEPTION '种子断言失败：tenant_admin 绑定 % 条，期望 59', tenant_bind;
    END IF;
END $$;
