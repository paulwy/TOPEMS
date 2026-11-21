-- B47 · mes.material_issues 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/mes/src/modules/material_bom/issue_status.rs（MaterialIssueStatus）
-- 流转：pending → completed；completed 为终态，编辑不可回退，删除只允许 pending。
-- 本地 0 行；列默认已是 'pending'。

ALTER TABLE mes.material_issues
  ADD CONSTRAINT material_issues_status_check
  CHECK (status = ANY (ARRAY['pending','completed']))
  NOT VALID;

-- 窗口内：
-- ALTER TABLE mes.material_issues VALIDATE CONSTRAINT material_issues_status_check;
-- 回滚：
-- ALTER TABLE mes.material_issues DROP CONSTRAINT IF EXISTS material_issues_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   insert pending → completed UPDATE 1；completed→'issued' → 23514。

-- 修复记录（本批代码改动，非 DDL）：
--   创建状态由 SQL 字面量 'pending' 改为绑定 DEFAULT；
--   列表状态过滤严格解析（未知 400）；
--   编辑状态严格解析，并按目标态限制起始态（completed 只能从 pending 进入）；
--   删除顺序修正为「先校验并软删主单、成功后再删明细」，原来先删明细，
--   状态不允许时明细已丢、主单仍在；0 行改为 409。
