-- 批4 权限码统一专项：前端使用但后端未签发的 38 个权限码补录 core_permissions
-- 来源：批4 审计盘点 apps/web/src/modules/*/config.ts 的 permission/requiredPermissions（前端 417 码全集）
-- 与 20260908000014 同风格（A 方案：后端扩展签发）；幂等（ON CONFLICT (code) DO NOTHING）
-- 含 master 模块三风格归一：master:data-asset / master_data:* 统一为 master-data:*
ALTER TABLE public.core_permissions ADD COLUMN IF NOT EXISTS level integer;
INSERT INTO public.core_permissions (code, name, description, resource, action, level)
SELECT v.code, v.code, v.description, v.resource, v.action, v.level
FROM (VALUES
  ('admin:dashboard:write', 'admin:dashboard:write', 'Auto-registered from frontend usage: batch4 perm unification', 'admin:dashboard', 'write', 1),
  ('admin:iam:dashboard:approve', 'admin:iam:dashboard:approve', 'Auto-registered from frontend usage: batch4 perm unification', 'admin:iam', 'dashboard', 1),
  ('admin:tenant:write', 'admin:tenant:write', 'Auto-registered from frontend usage: batch4 perm unification', 'admin:tenant', 'write', 1),
  ('bi:dashboard:write', 'bi:dashboard:write', 'Auto-registered from frontend usage: batch4 perm unification', 'bi:dashboard', 'write', 1),
  ('crm:contract:read', 'crm:contract:read', 'Auto-registered from frontend usage: batch4 perm unification', 'crm:contract', 'read', 1),
  ('crm:customer:create', 'crm:customer:create', 'Auto-registered from frontend usage: batch4 perm unification', 'crm:customer', 'create', 1),
  ('crm:customer:update', 'crm:customer:update', 'Auto-registered from frontend usage: batch4 perm unification', 'crm:customer', 'update', 1),
  ('crm:dashboard:update', 'crm:dashboard:update', 'Auto-registered from frontend usage: batch4 perm unification', 'crm:dashboard', 'update', 1),
  ('crm:dashboard:write', 'crm:dashboard:write', 'Auto-registered from frontend usage: batch4 perm unification', 'crm:dashboard', 'write', 1),
  ('erp:sales:read', 'erp:sales:read', 'Auto-registered from frontend usage: batch4 perm unification', 'erp:sales', 'read', 1),
  ('finance:currency:read', 'finance:currency:read', 'Auto-registered from frontend usage: batch4 perm unification', 'finance:currency', 'read', 1),
  ('lims:test-method:read', 'lims:test-method:read', 'Auto-registered from frontend usage: batch4 perm unification', 'lims:test-method', 'read', 1),
  ('master-data:ai_governance:read', 'master-data:ai_governance:read', 'Auto-registered from frontend usage: batch4 perm unification', 'master-data:ai_governance', 'read', 1),
  ('master-data:commercial:read', 'master-data:commercial:read', 'Auto-registered from frontend usage: batch4 perm unification', 'master-data:commercial', 'read', 1),
  ('master-data:data-asset:read', 'master-data:data-asset:read', 'Auto-registered from frontend usage: batch4 perm unification', 'master-data:data-asset', 'read', 1),
  ('master-data:disaster:read', 'master-data:disaster:read', 'Auto-registered from frontend usage: batch4 perm unification', 'master-data:disaster', 'read', 1),
  ('master-data:governance:read', 'master-data:governance:read', 'Auto-registered from frontend usage: batch4 perm unification', 'master-data:governance', 'read', 1),
  ('master-data:knowledge:read', 'master-data:knowledge:read', 'Auto-registered from frontend usage: batch4 perm unification', 'master-data:knowledge', 'read', 1),
  ('master-data:lineage:read', 'master-data:lineage:read', 'Auto-registered from frontend usage: batch4 perm unification', 'master-data:lineage', 'read', 1),
  ('master-data:quality:read', 'master-data:quality:read', 'Auto-registered from frontend usage: batch4 perm unification', 'master-data:quality', 'read', 1),
  ('master-data:schema:read', 'master-data:schema:read', 'Auto-registered from frontend usage: batch4 perm unification', 'master-data:schema', 'read', 1),
  ('master-data:semantic:read', 'master-data:semantic:read', 'Auto-registered from frontend usage: batch4 perm unification', 'master-data:semantic', 'read', 1),
  ('master-data:versioning:read', 'master-data:versioning:read', 'Auto-registered from frontend usage: batch4 perm unification', 'master-data:versioning', 'read', 1),
  ('mes:workshop:read', 'mes:workshop:read', 'Auto-registered from frontend usage: batch4 perm unification', 'mes:workshop', 'read', 1),
  ('pdm:drawing:read', 'pdm:drawing:read', 'Auto-registered from frontend usage: batch4 perm unification', 'pdm:drawing', 'read', 1),
  ('plugin:marketplace:read', 'plugin:marketplace:read', 'Auto-registered from frontend usage: batch4 perm unification', 'plugin:marketplace', 'read', 1),
  ('pm:contract:create', 'pm:contract:create', 'Auto-registered from frontend usage: batch4 perm unification', 'pm:contract', 'create', 1),
  ('pm:dashboard:write', 'pm:dashboard:write', 'Auto-registered from frontend usage: batch4 perm unification', 'pm:dashboard', 'write', 1),
  ('qms:action:read', 'qms:action:read', 'Auto-registered from frontend usage: batch4 perm unification', 'qms:action', 'read', 1),
  ('rd:dashboard:write', 'rd:dashboard:write', 'Auto-registered from frontend usage: batch4 perm unification', 'rd:dashboard', 'write', 1),
  ('rd:experiment:write', 'rd:experiment:write', 'Auto-registered from frontend usage: batch4 perm unification', 'rd:experiment', 'write', 1),
  ('rd:formula:write', 'rd:formula:write', 'Auto-registered from frontend usage: batch4 perm unification', 'rd:formula', 'write', 1),
  ('rd:project:write', 'rd:project:write', 'Auto-registered from frontend usage: batch4 perm unification', 'rd:project', 'write', 1),
  ('report:dashboard:write', 'report:dashboard:write', 'Auto-registered from frontend usage: batch4 perm unification', 'report:dashboard', 'write', 1),
  ('wms:movement:read', 'wms:movement:read', 'Auto-registered from frontend usage: batch4 perm unification', 'wms:movement', 'read', 1),
  ('wms:stocktake:read', 'wms:stocktake:read', 'Auto-registered from frontend usage: batch4 perm unification', 'wms:stocktake', 'read', 1),
  ('wms:wavepick:read', 'wms:wavepick:read', 'Auto-registered from frontend usage: batch4 perm unification', 'wms:wavepick', 'read', 1),
  ('workflow:dashboard:write', 'workflow:dashboard:write', 'Auto-registered from frontend usage: batch4 perm unification', 'workflow:dashboard', 'write', 1),
  ('finance:period:read', 'finance:period:read', 'Auto-registered from frontend usage: batch4 perm unification', 'finance:period', 'read', 1)
) AS v(code, name, description, resource, action, level)
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions p WHERE p.code = v.code);
