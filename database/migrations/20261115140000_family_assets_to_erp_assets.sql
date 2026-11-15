-- 20261115140000 family_assets_to_erp_assets
-- 31 列全同；prod 侧 1 行已存在且逐列一致 → 预期插入 0
-- 本迁移不写入数据，仅做一致性断言；回滚为空操作。
DO $$
DECLARE n_src int; n_tgt int;
BEGIN
  SELECT count(*) INTO n_src FROM public.assets;
  SELECT count(*) INTO n_tgt FROM erp.assets;
  IF n_src <> n_tgt THEN
    RAISE EXCEPTION '断言失败：public.assets(%) 与 erp.assets(%) 行数不一致', n_src, n_tgt;
  END IF;
END $$;
