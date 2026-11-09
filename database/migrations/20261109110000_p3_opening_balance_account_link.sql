-- P3 第一批（1/3）：erp.opening_balances 补 account_id，与 finance 科目表对齐
--
-- 背景：期初余额保存在 erp.opening_balances，只按 subject_code 关联科目；
--       报表侧需要稳定的 account_id 关联（code 可被改名/复用），且必须做一致性校验。
-- 口径：tenant_id + subject_code 唯一确定 finance.core_finance_accounts（唯一键 unique_account_code）。
--       无法关联的行不静默跳过，直接 RAISE（fail-closed，交人工清洗）。
--
-- 本文件为前向迁移，仅加列 + 回填 + 索引，不删列、不改类型。
--
-- ROLLBACK（人工评估后执行）：
--   DROP INDEX IF EXISTS erp.idx_opening_balances_account;
--   ALTER TABLE erp.opening_balances DROP COLUMN IF EXISTS account_id;

ALTER TABLE erp.opening_balances ADD COLUMN IF NOT EXISTS account_id uuid;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 回填期初余额 account_id，仅填补空值并按 tenant_id+subject_code 精确关联科目
-- destructive-owner: finance
-- destructive-ticket: P3-BATCH1-OPENING-ACCOUNT
-- destructive-expires: 2027-03-31
-- destructive-max-rows: 500000
-- destructive-backup: 迁移前 pg_dump -t erp.opening_balances（见 docs/deploy/p3-batch1-preflight）
UPDATE erp.opening_balances
SET account_id = a.id
FROM finance.core_finance_accounts a
WHERE opening_balances.account_id IS NULL
  AND opening_balances.deleted_at IS NULL
  AND a.tenant_id = opening_balances.tenant_id
  AND a.code = opening_balances.subject_code;

CREATE INDEX IF NOT EXISTS idx_opening_balances_account
    ON erp.opening_balances (tenant_id, company_id, account_id);

-- 一致性校验：活动期初行必须全部关联到科目，否则报表拒绝出数。
DO $$
DECLARE
    n bigint;
    sample text;
BEGIN
    SELECT count(*) INTO n
    FROM erp.opening_balances
    WHERE deleted_at IS NULL AND account_id IS NULL;

    IF n > 0 THEN
        SELECT string_agg(DISTINCT subject_code, ',' ORDER BY subject_code)
        INTO sample
        FROM (
            SELECT subject_code
            FROM erp.opening_balances
            WHERE deleted_at IS NULL AND account_id IS NULL
            LIMIT 20
        ) s;

        RAISE EXCEPTION
            'P3 期初口径：erp.opening_balances 有 % 行无法按 tenant_id+subject_code 关联 finance.core_finance_accounts，样例科目：%',
            n, sample;
    END IF;
END $$;
