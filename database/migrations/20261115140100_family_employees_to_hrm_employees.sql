-- 20261115140100 family_employees_to_hrm_employees
-- 41 列同名；19 行已存在且逐列一致 → 预期插入 0
-- 本迁移不写入数据，仅做一致性断言；回滚为空操作。
DO $$
DECLARE n_src int; n_tgt int;
BEGIN
  SELECT count(*) INTO n_src FROM public.employees;
  SELECT count(*) INTO n_tgt FROM hrm.employees;
  IF n_src <> n_tgt THEN
    RAISE EXCEPTION '断言失败：public.employees(%) 与 hrm.employees(%) 行数不一致', n_src, n_tgt;
  END IF;
END $$;
