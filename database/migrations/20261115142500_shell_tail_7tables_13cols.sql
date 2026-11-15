-- 空壳表整表对齐（收尾 · 7/8）· portal_todos(4 列+4 索引) + finance_voucher_templates(2 列)
--   + integration 四张 sync 表 updated_at + core_inter_module_sync(dev ∪ prod 并集补 7 列)
--
-- 口径：docs/database/code-schema-gap-2026-11-15.md §7.2 第 2/6 条、§7.5。
--
-- 现状（2026-11-15 实测，七张表 prod 均 0 行）：
--   portal.portal_todos                 prod 16 / dev 21 → 本批补 4 列 + 4 只缺失部分索引
--   finance.finance_voucher_templates   prod 14 / dev 16 → 补 2 列
--   integration.crm_erp_sync            prod 22 / dev 24 → 补 updated_at（crm_product_id 代码未引用，不补）
--   integration.crm_scm_sync            prod 24 / dev 25 → 补 updated_at
--   integration.erp_wms_sync            prod 24 / dev 26 → 补 updated_at（erp_sales_order_id 代码未引用，不补）
--   integration.hrm_finance_sync        prod 20 / dev 21 → 补 updated_at
--   integration.core_inter_module_sync  prod 16 / dev 18 → 按并集补 7 列（prod 独有 5 列全部保留）
--
-- core_inter_module_sync 并集决定：
--   代码同时使用两侧字段。prod 独有 operation / entity_type / entity_ids / started_at /
--   finished_at 在代码中仍在读写；dev 独有 source_entity / source_id / source_code /
--   retry_count / max_retries / next_retry_at / executed_at 也在读写。目标形状取并集
--   （补完后 prod 23 列），缺哪列补哪列。
--   operation 与 source_entity 是否同一状态机的两代字段，属数据治理事项，另立项；
--   本迁移不做同义收敛，也不删除任何一侧字段。
--
-- portal_todos 只补 4 列：代码 INSERT/SELECT 明确引用 service_code / service_name /
--   todo_type / link_url（svc/portal/src/modules/todos.rs:59/161）。dev 另有 sort_order
--   （NOT NULL DEFAULT 0）在 prod 也缺，但当前代码未引用，不在本批（属于 §7 对齐尾差，
--   另行处置），故 prod 仍为 20 列而非 21 列。
--
-- 边界（本批只做止血，不做治理）：
--   * 只 ADD COLUMN + CREATE INDEX；
--   * 不改任何已有列类型/默认值、不改代码、不改 RLS 策略；
--   * 四张 sync 表只补 updated_at，不补代码未引用的 crm_product_id / erp_sales_order_id。
--
-- 前置断言：七表存在；目标列均不存在；portal_todos 4 只索引不存在；七表均 0 行
--   （core_inter_module_sync.source_entity 为 NOT NULL 无默认值）。
-- 后置断言：目标列形状对齐 dev；portal_todos 4 只索引定义逐字一致。
--
-- 回滚：database/rollback/20261115142500_shell_tail_7tables_13cols.rollback.sql

-- 1. 前置断言
DO $$
DECLARE
    n bigint;
BEGIN
    IF to_regclass('portal.portal_todos') IS NULL
       OR to_regclass('finance.finance_voucher_templates') IS NULL
       OR to_regclass('integration.crm_erp_sync') IS NULL
       OR to_regclass('integration.crm_scm_sync') IS NULL
       OR to_regclass('integration.erp_wms_sync') IS NULL
       OR to_regclass('integration.hrm_finance_sync') IS NULL
       OR to_regclass('integration.core_inter_module_sync') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：第 7 批七张目标表不全存在';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='portal' AND table_name='portal_todos'
                  AND column_name IN ('service_code','service_name','todo_type','link_url')) THEN
        RAISE EXCEPTION '前置断言失败：portal.portal_todos 已有本次要补的列';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='finance' AND table_name='finance_voucher_templates'
                  AND column_name IN ('default_debit_account','default_credit_account')) THEN
        RAISE EXCEPTION '前置断言失败：finance.finance_voucher_templates 已有本次要补的列';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='integration' AND table_name IN
                      ('crm_erp_sync','crm_scm_sync','erp_wms_sync','hrm_finance_sync')
                  AND column_name='updated_at') THEN
        RAISE EXCEPTION '前置断言失败：integration 四张 sync 表已有 updated_at';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='integration' AND table_name='core_inter_module_sync'
                  AND column_name IN ('source_entity','source_id','source_code','retry_count',
                                      'max_retries','next_retry_at','executed_at')) THEN
        RAISE EXCEPTION '前置断言失败：integration.core_inter_module_sync 已有本次要补的列';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n2 ON n2.oid=c.relnamespace
                WHERE n2.nspname='portal' AND c.relname IN
                      ('idx_todos_completed','idx_todos_due_date','idx_todos_tenant','idx_todos_user')) THEN
        RAISE EXCEPTION '前置断言失败：portal.portal_todos 目标部分索引已存在';
    END IF;

    EXECUTE 'SELECT count(*) FROM portal.portal_todos' INTO n;
    IF n <> 0 THEN RAISE EXCEPTION '前置断言失败：portal.portal_todos 有 % 行', n; END IF;
    EXECUTE 'SELECT count(*) FROM finance.finance_voucher_templates' INTO n;
    IF n <> 0 THEN RAISE EXCEPTION '前置断言失败：finance.finance_voucher_templates 有 % 行', n; END IF;
    EXECUTE 'SELECT count(*) FROM integration.crm_erp_sync' INTO n;
    IF n <> 0 THEN RAISE EXCEPTION '前置断言失败：integration.crm_erp_sync 有 % 行', n; END IF;
    EXECUTE 'SELECT count(*) FROM integration.crm_scm_sync' INTO n;
    IF n <> 0 THEN RAISE EXCEPTION '前置断言失败：integration.crm_scm_sync 有 % 行', n; END IF;
    EXECUTE 'SELECT count(*) FROM integration.erp_wms_sync' INTO n;
    IF n <> 0 THEN RAISE EXCEPTION '前置断言失败：integration.erp_wms_sync 有 % 行', n; END IF;
    EXECUTE 'SELECT count(*) FROM integration.hrm_finance_sync' INTO n;
    IF n <> 0 THEN RAISE EXCEPTION '前置断言失败：integration.hrm_finance_sync 有 % 行', n; END IF;
    EXECUTE 'SELECT count(*) FROM integration.core_inter_module_sync' INTO n;
    IF n <> 0 THEN RAISE EXCEPTION '前置断言失败：integration.core_inter_module_sync 有 % 行，source_entity 为 NOT NULL 无默认列', n; END IF;
END $$;

-- 2. portal.portal_todos 补 4 列
ALTER TABLE portal.portal_todos
    ADD COLUMN IF NOT EXISTS service_code varchar(50)  NOT NULL DEFAULT 'portal',
    ADD COLUMN IF NOT EXISTS service_name varchar(100),
    ADD COLUMN IF NOT EXISTS todo_type    varchar(20)  NOT NULL DEFAULT 'personal',
    ADD COLUMN IF NOT EXISTS link_url     varchar(500);

-- 3. portal.portal_todos 4 只缺失部分索引（定义逐字取自 dev）
CREATE INDEX idx_todos_user      ON portal.portal_todos USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_todos_completed ON portal.portal_todos USING btree (user_id, completed) WHERE (deleted_at IS NULL);
CREATE INDEX idx_todos_due_date  ON portal.portal_todos USING btree (user_id, due_date) WHERE (deleted_at IS NULL);
CREATE INDEX idx_todos_tenant    ON portal.portal_todos USING btree (tenant_id) WHERE (deleted_at IS NULL);

-- 4. finance.finance_voucher_templates 补 2 列
ALTER TABLE finance.finance_voucher_templates
    ADD COLUMN IF NOT EXISTS default_credit_account varchar(255),
    ADD COLUMN IF NOT EXISTS default_debit_account  varchar(255);

-- 5. integration 四张 sync 表补 updated_at
ALTER TABLE integration.crm_erp_sync       ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE integration.crm_scm_sync       ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE integration.erp_wms_sync       ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE integration.hrm_finance_sync   ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 6. integration.core_inter_module_sync 按并集补 dev 侧 7 列（prod 独有 5 列保留不动）
ALTER TABLE integration.core_inter_module_sync
    ADD COLUMN IF NOT EXISTS source_entity varchar(128) NOT NULL,
    ADD COLUMN IF NOT EXISTS source_id     uuid,
    ADD COLUMN IF NOT EXISTS source_code   varchar(128),
    ADD COLUMN IF NOT EXISTS retry_count   integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_retries   integer DEFAULT 3,
    ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
    ADD COLUMN IF NOT EXISTS executed_at   timestamptz;

-- 7. 后置断言：13 列形状与 dev 逐项一致
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('portal','portal_todos','service_code','character varying',50, NULL::int, NULL::int, 'NO','''portal''::character varying'),
            ('portal','portal_todos','service_name','character varying',100,NULL::int, NULL::int, 'YES',NULL::text),
            ('portal','portal_todos','todo_type','character varying',20, NULL::int, NULL::int, 'NO','''personal''::character varying'),
            ('portal','portal_todos','link_url','character varying',500,NULL::int, NULL::int, 'YES',NULL::text),
            ('finance','finance_voucher_templates','default_credit_account','character varying',255,NULL::int,NULL::int,'YES',NULL::text),
            ('finance','finance_voucher_templates','default_debit_account','character varying',255,NULL::int,NULL::int,'YES',NULL::text),
            ('integration','crm_erp_sync','updated_at','timestamp with time zone',NULL::int,NULL::int,NULL::int,'NO','now()'),
            ('integration','crm_scm_sync','updated_at','timestamp with time zone',NULL::int,NULL::int,NULL::int,'NO','now()'),
            ('integration','erp_wms_sync','updated_at','timestamp with time zone',NULL::int,NULL::int,NULL::int,'NO','now()'),
            ('integration','hrm_finance_sync','updated_at','timestamp with time zone',NULL::int,NULL::int,NULL::int,'NO','now()'),
            ('integration','core_inter_module_sync','source_entity','character varying',128,NULL::int,NULL::int,'NO',NULL::text),
            ('integration','core_inter_module_sync','source_id','uuid',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('integration','core_inter_module_sync','source_code','character varying',128,NULL::int,NULL::int,'YES',NULL::text),
            ('integration','core_inter_module_sync','retry_count','integer',NULL::int,32,0,'YES','0'),
            ('integration','core_inter_module_sync','max_retries','integer',NULL::int,32,0,'YES','3'),
            ('integration','core_inter_module_sync','next_retry_at','timestamp with time zone',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('integration','core_inter_module_sync','executed_at','timestamp with time zone',NULL::int,NULL::int,NULL::int,'YES',NULL::text)
        ) AS v(sch, tbl, col, typ, maxlen, numprec, numscale, nullable, dflt_exact)
    LOOP
        PERFORM 1
           FROM information_schema.columns
          WHERE table_schema = r.sch
            AND table_name = r.tbl
            AND column_name = r.col
            AND data_type = r.typ
            AND is_nullable = r.nullable
            AND character_maximum_length IS NOT DISTINCT FROM r.maxlen
            AND numeric_precision IS NOT DISTINCT FROM r.numprec
            AND numeric_scale IS NOT DISTINCT FROM r.numscale
            AND column_default IS NOT DISTINCT FROM r.dflt_exact;
        IF NOT FOUND THEN
            RAISE EXCEPTION '后置断言失败：%.%.% 形状与 dev 定义不一致', r.sch, r.tbl, r.col;
        END IF;
    END LOOP;
END $$;

-- 8. 后置断言：portal_todos 4 只部分索引定义逐字一致
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('idx_todos_user','CREATE INDEX idx_todos_user ON portal.portal_todos USING btree (user_id) WHERE (deleted_at IS NULL)'),
            ('idx_todos_completed','CREATE INDEX idx_todos_completed ON portal.portal_todos USING btree (user_id, completed) WHERE (deleted_at IS NULL)'),
            ('idx_todos_due_date','CREATE INDEX idx_todos_due_date ON portal.portal_todos USING btree (user_id, due_date) WHERE (deleted_at IS NULL)'),
            ('idx_todos_tenant','CREATE INDEX idx_todos_tenant ON portal.portal_todos USING btree (tenant_id) WHERE (deleted_at IS NULL)')
        ) AS v(idx, def)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c JOIN pg_namespace n2 ON n2.oid = c.relnamespace
             WHERE n2.nspname = 'portal' AND c.relname = r.idx
               AND pg_get_indexdef(c.oid) = r.def
        ) THEN
            RAISE EXCEPTION '后置断言失败：索引 portal.% 定义与 dev 不一致', r.idx;
        END IF;
    END LOOP;
END $$;
