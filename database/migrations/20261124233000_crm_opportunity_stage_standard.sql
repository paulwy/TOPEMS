-- B266：CRM 商机阶段词表收口（2026-11-24）
--
-- 背景：crm.opportunities.stage 无 CHECK，默认值仍是 legacy 'prospecting'；
--   后端 OppStage 使用 draft/lead/qualified/proposal/negotiation/won/lost/closed，
--   但漏斗、赢输单统计和预测仍按 closed_won/closed_lost 查询，前端详情页标签
--   也按 prospecting/closed_won/closed_lost 匹配，导致统计恒为 0、标签退化。
--
-- 本次：归一 legacy 别名 → 默认值固定 'draft' → NOT NULL →
--   ADD CHECK + VALIDATE（8 态与 Rust OppStage::DB_VALUES 同源）。
-- fail-closed：归一后仍有 8 态之外的值则 RAISE EXCEPTION。

DO $$
DECLARE
    n_bad bigint;
    exists_already boolean;
BEGIN
    IF to_regclass('crm.opportunities') IS NULL THEN
        RAISE NOTICE '跳过：crm.opportunities 不存在';
        RETURN;
    END IF;

    UPDATE crm.opportunities
       SET stage = CASE lower(btrim(coalesce(stage, '')))
           WHEN '' THEN 'draft'
           WHEN 'prospecting' THEN 'draft'
           WHEN 'new' THEN 'draft'
           WHEN 'lead' THEN 'lead'
           WHEN 'qualified' THEN 'qualified'
           WHEN 'proposal' THEN 'proposal'
           WHEN 'negotiation' THEN 'negotiation'
           WHEN 'won' THEN 'won'
           WHEN 'closed_won' THEN 'won'
           WHEN 'closedwon' THEN 'won'
           WHEN 'lost' THEN 'lost'
           WHEN 'closed_lost' THEN 'lost'
           WHEN 'closedlost' THEN 'lost'
           WHEN 'closed' THEN 'closed'
           ELSE lower(btrim(coalesce(stage, '')))
       END
     WHERE stage IS NULL
        OR stage <> CASE lower(btrim(coalesce(stage, '')))
           WHEN '' THEN 'draft'
           WHEN 'prospecting' THEN 'draft'
           WHEN 'new' THEN 'draft'
           WHEN 'lead' THEN 'lead'
           WHEN 'qualified' THEN 'qualified'
           WHEN 'proposal' THEN 'proposal'
           WHEN 'negotiation' THEN 'negotiation'
           WHEN 'won' THEN 'won'
           WHEN 'closed_won' THEN 'won'
           WHEN 'closedwon' THEN 'won'
           WHEN 'lost' THEN 'lost'
           WHEN 'closed_lost' THEN 'lost'
           WHEN 'closedlost' THEN 'lost'
           WHEN 'closed' THEN 'closed'
           ELSE lower(btrim(coalesce(stage, '')))
       END;

    SELECT count(*) FROM crm.opportunities
     WHERE stage IS NULL
        OR stage NOT IN ('draft', 'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'closed')
      INTO n_bad;

    IF n_bad > 0 THEN
        RAISE EXCEPTION 'B266 前置断言失败：% 行 stage 落在 8 态之外', n_bad;
    END IF;

    ALTER TABLE crm.opportunities
        ALTER COLUMN stage SET DEFAULT 'draft';
    ALTER TABLE crm.opportunities
        ALTER COLUMN stage SET NOT NULL;

    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'crm.opportunities'::regclass
           AND conname = 'ck_opportunities_stage_standard'
    ) INTO exists_already;

    IF exists_already THEN
        ALTER TABLE crm.opportunities
            VALIDATE CONSTRAINT ck_opportunities_stage_standard;
        RAISE NOTICE '跳过 ADD：约束已存在，已重新 VALIDATE';
        RETURN;
    END IF;

    ALTER TABLE crm.opportunities
        ADD CONSTRAINT ck_opportunities_stage_standard
        CHECK (stage IN ('draft', 'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'closed')) NOT VALID;
    ALTER TABLE crm.opportunities
        VALIDATE CONSTRAINT ck_opportunities_stage_standard;

    RAISE NOTICE 'B266 完成：crm.opportunities.stage 已建立八态约束';
END $$;
