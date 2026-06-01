-- Insert test notification data into public schema
INSERT INTO notifications (id, user_id, title, content, notification_type, status, action_url, metadata, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '系统通知', '欢迎使用 TOPEMS 系统！', 'system', 'unread', NULL, '{"source": "system"}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '审批通知', '您有一个新的审批请求待处理', 'workflow', 'unread', '/approvals/123', '{"approval_id": "123"}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '提醒通知', '请尽快完成您的任务', 'reminder', 'read', NULL, '{"task_id": "456"}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '告警通知', '系统检测到异常活动', 'alert', 'unread', '/alerts/789', '{"severity": "high"}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', '消息通知', '您收到了一条新消息', 'message', 'unread', '/messages/101', '{"sender": "admin"}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
