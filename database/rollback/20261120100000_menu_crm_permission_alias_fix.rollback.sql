-- 回滚：20261120100000_menu_crm_permission_alias_fix.sql
--
-- 性质：本迁移只把 3 个 CRM 菜单的 permissions.permission 从「权限表不存在的别名」
--   改为后端与 core_permissions 实际使用的正式码，不改菜单结构、不删行。
--
-- 回滚即恢复旧别名（用于确需回到迁移前状态的场景）。注意：
--   * 旧别名在 public.core_permissions 中不存在，恢复后这 3 个菜单的权限判定会
--     再次失效（前端可能整项隐藏/后端 403），仅作应急回退；
--   * 只更新当前值为新码的行，已人工改成其他值的不覆盖；
--   * public / iam 双 schema 探测，表不存在则跳过。
-- 文件内无 BEGIN/COMMIT。

DO $$
DECLARE
  r record;
  v_updated integer;
BEGIN
  FOR r IN
    SELECT *
    FROM (VALUES
      ('crm-customer-scoring',      'crm:customer_scoring:read', 'crm:scoring:read'),
      ('crm-customer-segmentation', 'crm:customer_segmentation:read', 'crm:segmentation:read'),
      ('crm-sales-funnel',          'crm:sales_funnel:read', 'crm:funnel:read')
    ) AS t(menu_code, new_perm, old_perm)
  LOOP
    IF to_regclass('public.core_menus') IS NOT NULL THEN
      UPDATE public.core_menus
      SET permissions = jsonb_set(permissions, '{permission}', to_jsonb(r.old_perm), true),
          updated_at = now()
      WHERE code = r.menu_code
        AND permissions->>'permission' = r.new_perm;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
    END IF;

    IF to_regclass('iam.core_menus') IS NOT NULL THEN
      UPDATE iam.core_menus
      SET permissions = jsonb_set(permissions, '{permission}', to_jsonb(r.old_perm), true),
          updated_at = now()
      WHERE code = r.menu_code
        AND permissions->>'permission' = r.new_perm;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
    END IF;
  END LOOP;
END
$$;
