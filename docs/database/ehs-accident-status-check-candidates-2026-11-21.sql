-- B44 · ehs.qa_ehs_accidents 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/ehs/src/modules/accident_status.rs（AccidentStatus）
-- 流转：reported → closed；结案接口只接受 reported 起始态，重复结案 409。
-- 本地存量：reported 48 行，均在候选集合内。列默认已是 'reported'。

ALTER TABLE ehs.qa_ehs_accidents
  ADD CONSTRAINT qa_ehs_accidents_status_check
  CHECK (status = ANY (ARRAY['reported','closed']))
  NOT VALID;

-- 窗口内：
-- ALTER TABLE ehs.qa_ehs_accidents VALIDATE CONSTRAINT qa_ehs_accidents_status_check;
-- 回滚：
-- ALTER TABLE ehs.qa_ehs_accidents DROP CONSTRAINT IF EXISTS qa_ehs_accidents_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   insert reported → closed UPDATE 1；closed→'pending' → 23514。

-- 修复记录（本批代码改动，非 DDL）：
--   列表 status 过滤严格解析（未知 400）；
--   上报状态绑定 DEFAULT(reported)，不再写字面量；
--   结案改绑 Closed，并加 status = ANY([reported]) 起始谓词，重复结案 409；
--   前端事故状态选项由「调查中/处理中/已结案/已归档」（中文值，后端无法存储）
--   收敛为 reported / closed 两态，色板与标签同步，修掉表单提交后状态永不匹配。
