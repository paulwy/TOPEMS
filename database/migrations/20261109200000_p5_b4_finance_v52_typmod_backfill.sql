-- P5 B4：六张 finance `_v52` 表 typmod 回填 + finance_audit_rules_v52 语义对齐
--
-- 依据：生产库这六张表源自 20260725000000_business_base_tables.sql 的骨架壳表；
--       20261109160000 补列时使用了裸类型（ADD COLUMN IF NOT EXISTS xxx varchar /
--       numeric），本地/契约库该列已存在（带 typmod），因此补列为 no-op、问题未暴露。
--       生产实际落成：
--         14 列 character varying 无长度  → 契约 character varying(255)
--          3 列 numeric 无精度           → 契约 numeric(18,2)
--       finance_audit_rules_v52 另有 6 处语义差异（见文件末段）。
-- 契约权威：fixtures/full_schema_contract.sql（2026-10-15 dump）
--
-- 幂等/守卫：逐列比对 pg_attribute.atttypmod，仅在不等于目标值时 ALTER；
--           列不存在时 NOTICE 跳过。重复执行零副作用。
-- 金额语义：裸 numeric 可写入任意小数位，会让契约的两位小数金额漂移；
--           遇到已存在超过 2 位小数的数据时 RAISE EXCEPTION 中止，不静默舍入。
--
-- 回滚：本迁移只收敛类型/默认值，无数据变更；反向需人工评估（回退到裸类型会
--       重新引入精度漂移），不提供自动回滚。

DO $$
DECLARE
    -- varchar(255) 的 atttypmod = 255 + 4
    c_varchar255 CONSTANT integer := 259;
    -- numeric(18,2) 的 atttypmod = ((18 << 16) | 2) + 4
    c_numeric182 CONSTANT integer := 1179654;
    r record;
    v_exists boolean;
    v_typmod integer;
    v_bad bigint;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            -- ---- 14 列 varchar → varchar(255) ----
            ('finance_alert_configs_v52',   'channel',        'varchar'),
            ('finance_alert_history_v52',   'acknowledged_by','varchar'),
            ('finance_alert_history_v52',   'alert_type',     'varchar'),
            ('finance_alert_history_v52',   'channel',        'varchar'),
            ('finance_alert_history_v52',   'severity',       'varchar'),
            ('finance_anomaly_alerts_v52',  'detection_type', 'varchar'),
            ('finance_anomaly_alerts_v52',  'entity_type',    'varchar'),
            ('finance_anomaly_alerts_v52',  'severity',       'varchar'),
            ('finance_audit_findings_v52',  'entity_type',    'varchar'),
            ('finance_audit_findings_v52',  'finding_type',   'varchar'),
            ('finance_audit_findings_v52',  'resolved_by',    'varchar'),
            ('finance_audit_findings_v52',  'severity',       'varchar'),
            ('finance_audit_findings_v52',  'status',         'varchar'),
            ('finance_detection_configs_v52','detection_type','varchar'),
            -- ---- 3 列 numeric → numeric(18,2) ----
            ('finance_alert_configs_v52',   'threshold',      'numeric'),
            ('finance_anomaly_alerts_v52',  'confidence',     'numeric'),
            ('finance_anomaly_alerts_v52',  'metric_value',   'numeric')
        ) AS v(tbl, col, kind)
    LOOP
        SELECT a.atttypmod INTO v_typmod
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'finance'
          AND c.relname = r.tbl
          AND a.attname = r.col
          AND a.attnum > 0
          AND NOT a.attisdropped;

        IF v_typmod IS NULL THEN
            RAISE NOTICE 'P5 B4：finance.% 无列 %，跳过', r.tbl, r.col;
            CONTINUE;
        END IF;

        IF r.kind = 'varchar' THEN
            IF v_typmod <> c_varchar255 THEN
                EXECUTE format(
                    'ALTER TABLE finance.%I ALTER COLUMN %I TYPE character varying(255)',
                    r.tbl, r.col
                );
                RAISE NOTICE 'P5 B4：finance.%.% typmod % → varchar(255)', r.tbl, r.col, v_typmod;
            END IF;
        ELSE
            IF v_typmod <> c_numeric182 THEN
                -- 契约金额为两位小数：先确认现有数据没有更高精度，避免静默舍入
                EXECUTE format(
                    'SELECT count(*) FROM finance.%I WHERE %I IS NOT NULL AND %I <> round(%I, 2)',
                    r.tbl, r.col, r.col, r.col
                ) INTO v_bad;
                IF v_bad > 0 THEN
                    RAISE EXCEPTION
                        'P5 B4：finance.%.% 存在 % 行超过 2 位小数的金额，contract 要求 numeric(18,2)，请人工确认后重跑',
                        r.tbl, r.col, v_bad;
                END IF;
                EXECUTE format(
                    'ALTER TABLE finance.%I ALTER COLUMN %I TYPE numeric(18,2) USING %I::numeric(18,2)',
                    r.tbl, r.col, r.col
                );
                RAISE NOTICE 'P5 B4：finance.%.% typmod % → numeric(18,2)', r.tbl, r.col, v_typmod;
            END IF;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- finance_audit_rules_v52：6 处语义差异对齐
--   1) name/category/severity: text → varchar(255)
--   2) created_by:             uuid → varchar(255)（表内非 0 行时中止并报告）
--   3) is_active:             DEFAULT true → false
--   4) created_at:            DEFAULT now() → 无默认
--   5) updated_at:            DEFAULT now() → 无默认
--   6) id:                    DEFAULT uuid_generate_v4() → gen_random_uuid()
-- 契约：fixtures/full_schema_contract.sql
-- ============================================================================

-- 1) name / category / severity：text（或无长度 varchar）→ varchar(255)
DO $$
DECLARE
    c varchar;
BEGIN
    FOREACH c IN ARRAY ARRAY['name', 'category', 'severity']
    LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_attribute a
            JOIN pg_class cl ON cl.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = cl.relnamespace
            WHERE n.nspname = 'finance'
              AND cl.relname = 'finance_audit_rules_v52'
              AND a.attname = c
              AND a.attnum > 0
              AND NOT a.attisdropped
              AND format_type(a.atttypid, a.atttypmod) IS DISTINCT FROM 'character varying(255)'
        ) THEN
            EXECUTE format(
                'ALTER TABLE finance.finance_audit_rules_v52 ALTER COLUMN %I TYPE character varying(255)',
                c
            );
            RAISE NOTICE 'P5 B4：finance_audit_rules_v52.% → varchar(255)', c;
        END IF;
    END LOOP;
END $$;

-- 2) created_by：uuid → varchar(255)。表非空时不允许静默改型（uuid→text 不可逆语义损失）。
DO $$
DECLARE
    v_type text;
    v_rows bigint;
BEGIN
    SELECT format_type(a.atttypid, a.atttypmod) INTO v_type
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'finance'
      AND c.relname = 'finance_audit_rules_v52'
      AND a.attname = 'created_by'
      AND a.attnum > 0
      AND NOT a.attisdropped;

    IF v_type IS NULL THEN
        RAISE NOTICE 'P5 B4：finance_audit_rules_v52 无 created_by 列，跳过';
        RETURN;
    END IF;

    IF v_type = 'character varying(255)' THEN
        RETURN;
    END IF;

    IF v_type = 'uuid' THEN
        SELECT count(*) INTO v_rows FROM finance.finance_audit_rules_v52;
        IF v_rows > 0 THEN
            RAISE EXCEPTION
                'P5 B4：finance_audit_rules_v52.created_by 仍为 uuid 且表内 % 行，契约要求 varchar(255)；停止迁移，需人工确认存量映射后重跑',
                v_rows;
        END IF;
        ALTER TABLE finance.finance_audit_rules_v52
            ALTER COLUMN created_by TYPE character varying(255) USING created_by::text;
    ELSE
        ALTER TABLE finance.finance_audit_rules_v52
            ALTER COLUMN created_by TYPE character varying(255);
    END IF;
    RAISE NOTICE 'P5 B4：finance_audit_rules_v52.created_by % → varchar(255)', v_type;
END $$;

-- 3) is_active 默认 true → false
DO $$
DECLARE
    v_def text;
BEGIN
    SELECT pg_get_expr(d.adbin, d.adrelid) INTO v_def
    FROM pg_attrdef d
    JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
    JOIN pg_class c ON c.oid = d.adrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'finance'
      AND c.relname = 'finance_audit_rules_v52'
      AND a.attname = 'is_active';

    IF v_def IS DISTINCT FROM 'false' THEN
        ALTER TABLE finance.finance_audit_rules_v52 ALTER COLUMN is_active SET DEFAULT false;
        RAISE NOTICE 'P5 B4：finance_audit_rules_v52.is_active 默认值 % → false', coalesce(v_def, '<none>');
    END IF;
END $$;

-- 4) / 5) created_at / updated_at：去掉 now() 默认
DO $$
DECLARE
    c varchar;
    v_def text;
BEGIN
    FOREACH c IN ARRAY ARRAY['created_at', 'updated_at']
    LOOP
        SELECT pg_get_expr(d.adbin, d.adrelid) INTO v_def
        FROM pg_attrdef d
        JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
        JOIN pg_class cl ON cl.oid = d.adrelid
        JOIN pg_namespace n ON n.oid = cl.relnamespace
        WHERE n.nspname = 'finance'
          AND cl.relname = 'finance_audit_rules_v52'
          AND a.attname = c;

        IF v_def IS NOT NULL THEN
            EXECUTE format(
                'ALTER TABLE finance.finance_audit_rules_v52 ALTER COLUMN %I DROP DEFAULT',
                c
            );
            RAISE NOTICE 'P5 B4：finance_audit_rules_v52.% 默认值 % 已移除', c, v_def;
        END IF;
    END LOOP;
END $$;

-- 6) id 默认 uuid_generate_v4() → gen_random_uuid()
DO $$
DECLARE
    v_def text;
BEGIN
    SELECT pg_get_expr(d.adbin, d.adrelid) INTO v_def
    FROM pg_attrdef d
    JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
    JOIN pg_class c ON c.oid = d.adrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'finance'
      AND c.relname = 'finance_audit_rules_v52'
      AND a.attname = 'id';

    IF v_def IS NOT NULL AND v_def LIKE '%uuid_generate_v4%' THEN
        ALTER TABLE finance.finance_audit_rules_v52
            ALTER COLUMN id SET DEFAULT gen_random_uuid();
        RAISE NOTICE 'P5 B4：finance_audit_rules_v52.id 默认值 % → gen_random_uuid()', v_def;
    END IF;
END $$;
