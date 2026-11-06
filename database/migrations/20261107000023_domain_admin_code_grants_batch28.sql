-- P3-18 域管理码授权补齐（批 28 / 2026-11-07）
--
-- 背景：批 28 的可达性实测（395 个路由码）暴露 13 个 admin 不可达的路由码，
-- 取证后发现根因是「域管理码 X:admin 存在但关键角色未持有」：
--   · admin 只持 25 个 X:admin 通配，缺 lims:admin / master-data:admin
--     → hasPermission 规则③（<模块>:admin 通配）不生效
--     → lims:test-method:read 与 master-data 的 11 个 :read 全部不可达
--   · 4 个既有 manager 未持自家域 X:admin（erp/lims/pdm/srm），而其余 14 个 manager 持有
--     → 同为 manager 却能力不一致；域内新增码时不会自动覆盖
--   · admin:iam:dashboard:approve 是四段码，模块=admin，而 admin:admin /
--     admin:iam:admin 均不存在，iam:admin 的通配也不覆盖四段码 → 无人可达
--
-- 本迁移只【补授权】，不新建任何码、不建角色：
--   1) lims:admin         → admin + lims_manager
--   2) master-data:admin  → admin
--   3) erp:admin          → erp_manager
--   4) pdm:admin          → admin + pdm_manager
--   5) srm:admin          → admin + srm_manager
--   6) admin:iam:dashboard:approve → admin + superadmin
--
-- 不新建的码（避免无依据扩张，登记待治理）：
--   aps / bi / report / ticket / project 等域在 core_permissions 中【无 X:admin 管理码】，
--   故 aps_manager / bi_manager / report_manager / ticket_manager 不具备域内通配能力，
--   域内后续新增码需再补授权。是否统一为每个域补齐 admin 管理码，待产品拍板。
--
-- 幂等：全部用 NOT EXISTS(role_id, permission_id)。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id
--      AND p.code IN ('lims:admin','master-data:admin','erp:admin','pdm:admin','srm:admin','admin:iam:dashboard:approve')
--      AND rp.role_id IN (SELECT id FROM public.core_roles
--                         WHERE name IN ('admin','lims_manager','erp_manager','pdm_manager','srm_manager','superadmin'));

INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code IN (
    'lims:admin',          -- → admin, lims_manager
    'master-data:admin',   -- → admin
    'erp:admin',           -- → erp_manager
    'pdm:admin',           -- → pdm_manager
    'srm:admin',           -- → srm_manager
    'admin:iam:dashboard:approve'  -- → admin, superadmin
)
WHERE (
       (p.code = 'lims:admin'         AND r.name IN ('admin', 'lims_manager'))
    OR (p.code = 'master-data:admin'  AND r.name = 'admin')
    OR (p.code = 'erp:admin'          AND r.name = 'erp_manager')
    OR (p.code = 'pdm:admin'          AND r.name IN ('admin', 'pdm_manager'))
    OR (p.code = 'srm:admin'          AND r.name IN ('admin', 'srm_manager'))
    OR (p.code = 'admin:iam:dashboard:approve' AND r.name IN ('admin', 'superadmin'))
)
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
