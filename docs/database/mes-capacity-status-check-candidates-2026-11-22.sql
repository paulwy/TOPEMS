-- B100 · mes.capacities.status 唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/mes/src/modules/capacity_status.rs
--   available / allocated / consumed / maintenance / released
-- 写入方：capacity.rs（创建固定 available；allocate/submit/release/maintenance 流转）。
-- 预检（本地）：mes.capacities 0 行，集合外 0。
-- DB 默认值：已是 'available'，与代码默认一致，无需改默认。
-- 语义提醒：通用 PUT 已禁止改状态，状态只能走分配/提交/释放/维护流程。
-- consumed 仍保留在 FSM 与集合内，但当前没有消费端点；新增端点前不会由 API 写入。

ALTER TABLE mes.capacities
  ADD CONSTRAINT capacities_status_check
  CHECK (status::text = ANY (ARRAY['available','allocated','consumed','maintenance','released']))
  NOT VALID;

-- 窗口内（存量脏值确认后）：
-- ALTER TABLE mes.capacities VALIDATE CONSTRAINT capacities_status_check;
-- 回滚：
-- ALTER TABLE mes.capacities DROP CONSTRAINT IF EXISTS capacities_status_check;

-- 本地演练（2026-11-22，事务内 ROLLBACK，残留 0）：
--   available→allocated（谓词 available）→ UPDATE 1
--   available→allocated（同谓词重复）→ UPDATE 0
--   allocated→released（谓词 allocated）→ UPDATE 1
--   maintenance→available（ANY maintenance）→ UPDATE 1
--   available→maintenance（ANY available）→ UPDATE 1
--   bogus 行改 used_hours（五值谓词）→ UPDATE 0
--   候选 CHECK 下 available 行改为 bogus → 23514
