-- P0 合并报表止血：动作级权限码（2026-11-08）
--
-- 背景：
--   /erp/consolidation 整组此前只挂 require_module_access("erp")，任何持有
--   erp:read / erp:write 的普通 ERP 用户都能触发生成、发布、执行抵消。
--   本次为三个高风险动作补独立权限码，路由 handler 做精确串匹配校验：
--     POST /erp/consolidation/reports/generate        → erp:consolidation-report:write
--     POST /erp/consolidation/reports/{id}/publish    → erp:consolidation-report:approve
--     POST /erp/consolidation/execute-elimination     → erp:consolidation-elimination:write
--
-- 命名口径：
--   `module:resource:action`，末段 ∈ read/write/delete/approve/admin（见
--   lib/shared-auth/src/middleware/permission.rs 的 P0-4 约定）。
--   “生成”归 write，“发布”归 approve，“执行抵消”归 write。
--
-- 只增不减，幂等：
--   1) NOT EXISTS(code) 补建 3 个权限码；
--   2) 仅授予 finance_manager / admin / superadmin（与 finance:budget:write 等同组
--      财务动作码的既有授权口径一致）。employee / finance_user 等普通角色不授予。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id
--      AND p.code IN ('erp:consolidation-report:write',
--                     'erp:consolidation-report:approve',
--                     'erp:consolidation-elimination:write')
--      AND rp.role_id IN (SELECT id FROM public.core_roles
--                          WHERE name IN ('finance_manager','admin','superadmin'));
--   DELETE FROM public.core_permissions
--    WHERE code IN ('erp:consolidation-report:write',
--                   'erp:consolidation-report:approve',
--                   'erp:consolidation-elimination:write');

INSERT INTO public.core_permissions (code, name, description, resource, action, level)
SELECT v.code, v.name, v.description, v.resource, v.action, 1
FROM (
    VALUES
        ('erp:consolidation-report:write',      '合并报表-生成',     '生成合并报表（法人主体账簿归集）', 'erp:consolidation-report', 'write'),
        ('erp:consolidation-report:approve',    '合并报表-发布',     '发布/对外出具合并报表',             'erp:consolidation-report', 'approve'),
        ('erp:consolidation-elimination:write', '合并抵消-执行',     '执行内部交易抵消',                 'erp:consolidation-elimination', 'write')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions p WHERE p.code = v.code
);

INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p
  ON p.code IN (
      'erp:consolidation-report:write',
      'erp:consolidation-report:approve',
      'erp:consolidation-elimination:write'
  )
WHERE r.name IN ('finance_manager', 'admin', 'superadmin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
