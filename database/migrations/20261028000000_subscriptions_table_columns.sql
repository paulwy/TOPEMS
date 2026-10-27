-- ============================================================
-- 20261028000000: subscriptions 表结构补齐（订阅管理契约落地配套）
--
-- 背景：public.subscriptions 存量库为历史 stub（仅 id + deleted_at），
-- subscription_module（feature module-subscription 启用后）建表语句
-- IF NOT EXISTS 跳过存量 stub → 查询缺列 500。本迁移幂等补齐列。
--
-- 新库无 stub：module 建表即全量结构，本迁移全部语句自动跳过。
-- ============================================================

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' UNIQUE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
