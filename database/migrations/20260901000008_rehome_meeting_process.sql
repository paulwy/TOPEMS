-- 2026-09-01 活跃表归位：meeting→erp、process→mes（仅引用服务 + search_path 含目标 schema + 0 行 + 无同名冲突）
ALTER TABLE public.meeting_bookings SET SCHEMA erp;
ALTER TABLE public.meeting_rooms SET SCHEMA erp;
ALTER TABLE public.process_flows SET SCHEMA mes;
ALTER TABLE public.process_flow_steps SET SCHEMA mes;
