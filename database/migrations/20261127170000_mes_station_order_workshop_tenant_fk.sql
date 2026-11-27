-- ============================================================
-- 20261127170000: 承接 orphan 20261127160000 —— 工位/生产订单的车间外键统一为租户内复合外键
--
-- 背景（2026-11-27）：
--   本机 dev 账本存在 `20261127160000 | mes station order workshop tenant fk` 的 success 行，
--   但对应迁移文件在应用后被撤回、未进入 origin/checksums/manifest —— 又一条 orphan
--   （有结构、无来源）。它在本机 dev 建下了：
--     · mes.work_stations.work_stations_workshop_tenant_fkey      (workshop_id, tenant_id) → mes.workshops(id, tenant_id)
--     · mes.production_orders.production_orders_workshop_tenant_fkey (workshop_id, tenant_id) → mes.workshops(id, tenant_id)
--   而生产侧仍是 20261127140000 建的单列外键
--   `fk_work_stations_workshop` / `fk_production_orders_workshop`（→ mes.workshops(id) ON DELETE SET NULL）。
--   两端结构因此分叉：dev 有租户内复合约束、生产没有。
--
-- 口径选择（一次性定死，两端对齐）：采用**租户内复合外键**，不再回退单列。
--   理由：车间属于某个租户，工位/订单挂车间时必须同租户，否则跨租户可挂靠
--   （单列外键只校验 id 存在，完全不看 tenant）。mes.production_lines 早在 20261127150000
--   就用同一口径，本迁移把工位/订单补齐，三张车间引用表口径一致。
--   副作用（显式接受）：复合外键不能再用 ON DELETE SET NULL（多列 SET NULL 会把 tenant_id 也置空，
--   与 tenant 口径冲突），故删除车间前必须先处理其下工位/订单 —— 比「静默置空留跨租户孤儿」安全。
--   遗留（另议，不在本迁移）：两表 tenant_id 列仍可空（production_orders 现有 5 行 tenant_id 为 NULL），
--   tenant_id 为 NULL 时复合外键按 MATCH SIMPLE 不校验，属已知软约束。
--
-- 动作（对 mes.work_stations / mes.production_orders 各做一遍，顺序固定）：
--   1) 若复合外键已存在 → 跳过；
--   2) 若同表仍挂着指向 mes.workshops(id) 的单列外键 → DROP；
--   3) 建复合外键 (workshop_id, tenant_id) REFERENCES mes.workshops(id, tenant_id)；
--      （要求 mes.workshops 上有 (id, tenant_id) 唯一约束，20261127110000 已保证）
--   4) 收尾断言：复合外键在位、单列外键不在。
--
-- 数据安全性：两表 workshop_id 当前全为 NULL（dev 79 行工位、134 行订单），建约束零校验冲突。
-- 幂等：全部走 to_regclass / pg_constraint 守卫。
-- 事务：文件内不含 BEGIN/COMMIT。
-- 回滚：database/rollback/20261127170000_*.rollback.sql（恢复单列外键 + ON DELETE SET NULL）
-- ============================================================

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

DO $mig$
DECLARE
  r record;
  v_def text;
BEGIN
  IF to_regclass('mes.workshops') IS NULL THEN
    RAISE EXCEPTION 'mes.workshops 不存在，无法建复合外键';
  END IF;
  -- 复合外键的依赖：mes.workshops 上必须有 (id, tenant_id) 唯一索引
  -- （dev 为唯一约束、prod 只有同名唯一索引，两者对 FK 等价，故按 pg_index 判定）
  IF NOT EXISTS (
    SELECT 1
      FROM pg_index i
      JOIN pg_class c ON c.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'mes' AND c.relname = 'workshops' AND i.indisunique AND i.indisvalid
       AND (SELECT array_agg(a.attname ORDER BY a.attname)
              FROM unnest(string_to_array(i.indkey::text, ' ')::int[]) AS k(attnum)
              JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum) = ARRAY['id','tenant_id']::name[]
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS workshops_id_tenant_key ON mes.workshops USING btree (id, tenant_id)';
    RAISE NOTICE 'created: mes.workshops workshops_id_tenant_key (id, tenant_id)';
  END IF;

  FOR r IN
    SELECT * FROM (VALUES
      ('mes', 'work_stations',     'fk_work_stations_workshop',     'work_stations_workshop_tenant_fkey'),
      ('mes', 'production_orders', 'fk_production_orders_workshop', 'production_orders_workshop_tenant_fkey')
    ) AS v(sch, tbl, old_con, new_con)
  LOOP
    -- 1) 复合外键已在位 → 跳过
    IF EXISTS (SELECT 1 FROM pg_constraint
                WHERE conrelid = format('%I.%I', r.sch, r.tbl)::regclass AND conname = r.new_con) THEN
      RAISE NOTICE 'skip: %.% % 已在位', r.sch, r.tbl, r.new_con;
      CONTINUE;
    END IF;

    -- 2) 单列外键若指向 mes.workshops(id) → 删除（先删再建，避免双约束并存期语义含糊）
    IF EXISTS (SELECT 1 FROM pg_constraint
                WHERE conrelid = format('%I.%I', r.sch, r.tbl)::regclass AND conname = r.old_con) THEN
      SELECT pg_get_constraintdef(oid) INTO v_def FROM pg_constraint
       WHERE conrelid = format('%I.%I', r.sch, r.tbl)::regclass AND conname = r.old_con;
      IF v_def NOT LIKE '%REFERENCES workshops(id)%'
         AND v_def NOT LIKE '%REFERENCES public.workshops(id)%'
         AND v_def NOT LIKE '%REFERENCES mes.workshops(id)%' THEN
        RAISE EXCEPTION '%.% % 的指向不是 mes.workshops(id)（实际: %），先人工确认', r.sch, r.tbl, r.old_con, v_def;
      END IF;
      EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.sch, r.tbl, r.old_con);
      RAISE NOTICE 'dropped: %.% %（单列，原 %）', r.sch, r.tbl, r.old_con, v_def;
    END IF;

    -- 3) 建复合外键
    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (workshop_id, tenant_id) REFERENCES mes.workshops(id, tenant_id)',
      r.sch, r.tbl, r.new_con
    );
    RAISE NOTICE 'created: %.% % (workshop_id, tenant_id) → mes.workshops(id, tenant_id)', r.sch, r.tbl, r.new_con;
  END LOOP;
END
$mig$;

-- 收尾断言：三张车间引用表口径一致（production_lines 由 20261127150000 保证）
DO $mig$
DECLARE
  r record;
  v_def text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('mes', 'work_stations',     'fk_work_stations_workshop',     'work_stations_workshop_tenant_fkey'),
      ('mes', 'production_orders', 'fk_production_orders_workshop', 'production_orders_workshop_tenant_fkey'),
      ('mes', 'production_lines',  'production_lines_workshop_id_fkey', 'production_lines_workshop_tenant_fkey')
    ) AS v(sch, tbl, old_con, new_con)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conrelid = format('%I.%I', r.sch, r.tbl)::regclass AND conname = r.new_con) THEN
      RAISE EXCEPTION '断言失败：%.% 缺复合外键 %', r.sch, r.tbl, r.new_con;
    END IF;
    EXECUTE format('SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = %L::regclass AND conname = %L',
                   format('%I.%I', r.sch, r.tbl), r.new_con) INTO v_def;
    IF v_def NOT LIKE '%workshops(id, tenant_id)%' THEN
      RAISE EXCEPTION '断言失败：%.% % 指向错误（%）', r.sch, r.tbl, r.new_con, v_def;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint
                WHERE conrelid = format('%I.%I', r.sch, r.tbl)::regclass AND conname = r.old_con) THEN
      RAISE EXCEPTION '断言失败：%.% 仍残留单列外键 %', r.sch, r.tbl, r.old_con;
    END IF;
  END LOOP;
  RAISE NOTICE 'done: 三张车间引用表外键统一为 (workshop_id, tenant_id)';
END
$mig$;
