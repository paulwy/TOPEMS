-- B37 · wms.replenishment_suggestions / wms.replenishment_orders 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/wms/src/modules/smart_replenishment/status.rs
-- suggestions：draft（历史草稿，被补货计算清理）/ active（系统生成，本地 7332 行）/ confirmed
-- orders：pending / confirmed / completed
-- 回滚：文件末尾。

ALTER TABLE wms.replenishment_suggestions
  ADD CONSTRAINT replenishment_suggestions_status_check
  CHECK (status = ANY (ARRAY['draft','active','confirmed']))
  NOT VALID;

-- 建议列默认值是 'draft'，与代码写入的 'active' 不一致；draft 行会被下一次补货计算软删。
-- 统一为 'active'，避免绕过应用的 INSERT 落进即将被清理的草稿态。
ALTER TABLE wms.replenishment_suggestions
  ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE wms.replenishment_orders
  ADD CONSTRAINT replenishment_orders_status_check
  CHECK (status = ANY (ARRAY['pending','confirmed','completed']))
  NOT VALID;

-- orders 列默认值已是 'pending'，与 B37 后的创建写入口一致，无需改默认。

-- 窗口内：
-- ALTER TABLE wms.replenishment_suggestions VALIDATE CONSTRAINT replenishment_suggestions_status_check;
-- ALTER TABLE wms.replenishment_orders VALIDATE CONSTRAINT replenishment_orders_status_check;
-- 回滚：
-- ALTER TABLE wms.replenishment_suggestions DROP CONSTRAINT IF EXISTS replenishment_suggestions_status_check;
-- ALTER TABLE wms.replenishment_suggestions ALTER COLUMN status SET DEFAULT 'draft';
-- ALTER TABLE wms.replenishment_orders DROP CONSTRAINT IF EXISTS replenishment_orders_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   suggestions：active→confirmed（谓词 active|draft）→ UPDATE 1；active→'bogus' → 23514
--   orders：插入 pending → confirmed → completed 各 UPDATE 1；completed→'bogus' → 23514

-- 修复记录（本批代码改动，非 DDL）：
--   suggestions 确认谓词原本只认 draft，但补货计算写入 active，7332 条建议无法确认；
--   orders 创建原本写 active，而确认谓词只认 pending，新建的补货订单无法确认。
