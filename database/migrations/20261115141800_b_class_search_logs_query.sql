-- B 类列补齐（7/7）· search · public.search_logs（1 表 1 列）
--
-- 口径：B 类 = prod 缺列、且 HEAD 代码已真实读/写该列（docs/database/column-drift-attribution-2026-11-15.md §4.2.2）。
--   本迁移只做 ADD COLUMN，不建索引、不建约束、不改策略、不含 BEGIN/COMMIT。
--
-- 目标定义（以 dev 现有定义为唯一依据）：
--   public.search_logs.query  text  NOT NULL  （无默认值）
--
-- 证据（取证门已回读，行号直接引用）：
--   读：svc/search/src/handlers.rs:478-483
--       SELECT query FROM public.search_logs
--        WHERE query ILIKE $1
--        GROUP BY query
--        ORDER BY COUNT(*) DESC, MAX(created_at) DESC
--        LIMIT $2
--
--   prod 缺列时的失败方式：parse/analyze 阶段报 SQLSTATE 42703 undefined_column
--   （column "query" does not exist），搜索联想/历史词整条路径 500；稳定报错，不是空列表。
--
-- 前置断言：表存在；query 不存在；表 0 行（dev 定义为 NOT NULL 且无默认值，非 0 行则拒绝直加）。
-- 同名对象冲突：本迁移不创建索引；dev 侧 idx_search_logs_query 不随本次创建；prod 既有 pkey
--   不引用 query（列不存在，必然不引用）。
-- 后置断言：query 形状 = (text, NOT NULL, 无默认)。
--
-- RLS 副作用核查（prod 实测）：public.search_logs 为 relrowsecurity=false /
--   relforcerowsecurity=false，pg_policies 中无任何策略。补列不创建/修改策略，无副作用；
--   dev 侧 rls_tenant_isolation 属后续收紧批次，本迁移不涉及。
--
-- 残余缺列（不在本批，按 §4.2.3/§4.4 另行处置）：prod 的 search_logs 还缺 created_at /
--   duration_ms / result_count / tenant_id / user_id。上面 :478-483 的排序用到 MAX(created_at)，
--   因此本迁移后该语句仍会在 created_at 上 42703 —— 本批只负责 query 一列，该路径要端到端可用
--   需另案处理 created_at 等列，不能据本迁移宣称该路径已修复。
--
-- 回滚：database/rollback/20261115141800_b_class_search_logs_query.rollback.sql
--   （仅当列内无任何非空值才删列，有数据则保留并 RAISE NOTICE）。

-- 1. 前置断言
DO $$
DECLARE
    n_rows bigint;
BEGIN
    IF to_regclass('public.search_logs') IS NULL THEN
        RAISE EXCEPTION 'B 类前置断言失败：表 public.search_logs 不存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'search_logs' AND column_name = 'query'
    ) THEN
        RAISE EXCEPTION 'B 类前置断言失败：public.search_logs.query 已存在，本迁移只补缺失列';
    END IF;

    EXECUTE 'SELECT count(*) FROM public.search_logs' INTO n_rows;
    IF n_rows <> 0 THEN
        RAISE EXCEPTION 'B 类前置断言失败：public.search_logs 有 % 行，dev 定义为 NOT NULL 且无默认值，禁止直接加', n_rows;
    END IF;
END $$;

-- 2. 补列
ALTER TABLE public.search_logs ADD COLUMN IF NOT EXISTS query text NOT NULL;

-- 3. 后置断言：形状与 dev 定义逐项对齐
DO $$
DECLARE
    v_type text;
    v_nullable text;
    v_default text;
BEGIN
    SELECT data_type, is_nullable, column_default
      INTO v_type, v_nullable, v_default
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'search_logs' AND column_name = 'query';

    IF v_type IS NULL THEN
        RAISE EXCEPTION 'B 类后置断言失败：public.search_logs.query 未创建';
    END IF;
    IF v_type <> 'text' OR v_nullable <> 'NO' OR v_default IS NOT NULL THEN
        RAISE EXCEPTION 'B 类后置断言失败：search_logs.query 形状=(%,%,%)，期望=(text,NO,NULL)',
            v_type, v_nullable, coalesce(v_default, 'NULL');
    END IF;
END $$;
