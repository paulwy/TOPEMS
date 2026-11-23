-- B234 · pm.defects.status 候选约束（NOT VALID）
--
-- 值集来源：
--   svc/pm/src/modules/defect_status.rs
--     DefectStatus::DB_VALUES = open / in_progress / resolved / closed
--   默认 open（列默认值）；创建缺陷写 open，更新接口按目标状态决定 resolved_at。
--   实际列类型为 text（DB 默认 'open'::character varying）。
--
-- 历史别名：new/identified → open、inprogress/active/fixing → in_progress、
--   fixed/done → resolved、complete/finished → closed（仅读取侧兼容）。
--
-- 本地 topems 已应用（0 行存量；事务内取父项目 + 缺陷，bogus 被拒）。
-- 无迁移，已登记 prod-only 待回迁清单（total 401→402）。

ALTER TABLE pm.defects
  ADD CONSTRAINT ck_defects_status_standard
  CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE pm.defects DROP CONSTRAINT IF EXISTS ck_defects_status_standard;
