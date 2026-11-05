-- ============================================================
-- DB-24: test 侧类型收敛（crm.rfm_results.monetary / rfm_score → numeric）
--
-- 仅 test 执行；禁止在 prod 运行（prod 已是目标类型，无需变更）。
--
-- 判定依据（2026-11-05 逐列核查，代码契约 + 线上 prod 行为为准）：
--
-- 1) crm.rfm_results.monetary  double precision → numeric(15,2)
-- 2) crm.rfm_results.rfm_score double precision → numeric(10,2)
--    - prod 实测已是 numeric(15,2) / numeric(10,2)；
--    - 迁移 20261029200000_schema_defense_type_align.sql 明文目标
--      monetary numeric(15,2)、rfm_score numeric(10,2)（金额/分值语义，保精度）；
--    - 读路径代码已显式 ::float8（rfm.rs 详情查询），两类型均可工作；
--      写路径 f64 绑定 numeric 走隐式赋值转换，属预期精度口径（2 位小数）。
--    故以 prod 契约权威，把 test 的 double 漂移收敛回 numeric。
--
-- 安全性（收窄前置校验；test 实测 37 行）：
--   - monetary 全为 0（min=max=0）；
--   - rfm_score 取值 3..15（整数）；
--   - 守卫逐列复算：非有限值（NaN/±Infinity）、超过 2 位小数、
--     超出目标精度范围时 NOTICE 跳过并保持原类型。
--
-- 幂等：当前类型已为目标类型时跳过；表/列不存在时 NOTICE 跳过。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

-- 1) crm.rfm_results.monetary: double precision -> numeric(15,2)
DO $$
DECLARE
    cur  text;
    bad  bigint;
    vmin double precision;
    vmax double precision;
BEGIN
    IF to_regclass('crm.rfm_results') IS NULL THEN
        RAISE NOTICE 'SKIP monetary: table crm.rfm_results missing';
        RETURN;
    END IF;

    SELECT format_type(a.atttypid, a.atttypmod) INTO cur
    FROM pg_attribute a
    WHERE a.attrelid = to_regclass('crm.rfm_results')
      AND a.attname = 'monetary' AND NOT a.attisdropped AND a.attnum > 0;

    IF cur IS NULL THEN
        RAISE NOTICE 'SKIP monetary: column missing';
        RETURN;
    ELSIF cur = 'numeric(15,2)' THEN
        RAISE NOTICE 'NOOP monetary: already numeric(15,2)';
        RETURN;
    ELSIF cur IN ('double precision', 'real') THEN
        SELECT count(*) INTO bad
        FROM crm.rfm_results
        WHERE monetary IS NOT NULL
          AND (monetary::text IN ('NaN', 'Infinity', '-Infinity')
               OR monetary * 100 <> round(monetary * 100)      -- 超过 2 位小数
               OR monetary > 9999999999999.99
               OR monetary < -9999999999999.99);

        SELECT min(monetary), max(monetary) INTO vmin, vmax
        FROM crm.rfm_results WHERE monetary IS NOT NULL;

        IF bad > 0 THEN
            RAISE NOTICE 'SKIP monetary: % non-convertible rows (min=%, max=%)', bad, vmin, vmax;
            RETURN;
        END IF;

        ALTER TABLE crm.rfm_results
            ALTER COLUMN monetary TYPE numeric(15,2)
            USING monetary::numeric(15,2);
        RAISE NOTICE 'ALTERED monetary: % -> numeric(15,2) (rows: min=%, max=%)', cur, vmin, vmax;
    ELSE
        RAISE NOTICE 'SKIP monetary: unexpected current type %', cur;
    END IF;
END $$;

-- 2) crm.rfm_results.rfm_score: double precision -> numeric(10,2)
DO $$
DECLARE
    cur  text;
    bad  bigint;
    vmin double precision;
    vmax double precision;
BEGIN
    IF to_regclass('crm.rfm_results') IS NULL THEN
        RAISE NOTICE 'SKIP rfm_score: table crm.rfm_results missing';
        RETURN;
    END IF;

    SELECT format_type(a.atttypid, a.atttypmod) INTO cur
    FROM pg_attribute a
    WHERE a.attrelid = to_regclass('crm.rfm_results')
      AND a.attname = 'rfm_score' AND NOT a.attisdropped AND a.attnum > 0;

    IF cur IS NULL THEN
        RAISE NOTICE 'SKIP rfm_score: column missing';
        RETURN;
    ELSIF cur = 'numeric(10,2)' THEN
        RAISE NOTICE 'NOOP rfm_score: already numeric(10,2)';
        RETURN;
    ELSIF cur IN ('double precision', 'real') THEN
        SELECT count(*) INTO bad
        FROM crm.rfm_results
        WHERE rfm_score IS NOT NULL
          AND (rfm_score::text IN ('NaN', 'Infinity', '-Infinity')
               OR rfm_score * 100 <> round(rfm_score * 100)
               OR rfm_score > 99999999.99
               OR rfm_score < -99999999.99);

        SELECT min(rfm_score), max(rfm_score) INTO vmin, vmax
        FROM crm.rfm_results WHERE rfm_score IS NOT NULL;

        IF bad > 0 THEN
            RAISE NOTICE 'SKIP rfm_score: % non-convertible rows (min=%, max=%)', bad, vmin, vmax;
            RETURN;
        END IF;

        ALTER TABLE crm.rfm_results
            ALTER COLUMN rfm_score TYPE numeric(10,2)
            USING rfm_score::numeric(10,2);
        RAISE NOTICE 'ALTERED rfm_score: % -> numeric(10,2) (rows: min=%, max=%)', cur, vmin, vmax;
    ELSE
        RAISE NOTICE 'SKIP rfm_score: unexpected current type %', cur;
    END IF;
END $$;

-- 终态复核
DO $$
DECLARE
    t1 text;
    t2 text;
BEGIN
    SELECT format_type(a.atttypid, a.atttypmod) INTO t1
    FROM pg_attribute a
    WHERE a.attrelid = to_regclass('crm.rfm_results') AND a.attname = 'monetary' AND a.attnum > 0;
    SELECT format_type(a.atttypid, a.atttypmod) INTO t2
    FROM pg_attribute a
    WHERE a.attrelid = to_regclass('crm.rfm_results') AND a.attname = 'rfm_score' AND a.attnum > 0;
    RAISE NOTICE 'VERIFY rfm_results monetary=% rfm_score=%', t1, t2;
END $$;
