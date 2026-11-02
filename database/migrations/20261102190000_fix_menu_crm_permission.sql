-- ============================================================
-- 审计整改批 5：修正 crm-customer-segmentation 菜单权限码
-- 问题：backfill 补种时该菜单 permission 误写为 crm:segmentation:read，
--       core_permissions 无此码；前端真实码为 crm:customer_segmentation:read。
-- 幂等：固定值 UPDATE，可重复执行。
-- 2026-11-03 修正：core_menus 所在 schema 各库不一致（prod=public / test=iam /
--       5433 亦 iam 类）——改为 DO 块双 schema 探测（显式 public + iam，
--       不依赖 search_path；任一存在即 UPDATE，均不存在则 NOTICE 跳过）。
--       注：该迁移此前因硬编码 mes.core_menus 在五库均执行失败、账本无记录
--       （实测修复已手动完成）——本修正保证未来 migrate run 幂等成功。
-- ============================================================

DO $$
BEGIN
  -- public 分支（prod 等库 core_menus 位于 public）
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'core_menus') THEN
    UPDATE public.core_menus
    SET permissions = json_build_object('permission', 'crm:customer_segmentation:read')
    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
      AND code = 'crm-customer-segmentation'
      AND permissions->>'permission' = 'crm:segmentation:read';
  END IF;

  -- iam 分支（test/5433 等库 core_menus 位于 iam）
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'iam' AND table_name = 'core_menus') THEN
    UPDATE iam.core_menus
    SET permissions = json_build_object('permission', 'crm:customer_segmentation:read')
    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
      AND code = 'crm-customer-segmentation'
      AND permissions->>'permission' = 'crm:segmentation:read';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'core_menus' AND table_schema IN ('public','iam')) THEN
    RAISE NOTICE 'core_menus not found in public/iam; skip permission fix';
  END IF;
END $$;
