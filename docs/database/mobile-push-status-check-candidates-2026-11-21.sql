-- B45 · mobile.push_notifications 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/mobile/src/modules/push_status.rs（PushNotificationStatus）
-- 流转：pending → sent / failed；发送结果回写只接受 pending 起始态。
-- 本地存量：pending 0 / active 191 / sent 3。active 是旧创建逻辑误写，
-- 需在窗口内归一为 pending 后再 VALIDATE。

ALTER TABLE mobile.push_notifications
  ADD CONSTRAINT push_notifications_status_check
  CHECK (status = ANY (ARRAY['pending','sent','failed']))
  NOT VALID;

-- 窗口内先归一历史值（191 行 active → pending）：
-- UPDATE mobile.push_notifications SET status = 'pending' WHERE status = 'active';
-- ALTER TABLE mobile.push_notifications VALIDATE CONSTRAINT push_notifications_status_check;
-- 回滚：
-- ALTER TABLE mobile.push_notifications DROP CONSTRAINT IF EXISTS push_notifications_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   insert pending → sent UPDATE 1；sent→'active' → 23514。

-- 修复记录（本批代码改动，非 DDL）：
--   创建推送通知原本 status 写 'active' 却返回 'pending'，改为统一绑定 DEFAULT(pending)；
--   发送统计回写状态加 pending 起始谓词，避免重复计数；
--   发送/送达/点击三项统计的 `status = 'sent'` 字面量改为绑定枚举值。
-- 遗留：mobile.mobile_push_notifications（76 行全 pending，事件处理器写入后无人推进）
--   与 push_notifications 并行存在，下一批确认删表或接线。
