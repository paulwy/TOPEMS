-- P4 第一批（3/3）：内部交易台账/扫描/对账的细粒度权限码（2026-11-09）
--
-- 命名口径沿用 `module:resource:action`，末段 ∈ read/write/approve（见
-- lib/shared-auth/src/middleware/permission.rs 的 P0-4 约定），不新造伞码：
--   POST /erp/consolidation/internal-transactions                → erp:consolidation-ledger:write
--   PUT  /erp/consolidation/internal-transactions/{id}           → erp:consolidation-ledger:write
--   POST /erp/consolidation/internal-transactions/{id}/dispute   → erp:consolidation-ledger:write
--   POST /erp/consolidation/internal-transactions/{id}/confirm   → erp:consolidation-ledger:approve
--   POST /erp/consolidation/elimination-candidates/scan          → erp:consolidation-scan:write
--   GET  /erp/consolidation/reconciliations                      → erp:consolidation-reconcile:read
--   POST /erp/consolidation/eliminations/preview                 → erp:consolidation-reconcile:read
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id
--      AND p.code IN ('erp:consolidation-ledger:write',
--                     'erp:consolidation-ledger:approve',
--                     'erp:consolidation-scan:write',
--                     'erp:consolidation-reconcile:read')
--      AND rp.role_id IN (SELECT id FROM public.core_roles
--                          WHERE name IN ('finance_manager','admin','superadmin'));
--   DELETE FROM public.core_permissions
--    WHERE code IN ('erp:consolidation-ledger:write',
--                   'erp:consolidation-ledger:approve',
--                   'erp:consolidation-scan:write',
--                   'erp:consolidation-reconcile:read');

INSERT INTO public.core_permissions (code, name, description, resource, action, level)
SELECT v.code, v.name, v.description, v.resource, v.action, 1
FROM (
    VALUES
        ('erp:consolidation-ledger:write',    '内部交易台账-登记', '录入/编辑内部交易台账、标记争议', 'erp:consolidation-ledger', 'write'),
        ('erp:consolidation-ledger:approve',  '内部交易台账-确认', '确认内部交易台账（锁定对账金额）', 'erp:consolidation-ledger', 'approve'),
        ('erp:consolidation-scan:write',      '内部交易-凭证扫描', '按期间与合并范围扫描同额反向凭证候选', 'erp:consolidation-scan', 'write'),
        ('erp:consolidation-reconcile:read',  '内部交易-对账与预演', '查看对账汇总与抵消草案（只读/只算）', 'erp:consolidation-reconcile', 'read')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions p WHERE p.code = v.code
);

INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p
  ON p.code IN (
      'erp:consolidation-ledger:write',
      'erp:consolidation-ledger:approve',
      'erp:consolidation-scan:write',
      'erp:consolidation-reconcile:read'
  )
WHERE r.name IN ('finance_manager', 'admin', 'superadmin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
