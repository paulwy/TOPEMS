-- B46 · srm.quotations 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/srm/src/modules/quotation_status.rs（QuotationStatus）
-- 流转：pending → awarded / rejected；中标、拒绝、修改、删除只接受 pending。
-- 本地 0 行。DB 列默认是 'draft'，与代码创建入口（pending）不一致，需改默认。

ALTER TABLE srm.quotations
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE srm.quotations
  ADD CONSTRAINT quotations_status_check
  CHECK (status = ANY (ARRAY['pending','awarded','rejected']))
  NOT VALID;

-- 窗口内：
-- ALTER TABLE srm.quotations VALIDATE CONSTRAINT quotations_status_check;
-- 回滚：
-- ALTER TABLE srm.quotations DROP CONSTRAINT IF EXISTS quotations_status_check;
-- ALTER TABLE srm.quotations ALTER COLUMN status SET DEFAULT 'draft';

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   insert pending → awarded UPDATE 1；awarded→'draft' → 23514。

-- 修复记录（本批代码改动，非 DDL）：
--   创建状态由字面量 'pending' 改为绑定 DEFAULT；
--   中标/拒绝目标态改绑枚举，起始谓词改 status = ANY([pending])；
--   修改与删除接口补 pending 起始谓词，避免已中标/已拒绝报价被改或被软删。
