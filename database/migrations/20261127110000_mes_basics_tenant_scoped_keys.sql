-- ============================================================
-- 20261127110000: mes 基础资料「租户内业务键唯一」（可重放来源重建）
--
-- 背景（2026-11-27）：
--   dev 库曾以未提交的 20261127090000_mes_basics_tenant_scoped_keys 建下 5 条唯一索引，
--   随后该文件在工作区被撤回（origin 与本地均无、manifest 无登记），但 dev 库已应用、
--   _sqlx_migrations 留有 success 行 → 形成「有结构、无来源」的不可重建债：
--   新库 / drill 隔离库 / prod 都建不出这批约束，dev 与基线会永久分叉。
--
-- 处置：本文件以幂等 `CREATE UNIQUE INDEX IF NOT EXISTS` 复刻同形约束，作为可重放来源；
--   后续任何环境（含从零 provision 的隔离库）都能重建出与 dev 一致的唯一性口径。
--   20261127090000 在 manifest 中登记为 orphan（已应用无文件），本文件承接其效果。
--
-- 约束清单：
--   mes.workshops          workshops_tenant_code_key (tenant_id, code)
--                          workshops_id_tenant_key   (id, tenant_id)
--   mes.production_lines   production_lines_tenant_code_key (tenant_id, code)
--   mes.shifts             shifts_tenant_code_key (tenant_id, code)
--   mes.work_calendars     work_calendars_tenant_code_key (tenant_id, code)
--
-- 幂等：IF NOT EXISTS + 表缺失跳过；末尾断言 5 条索引全部在位，缺一即 RAISE EXCEPTION。
-- 事务：文件内不含 BEGIN/COMMIT（由迁移执行器包裹）。
-- 回滚：database/rollback/20261127110000_mes_basics_tenant_scoped_keys.rollback.sql
-- ============================================================

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

DO $mig$
BEGIN
  IF to_regclass('mes.workshops') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS workshops_tenant_code_key ON mes.workshops (tenant_id, code);
    CREATE UNIQUE INDEX IF NOT EXISTS workshops_id_tenant_key   ON mes.workshops (id, tenant_id);
  ELSE
    RAISE NOTICE 'skip: mes.workshops 不存在';
  END IF;

  IF to_regclass('mes.production_lines') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS production_lines_tenant_code_key
      ON mes.production_lines (tenant_id, code);
  ELSE
    RAISE NOTICE 'skip: mes.production_lines 不存在';
  END IF;

  IF to_regclass('mes.shifts') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS shifts_tenant_code_key ON mes.shifts (tenant_id, code);
  ELSE
    RAISE NOTICE 'skip: mes.shifts 不存在';
  END IF;

  IF to_regclass('mes.work_calendars') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS work_calendars_tenant_code_key
      ON mes.work_calendars (tenant_id, code);
  ELSE
    RAISE NOTICE 'skip: mes.work_calendars 不存在';
  END IF;
END
$mig$;

-- 收尾断言：四条基础资料表的租户业务键必须全部在位（表已存在时）
-- 注：索引名不带表名前缀，必须按 (schema, tablename, indexname) 在 pg_indexes 里核对；
--     `to_regclass('mes.tbl.idx')` 是三段式，非法。
DO $mig$
DECLARE
  r record;
  v_missing text := NULL;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('mes', 'workshops',        'workshops_tenant_code_key'),
      ('mes', 'workshops',        'workshops_id_tenant_key'),
      ('mes', 'production_lines', 'production_lines_tenant_code_key'),
      ('mes', 'shifts',           'shifts_tenant_code_key'),
      ('mes', 'work_calendars',   'work_calendars_tenant_code_key')
    ) AS v(sch, tbl, idx)
  LOOP
    IF to_regclass(r.sch || '.' || r.tbl) IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = r.sch AND tablename = r.tbl AND indexname = r.idx
    ) THEN
      v_missing := concat_ws(', ', v_missing, r.sch || '.' || r.tbl || ' / ' || r.idx);
    END IF;
  END LOOP;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION '缺少租户业务键唯一索引：%', v_missing;
  END IF;
END
$mig$;
