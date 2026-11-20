-- 20261121220000: finance.opening_balances 归属收口（W2-C1..C3）
--
-- 背景：finance 的期初余额 API 与法定报表一直直连 erp.opening_balances，
-- 但全仓只有 finance 读写该表，erp 服务零引用。跨 schema 直连既让 finance
-- 依赖 erp 的 RLS/search_path，也让 W2-B 需要给 finance 额外放行 erp。
-- 本迁移把表连同数据、索引、约束、RLS 策略整体迁入 finance schema，
-- 代码改为 finance.opening_balances，不再存在跨服务直连。
--
-- 可逆：只做 ALTER TABLE ... SET SCHEMA，不复制、不删除数据。
-- 幂等：erp 表存在且 finance 表不存在时迁移；已迁移则跳过。
-- 冲突保护：两张表同时存在时中止，避免静默选错事实源。

CREATE SCHEMA IF NOT EXISTS finance;

DO $$
BEGIN
    IF to_regclass('erp.opening_balances') IS NOT NULL
       AND to_regclass('finance.opening_balances') IS NOT NULL THEN
        RAISE EXCEPTION
            '20261121220000 ABORT: erp.opening_balances 与 finance.opening_balances 同时存在，需人工裁决事实源';
    END IF;

    IF to_regclass('erp.opening_balances') IS NOT NULL THEN
        ALTER TABLE erp.opening_balances SET SCHEMA finance;
        RAISE NOTICE '20261121220000: erp.opening_balances -> finance.opening_balances';
    END IF;

    IF to_regclass('finance.opening_balances') IS NULL THEN
        RAISE EXCEPTION
            '20261121220000 ABORT: 迁移后期初余额表不存在（erp/finance 均缺失）';
    END IF;
END $$;
