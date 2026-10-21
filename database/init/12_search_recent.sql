-- S1 最近搜索（search/recent 接真）：用户级最近搜索记录
-- 消费方：FavoritesPage searchApi.getRecentSearches/clearRecentSearches（此前 core 兜底空壳）
-- 写入：svc/search search_handler 搜索成功时 upsert（user_id 取自 auth Claims.sub）
-- 语义：每用户最近搜索（去重），按 searched_at 倒序取前 N 条
-- 幂等：IF NOT EXISTS；表在 public schema（svc/search 现有表 search_logs/search_entity_projections 同 schema）

CREATE TABLE IF NOT EXISTS public.search_recent (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL,
    keyword     text NOT NULL,
    searched_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_search_recent_user_time
    ON public.search_recent (user_id, searched_at DESC);
