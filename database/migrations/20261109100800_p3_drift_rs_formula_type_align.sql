-- P3 A 级止血（续）/ 2026-11-09：rs 域配方列类型对齐（单独成批，不跨域）
--
-- 背景（验证 rd 配方链路时确认；见 docs/quality/prod-schema-drift-2026-11-09.md）：
--   Rust 侧 svc/rd/src/models/formula.rs 把下列字段一律按 String 读写，但生产库：
--
--     rs.formulas.version            integer   → 列表/详情 query_as 解码失败、新建 500
--     rs.formula_versions.version    integer   → 版本写入 500
--     rs.formulas.created_by         uuid      → 新建 500（String bind 不进 uuid）
--     rs.formula_versions.created_by uuid      → 版本写入 500
--
--   其中 created_by / approval_status 原计划放在 20261109100600，按“迁移不跨域”要求
--   收敛到本文件（100600 只保留 rd.deploys 关联列）。
--
--   保持不动：process_steps / changes / ingredients / process_params / properties
--   维持 jsonb，由 svc/rd 代码按 JSON 绑定与读取（#>> '{}' 回读为字符串）。
--
-- 执行前只读复核（2026-11-09）：rs.formulas 0 行、rs.formula_versions 0 行。
-- 每条类型转换均带「列类型仍为旧类型」+「表内 0 行」双重守卫；非 0 行直接
-- RAISE EXCEPTION，交回人工定转换口径（不猜测）。
--
-- Idempotency：information_schema 判断列类型，已对齐则整段 no-op；约束按名判存在。
--
-- ROLLBACK（仅当确认两表仍 0 行）：
--   ALTER TABLE rs.formulas
--     ALTER COLUMN version TYPE integer USING version::integer,
--     ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
--   ALTER TABLE rs.formula_versions
--     ALTER COLUMN version TYPE integer USING version::integer,
--     ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
--   ALTER TABLE rs.formulas DROP CONSTRAINT IF EXISTS ck_formulas_approval_status;

BEGIN;

-- 1) rs.formulas.version integer → text
DO $$
DECLARE
    row_cnt bigint;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'rs' AND table_name = 'formulas'
          AND column_name = 'version' AND data_type = 'integer'
    ) THEN
        EXECUTE 'SELECT count(*) FROM rs.formulas' INTO row_cnt;
        IF row_cnt > 0 THEN
            RAISE EXCEPTION 'P3 止血：rs.formulas 有 % 行数据，version integer→text 需人工确认', row_cnt;
        END IF;
        ALTER TABLE rs.formulas
            ALTER COLUMN version TYPE text USING version::text;
    END IF;
END $$;

-- 2) rs.formula_versions.version integer → text
DO $$
DECLARE
    row_cnt bigint;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'rs' AND table_name = 'formula_versions'
          AND column_name = 'version' AND data_type = 'integer'
    ) THEN
        EXECUTE 'SELECT count(*) FROM rs.formula_versions' INTO row_cnt;
        IF row_cnt > 0 THEN
            RAISE EXCEPTION 'P3 止血：rs.formula_versions 有 % 行数据，version integer→text 需人工确认', row_cnt;
        END IF;
        ALTER TABLE rs.formula_versions
            ALTER COLUMN version TYPE text USING version::text;
    END IF;
END $$;

-- 3) rs.formulas.created_by uuid → text
DO $$
DECLARE
    row_cnt bigint;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'rs' AND table_name = 'formulas'
          AND column_name = 'created_by' AND data_type = 'uuid'
    ) THEN
        EXECUTE 'SELECT count(*) FROM rs.formulas' INTO row_cnt;
        IF row_cnt > 0 THEN
            RAISE EXCEPTION 'P3 止血：rs.formulas 有 % 行数据，created_by uuid→text 需人工确认', row_cnt;
        END IF;
        ALTER TABLE rs.formulas
            ALTER COLUMN created_by TYPE text USING created_by::text;
    END IF;
END $$;

-- 4) rs.formula_versions.created_by uuid → text
DO $$
DECLARE
    row_cnt bigint;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'rs' AND table_name = 'formula_versions'
          AND column_name = 'created_by' AND data_type = 'uuid'
    ) THEN
        EXECUTE 'SELECT count(*) FROM rs.formula_versions' INTO row_cnt;
        IF row_cnt > 0 THEN
            RAISE EXCEPTION 'P3 止血：rs.formula_versions 有 % 行数据，created_by uuid→text 需人工确认', row_cnt;
        END IF;
        ALTER TABLE rs.formula_versions
            ALTER COLUMN created_by TYPE text USING created_by::text;
    END IF;
END $$;

-- 5) rs.formulas.approval_status 三态约束（从 100600 收敛到 rs 域）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_formulas_approval_status'
    ) THEN
        ALTER TABLE rs.formulas
            ADD CONSTRAINT ck_formulas_approval_status
            CHECK (
                approval_status IS NULL
                OR approval_status IN ('pending', 'approved', 'rejected')
            );
    END IF;
END $$;

COMMIT;
