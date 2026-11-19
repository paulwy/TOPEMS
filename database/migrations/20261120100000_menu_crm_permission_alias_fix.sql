-- =============================================================================
-- CRM 菜单权限码别名修复（2026-11-20）
-- =============================================================================
-- 现场（live public.core_menus，tenant_id IS NULL 的全局菜单）：
--   crm-customer-scoring      permissions = {"permission":"crm:scoring:read"}
--   crm-customer-segmentation permissions = {"permission":"crm:segmentation:read"}
--   crm-sales-funnel          permissions = {"permission":"crm:funnel:read"}
-- 这三个码在 public.core_permissions 中不存在，而后端与权限表实际使用：
--   crm:customer_scoring:read / crm:customer_segmentation:read / crm:sales_funnel:read
-- （svc/crm/src/modules/{customer_scoring,customer_segmentation,sales_funnel}.rs
--   的 security(...) 声明与 core_permissions 行均可佐证）。
--
-- 历史修复为何没生效：
--   20261102190000_fix_menu_crm_permission.sql 只处理
--   tenant_id = '00000000-0000-0000-0000-000000000001' 的分群菜单，
--   而这批模块菜单是 tenant_id IS NULL 的全局行（20261110100100 已把全局行归 NULL），
--   因此 UPDATE 命中 0 行，别名一直留在库里。该迁移只修分群一项，评分/漏斗从未覆盖。
--
-- 本迁移口径：
--   * 按 code + 旧权限码精确匹配，不限制 tenant_id（同时覆盖全局行与租户副本）；
--   * 仅替换 permissions->>'permission'，保留 permissions 内其他键；
--   * 幂等：已是新码则不再匹配；表不存在则 NOTICE 跳过（public / iam 双 schema 探测）。
--   * 不改 20260724000005 种子（已应用迁移文本不可变），由本迁移做前向收敛；
--     新库先seed后本迁移即可得到终态。
-- 文件内无 BEGIN/COMMIT。
-- =============================================================================

DO $$
DECLARE
  r record;
  v_updated integer;
  v_total integer := 0;
BEGIN
  FOR r IN
    SELECT *
    FROM (VALUES
      ('crm-customer-scoring',      'crm:scoring:read',      'crm:customer_scoring:read'),
      ('crm-customer-segmentation', 'crm:segmentation:read', 'crm:customer_segmentation:read'),
      ('crm-sales-funnel',          'crm:funnel:read',       'crm:sales_funnel:read')
    ) AS t(menu_code, old_perm, new_perm)
  LOOP
    -- public 分支（prod / 本机 dev）
    IF to_regclass('public.core_menus') IS NOT NULL THEN
      UPDATE public.core_menus
      SET permissions = CASE
            WHEN permissions IS NULL THEN jsonb_build_object('permission', r.new_perm)
            ELSE jsonb_set(permissions, '{permission}', to_jsonb(r.new_perm), true)
          END,
          updated_at = now()
      WHERE code = r.menu_code
        AND permissions->>'permission' = r.old_perm;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      v_total := v_total + v_updated;
    END IF;

    -- iam 分支（部分测试/5433 库 core_menus 位于 iam）
    IF to_regclass('iam.core_menus') IS NOT NULL THEN
      UPDATE iam.core_menus
      SET permissions = CASE
            WHEN permissions IS NULL THEN jsonb_build_object('permission', r.new_perm)
            ELSE jsonb_set(permissions, '{permission}', to_jsonb(r.new_perm), true)
          END,
          updated_at = now()
      WHERE code = r.menu_code
        AND permissions->>'permission' = r.old_perm;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      v_total := v_total + v_updated;
    END IF;
  END LOOP;

  RAISE NOTICE 'crm menu permission alias fix: % row(s) updated', v_total;
END
$$;
