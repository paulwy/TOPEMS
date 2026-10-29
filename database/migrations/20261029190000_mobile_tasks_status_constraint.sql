-- mobile_tasks 状态约束对齐代码状态机（2026-10-29）
-- 背景：原约束 ck_mobile_tasks_status_standard（active/inactive/archived）与
-- svc/mobile task.rs allow_transition 状态机（pending/in_progress/completed/cancelled/on_hold）冲突，
-- 导致 POST /task 创建 500（check violation）。代码状态机为业务权威，约束对齐之。

ALTER TABLE IF EXISTS "mobile"."mobile_tasks" DROP CONSTRAINT IF EXISTS "ck_mobile_tasks_status_standard";
ALTER TABLE IF EXISTS "mobile"."mobile_tasks" ADD CONSTRAINT "ck_mobile_tasks_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'on_hold'::character varying])::text[]))));
