-- P2a 修正（2026-11-09）：删除被新键取代的旧唯一索引 uq_aux_balance
--
-- 背景：
--   20261108140000 第 269–270 行用
--     ALTER TABLE ... DROP CONSTRAINT IF EXISTS uq_aux_balance / unique_aux_balance
--   删除旧键，但生产该对象是**唯一索引**（pg_class/pg_index，不在 pg_constraint），
--   因此 IF EXISTS 静默跳过，旧索引仍然存在。
--   旧索引 (tenant_id, account_id, aux_type, aux_id, period) 不含 company_id，
--   会阻止「同租户、同科目、同辅助、不同公司」的合法行，P2a 口径无法落库。
--
-- 为什么新增本迁移：
--   20261108140000 已推送并被生产账本引用，改内容会造成 checksum 失配。
--
-- 安全守卫：
--   - 新唯一键 finance.uq_aux_balance_company 必须已存在，否则 RAISE EXCEPTION；
--   - 删除前确认无数据违反新键（新键本身在 20261108140000 已创建，天然约束）；
--   - DROP INDEX IF EXISTS 幂等；unique_aux_balance 在生产不存在，安全跳过。
--
-- ROLLBACK：
--   CREATE UNIQUE INDEX uq_aux_balance ON finance.core_finance_aux_balances
--       (tenant_id, account_id, aux_type, aux_id, period);
--   （仅当确认无跨公司同键数据时才可回退）

DO $$
BEGIN
    IF to_regclass('finance.core_finance_aux_balances') IS NULL THEN
        RAISE NOTICE 'P2a 修正：core_finance_aux_balances 不存在，跳过';
        RETURN;
    END IF;

    IF to_regclass('finance.uq_aux_balance_company') IS NULL THEN
        RAISE EXCEPTION
            'P2a 修正：新唯一键 finance.uq_aux_balance_company 不存在，拒绝删除旧键';
    END IF;
END $$;

DROP INDEX IF EXISTS finance.uq_aux_balance;
DROP INDEX IF EXISTS finance.unique_aux_balance;
