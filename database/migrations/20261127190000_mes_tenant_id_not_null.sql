-- ============================================================
-- 20261127190000: mes 工位/生产订单的 tenant_id 收紧为 NOT NULL（复合外键从「软」变「硬」
--
-- 背景（2026-11-27，接 20261127170000 的已知遗留）：
--   20261127170000 把 mes.work_stations / mes.production_orders 的车间外键改成
--   `(workshop_id, tenant_id) → mes.workshops(id, tenant_id)`，但两表 tenant_id 仍可空。
--   PostgreSQL 复合外键默认 MATCH SIMPLE：只要**任一**列是 NULL，整条外键就被跳过，
--   于是 tenant_id 为 NULL 的行等于「既没租户、也不校验车间租户」——复合外键形同虚设，
--   且 rls_tenant_isolation 策略里 `OR tenant_id IS NULL` 对所有租户放行，属明显隔离缺口。
--   本迁移把 tenant_id 收紧为 NOT NULL，让复合外键在不属于任何租户时直接报错。
--
-- 数据前置（2026-11-27 实测）：
--   · 生产 topems_prod：production_orders 4 行、work_stations 4 行，tenant_id NULL 均为 0 → 无回填；
--   · 本机 dev：work_stations 79 行 NULL 0；production_orders 134 行中有 5 行 tenant_id 为 NULL
--     （均为 2026-10-17 / 11-06 的 MO-TEST-* 冒烟工单，workshop_id 也全为空）。
--   回填口径：这 5 行归默认租户 00000000-0000-0000-0000-000000000001（dev 内该租户存在），
--   保留历史行而不是删除；生产无此类行，UPDATE 为 0 行空跑。
--
-- 动作：
--   1) 回填 tenant_id 为 NULL 的行（仅 production_orders；两表都跑一遍，实际 0 行即可）；
--   2) 两表 tenant_id 收紧 NOT NULL（当前已 NOT NULL 则跳过）；
--   3) 收尾断言：两表 tenant_id 均 NOT NULL，且库内无 tenant_id 为 NULL 的行。
--
-- 影响面核查（2026-11-27）：运行期插入 mes.production_orders 的唯一路径
--   svc/mes/src/event_handlers.rs:124 显式写入 tenant_id（且带 nil 租户拦截注释），
--   work_stations 无运行期 INSERT（仅测试与读查询），故收紧不会打穿写入路径。
-- 幂等：information_schema 判定 is_nullable；回填按 IS NULL 过滤。
-- 事务：文件内不含 BEGIN/COMMIT。
-- 回滚：database/rollback/20261127190000_*.rollback.sql（DROP NOT NULL；不回退已回填的 tenant_id）
-- ============================================================

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

-- 1) 回填游离租户行（dev 5 行测试工单；生产 0 行）
-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: production_orders 中 tenant_id 为 NULL 的冒烟测试工单（MO-TEST-*）回填默认租户，避免 NOT NULL 收紧失败
-- destructive-owner: mes
-- destructive-ticket: MES-TENANT-20261127
-- destructive-expires: 2027-05-26
-- destructive-max-rows: 5
-- destructive-backup: dev 5 行 MO-TEST 工单原值已记录在台账 ⑩（id/order_no/created_at），生产 0 行
UPDATE mes.production_orders
   SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid,
       updated_at = now()
 WHERE tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: work_stations 中 tenant_id 为 NULL 的行回填默认租户（当前实测 0 行）
-- destructive-owner: mes
-- destructive-ticket: MES-TENANT-20261127
-- destructive-expires: 2027-05-26
-- destructive-max-rows: 0
-- destructive-backup: 实测 0 行，无需备份；若出现行则 fail-closed 拒绝执行
UPDATE mes.work_stations
   SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid,
       updated_at = now()
 WHERE tenant_id IS NULL;

-- 2) 收紧 NOT NULL
DO $mig$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES ('mes','work_stations'), ('mes','production_orders')) AS v(sch, tbl)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = r.sch AND table_name = r.tbl AND column_name = 'tenant_id'
    ) THEN
      RAISE EXCEPTION '缺少列: %.%.tenant_id', r.sch, r.tbl;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = r.sch AND table_name = r.tbl AND column_name = 'tenant_id' AND is_nullable = 'YES'
    ) THEN
      EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN tenant_id SET NOT NULL', r.sch, r.tbl);
      RAISE NOTICE 'not null: %.%.tenant_id', r.sch, r.tbl;
    ELSE
      RAISE NOTICE 'skip: %.%.tenant_id 已是 NOT NULL', r.sch, r.tbl;
    END IF;
  END LOOP;
END
$mig$;

-- 3) 收尾断言
DO $mig$
DECLARE
  r record;
  v_null bigint;
BEGIN
  FOR r IN SELECT * FROM (VALUES ('mes','work_stations'), ('mes','production_orders')) AS v(sch, tbl)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = r.sch AND table_name = r.tbl AND column_name = 'tenant_id' AND is_nullable = 'YES'
    ) THEN
      RAISE EXCEPTION '断言失败：%.%.tenant_id 仍可空', r.sch, r.tbl;
    END IF;
    EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id IS NULL', r.sch, r.tbl) INTO v_null;
    IF v_null <> 0 THEN
      RAISE EXCEPTION '断言失败：%.% 仍有 % 行 tenant_id 为 NULL', r.sch, r.tbl, v_null;
    END IF;
  END LOOP;
  RAISE NOTICE 'done: 两表 tenant_id 已 NOT NULL，复合外键对任何行都生效';
END
$mig$;
