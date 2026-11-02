-- ============================================================
-- 审计整改批 5：修正 crm-customer-segmentation 菜单权限码
-- 问题：backfill 补种时该菜单 permission 误写为 crm:segmentation:read，
--       core_permissions 无此码；前端真实码为 crm:customer_segmentation:read。
-- 幂等：固定值 UPDATE，可重复执行。
-- 2026-11-02 修正：core_menus 不硬编码 schema（prod=public / test=iam，依赖 search_path）。
-- ============================================================

UPDATE core_menus
SET permissions = json_build_object('permission', 'crm:customer_segmentation:read')
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND code = 'crm-customer-segmentation'
  AND permissions->>'permission' = 'crm:segmentation:read';
