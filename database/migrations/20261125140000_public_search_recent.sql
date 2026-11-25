-- 2026-11-25 · public.search_recent 建表（搜索「最近搜索」去重表）
--
-- 为什么需要：
--   svc/search/src/handlers.rs 一直在用 public.search_recent
--     INSERT INTO public.search_recent (user_id, keyword, searched_at) ...
--       ON CONFLICT (user_id, keyword) DO UPDATE SET searched_at = now()
--     SELECT keyword ... WHERE user_id = $1 ORDER BY searched_at DESC LIMIT 10
--     DELETE FROM public.search_recent WHERE user_id = $1
--   但仓库里没有任何迁移 CREATE 这张表：
--     20261103000004_db_governance_pk_backfill.sql / 20261104140000_p3_unique_48.sql
--   都只是 `IF to_regclass('public.search_recent') IS NOT NULL` 的守卫式补约束，
--   基线（fixtures/full_schema_contract.sql）里有这张表 5 列，现库（anchor 血缘）没有。
--   结果是 /api/search 的最近搜索写入与读回全都静默失败（代码用 `let _ =` 吞错）。
--
-- 非破坏：CREATE TABLE IF NOT EXISTS + 独立唯一索引 + 租户策略，可重复执行。

CREATE TABLE IF NOT EXISTS public.search_recent (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid,
    user_id     uuid NOT NULL,
    keyword     text NOT NULL,
    searched_at timestamptz NOT NULL DEFAULT now(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);

-- anchor/prod 血缘里这张表可能存在（基线 5 列：id/keyword/searched_at/user_id/deleted_at），
-- 那时 CREATE TABLE IF NOT EXISTS 是 no-op，必须再显式补列，否则后面的租户策略引用不到 tenant_id。
ALTER TABLE public.search_recent
    ADD COLUMN IF NOT EXISTS tenant_id uuid,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ON CONFLICT (user_id, keyword) 依赖这个唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS uq_search_recent_user_keyword
    ON public.search_recent (user_id, keyword);

CREATE INDEX IF NOT EXISTS idx_search_recent_user_searched
    ON public.search_recent (user_id, searched_at DESC);

ALTER TABLE public.search_recent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_recent FORCE ROW LEVEL SECURITY;

-- 与 public.search_logs 同口径：租户匹配 / tenant_id 为空 / 零租户放行
DROP POLICY IF EXISTS tenant_isolation_search_recent ON public.search_recent;
CREATE POLICY tenant_isolation_search_recent ON public.search_recent
    USING (
        (tenant_id::text = NULLIF(current_setting('app.tenant_id', true), ''))
        OR (tenant_id IS NULL)
        OR (NULLIF(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000')
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_recent TO topems_app;
