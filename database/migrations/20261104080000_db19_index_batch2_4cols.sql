-- ============================================================
-- DB-19: 无二级索引非空表补索引 4 列
--
-- 背景：索引二批——无二级索引且非空表的业务列。
-- 方向：补常用查询路径索引。
-- ============================================================

SET lock_timeout = '5s';

-- public.core_sessions（17 行）
-- user_id：按用户查 session 列表
-- expires_at：过期 session 清理任务
CREATE INDEX IF NOT EXISTS idx_core_sessions_user_id ON public.core_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_core_sessions_expires_at ON public.core_sessions(expires_at);

-- bi.reports（1 行）
-- tenant_id：RLS 租户隔离
-- status：报表状态过滤
CREATE INDEX IF NOT EXISTS idx_bi_reports_tenant_id ON bi.reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bi_reports_status ON bi.reports(status);
