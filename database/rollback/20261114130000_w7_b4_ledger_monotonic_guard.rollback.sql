-- ============================================================
-- 回滚：20261114130000_w7_b4_ledger_monotonic_guard.sql
--
-- 移除 public._sqlx_migrations 上的版本单调守卫（触发器 + 函数）。
-- 回滚后裸 `sqlx migrate run` 会重新接受乱序版本；仅在本守卫误伤时才回滚，
-- 并同步登记原因（守卫只拦 version < 账本 max 的 INSERT）。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '30s';

DO $ledger_guard_rollback$
BEGIN
    IF to_regclass('public._sqlx_migrations') IS NOT NULL THEN
        EXECUTE 'DROP TRIGGER IF EXISTS trg_sqlx_migrations_monotonic ON public._sqlx_migrations';
        RAISE NOTICE 'ledger-guard rollback：触发器 trg_sqlx_migrations_monotonic 已移除';
    ELSE
        RAISE NOTICE 'ledger-guard rollback SKIP：public._sqlx_migrations 不存在';
    END IF;
END
$ledger_guard_rollback$;

DROP FUNCTION IF EXISTS public._sqlx_migrations_reject_out_of_order();
