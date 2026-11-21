-- B97 · mes.material_plans.status 唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/mes/src/modules/material_plan_status.rs
--   pending / requisitioned / sourced / satisfied / shortage / cancelled
-- 写入方：material_plan.rs（创建默认 pending、编辑、submit/requisition/cancel 流转）。
-- 预检（本地）：mes.material_plans 0 行，集合外 0。
-- DB 默认值：已是 'pending'，与代码默认一致，无需改默认。
-- 语义提醒：satisfied 与 cancelled 视为终态；取消只允许从
--   pending / requisitioned / sourced / shortage 进入。

ALTER TABLE mes.material_plans
  ADD CONSTRAINT material_plans_status_check
  CHECK (status = ANY (ARRAY['pending','requisitioned','sourced','satisfied','shortage','cancelled']))
  NOT VALID;

-- 窗口内（存量脏值确认后）：
-- ALTER TABLE mes.material_plans VALIDATE CONSTRAINT material_plans_status_check;
-- 回滚：
-- ALTER TABLE mes.material_plans DROP CONSTRAINT IF EXISTS material_plans_status_check;

-- 本地演练（2026-11-22，事务内 ROLLBACK，残留 0）：
--   pending→requisitioned（谓词 pending）→ UPDATE 1
--   pending→requisitioned（同谓词重复）→ UPDATE 0
--   bogus→sourced（谓词 requisitioned）→ UPDATE 0
--   候选 CHECK 下 pending 行改为 bogus → 23514
