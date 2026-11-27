-- ============================================================
-- 20261127120000: mes 基础资料 code 唯一性由「全局唯一」降级为「租户内唯一」
--
-- 背景（2026-11-27，决策 A）：
--   canonical 迁移 20261121160000_mes_schema_canonical 为四张基础资料表加了
--   `*_code_key UNIQUE (code)`（全局唯一），但同一批表在本机已有
--   `*_tenant_code_key UNIQUE (tenant_id, code)`（见 20261127110000 承接重建）。
--   两者并存时全局约束更严：跨租户不能复用同一 code（A 厂 WS01 与 B 厂 WS01 互斥），
--   与多租户 + RLS 的隔离口径冲突，租户内唯一形同虚设。
--
-- 决策：保留「租户内唯一」，删除「全局唯一」——code 只在租户内保证唯一。
--
-- 动作：对 mes.production_lines / mes.shifts / mes.work_calendars / mes.workshops
--   的 `*_code_key` 约束逐个 DROP CONSTRAINT IF EXISTS（表缺失或约束已不在则跳过）。
--   `(tenant_id, code)` 唯一索引由 20261127110000 提供，本文件末尾断言其在位。
--
-- 幂等：to_regclass 守卫 + pg_constraint 存在性判断 + DROP CONSTRAINT IF EXISTS。
-- 事务：文件内不含 BEGIN/COMMIT（由迁移执行器包裹）。
-- 回滚：database/rollback/20261127120000_mes_basics_code_unique_tenant_scope.rollback.sql
--       （回滚会重建全局唯一；若存在跨租户同 code 数据，回滚会失败，属预期）
-- ============================================================

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

DO $mig$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('mes', 'production_lines', 'production_lines_code_key'),
      ('mes', 'shifts',           'shifts_code_key'),
      ('mes', 'work_calendars',   'work_calendars_code_key'),
      ('mes', 'workshops',        'workshops_code_key')
    ) AS v(sch, tbl, con)
  LOOP
    IF to_regclass(r.sch || '.' || r.tbl) IS NULL THEN
      RAISE NOTICE 'skip: %.% 不存在', r.sch, r.tbl;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('%I.%I', r.sch, r.tbl)::regclass
        AND conname = r.con
    ) THEN
      EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', r.sch, r.tbl, r.con);
      RAISE NOTICE 'dropped: %.% constraint %', r.sch, r.tbl, r.con;
    ELSE
      RAISE NOTICE 'skip: %.% 无约束 %', r.sch, r.tbl, r.con;
    END IF;
  END LOOP;
END
$mig$;

-- 收尾断言：
--   1) 4 条全局 `*_code_key` 约束不得再存在于对应表；
--   2) `(tenant_id, code)` 租户内唯一索引必须在位（表存在时）。
DO $mig$
DECLARE
  r record;
  v_problem text := NULL;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('mes', 'production_lines', 'production_lines_code_key', 'production_lines_tenant_code_key'),
      ('mes', 'shifts',           'shifts_code_key',           'shifts_tenant_code_key'),
      ('mes', 'work_calendars',   'work_calendars_code_key',   'work_calendars_tenant_code_key'),
      ('mes', 'workshops',        'workshops_code_key',        'workshops_tenant_code_key')
    ) AS v(sch, tbl, global_con, tenant_idx)
  LOOP
    IF to_regclass(r.sch || '.' || r.tbl) IS NULL THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('%I.%I', r.sch, r.tbl)::regclass
        AND conname = r.global_con
    ) THEN
      v_problem := concat_ws(', ', v_problem, format('%s.%s 仍存在全局约束 %s', r.sch, r.tbl, r.global_con));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = r.sch AND tablename = r.tbl AND indexname = r.tenant_idx
    ) THEN
      v_problem := concat_ws(', ', v_problem, format('%s.%s 缺少租户内唯一索引 %s', r.sch, r.tbl, r.tenant_idx));
    END IF;
  END LOOP;

  IF v_problem IS NOT NULL THEN
    RAISE EXCEPTION 'code 唯一性收敛未完成：%', v_problem;
  END IF;
END
$mig$;
