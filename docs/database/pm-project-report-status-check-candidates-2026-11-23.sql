-- B233 · pm.project_reports.status 候选约束（NOT VALID）
--
-- 值集来源：
--   svc/pm/src/modules/project_report_status.rs
--     ProjectReportStatus::DB_VALUES = pending / generated
--   默认 pending（列默认值）；手工登记报告写 pending、自动生成报告写 generated。
--
-- 历史别名：generating/in_progress → pending、completed/done → generated（仅读取侧兼容）。
--
-- 本地 topems 已应用（0 行存量；事务内取父项目 + 报告，bogus 被拒）。
-- 无迁移，已登记 prod-only 待回迁清单（total 400→401）。

ALTER TABLE pm.project_reports
  ADD CONSTRAINT ck_project_reports_status_standard
  CHECK (status IN ('pending', 'generated'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE pm.project_reports DROP CONSTRAINT IF EXISTS ck_project_reports_status_standard;
