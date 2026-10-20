-- =============================================================
-- C4: 对齐 finance.core_finance_payments.created_by 列型为 VARCHAR(100)
--
-- 背景：
--   同表族 finance.core_finance_vouchers.created_by 为 VARCHAR(100)，
--   服务层（payment.rs / voucher.rs）统一绑定「用户名 String」写入 created_by；
--   而 core_finance_payments.created_by 历史建列为 UUID，创建付款时
--   文本绑定到 uuid 列 → 类型不匹配 500。
--
-- 决策：选择「迁移对齐列型为 varchar」而非「代码改传 user_id uuid」——
--   1. 与同表族 vouchers.created_by 保持一致，服务层无需区分两类绑定；
--   2. created_by 在本服务语义上就是操作者用户名（claims.username），
--      与审计列习惯一致，改动面最小。
--
-- 幂等：仅当当前列类型为 uuid 时才转换；已是 varchar 则跳过。
-- 不修改任何历史数据语义：uuid 值原样 ::text，NULL 保持 NULL。
-- =============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'finance'
          AND table_name = 'core_finance_payments'
          AND column_name = 'created_by'
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE finance.core_finance_payments
            ALTER COLUMN created_by TYPE VARCHAR(100)
            USING created_by::text;
    END IF;
END $$;
