-- ============================================================
-- W7-B4 后续单：wms.purchase_order_snapshots 生产列补齐 + 状态约束（K7）
--
-- reason:
--   生产该表只有 3 列（id / deleted_at / tenant_id），dev 为 14 列，属已登记的
--   生产列漂移（topems-table-inventory-2026-11-14.md §7 K7）。
--   而 svc/wms/src/event_handlers/mod.rs:436-450 的 INSERT 引用 13 列，
--   svc/wms/src/modules/data_sync.rs:384-394 的 SELECT 引用 order_number/status，
--   生产任何一次采购订单快照写入都会 42703。本迁移把缺失的 11 列按 dev 定义
--   补齐，并建立 ck_purchase_order_snapshots_status_standard。
--
-- owner:  platform-db + wms
-- ticket: TOPEMS-W7-B4-WMS-PO-SNAPSHOT-BACKFILL
--
-- 口径（2026-11-15 事实核查，见工单 docs/database/workorder-wms-po-snapshot-backfill-20261115.md
--      与 docs/quality/prod-column-drift-verified-2026-11-09.md）：
--   - 全仓唯一写入点：svc/wms/src/event_handlers/mod.rs:436-450
--     （INSERT ... ON CONFLICT (id) DO UPDATE）；
--   - status 实参只有两处字面量：handle_po_created → 'pending'，
--     handle_po_approved → 'approved'；
--   - 读路径 status = 'approved'（data_sync.rs:389）；
--   - 代码显式 schema 限定 wms.*，读路径带 only_own_schema_query!("wms", ...) 守卫，
--     与 plugin_wms.purchase_order_snapshots（插件历史表）无关，目标表不切换；
--   - 约束值域 = 代码实际写入 {pending, approved}
--     ∪ dev 现值域 {active, inactive, archived, pending, approved}
--     = {active, inactive, archived, pending, approved}。
--
-- 对齐口径：类型 / 可空 / 默认逐列对齐 dev（2026-11-15 快照）。
--   - 刻意不动已有列：prod.id 有 DEFAULT gen_random_uuid()（dev 无此默认），保留；
--   - 不新增 dev 没有的约束；dev 只有 pkey 与 idx_wms_po_snapshots_tenant，
--     prod 两者均已存在，故本迁移不建索引；
--   - prod 该表 0 行，ADD COLUMN ... NOT NULL DEFAULT now() 无回填风险；
--   - 列序无法与 dev 完全一致（deleted_at/tenant_id 已在前），对齐按列名比对。
--
-- 安全 / 幂等：
--   1. 前置断言：表存在；已有列类型必须与 dev 一致，类型不符立即 ABORT，
--      不允许 ADD COLUMN IF NOT EXISTS 静默跳过；
--   2. 逐列 ADD COLUMN IF NOT EXISTS 补齐 11 列；
--   3. 后置断言：14 列逐列类型 / 可空 / 默认与 dev 一致；约束存在、保留 NULL 语义、
--      对实际约束表达式逐值求值（5 个目标值全部接受，非法值必须被拒）；
--   4. 文件内不写 BEGIN/COMMIT，由 apply-forward.sh 的 --single-transaction
--      把 DDL 与 _sqlx_migrations 账本写入包在同一事务里。
--
-- 回滚：database/rollback/20261115100000_w7_b4_wms_po_snapshot_backfill.rollback.sql
--   顺序：先 DROP CONSTRAINT（约束引用 status），再逆序 DROP COLUMN；
--   表内有数据时回滚直接 ABORT（删列会丢数据），需人工停写确认。
--
-- 锁：ADD COLUMN 取 ACCESS EXCLUSIVE（0 行，瞬时）；ADD CONSTRAINT 全表校验。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- ---------------------------------------------------------------------------
-- 1) 前置断言：表存在；已存在列的列类型必须与 dev 一致
-- ---------------------------------------------------------------------------
DO $po_snapshot_precheck$
DECLARE
    r       record;
    v_type  text;
BEGIN
    IF to_regclass('wms.purchase_order_snapshots') IS NULL THEN
        RAISE EXCEPTION 'po-snapshot-backfill ABORT: 表 wms.purchase_order_snapshots 不存在';
    END IF;

    FOR r IN
        SELECT *
        FROM (VALUES
            -- 列名, dev 类型
            ('id',             'uuid'),
            ('deleted_at',     'timestamp with time zone'),
            ('tenant_id',      'uuid'),
            ('order_number',   'character varying(100)'),
            ('supplier_id',    'uuid'),
            ('supplier_name',  'character varying(200)'),
            ('total_amount',   'numeric(15,2)'),
            ('payable_amount', 'numeric(15,2)'),
            ('status',         'character varying(20)'),
            ('approved_by',    'uuid'),
            ('approved_at',    'timestamp with time zone'),
            ('synced_at',      'timestamp with time zone'),
            ('created_at',     'timestamp with time zone'),
            ('updated_at',     'timestamp with time zone')
        ) AS t(col, typ)
    LOOP
        SELECT format_type(a.atttypid, a.atttypmod)
          INTO v_type
          FROM pg_attribute a
         WHERE a.attrelid = 'wms.purchase_order_snapshots'::regclass
           AND a.attname  = r.col
           AND NOT a.attisdropped;

        IF v_type IS NOT NULL AND v_type <> r.typ THEN
            RAISE EXCEPTION 'po-snapshot-backfill ABORT: wms.purchase_order_snapshots.% 已存在但类型为 [%]，预期 [%]',
                r.col, v_type, r.typ;
        END IF;
    END LOOP;
END
$po_snapshot_precheck$;

-- ---------------------------------------------------------------------------
-- 2) 按 dev 定义补齐 11 列（可空性 / 默认值逐列对齐 dev）
-- ---------------------------------------------------------------------------
ALTER TABLE wms.purchase_order_snapshots
    ADD COLUMN IF NOT EXISTS order_number   character varying(100),
    ADD COLUMN IF NOT EXISTS supplier_id    uuid,
    ADD COLUMN IF NOT EXISTS supplier_name  character varying(200),
    ADD COLUMN IF NOT EXISTS total_amount   numeric(15,2),
    ADD COLUMN IF NOT EXISTS payable_amount numeric(15,2),
    ADD COLUMN IF NOT EXISTS status         character varying(20),
    ADD COLUMN IF NOT EXISTS approved_by    uuid,
    ADD COLUMN IF NOT EXISTS approved_at    timestamp with time zone,
    ADD COLUMN IF NOT EXISTS synced_at      timestamp with time zone,
    ADD COLUMN IF NOT EXISTS created_at     timestamp with time zone NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at     timestamp with time zone NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------------
-- 3) 后置断言：14 列属性与 dev 一致
-- ---------------------------------------------------------------------------
DO $po_snapshot_columns_verify$
DECLARE
    r          record;
    v_type     text;
    v_nullable boolean;
    v_default  text;
    v_count    integer := 0;
BEGIN
    FOR r IN
        SELECT *
        FROM (VALUES
            -- 列名, dev 类型, 是否可空, dev 默认（NULL 表示无默认）
            ('id',             'uuid',                      false, NULL::text),
            ('order_number',   'character varying(100)',    true,  NULL::text),
            ('supplier_id',    'uuid',                      true,  NULL::text),
            ('supplier_name',  'character varying(200)',    true,  NULL::text),
            ('total_amount',   'numeric(15,2)',             true,  NULL::text),
            ('payable_amount', 'numeric(15,2)',             true,  NULL::text),
            ('status',         'character varying(20)',     true,  NULL::text),
            ('approved_by',    'uuid',                      true,  NULL::text),
            ('approved_at',    'timestamp with time zone',  true,  NULL::text),
            ('synced_at',      'timestamp with time zone',  true,  NULL::text),
            ('created_at',     'timestamp with time zone',  false, 'now()'),
            ('updated_at',     'timestamp with time zone',  false, 'now()'),
            ('tenant_id',      'uuid',                      true,  NULL::text),
            ('deleted_at',     'timestamp with time zone',  true,  NULL::text)
        ) AS t(col, typ, nullable, def)
    LOOP
        v_count := v_count + 1;

        SELECT format_type(a.atttypid, a.atttypmod), NOT a.attnotnull,
               pg_get_expr(d.adbin, d.adrelid)
          INTO v_type, v_nullable, v_default
          FROM pg_attribute a
          LEFT JOIN pg_attrdef d
                 ON d.adrelid = a.attrelid AND d.adnum = a.attnum
         WHERE a.attrelid = 'wms.purchase_order_snapshots'::regclass
           AND a.attname  = r.col
           AND NOT a.attisdropped;

        IF v_type IS NULL THEN
            RAISE EXCEPTION 'po-snapshot-backfill VERIFY FAIL: 列 % 缺失', r.col;
        END IF;

        IF v_type <> r.typ THEN
            RAISE EXCEPTION 'po-snapshot-backfill VERIFY FAIL: 列 % 类型为 [%]，预期 [%]',
                r.col, v_type, r.typ;
        END IF;

        -- id 在 prod 保留既有 DEFAULT gen_random_uuid()（dev 无），不纳入默认值比对
        IF r.col <> 'id' THEN
            IF v_nullable <> r.nullable THEN
                RAISE EXCEPTION 'po-snapshot-backfill VERIFY FAIL: 列 % 可空性为 [%]，预期 [%]',
                    r.col, v_nullable, r.nullable;
            END IF;

            IF v_default IS DISTINCT FROM r.def THEN
                RAISE EXCEPTION 'po-snapshot-backfill VERIFY FAIL: 列 % 默认为 [%]，预期 [%]',
                    r.col, coalesce(v_default, '<none>'), coalesce(r.def, '<none>');
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE 'po-snapshot-backfill COLUMNS OK: % 列与 dev 定义一致', v_count;
END
$po_snapshot_columns_verify$;

-- ---------------------------------------------------------------------------
-- 4) 建立 / 对齐 ck_purchase_order_snapshots_status_standard
-- ---------------------------------------------------------------------------
DO $po_snapshot_status_check$
DECLARE
    v_rel      regclass := 'wms.purchase_order_snapshots'::regclass;
    v_conname  text := 'ck_purchase_order_snapshots_status_standard';
    v_vals     text[] := ARRAY['active','inactive','archived','pending','approved'];
    v_contype  "char";
    v_def      text;
    v_expr     text;
    v_cur      text[];
    v_eq       boolean := false;
    v_val      text;
    v_ok       boolean;
BEGIN
    SELECT k.contype, pg_get_constraintdef(k.oid)
      INTO v_contype, v_def
      FROM pg_constraint k
     WHERE k.conrelid = v_rel
       AND k.conname  = v_conname;

    IF v_contype IS NOT NULL AND v_contype <> 'c' THEN
        RAISE EXCEPTION 'po-snapshot-backfill ABORT: % 已是 % 类型约束，非 CHECK，拒绝处理',
            v_conname, v_contype;
    END IF;

    IF v_def IS NOT NULL THEN
        SELECT array_agg(DISTINCT btrim(btrim(x), '{}'))
          INTO v_cur
          FROM regexp_matches(v_def, '''([^'']*)''', 'g') AS m(chunk),
               LATERAL unnest(string_to_array(m[1], ',')) AS x;

        IF v_cur IS NOT NULL AND v_def LIKE '%status IS NULL%' THEN
            v_eq := NOT EXISTS (SELECT 1 FROM unnest(v_vals) u(val) WHERE NOT (u.val = ANY (v_cur)))
                AND NOT EXISTS (SELECT 1 FROM unnest(v_cur) u(val) WHERE NOT (u.val = ANY (v_vals)));
        END IF;
    END IF;

    IF v_eq THEN
        RAISE NOTICE 'po-snapshot-backfill SKIP: %（定义已与目标一致）', v_conname;
    ELSE
        IF v_def IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', v_rel, v_conname);
        END IF;

        EXECUTE format(
            'ALTER TABLE %s ADD CONSTRAINT %I CHECK (status IS NULL OR status = ANY (%L::text[]))',
            v_rel, v_conname, v_vals
        );

        IF v_def IS NULL THEN
            RAISE NOTICE 'po-snapshot-backfill OK: % 新建（目标值域 [%]）', v_conname, v_vals;
        ELSE
            RAISE NOTICE 'po-snapshot-backfill OK: % 重建（原定义：%）', v_conname, v_def;
        END IF;
    END IF;

    -- 后置断言：约束存在、保留 NULL 语义、逐值求值
    SELECT pg_get_expr(k.conbin, k.conrelid), pg_get_constraintdef(k.oid)
      INTO v_expr, v_def
      FROM pg_constraint k
     WHERE k.conrelid = v_rel
       AND k.conname  = v_conname
       AND k.contype  = 'c';

    IF v_expr IS NULL THEN
        RAISE EXCEPTION 'po-snapshot-backfill VERIFY FAIL: 约束 % 不存在', v_conname;
    END IF;

    IF v_def NOT LIKE '%status IS NULL%' THEN
        RAISE EXCEPTION 'po-snapshot-backfill VERIFY FAIL: % 丢失 NULL 语义（定义：%）', v_conname, v_def;
    END IF;

    FOREACH v_val IN ARRAY v_vals LOOP
        EXECUTE format(
            'SELECT coalesce((%s)::boolean, false) FROM (SELECT %L::text AS status) s',
            v_expr, v_val
        ) INTO v_ok;

        IF NOT v_ok THEN
            RAISE EXCEPTION 'po-snapshot-backfill VERIFY FAIL: % 拒绝目标值 [%]', v_conname, v_val;
        END IF;
    END LOOP;

    EXECUTE format(
        'SELECT coalesce((%s)::boolean, false) FROM (SELECT %L::text AS status) s',
        v_expr, '__not_a_status__'
    ) INTO v_ok;

    IF v_ok THEN
        RAISE EXCEPTION 'po-snapshot-backfill VERIFY FAIL: % 未拒绝非法值 [__not_a_status__]', v_conname;
    END IF;

    RAISE NOTICE 'po-snapshot-backfill STATUS CHECK OK: 5 个目标值全部接受，非法值被拒';
END
$po_snapshot_status_check$;
