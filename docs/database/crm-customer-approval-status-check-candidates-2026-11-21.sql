-- B55 · crm.customers.approval_status 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/crm/src/modules/customer_approval_status.rs（CustomerApprovalStatus）
-- 流转：none → pending → approved/rejected；rejected 可重新提交为 pending。
-- 本地 301 行全部 none；列非空，DB 默认 'none'。

ALTER TABLE crm.customers
  ADD CONSTRAINT customers_approval_status_check
  CHECK (approval_status = ANY (ARRAY['none','pending','approved','rejected']))
  NOT VALID;

-- 窗口内：
-- ALTER TABLE crm.customers VALIDATE CONSTRAINT customers_approval_status_check;
-- 回滚：
-- ALTER TABLE crm.customers DROP CONSTRAINT IF EXISTS customers_approval_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 301 行 none）：
--   none→pending UPDATE 1；pending→approved UPDATE 1；
--   approved→pending 带起始态谓词 UPDATE 0；'waiting' → 23514。
