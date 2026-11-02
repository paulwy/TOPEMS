-- ============================================================
-- 审计整改批 5：修正 crm-customer-segmentation 菜单权限码
-- 问题：backfill 补种时该菜单 permission 误写为 crm:segmentation:read，
--       core_permissions 无此码；前端真实码为 crm:customer_segmentation:read。
-- 幂等：固定值 UPDATE，可重复执行。
-- ============================================================

UPDATE mes.core_menus
SET permissions = json_build_object('permission', 'crm:customer_segmentation:read')
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND code = 'crm-customer-segmentation'
  AND permissions->>'permission' = 'crm:segmentation:read';
