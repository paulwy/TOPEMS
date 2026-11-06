-- P3-12 erp_manager 跨域只读授权（批 22 / 2026-11-06）
--
-- 背景：批 21 把 ERP 凭证入口的落点收敛到 finance 权威页（FinanceVoucherPage），
-- 后端 /finance/vouchers 实际鉴权码为 finance:voucher:read
-- （svc/finance/src/modules/mod.rs:290、cqrs_routes.rs:130）。
-- 而 DB 实测 erp_manager 对 finance:voucher:* 持有 0 条 → ERP 角色无法使用该入口。
--
-- 拍板：补 **只读**（不补 write —— ERP 角色不获财务写权限，保持最小权限）。
--
-- 影响面：erp_manager 因此可见并使用 /erp/voucher-management 入口（菜单 permission 与
-- 路由 requiredPermissions 均已对齐为 finance:voucher:read，见 modules/erp/config.ts:599/180）。
--
-- 幂等：NOT EXISTS(role,permission) 判重。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_roles r, public.core_permissions p
--    WHERE rp.role_id = r.id AND rp.permission_id = p.id
--      AND r.name = 'erp_manager' AND p.code = 'finance:voucher:read';

INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code = 'finance:voucher:read'
WHERE r.name = 'erp_manager'
  AND NOT EXISTS (
    SELECT 1 FROM public.core_role_permissions x
    WHERE x.role_id = r.id AND x.permission_id = p.id
  );
