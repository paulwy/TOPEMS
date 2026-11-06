-- P3-8 模块级 → 资源级 权限码细化（批 18 / 2026-11-06）
--
-- 背景：notification / integration / ticket / plugin / migration 五个模块此前只有**模块级**码
-- （如 notification:read / notification:write），无资源级码，导致 10 个页面无法接入写权限。
-- 本迁移按 DB 既有码制（`模块:资源:动作`）建 27 条资源级码（9 资源 × 3 动作），
-- 每条都先核实了实体依据（表或后端路由），不造无依据的码：
--   notification:notification ← core_notifications 表 + /api/core/notification 路由
--   notification:archived_notification ← archived_notifications 表
--   integration:lims_qms_sync ← /api/integration/lims-qms 路由
--   integration:mes_erp_sync ← svc/integration/src/mes_erp_sync.rs + /api/integration/mes-erp 路由
--   integration:wms_scm_sync ← svc/integration wms_scm 同步模块
--   ticket:ticket ← core_tickets 表 + /api/ticket 路由
--   plugin:plugin ← core_plugins 表 + /api/plugins 路由 + svc/plugin-registry
--   migration:service ← core_migration_history 表 + svc/unified-core/src/modules/migration
--   finance:account ← core_finance_accounts 表 + /api/finance/accounts 路由
--
-- 幂等：NOT EXISTS(code) 判重；授权按 description 的 '[batch18]' 标记 + NOT EXISTS 判重。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id AND p.description LIKE '[batch18]%';
--   DELETE FROM public.core_permissions WHERE description LIKE '[batch18]%';

INSERT INTO public.core_permissions (id, code, name, description, resource, action, level, created_at)
SELECT gen_random_uuid(), v.code, v.name, v.description, v.resource, v.action, 1, now()
FROM (
    VALUES
        ('notification:notification:create', '通知新增', '[batch18] 资源级细化 - 通知新增', 'notification:notification', 'create'),        ('notification:notification:update', '通知编辑', '[batch18] 资源级细化 - 通知编辑', 'notification:notification', 'update'),        ('notification:notification:delete', '通知删除', '[batch18] 资源级细化 - 通知删除', 'notification:notification', 'delete'),        ('notification:archived_notification:create', '归档通知新增', '[batch18] 资源级细化 - 归档通知新增', 'notification:archived_notification', 'create'),        ('notification:archived_notification:update', '归档通知编辑', '[batch18] 资源级细化 - 归档通知编辑', 'notification:archived_notification', 'update'),        ('notification:archived_notification:delete', '归档通知删除', '[batch18] 资源级细化 - 归档通知删除', 'notification:archived_notification', 'delete'),        ('integration:lims_qms_sync:create', 'LIMS-QMS 同步新增', '[batch18] 资源级细化 - LIMS-QMS 同步新增', 'integration:lims_qms_sync', 'create'),        ('integration:lims_qms_sync:update', 'LIMS-QMS 同步编辑', '[batch18] 资源级细化 - LIMS-QMS 同步编辑', 'integration:lims_qms_sync', 'update'),        ('integration:lims_qms_sync:delete', 'LIMS-QMS 同步删除', '[batch18] 资源级细化 - LIMS-QMS 同步删除', 'integration:lims_qms_sync', 'delete'),        ('integration:mes_erp_sync:create', 'MES-ERP 同步新增', '[batch18] 资源级细化 - MES-ERP 同步新增', 'integration:mes_erp_sync', 'create'),        ('integration:mes_erp_sync:update', 'MES-ERP 同步编辑', '[batch18] 资源级细化 - MES-ERP 同步编辑', 'integration:mes_erp_sync', 'update'),        ('integration:mes_erp_sync:delete', 'MES-ERP 同步删除', '[batch18] 资源级细化 - MES-ERP 同步删除', 'integration:mes_erp_sync', 'delete'),        ('integration:wms_scm_sync:create', 'WMS-SCM 同步新增', '[batch18] 资源级细化 - WMS-SCM 同步新增', 'integration:wms_scm_sync', 'create'),        ('integration:wms_scm_sync:update', 'WMS-SCM 同步编辑', '[batch18] 资源级细化 - WMS-SCM 同步编辑', 'integration:wms_scm_sync', 'update'),        ('integration:wms_scm_sync:delete', 'WMS-SCM 同步删除', '[batch18] 资源级细化 - WMS-SCM 同步删除', 'integration:wms_scm_sync', 'delete'),        ('ticket:ticket:create', '工单新增', '[batch18] 资源级细化 - 工单新增', 'ticket:ticket', 'create'),        ('ticket:ticket:update', '工单编辑', '[batch18] 资源级细化 - 工单编辑', 'ticket:ticket', 'update'),        ('ticket:ticket:delete', '工单删除', '[batch18] 资源级细化 - 工单删除', 'ticket:ticket', 'delete'),        ('plugin:plugin:create', '插件新增', '[batch18] 资源级细化 - 插件新增', 'plugin:plugin', 'create'),        ('plugin:plugin:update', '插件编辑', '[batch18] 资源级细化 - 插件编辑', 'plugin:plugin', 'update'),        ('plugin:plugin:delete', '插件删除', '[batch18] 资源级细化 - 插件删除', 'plugin:plugin', 'delete'),        ('migration:service:create', '迁移服务新增', '[batch18] 资源级细化 - 迁移服务新增', 'migration:service', 'create'),        ('migration:service:update', '迁移服务编辑', '[batch18] 资源级细化 - 迁移服务编辑', 'migration:service', 'update'),        ('migration:service:delete', '迁移服务删除', '[batch18] 资源级细化 - 迁移服务删除', 'migration:service', 'delete'),        ('finance:account:create', '财务账户新增', '[batch18] 资源级细化 - 财务账户新增', 'finance:account', 'create'),        ('finance:account:update', '财务账户编辑', '[batch18] 资源级细化 - 财务账户编辑', 'finance:account', 'update'),        ('finance:account:delete', '财务账户删除', '[batch18] 资源级细化 - 财务账户删除', 'finance:account', 'delete')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions p WHERE p.code = v.code);

-- 授权：管理员全量（这些模块无 manager 角色，admin/superadmin 是唯一持有者）
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.description LIKE '[batch18]%'
WHERE r.name IN ('admin', 'superadmin')
  AND NOT EXISTS (SELECT 1 FROM public.core_role_permissions x WHERE x.role_id = r.id AND x.permission_id = p.id);

-- 授权：finance_manager 仅财务账户（本域）
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code LIKE 'finance:account:%' AND p.description LIKE '[batch18]%'
WHERE r.name = 'finance_manager'
  AND NOT EXISTS (SELECT 1 FROM public.core_role_permissions x WHERE x.role_id = r.id AND x.permission_id = p.id);
