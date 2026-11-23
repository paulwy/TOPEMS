-- B235 · pm.project_risks.status 候选约束（NOT VALID）
--
-- 值集来源：
--   svc/pm/src/modules/project_risk_status.rs
--     ProjectRiskStatus::DB_VALUES = identified / mitigated / closed
--   默认 identified（列默认值）；创建风险写 identified，更新接口接状态机。
--   `mitigated` 已被前端 pm-api.test.ts 的更新用例使用。
--
-- 历史别名：open/active → identified、mitigating/controlled → mitigated、
--   complete/done/resolved → closed（仅读取侧兼容）。
--
-- 本地 topems 已应用（0 行存量；事务内取父项目 + 风险，bogus 被拒）。
-- 无迁移，已登记 prod-only 待回迁清单（total 402→403）。

ALTER TABLE pm.project_risks
  ADD CONSTRAINT ck_project_risks_status_standard
  CHECK (status IN ('identified', 'mitigated', 'closed'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE pm.project_risks DROP CONSTRAINT IF EXISTS ck_project_risks_status_standard;
