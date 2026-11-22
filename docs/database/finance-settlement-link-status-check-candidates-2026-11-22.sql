-- B141 · finance.reconciliation_settlement_links.status 状态收敛候选 DDL
-- 值集来源：svc/finance/src/modules/settlement_center_status.rs（SettlementLinkStatus）
-- 创建只写 linked，解除只写 cancelled；cancelled 为终态。
-- 本地：0 行，NOT NULL 默认 linked，无 CHECK。
-- 生产快照：0 行，NOT NULL 无 CHECK；本候选未应用生产。

ALTER TABLE finance.reconciliation_settlement_links
  DROP CONSTRAINT IF EXISTS ck_reconciliation_settlement_links_status_standard;

ALTER TABLE finance.reconciliation_settlement_links ALTER COLUMN status SET DEFAULT 'linked';

ALTER TABLE finance.reconciliation_settlement_links
  ADD CONSTRAINT ck_reconciliation_settlement_links_status_standard
  CHECK (status = ANY (ARRAY['linked','cancelled']))
  NOT VALID;

COMMENT ON COLUMN finance.reconciliation_settlement_links.status IS '关联状态：linked, cancelled';

-- 窗口内验证：
-- ALTER TABLE finance.reconciliation_settlement_links VALIDATE CONSTRAINT ck_reconciliation_settlement_links_status_standard;
-- 回滚：
-- ALTER TABLE finance.reconciliation_settlement_links DROP CONSTRAINT IF EXISTS ck_reconciliation_settlement_links_status_standard;
