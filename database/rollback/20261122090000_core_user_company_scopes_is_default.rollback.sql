-- 回滚 20261122090000_core_user_company_scopes_is_default
-- 删除部分唯一索引与 is_default 列（含回填的默认公司标记），恢复迁移前原状。
-- 幂等：索引/列不存在时均跳过，不报错。
-- 注意：回滚会丢弃本次回填的 is_default 标记（列本身为本次新增）。

DROP INDEX IF EXISTS public.uq_user_company_scopes_default;

ALTER TABLE public.core_user_company_scopes
    DROP COLUMN IF EXISTS is_default;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'core_user_company_scopes'
           AND column_name = 'is_default'
    ) THEN
        RAISE EXCEPTION '回滚断言失败：is_default 列仍存在';
    END IF;

    IF to_regclass('public.uq_user_company_scopes_default') IS NOT NULL THEN
        RAISE EXCEPTION '回滚断言失败：uq_user_company_scopes_default 仍存在';
    END IF;

    RAISE NOTICE '回滚完成：core_user_company_scopes 已移除 is_default 与默认公司唯一索引';
END $$;

-- 清理本迁移在账本中的登记行（幂等；按 version 精确匹配，不存在也不报错）
DELETE FROM public._sqlx_migrations WHERE version = 20261122090000;

DO $$
DECLARE
    n int;
BEGIN
    SELECT count(*) INTO n
      FROM public._sqlx_migrations
     WHERE version = 20261122090000;
    IF n <> 0 THEN
        RAISE EXCEPTION '回滚断言失败：账本仍残留 % 行 20261122090000', n;
    END IF;
    RAISE NOTICE '账本已清理：20261122090000 残留 0 行';
END $$;
