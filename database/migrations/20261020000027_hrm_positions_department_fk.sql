-- 20261020000027_hrm_positions_department_fk.sql
-- P2-4 收口：hrm.positions.department_id 此前仅加列、无 DB 外键（仅应用层校验）。
-- 本迁移幂等补齐硬 FK：
--   1) 先把指向不存在部门的孤儿行 department_id 置 NULL（非破坏，不删岗位）；
--   2) 已有正确 FK（指向 hrm.departments）则跳过；否则 DROP IF EXISTS 后重建，
--      ON DELETE SET NULL（部门删除时岗位保留、解绑部门，与软删除体系一致）。
-- 表缺失则跳过，整批可重复执行。

SET app.tenant_id = '00000000-0000-0000-0000-000000000000';

DO $$
DECLARE
  fk_ok boolean;
  orphans bigint;
  v_conname constant text := 'hrm_positions_department_id_fkey';
BEGIN
  IF to_regclass('hrm.positions') IS NULL OR to_regclass('hrm.departments') IS NULL THEN
    RAISE NOTICE 'skip (relation missing): hrm.positions / hrm.departments';
    RETURN;
  END IF;

  -- 1) 清孤儿：department_id 指向不存在部门的岗位解绑（置 NULL），不删行
  EXECUTE format(
    'SELECT count(*) FROM hrm.positions p
     WHERE p.department_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM hrm.departments d WHERE d.id = p.department_id)'
  ) INTO orphans;
  IF orphans > 0 THEN
    EXECUTE format(
      'UPDATE hrm.positions SET department_id = NULL, updated_at = NOW()
       WHERE department_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM hrm.departments d WHERE d.id = hrm.positions.department_id)'
    );
    RAISE NOTICE 'unbound % orphan position(s) from missing departments', orphans;
  END IF;

  -- 2) 已有正确 FK 则跳过
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class f ON f.oid = con.confrelid
    JOIN pg_namespace fn ON fn.oid = f.relnamespace
    WHERE con.contype = 'f'
      AND con.conname = v_conname
      AND n.nspname = 'hrm'
      AND c.relname = 'positions'
      AND fn.nspname = 'hrm'
      AND f.relname = 'departments'
  ) INTO fk_ok;
  IF fk_ok THEN
    RAISE NOTICE 'fk already correct: hrm.positions %', v_conname;
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE hrm.positions DROP CONSTRAINT IF EXISTS %I', v_conname);
  EXECUTE format(
    'ALTER TABLE hrm.positions ADD CONSTRAINT %I FOREIGN KEY (department_id)
     REFERENCES hrm.departments(id) ON DELETE SET NULL',
    v_conname
  );
  RAISE NOTICE 'fk rebuilt: hrm.positions % -> hrm.departments(id) ON DELETE SET NULL', v_conname;
END $$;

RESET app.tenant_id;
