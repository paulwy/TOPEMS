-- B43 · ehs.qa_ehs_risks 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/ehs/src/modules/risk_status.rs（RiskStatus）
-- 流转：identified → assessed → controlled；评估接口只接受 identified / assessed，
--       编辑接口只允许向前流转（不允许 controlled 回退）。
-- 本地存量：identified 321 / controlled 39 / assessed 1，均在候选集合内。

ALTER TABLE ehs.qa_ehs_risks
  ADD CONSTRAINT qa_ehs_risks_status_check
  CHECK (status = ANY (ARRAY['identified','assessed','controlled']))
  NOT VALID;

-- 列默认值已是 'identified'，与 RiskStatus::DEFAULT 一致，无需改默认。

-- 窗口内：
-- ALTER TABLE ehs.qa_ehs_risks VALIDATE CONSTRAINT qa_ehs_risks_status_check;
-- 回滚：
-- ALTER TABLE ehs.qa_ehs_risks DROP CONSTRAINT IF EXISTS qa_ehs_risks_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   insert identified → assessed → controlled 各 UPDATE 1；controlled→'bogus' → 23514。

-- 修复记录（本批代码改动，非 DDL）：
--   列表 status 过滤与创建/编辑状态改为严格解析（未知值 400）；
--   创建只接受 identified，且实际绑定 DEFAULT；
--   评估接口不再透传请求 status，固定写 assessed 并只允许 identified/assessed 起始态；
--   编辑接口按目标态校验起始态（identified→assessed/controlled，assessed→controlled）。
