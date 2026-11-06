-- P3-18 E 项缺口补齐 + 10 个域经理角色创建与授权（批 28 / 2026-11-07）
--
-- 背景：批 27 的可达性实测暴露两个既有权限缺口，且角色规划长期只停在"建议"阶段
-- （15 个域无 manager、合计 45 前缀，一律 admin-only）。本批按拍板「一次建齐」落地。
--
-- 本迁移做三件事：
--
--   1) E 项缺口 1：admin:iam:delete → 授 admin
--      现状：只有 superadmin 持有。模块=admin、资源=iam，而 admin:admin /
--      admin:iam:admin 均不存在，hasPermission 规则 5 的 admin↔iam 等价检查
--      iam:iam:delete（不存在）→ admin 无法通过该路由，只能靠补授权。
--
--   2) E 项缺口 2：pdm:drawing:read → 授 pdm_manager / admin / superadmin
--      现状：该码在 core_role_permissions 中【零持有者】，admin 也不持有
--      pdm:admin 通配 → 对 admin 与所有 manager 均不可达（功能缺口）。
--
--   3) 创建 10 个域经理角色，各授本域全部权限码（含批 23~27 新建的码）
--      角色（沿用既有 <域>_manager 命名与「XX管理角色」描述规范，平台级 tenant_id 全 0）：
--        rd_manager      研发        55 码
--        integration_manager 集成    31 码
--        workflow_manager 工作流     32 码
--        aps_manager     高级排程    22 码
--        tms_manager     运输        21 码
--        bi_manager      商业智能    19 码
--        monitor_manager 监控        16 码
--        notification_manager 通知   15 码
--        doc_manager     文档        14 码
--        ticket_manager  工单        5 码
--      合计 230 个域内码。授权口径 = 域内全部码（两段 + 三段），与既有
--      crm_manager / hrm_manager 等 42/45、12/12 的「域内近乎全码」模式一致。
--
--      不建的角色（拍板明确）：
--        mobile / migration / plugin / iam / tenant 五域维持 admin-only；
--        project_manager 已存在（tenant 级、description「项目经理 - 项目管理权限」），
--        与 pm_manager（「项目管理角色」）语义重叠但不合并：前者是租户级岗位角色，
--        后者是平台级域管理角色，两者授权范围不同，本批不新建重复角色。
--
-- 幂等：建角色用 ON CONFLICT (name) DO NOTHING；授权用 NOT EXISTS(role_id, permission_id)。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id
--      AND p.code IN ('admin:iam:delete', 'pdm:drawing:read');
--   DELETE FROM public.core_role_permissions rp USING public.core_roles r
--    WHERE rp.role_id = r.id
--      AND r.name IN ('rd_manager','integration_manager','workflow_manager','aps_manager',
--                     'tms_manager','bi_manager','monitor_manager','notification_manager',
--                     'doc_manager','ticket_manager');
--   DELETE FROM public.core_roles
--    WHERE name IN ('rd_manager','integration_manager','workflow_manager','aps_manager',
--                   'tms_manager','bi_manager','monitor_manager','notification_manager',
--                   'doc_manager','ticket_manager');

-- ========== 1) E 项缺口 1：admin:iam:delete → admin ==========
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code = 'admin:iam:delete'
WHERE r.name = 'admin'
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );

-- ========== 2) E 项缺口 2：pdm:drawing:read → pdm_manager / admin / superadmin ==========
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code = 'pdm:drawing:read'
WHERE r.name IN ('pdm_manager', 'admin', 'superadmin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );

-- ========== 3) 创建 10 个域经理角色 ==========
INSERT INTO public.core_roles (name, description, tenant_id)
VALUES
  ('rd_manager',           '研发管理角色',       '00000000-0000-0000-0000-000000000000'),
  ('integration_manager',  '系统集成管理角色',   '00000000-0000-0000-0000-000000000000'),
  ('workflow_manager',     '工作流管理角色',     '00000000-0000-0000-0000-000000000000'),
  ('aps_manager',          '高级排程管理角色',   '00000000-0000-0000-0000-000000000000'),
  ('tms_manager',          '运输管理角色',       '00000000-0000-0000-0000-000000000000'),
  ('bi_manager',           '商业智能管理角色',   '00000000-0000-0000-0000-000000000000'),
  ('monitor_manager',      '系统监控管理角色',   '00000000-0000-0000-0000-000000000000'),
  ('notification_manager', '通知中心管理角色',   '00000000-0000-0000-0000-000000000000'),
  ('doc_manager',          '文档管理角色',       '00000000-0000-0000-0000-000000000000'),
  ('ticket_manager',       '工单管理角色',       '00000000-0000-0000-0000-000000000000')
ON CONFLICT (name) DO NOTHING;

-- ========== 4) 每角色授本域全部权限码 ==========
--    split_part(r.name,'_',1) 对 10 个角色名均等于其域前缀（域名本身不含下划线）
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p
  ON split_part(p.code, ':', 1) = split_part(r.name, '_', 1)
WHERE r.name IN (
    'rd_manager', 'integration_manager', 'workflow_manager', 'aps_manager',
    'tms_manager', 'bi_manager', 'monitor_manager', 'notification_manager',
    'doc_manager', 'ticket_manager'
)
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
