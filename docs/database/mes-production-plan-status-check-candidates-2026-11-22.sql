-- B98 · mes.production_plans.status 唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/mes/src/modules/production_plan_status.rs
--   draft / pending_approval / approved / in_progress / completed / cancelled
-- 写入方：production_plan.rs（创建固定 draft；submit/approve/reject 流转）。
-- 预检（本地）：mes.production_plans 0 行，集合外 0。
-- DB 默认值：已是 'draft'，与代码默认一致，无需改默认。
-- 语义提醒：通用 PUT 已禁止改状态，状态只能走审批流；驳回 pending_approval → draft。

ALTER TABLE mes.production_plans
  ADD CONSTRAINT production_plans_status_check
  CHECK (status::text = ANY (ARRAY['draft','pending_approval','approved','in_progress','completed','cancelled']))
  NOT VALID;

-- 窗口内（存量脏值确认后）：
-- ALTER TABLE mes.production_plans VALIDATE CONSTRAINT production_plans_status_check;
-- 回滚：
-- ALTER TABLE mes.production_plans DROP CONSTRAINT IF EXISTS production_plans_status_check;

-- 本地演练（2026-11-22，事务内 ROLLBACK，残留 0）：
--   draft→pending_approval（谓词 draft）→ UPDATE 1
--   draft→pending_approval（同谓词重复）→ UPDATE 0
--   bogus→pending_approval（谓词 draft）→ UPDATE 0
--   bogus 行改 plan_name（六值谓词）→ UPDATE 0；draft 行 → UPDATE 1
--   候选 CHECK 下 draft 行改为 bogus → 23514
