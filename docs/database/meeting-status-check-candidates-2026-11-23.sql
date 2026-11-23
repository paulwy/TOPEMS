-- B202 会议室与会议预约状态候选约束（2026-11-23）
--
-- 目标：把两列收敛到唯一枚举（同一模块 `svc/erp/src/modules/meeting_status.rs`）
--   `MeetingRoomStatus`    → erp.meeting_rooms.status
--   `MeetingBookingStatus` → erp.meeting_bookings.status
--
-- 现状：两列 varchar 可空。会议室 DB 默认 `available`、创建也写 `'available'`（一致）；
-- 会议预约 DB 默认是 `pending`，但创建写 `'confirmed'`、冲突检测用 `AND status = 'confirmed'`，
-- 默认值从未被写入口使用 —— 本批把列默认统一到写入口实际使用的 `confirmed`（表 0 行，无回填风险，
-- 仍保留一次兜底 UPDATE 供其它环境执行）。
-- 代码侧此前：更新接口 `req.status.unwrap_or(existing.status)` 可写任意串；两个列表过滤
-- `params.status.clone()` 原样绑定；预约时校验会议室 `AND status = 'available'`；
-- 时段冲突检测 `AND status = 'confirmed'`。本批全部改为枚举绑定。
-- 约束以 NOT VALID 应用，生产历史行不做回填校验，只约束后续写入；生产需按窗口单独 VALIDATE。

ALTER TABLE erp.meeting_bookings
  ALTER COLUMN status SET DEFAULT 'confirmed';

UPDATE erp.meeting_bookings
   SET status = 'confirmed'
 WHERE status IN ('pending', 'active', 'booked');

ALTER TABLE erp.meeting_rooms
  ADD CONSTRAINT ck_erp_meeting_rooms_status_standard
  CHECK (status IS NULL OR status IN ('available', 'occupied', 'maintenance', 'unavailable'))
  NOT VALID;

ALTER TABLE erp.meeting_bookings
  ADD CONSTRAINT ck_erp_meeting_bookings_status_standard
  CHECK (status IS NULL OR status IN ('confirmed', 'cancelled'))
  NOT VALID;
