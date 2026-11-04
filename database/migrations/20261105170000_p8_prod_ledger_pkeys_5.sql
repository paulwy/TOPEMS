-- ============================================================
-- P8: prod 补齐 5 张运行时 schema_defense_ledger 的主键（pkey 索引）
--
-- 背景：P4 余量中的"缺索引 10"实为 5 条 P3 主键 + 5 条运行时自建账本主键：
--   - 5 条 P3 主键（flow.core_master_data_refs / iam._sqlx_migrations /
--     iam.core_chat_members / iam.core_role_permissions / iam.core_user_roles）
--     已由 20261104130000_p3_pk_5.sql 补齐，prod 实测 5/5 存在（本文件不重复处理）。
--   - 以下 5 张账本表在 prod 仍无主键，而 test 23/23 全部已有：
--       communication.schema_defense_ledger
--       ehs.schema_defense_ledger
--       integration.schema_defense_ledger
--       mobile.schema_defense_ledger
--       pdm.schema_defense_ledger
--
-- 风险：这 5 张表由各服务启动时 CREATE TABLE IF NOT EXISTS 自建；
-- CREATE TABLE IF NOT EXISTS 不会补约束，导致 ON CONFLICT (service_schema)
-- upsert 失败。启动守卫 ensure_ledger_table（lib/shared-db/src/schema.rs#L207-L234）
-- 会幂等补主键，但依赖服务重启；本迁移在 prod 直接补齐，与守卫行为等价、幂等。
--
-- 数据：5 张表 prod 均为 0 行，无 NULL / 无重复 service_schema。
--
-- 幂等：表不存在 / 已有主键 / 存在 NULL 或重复 → NOTICE 跳过。
-- 不收窄、不改列类型、不 DROP 任何对象、不使用 CASCADE。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

DO $$
DECLARE
    sch   text;
    bad   bigint;
    haspk boolean;
BEGIN
    FOREACH sch IN ARRAY ARRAY['communication','ehs','integration','mobile','pdm'] LOOP
        IF to_regclass(quote_ident(sch) || '.schema_defense_ledger') IS NULL THEN
            RAISE NOTICE 'SKIP %.schema_defense_ledger: table missing', sch;
            CONTINUE;
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = to_regclass(quote_ident(sch) || '.schema_defense_ledger')
              AND contype = 'p'
        ) INTO haspk;

        IF haspk THEN
            RAISE NOTICE 'NOOP %.schema_defense_ledger: primary key exists', sch;
            CONTINUE;
        END IF;

        EXECUTE format(
            'SELECT count(*) FROM %I.schema_defense_ledger WHERE service_schema IS NULL
               OR service_schema IN (SELECT service_schema FROM %I.schema_defense_ledger GROUP BY service_schema HAVING count(*) > 1)',
            sch, sch
        ) INTO bad;

        IF bad > 0 THEN
            RAISE NOTICE 'SKIP %.schema_defense_ledger: % NULL/duplicate service_schema rows', sch, bad;
            CONTINUE;
        END IF;

        EXECUTE format(
            'ALTER TABLE %I.schema_defense_ledger ADD CONSTRAINT schema_defense_ledger_pkey PRIMARY KEY (service_schema)',
            sch
        );
        RAISE NOTICE 'ALTERED %.schema_defense_ledger: added PRIMARY KEY (service_schema)', sch;
    END LOOP;
END $$;

-- 终态复核：仅提示，不阻断
DO $$
DECLARE
    bad text;
BEGIN
    SELECT string_agg(sch || '.schema_defense_ledger', ', ') INTO bad
    FROM unnest(ARRAY['communication','ehs','integration','mobile','pdm']) AS sch
    WHERE to_regclass(quote_ident(sch) || '.schema_defense_ledger') IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = to_regclass(quote_ident(sch) || '.schema_defense_ledger')
            AND contype = 'p'
      );

    IF bad IS NULL THEN
        RAISE NOTICE 'VERIFY OK: 5 ledger tables have primary keys';
    ELSE
        RAISE WARNING 'VERIFY MISMATCH: %', bad;
    END IF;
END $$;
