-- P2a 前置修正（2026-11-09）：补齐科目表 (tenant_id, code) 唯一约束
--
-- 背景：
--   20261108135000 的 finance.bootstrap_defaults 用
--     ON CONFLICT (tenant_id, code) DO NOTHING
--   播种默认科目，迁移注释假设库内已有 unique_account_code 约束。
--   生产 finance.core_finance_accounts 只有主键与两个普通索引，缺该唯一约束，
--   导致 20261108135000 在 SELECT finance.bootstrap_defaults(NULL) 处报
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification"，
--   整条迁移回滚。
--
-- 为什么新增本迁移而不是改 20261108135000：
--   该迁移已推送到 main 并被生产账本引用，改动内容会造成 checksum 失配；
--   按前向迁移口径，在它前面插入本笔（20261108134500）补齐前置。
--
-- 幂等与 fail-closed：
--   - 表不存在 → NOTICE 跳过（尚未建财务 schema 的环境）；
--   - 已存在 (tenant_id, code) 唯一索引（无论约束名）→ NOTICE 跳过；
--   - 存在重复 (tenant_id, code) → RAISE EXCEPTION 中止，绝不吞掉数据问题。
--
-- ROLLBACK：
--   ALTER TABLE finance.core_finance_accounts DROP CONSTRAINT unique_account_code;

DO $$
DECLARE
    v_dup bigint;
BEGIN
    IF to_regclass('finance.core_finance_accounts') IS NULL THEN
        RAISE NOTICE 'P2a 前置：finance.core_finance_accounts 不存在，跳过唯一约束补齐';
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_attribute a1
          ON a1.attrelid = i.indrelid AND a1.attnum = i.indkey[0]
        JOIN pg_attribute a2
          ON a2.attrelid = i.indrelid AND a2.attnum = i.indkey[1]
        WHERE i.indrelid = 'finance.core_finance_accounts'::regclass
          AND i.indisunique
          AND i.indnkeyatts = 2
          AND a1.attname = 'tenant_id'
          AND a2.attname = 'code'
    ) THEN
        RAISE NOTICE 'P2a 前置：已存在 (tenant_id, code) 唯一索引，跳过';
        RETURN;
    END IF;

    SELECT count(*) INTO v_dup
    FROM (
        SELECT tenant_id, code
        FROM finance.core_finance_accounts
        GROUP BY tenant_id, code
        HAVING count(*) > 1
    ) d;

    IF v_dup > 0 THEN
        RAISE EXCEPTION
            '无法创建 unique_account_code：存在 % 组重复 (tenant_id, code)，请先清理',
            v_dup;
    END IF;

    ALTER TABLE finance.core_finance_accounts
        ADD CONSTRAINT unique_account_code UNIQUE (tenant_id, code);
    RAISE NOTICE 'P2a 前置：已创建 unique_account_code UNIQUE (tenant_id, code)';
END $$;
