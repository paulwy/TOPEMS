-- 回滚 20261119141000_rls_intentional_policies_guard
-- 本迁移为纯断言守卫，不改变策略/数据，回滚为空操作：仅清理账本登记行。

DELETE FROM public._sqlx_migrations WHERE version = 20261119141000;
