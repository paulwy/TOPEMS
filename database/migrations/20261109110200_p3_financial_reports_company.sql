-- P3 第一批（3/3）：finance.financial_reports 补 company_id（法人主体）
--
-- 背景：报表持久化原先是租户级（org_id 实际写 tenant_id），P2a 引入公司维度后
--       同一租户多主体会互相覆盖。本迁移把报表归属收敛到公司级。
--
-- 回填口径与 P2a 一致：
--   - 每个租户必须恰好有 1 个有效公司，否则 RAISE（不猜测、不静默兜底）；
--   - company_id 回填后，把历史 row 的 org_id 同步为 company_id，
--     使既有唯一键 (report_type, org_id, period, currency_code) 自然成为公司级
--     （本仓库门禁禁止 DROP CONSTRAINT，故不重建唯一键，改用 org_id 承接公司维度）。
--
-- ROLLBACK（人工评估后执行）：
--   DROP INDEX IF EXISTS finance.idx_financial_reports_tenant_company;
--   ALTER TABLE finance.financial_reports ALTER COLUMN company_id DROP NOT NULL;
--   ALTER TABLE finance.financial_reports DROP COLUMN IF EXISTS company_id;

ALTER TABLE finance.financial_reports ADD COLUMN IF NOT EXISTS company_id uuid;

-- 多主体租户：无法判定归属，直接失败交人工。
DO $$
DECLARE
    ambiguous bigint;
BEGIN
    SELECT count(*) INTO ambiguous
    FROM (
        SELECT r.tenant_id
        FROM finance.financial_reports r
        GROUP BY r.tenant_id
        HAVING (
            SELECT count(*) FROM hrm.companies c
            WHERE c.tenant_id = r.tenant_id AND c.deleted_at IS NULL
        ) <> 1
    ) t;

    IF ambiguous > 0 THEN
        RAISE EXCEPTION
            'P3 报表公司维度：% 个租户的有效公司数不为 1，历史报表无法自动归属，请先人工指定后重跑',
            ambiguous;
    END IF;
END $$;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 回填历史报表 company_id，按租户唯一公司归属（前置已校验唯一性）
-- destructive-owner: finance
-- destructive-ticket: P3-BATCH1-REPORT-COMPANY
-- destructive-expires: 2027-03-31
-- destructive-max-rows: 100000
-- destructive-backup: 迁移前 pg_dump -t finance.financial_reports
UPDATE finance.financial_reports
SET company_id = c.id
FROM hrm.companies c
WHERE financial_reports.company_id IS NULL
  AND c.tenant_id = financial_reports.tenant_id
  AND c.deleted_at IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 历史报表 org_id 由租户对齐为公司，使既有唯一键承接公司维度
-- destructive-owner: finance
-- destructive-ticket: P3-BATCH1-REPORT-COMPANY
-- destructive-expires: 2027-03-31
-- destructive-max-rows: 100000
-- destructive-backup: 迁移前 pg_dump -t finance.financial_reports
UPDATE finance.financial_reports
SET org_id = company_id
WHERE company_id IS NOT NULL
  AND (org_id IS NULL OR org_id <> company_id);

-- 零遗漏校验
DO $$
DECLARE
    n bigint;
BEGIN
    SELECT count(*) INTO n FROM finance.financial_reports WHERE company_id IS NULL;
    IF n > 0 THEN
        RAISE EXCEPTION 'P3 报表公司维度：finance.financial_reports 仍有 % 行 company_id 为空', n;
    END IF;
END $$;

ALTER TABLE finance.financial_reports ALTER COLUMN company_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_reports_tenant_company
    ON finance.financial_reports (tenant_id, company_id, period);
