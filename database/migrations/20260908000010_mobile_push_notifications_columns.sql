-- 20260908000010: mobile.push_notifications 补 user_id/read_at 列
-- 背景：push_notification.rs 查询 public.push_notifications 用列（id/user_id/title/body/notification_type/read_at/created_at）
--      目标表 mobile.push_notifications 为群发设计（target_ids/sent_count/...）缺 user_id/read_at →
--      改码至 mobile.push_notifications 后需补列兼容（repository.rs 群发统计查询不受影响）。
ALTER TABLE mobile.push_notifications
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
