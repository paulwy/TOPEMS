-- B99 · mes.demand_forecasts.status 唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/mes/src/modules/demand_forecast_status.rs
--   draft / calculated / validated / adopted / superseded / cancelled
-- 写入方：demand_forecast.rs（创建固定 draft；calculate/validate/adopt 流转）。
-- 预检（本地）：mes.demand_forecasts 0 行，集合外 0。
-- DB 默认值：已是 'draft'，与代码默认一致，无需改默认。
-- 语义提醒：通用 PUT 已禁止改状态，状态只能走计算/验证/采纳流程。

ALTER TABLE mes.demand_forecasts
  ADD CONSTRAINT demand_forecasts_status_check
  CHECK (status::text = ANY (ARRAY['draft','calculated','validated','adopted','superseded','cancelled']))
  NOT VALID;

-- 窗口内（存量脏值确认后）：
-- ALTER TABLE mes.demand_forecasts VALIDATE CONSTRAINT demand_forecasts_status_check;
-- 回滚：
-- ALTER TABLE mes.demand_forecasts DROP CONSTRAINT IF EXISTS demand_forecasts_status_check;

-- 本地演练（2026-11-22，事务内 ROLLBACK，残留 0）：
--   draft→calculated（谓词 draft）→ UPDATE 1
--   draft→calculated（同谓词重复）→ UPDATE 0
--   bogus→calculated（谓词 draft）→ UPDATE 0
--   calculated→validated→adopted → 各 UPDATE 1
--   bogus 行改 notes（六值谓词）→ UPDATE 0
--   候选 CHECK 下 draft 行改为 bogus → 23514
