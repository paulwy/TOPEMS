-- P3-6b API 资源名 → DB 权限资源名 语义映射补码（批 17 / 2026-11-06）
--
-- 背景：批 16 盘点出 69 个页面的 api.resource（API 路径名）与 DB 权限资源名不同。批 17 逐条语义映射后：
--   ① 可直接映射 36 项（DB 已有三动作码，无需补码）；
--   ② 需补码才能映射 10 项（语义明确，本迁移处理）；
--   ③ 语义不明/一对多 23 项（不接入，登记）。
--
-- 本迁移处理 ② 的 30 条码：finance=6, mes=9, monitor=3, scm=6, wms=3, workflow=3
--   其中 4 项是对既有资源补动作（workflow:definition 已有 read/write、wms:stocktake 已有 read/write、
--   finance:receivable_payable 仅 read、monitor:rule 仅 read），6 项是新建资源码（mes 领料/需求/退料、
--   scm 来料检验/到货通知、finance 会计科目）——这 6 项语义明确且与既有资源不重叠：
--     mes 领料/退料 ≠ mes:material（物料主数据）；scm 来料检验 ≠ scm:supplier_admission；finance 会计科目 ≠ finance:ledger。
--
-- 幂等：NOT EXISTS(code) 判重；授权按 description 的 '[batch17]' 标记 + NOT EXISTS 判重。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id AND p.description LIKE '[batch17]%';
--   DELETE FROM public.core_permissions WHERE description LIKE '[batch17]%';

INSERT INTO public.core_permissions (id, code, name, description, resource, action, level, created_at)
SELECT gen_random_uuid(), v.code, v.name, v.description, v.resource, v.action, 1, now()
FROM (
    VALUES
        ('workflow:definition:create', 'definition新增', '[batch17] 工作流 - definition新增', 'workflow:definition', 'create'),        ('workflow:definition:update', 'definition编辑', '[batch17] 工作流 - definition编辑', 'workflow:definition', 'update'),        ('workflow:definition:delete', 'definition删除', '[batch17] 工作流 - definition删除', 'workflow:definition', 'delete'),        ('wms:stocktake:create', 'stocktake新增', '[batch17] WMS 仓储 - stocktake新增', 'wms:stocktake', 'create'),        ('wms:stocktake:update', 'stocktake编辑', '[batch17] WMS 仓储 - stocktake编辑', 'wms:stocktake', 'update'),        ('wms:stocktake:delete', 'stocktake删除', '[batch17] WMS 仓储 - stocktake删除', 'wms:stocktake', 'delete'),        ('finance:receivable_payable:create', 'receivable_payable新增', '[batch17] 财务 - receivable_payable新增', 'finance:receivable_payable', 'create'),        ('finance:receivable_payable:update', 'receivable_payable编辑', '[batch17] 财务 - receivable_payable编辑', 'finance:receivable_payable', 'update'),        ('finance:receivable_payable:delete', 'receivable_payable删除', '[batch17] 财务 - receivable_payable删除', 'finance:receivable_payable', 'delete'),        ('monitor:rule:create', 'rule新增', '[batch17] 监控 - rule新增', 'monitor:rule', 'create'),        ('monitor:rule:update', 'rule编辑', '[batch17] 监控 - rule编辑', 'monitor:rule', 'update'),        ('monitor:rule:delete', 'rule删除', '[batch17] 监控 - rule删除', 'monitor:rule', 'delete'),        ('mes:material_issue:create', 'material_issue新增', '[batch17] MES 制造 - material_issue新增', 'mes:material_issue', 'create'),        ('mes:material_issue:update', 'material_issue编辑', '[batch17] MES 制造 - material_issue编辑', 'mes:material_issue', 'update'),        ('mes:material_issue:delete', 'material_issue删除', '[batch17] MES 制造 - material_issue删除', 'mes:material_issue', 'delete'),        ('mes:material_requirement:create', 'material_requirement新增', '[batch17] MES 制造 - material_requirement新增', 'mes:material_requirement', 'create'),        ('mes:material_requirement:update', 'material_requirement编辑', '[batch17] MES 制造 - material_requirement编辑', 'mes:material_requirement', 'update'),        ('mes:material_requirement:delete', 'material_requirement删除', '[batch17] MES 制造 - material_requirement删除', 'mes:material_requirement', 'delete'),        ('mes:material_return:create', 'material_return新增', '[batch17] MES 制造 - material_return新增', 'mes:material_return', 'create'),        ('mes:material_return:update', 'material_return编辑', '[batch17] MES 制造 - material_return编辑', 'mes:material_return', 'update'),        ('mes:material_return:delete', 'material_return删除', '[batch17] MES 制造 - material_return删除', 'mes:material_return', 'delete'),        ('scm:incoming_inspection:create', 'incoming_inspection新增', '[batch17] SCM 供应链 - incoming_inspection新增', 'scm:incoming_inspection', 'create'),        ('scm:incoming_inspection:update', 'incoming_inspection编辑', '[batch17] SCM 供应链 - incoming_inspection编辑', 'scm:incoming_inspection', 'update'),        ('scm:incoming_inspection:delete', 'incoming_inspection删除', '[batch17] SCM 供应链 - incoming_inspection删除', 'scm:incoming_inspection', 'delete'),        ('scm:incoming_notice:create', 'incoming_notice新增', '[batch17] SCM 供应链 - incoming_notice新增', 'scm:incoming_notice', 'create'),        ('scm:incoming_notice:update', 'incoming_notice编辑', '[batch17] SCM 供应链 - incoming_notice编辑', 'scm:incoming_notice', 'update'),        ('scm:incoming_notice:delete', 'incoming_notice删除', '[batch17] SCM 供应链 - incoming_notice删除', 'scm:incoming_notice', 'delete'),        ('finance:accounting_subject:create', 'accounting_subject新增', '[batch17] 财务 - accounting_subject新增', 'finance:accounting_subject', 'create'),        ('finance:accounting_subject:update', 'accounting_subject编辑', '[batch17] 财务 - accounting_subject编辑', 'finance:accounting_subject', 'update'),        ('finance:accounting_subject:delete', 'accounting_subject删除', '[batch17] 财务 - accounting_subject删除', 'finance:accounting_subject', 'delete')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions p WHERE p.code = v.code);

-- 授权：管理员全量（不补会误锁管理员）
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.description LIKE '[batch17]%'
WHERE r.name IN ('admin', 'superadmin')
  AND NOT EXISTS (SELECT 1 FROM public.core_role_permissions x WHERE x.role_id = r.id AND x.permission_id = p.id);

-- 授权：域经理（最小权限，不给基础角色补）
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM (VALUES
    ('mes','mes_manager'),
    ('scm','scm_manager'),
    ('wms','wms_manager'),
    ('finance','finance_manager')
) AS m(module, role_name)
JOIN public.core_roles r ON r.name = m.role_name
JOIN public.core_permissions p
  ON p.code LIKE m.module || ':%'
 AND p.code ~ ':(create|update|delete)$'
 AND p.description LIKE '[batch17]%'
WHERE NOT EXISTS (SELECT 1 FROM public.core_role_permissions x WHERE x.role_id = r.id AND x.permission_id = p.id);
