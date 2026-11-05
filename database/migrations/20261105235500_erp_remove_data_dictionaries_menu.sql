-- ============================================================
-- erp_dictionaries 下线（A）· 菜单行删除
--
-- 背景：ERP「数据字典(业务)」页（/erp/data-dictionaries）后端 5 个 handler 在
--   search_path=erp,public 下裸名访问 erp_dictionaries 恒失败，从未成功上线；
--   2026-11-05 确认完整下线（前端页面/路由/导航 + 后端 handler + 菜单 + 表）。
--
-- 种子来源：database/migrations/20261102140000_menu_seed_erp.sql#L46
--   已发布迁移不可改写（checksum），故新增本迁移按 code 精确删除。
--
-- 双份历史问题：本项目 core_menus 存在 public / iam 两份副本。
--   实测（2026-11-05）：prod 行在 public.core_menus（1 行，iam 0 行）；
--                       test 行在 iam.core_menus（1 行，public 0 行）。
--   故两处都按 code 删除，缺失方打印 SKIP。
--
-- 幂等：DELETE ... WHERE code='erp-data-dictionaries'，重复执行 0 行。
-- ============================================================

SET lock_timeout = '5s';

DO $$
DECLARE
  v_cnt integer;
BEGIN
  IF to_regclass('public.core_menus') IS NOT NULL THEN
    DELETE FROM public.core_menus WHERE code = 'erp-data-dictionaries';
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    RAISE NOTICE 'public.core_menus delete erp-data-dictionaries: % row(s)', v_cnt;
  ELSE
    RAISE NOTICE 'SKIP public.core_menus: table missing';
  END IF;

  IF to_regclass('iam.core_menus') IS NOT NULL THEN
    DELETE FROM iam.core_menus WHERE code = 'erp-data-dictionaries';
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    RAISE NOTICE 'iam.core_menus delete erp-data-dictionaries: % row(s)', v_cnt;
  ELSE
    RAISE NOTICE 'SKIP iam.core_menus: table missing';
  END IF;
END $$;
