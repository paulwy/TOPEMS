-- P4 第一批补口：tenant_admin 授予内部交易台账/扫描/对账细码（2026-11-09）
--
-- 背景：20261109140200 只把四枚细码授予 finance_manager/admin/superadmin。
-- 单租户多法人模型下，内部交易台账由集团财务在租户域录入；真实 tenant_admin
-- 实测 POST/PUT /erp/consolidation/internal-transactions 与 confirm/dispute 均 403，
-- 等于这套台账在当前模型下无人可录。本迁移仅补租户域角色绑定。
--
-- 边界：**不**授予 erp:consolidation-elimination:write 或任何抵消执行类权限，
-- 抵消执行的三权分离属 P4 第二批单独定义，不在本迁移范围。
--
-- 幂等：权限码 INSERT ... WHERE NOT EXISTS；角色绑定 INSERT ... WHERE NOT EXISTS。
--
-- ROLLBACK（只回滚本迁移新增的绑定，不删 140200 已存在的权限码）：
--   DELETE FROM public.core_role_permissions rp USING public.core_roles r,
--                public.core_permissions p
--    WHERE rp.role_id = r.id AND rp.permission_id = p.id
--      AND r.name = 'tenant_admin'
--      AND p.code IN ('erp:consolidation-ledger:write',
--                     'erp:consolidation-ledger:approve',
--                     'erp:consolidation-scan:write',
--                     'erp:consolidation-reconcile:read');

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
WHERE r.name = 'tenant_admin'
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
