-- 批 41：finance 小文件 GET 端点补挂权限细码配套迁移（2026-11-07）
--
-- 背景：批 40 已完成 finance 主体 110 条路由补挂。本迁移补建 12 个小文件
-- 路由层需要的新读码（reconciliation / event / compliance / audit / treasury / risk），
-- 覆盖 95 条此前"真裸奔"的 GET 端点。
--
-- 已存在无需补建（直接复用）：
--   finance:budget:read      → forecasting.rs / forecast_v53.rs
--   finance:report:read       → report_center.rs
--   finance:dashboard:read    → decision_v60.rs
--
-- 无路由文件（无需补码）：
--   bootstrap.rs              仅 POST /bootstrap，无 GET
--   voucher_template.rs       无自有路由，全部在 mod.rs voucher 域子 Router 内（批 40 已挂 finance:voucher:read）
--
-- 幂等：建码用 NOT EXISTS(code)；授权用 NOT EXISTS(role_id, permission_id)。
-- 可重复执行，第二次执行影响行数为 0。
--
-- ROLLBACK 方案：
--   DELETE FROM core_role_permissions WHERE permission_id IN (
--     SELECT id FROM core_permissions WHERE code LIKE 'finance:reconciliation:read'
--        OR code LIKE 'finance:event:read'
--        OR code LIKE 'finance:compliance:read'
--        OR code LIKE 'finance:audit:read'
--        OR code LIKE 'finance:treasury:read'
--        OR code LIKE 'finance:risk:read'
--   );
--   DELETE FROM core_permissions WHERE code IN (
--     'finance:reconciliation:read','finance:event:read','finance:compliance:read',
--     'finance:audit:read','finance:treasury:read','finance:risk:read'
--   );

-- 1) 补建缺失的读码
INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:reconciliation:read', '对账会话-只读', 'finance:reconciliation', 'read', 1
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = 'finance:reconciliation:read');

INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:event:read', '事件溯源/CQRS 观测-只读', 'finance:event', 'read', 1
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = 'finance:event:read');

INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:compliance:read', '内控合规-只读', 'finance:compliance', 'read', 1
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = 'finance:compliance:read');

INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:audit:read', '审计/异常检测-只读', 'finance:audit', 'read', 1
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = 'finance:audit:read');

INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:treasury:read', '资金池/流动性管理-只读', 'finance:treasury', 'read', 1
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = 'finance:treasury:read');

INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:risk:read', '风险管理/反欺诈/信用评分-只读', 'finance:risk', 'read', 1
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = 'finance:risk:read');

-- 2) 授权上述新码 → finance_manager / admin / superadmin
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code IN (
    'finance:reconciliation:read',
    'finance:event:read',
    'finance:compliance:read',
    'finance:audit:read',
    'finance:treasury:read',
    'finance:risk:read'
)
WHERE r.name IN ('finance_manager', 'admin', 'superadmin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
