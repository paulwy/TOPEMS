-- 插入测试数据
SET search_path TO rs, public;

-- 插入测试项目
INSERT INTO rs.projects (id, name, code, description, project_type, status, leader, start_date, budget, progress, created_by) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'AI研发项目', 'AI-001', '基于大语言模型的AI助手研发', 'research', 'active', '张三', '2024-01-01', 500000.00, 35, '张三'),
('550e8400-e29b-41d4-a716-446655440001', '数据分析平台', 'DAP-001', '企业级数据分析平台建设', 'development', 'active', '李四', '2024-02-15', 300000.00, 60, '李四'),
('550e8400-e29b-41d4-a716-446655440002', '移动APP开发', 'APP-001', '公司内部管理APP', 'development', 'completed', '王五', '2023-08-01', 200000.00, 100, '王五');

-- 插入测试项目阶段
INSERT INTO rs.project_phases (id, project_id, phase_number, name, description, start_date, end_date, status, progress, weight) VALUES 
('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440000', 1, '需求分析', '项目需求调研和分析', '2024-01-01', '2024-01-31', 'completed', 100, 20),
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440000', 2, '架构设计', '系统架构设计', '2024-02-01', '2024-02-28', 'completed', 100, 25),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440000', 3, '开发实施', '核心功能开发', '2024-03-01', NULL, 'in_progress', 30, 35),
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440000', 4, '测试上线', '系统测试和部署', NULL, NULL, 'not_started', 0, 20);

-- 插入测试项目成员
INSERT INTO rs.project_members (id, project_id, employee_id, role, responsibility, allocation, hourly_rate, cost_rate) VALUES 
('550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440000', 'EMP001', '项目经理', '项目整体管理', 1.0, 200.00, 350.00),
('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440000', 'EMP002', '后端开发', '后端服务开发', 0.8, 180.00, 300.00),
('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440000', 'EMP003', '前端开发', '前端界面开发', 0.6, 160.00, 280.00);

-- 插入测试项目预算
INSERT INTO rs.project_budgets (id, project_id, budget_type, category, description, planned_amount, actual_amount, created_by) VALUES 
('550e8400-e29b-41d4-a716-446655440300', '550e8400-e29b-41d4-a716-446655440000', 'cost', '人力成本', '项目团队人员成本', 300000.00, 105000.00, '张三'),
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440000', 'cost', '设备采购', '开发设备采购', 100000.00, 50000.00, '张三'),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440000', 'cost', '其他费用', '差旅费、会议费等', 100000.00, 20000.00, '张三');

-- 插入测试项目合同
INSERT INTO rs.project_contracts (id, project_id, contract_number, contract_type, party_a, party_b, amount, status, created_by) VALUES 
('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440000', 'CONT-2024-001', 'service', 'ABC科技公司', 'TOPEMS公司', 500000.00, 'active', '张三');

-- 插入测试付款计划
INSERT INTO rs.payment_schedules (id, contract_id, project_id, payment_number, payment_type, description, due_date, amount, status, created_by) VALUES 
('550e8400-e29b-41d4-a716-446655440500', '550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440000', 'PAY-001', 'deposit', '首付款', '2024-01-15', 150000.00, 'paid', '张三'),
('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440000', 'PAY-002', 'progress', '进度款', '2024-04-01', 200000.00, 'pending', '张三'),
('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440000', 'PAY-003', 'final', '尾款', '2024-07-01', 150000.00, 'pending', '张三');

SELECT 'Test data inserted successfully!' AS status;
