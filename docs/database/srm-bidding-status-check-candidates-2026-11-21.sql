-- B59 · srm.biddings.status 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/srm/src/modules/bidding_status.rs（BiddingStatus）
-- 流转：draft → published → opened → evaluated → awarded；每步只允许前驱态。
-- 本地 0 行；列非空，DB 默认 'draft'。

ALTER TABLE srm.biddings
  ADD CONSTRAINT biddings_status_check
  CHECK (status = ANY (ARRAY['draft','published','opened','evaluated','awarded']))
  NOT VALID;

-- 窗口内：
-- ALTER TABLE srm.biddings VALIDATE CONSTRAINT biddings_status_check;
-- 回滚：
-- ALTER TABLE srm.biddings DROP CONSTRAINT IF EXISTS biddings_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   插入 draft → 发布/开标/评标/定标各 UPDATE 1；
--   已 awarded 再定标 UPDATE 0；'bogus' → 23514。
