-- ============================================================
-- 20261114130000_w7_b4_ledger_monotonic_guard.sql
--
-- 目的：给「迁移必须按版本升序落库」加一道数据库级兜底，
--   让绕过 scripts/migration/apply-forward.sh 的执行路径也直接失败。
--
-- 背景（2026-11-14 实测，sqlx-cli 0.8.6）：
--   裸 `sqlx migrate run` 默认接受乱序——账本已记录 20261114120000 时，
--   仍会执行 20261114100000 并把账本行写进去。仓库现有的守卫（锚点必须等于
--   账本 max、--only 白名单 fail-closed）只在走 apply-forward.sh 时生效；
--   一旦有人绕过脚本（裸 sqlx、psql -f + 手写账本），没有任何拦截。
--
-- 做法：在 public._sqlx_migrations 上安装 BEFORE INSERT 触发器。
--   NEW.version < 账本 max(version)（success=true）时 RAISE EXCEPTION，
--   整个迁移事务回滚：迁移 SQL 与账本行都不落库，业务表零变更。
--   升序写入不受影响，包括基线 prod_ledger_<anchor>.sql 的 ORDER BY version 重放。
--
-- 影响面：
--   - 只作用在 _sqlx_migrations 的 INSERT 上，不触达业务表，不改变 sqlx 的查询；
--   - 目标库没有 public._sqlx_migrations（非 sqlx 管理的库）→ NOTICE SKIP；
--   - 需要「历史版本回放演练」时：在副本库做（删账本行后重放，触发器只管 INSERT），
--     不要在生产账本上降锚回填——那正是本守卫要拦住的动作。
--
-- 幂等：DROP TRIGGER IF EXISTS + CREATE OR REPLACE FUNCTION，可重复执行。
-- 回滚：database/rollback/20261114130000_w7_b4_ledger_monotonic_guard.rollback.sql
-- 锁：仅 DDL 期间对 public._sqlx_migrations 加 ACCESS EXCLUSIVE（毫秒级）。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public._sqlx_migrations_reject_out_of_order()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
    ledger_max bigint;
BEGIN
    SELECT COALESCE(max(version), 0)
      INTO ledger_max
      FROM public._sqlx_migrations
     WHERE success;

    IF NEW.version < ledger_max THEN
        RAISE EXCEPTION
            'ledger-guard：拒绝乱序迁移 version=% < 账本水位 %（public._sqlx_migrations）',
            NEW.version, ledger_max
            USING HINT = '迁移必须按版本升序落库。不要回填低于账本 max 的历史版本；把改动收敛为 version > 账本 max 的前向迁移，或先在副本库重放。',
                  ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END
$fn$;

DO $ledger_guard$
BEGIN
    IF to_regclass('public._sqlx_migrations') IS NULL THEN
        RAISE NOTICE 'ledger-guard SKIP：public._sqlx_migrations 不存在，未安装触发器';
        RETURN;
    END IF;

    EXECUTE 'DROP TRIGGER IF EXISTS trg_sqlx_migrations_monotonic ON public._sqlx_migrations';
    EXECUTE 'CREATE TRIGGER trg_sqlx_migrations_monotonic
             BEFORE INSERT ON public._sqlx_migrations
             FOR EACH ROW EXECUTE FUNCTION public._sqlx_migrations_reject_out_of_order()';
    RAISE NOTICE 'ledger-guard OK：已安装 trg_sqlx_migrations_monotonic（拒绝 version < 账本 max 的插入）';
END
$ledger_guard$;
