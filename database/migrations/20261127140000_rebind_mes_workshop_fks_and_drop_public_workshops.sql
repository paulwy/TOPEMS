-- ============================================================
-- 20261127140000: mes 车间外键回绑 + 清除 public.workshops 遗留空壳表
--
-- 背景（2026-11-27 排查结论）：
--   本机 dev 存在 `public.workshops`（0 行，无 tenant_id、无 RLS）作为历史空壳，
--   而 `mes.work_stations.workshop_id` / `mes.production_orders.workshop_id` 的外键
--   `fk_work_stations_workshop` / `fk_production_orders_workshop` 都指向这张空壳
--   （`REFERENCES workshops(id)` 未限定 schema，按 search_path 落到 public）。
--   后果：车间外键校验打在死表上（当前两表 workshop_id 全 NULL、空壳 0 行，所以未爆），
--   一旦写入真实车间 ID 就会「mes.workshops 有、public.workshops 无」→ 23503 外键失败；
--   且空壳无 tenant_id/RLS，与多租户隔离口径不一致。
--   生产侧无此表，两条外键已正确指向 mes.workshops（本迁移在生产为纯空跑）。
--
-- 动作（顺序固定）：
--   1) 两条外键若仍指向 public.workshops → DROP 后重建为 REFERENCES mes.workshops(id) ON DELETE SET NULL；
--   2) 删除空壳表 public.workshops；
--   3) 收尾断言：public.workshops 不存在；两条外键都指向 mes.workshops。
--
-- 幂等：全部走 to_regclass / pg_constraint 存在性守卫；表或约束已不在则跳过。
-- 前置核查（本机 2026-11-27）：mes.work_stations 79 行、mes.production_orders 134 行，
--   workshop_id 非空行均为 0 → 回绑零校验冲突；空壳表 0 行、无视图/物化视图依赖。
-- 事务：文件内不含 BEGIN/COMMIT（由迁移执行器包裹）。
-- 回滚：database/rollback/20261127140000_rebind_mes_workshop_fks_and_drop_public_workshops.rollback.sql
--       （仅能重建空壳表结构，无法恢复历史数据——本身即为 0 行空壳）
-- ============================================================

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

-- 1) 外键回绑
DO $mig$
DECLARE
  r record;
  v_confrel oid;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('mes', 'work_stations',     'fk_work_stations_workshop'),
      ('mes', 'production_orders', 'fk_production_orders_workshop')
    ) AS v(sch, tbl, con)
  LOOP
    IF to_regclass(r.sch || '.' || r.tbl) IS NULL OR to_regclass('mes.workshops') IS NULL THEN
      RAISE NOTICE 'skip: 表缺失（%.% / mes.workshops）', r.sch, r.tbl;
      CONTINUE;
    END IF;

    SELECT confrelid INTO v_confrel
    FROM pg_constraint
    WHERE conrelid = format('%I.%I', r.sch, r.tbl)::regclass AND conname = r.con;

    IF v_confrel IS NULL THEN
      RAISE NOTICE 'skip: %.% 无约束 %', r.sch, r.tbl, r.con;
      CONTINUE;
    END IF;

    IF v_confrel = to_regclass('public.workshops') THEN
      EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.sch, r.tbl, r.con);
      EXECUTE format(
        'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (workshop_id) REFERENCES mes.workshops(id) ON DELETE SET NULL',
        r.sch, r.tbl, r.con
      );
      RAISE NOTICE 'rebound: %.% % → mes.workshops', r.sch, r.tbl, r.con;
    ELSE
      RAISE NOTICE 'skip: %.% % 已指向 %', r.sch, r.tbl, r.con, v_confrel::regclass;
    END IF;
  END LOOP;
END
$mig$;

-- 2) 删除空壳表（0 行、无数据价值；生产无此表）
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 历史遗留 public.workshops 空壳（0 行、无 tenant_id/RLS，外键已回绑 mes.workshops）
-- destructive-owner: mes
-- destructive-ticket: MES-LEGACY-20261127
-- destructive-expires: 2027-05-26
-- destructive-rows-at-review: 0
-- destructive-backup: 0 行空壳表；结构可由 20261021000006_mes_basics.sql 复现
DROP TABLE IF EXISTS public.workshops;

-- 3) 收尾断言
DO $mig$
DECLARE
  v_bad text := NULL;
  v_confrel oid;
  r record;
BEGIN
  IF to_regclass('public.workshops') IS NOT NULL THEN
    v_bad := concat_ws(', ', v_bad, 'public.workshops 仍存在');
  END IF;

  FOR r IN
    SELECT * FROM (VALUES
      ('mes', 'work_stations',     'fk_work_stations_workshop'),
      ('mes', 'production_orders', 'fk_production_orders_workshop')
    ) AS v(sch, tbl, con)
  LOOP
    IF to_regclass(r.sch || '.' || r.tbl) IS NULL THEN
      CONTINUE;
    END IF;

    SELECT confrelid INTO v_confrel
    FROM pg_constraint
    WHERE conrelid = format('%I.%I', r.sch, r.tbl)::regclass AND conname = r.con;

    IF v_confrel IS NULL THEN
      CONTINUE;
    END IF;

    IF v_confrel IS DISTINCT FROM to_regclass('mes.workshops') THEN
      v_bad := concat_ws(', ', v_bad,
        format('%s.%s 外键仍指向 %s', r.sch, r.tbl, v_confrel::regclass));
    END IF;
  END LOOP;

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION '车间外键回绑未完成：%', v_bad;
  END IF;
END
$mig$;
