-- TOPEMS 系统字典初始化数据
-- 预置系统基础字典类型和字典项

-- ========================================
-- 字典类型定义
-- ========================================

INSERT INTO erp.dict_types (id, code, name, category, description, status, created_at, updated_at) VALUES
-- 系统状态
(uuid_generate_v4(), 'system_status', '系统状态', 'system', '系统运行状态枚举', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'user_status', '用户状态', 'iam', '用户账号状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'user_role', '用户角色', 'iam', '用户角色类型', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'permission_level', '权限级别', 'iam', '权限控制级别', 'active', NOW(), NOW()),
-- 审批状态
(uuid_generate_v4(), 'approval_status', '审批状态', 'workflow', '审批流程状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'approval_result', '审批结果', 'workflow', '审批处理结果', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'approval_action', '审批动作', 'workflow', '审批操作类型', 'active', NOW(), NOW()),
-- HRM 状态
(uuid_generate_v4(), 'employee_status', '员工状态', 'hrm', '员工在职状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'employee_type', '员工类型', 'hrm', '员工类别', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'attendance_status', '考勤状态', 'hrm', '考勤记录状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'leave_type', '休假类型', 'hrm', '请假类型', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'contract_status', '合同状态', 'hrm', '劳动合同状态', 'active', NOW(), NOW()),
-- CRM 状态
(uuid_generate_v4(), 'customer_level', '客户级别', 'crm', '客户等级分类', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'customer_status', '客户状态', 'crm', '客户合作状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'lead_status', '线索状态', 'crm', '销售线索状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'opportunity_stage', '商机阶段', 'crm', '商机生命周期阶段', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'deal_status', '交易状态', 'crm', '交易订单状态', 'active', NOW(), NOW()),
-- ERP 状态
(uuid_generate_v4(), 'supplier_status', '供应商状态', 'erp', '供应商合作状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'supplier_level', '供应商级别', 'erp', '供应商等级', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'purchase_order_status', '采购订单状态', 'erp', '采购订单流程状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'sales_order_status', '销售订单状态', 'erp', '销售订单流程状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'inventory_status', '库存状态', 'erp', '库存物品状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'asset_status', '资产状态', 'erp', '固定资产状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'voucher_status', '凭证状态', 'erp', '财务凭证状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'expense_type', '费用类型', 'erp', '费用报销类别', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'budget_status', '预算状态', 'erp', '预算执行状态', 'active', NOW(), NOW()),
-- WMS 状态
(uuid_generate_v4(), 'warehouse_type', '仓库类型', 'wms', '仓库分类', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'stock_movement_type', '库存变动类型', 'wms', '出入库类型', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'transfer_status', '调拨状态', 'wms', '库存调拨状态', 'active', NOW(), NOW()),
-- MES 状态
(uuid_generate_v4(), 'production_order_status', '生产订单状态', 'mes', '生产订单流程状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'workshop_status', '车间状态', 'mes', '车间运行状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'equipment_status', '设备状态', 'mes', '设备运行状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'quality_inspection_status', '质检状态', 'mes', '质量检验状态', 'active', NOW(), NOW()),
-- 通用状态
(uuid_generate_v4(), 'enabled_disabled', '启用禁用', 'common', '通用启用/禁用状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'yes_no', '是否', 'common', '通用是/否选项', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'priority', '优先级', 'common', '任务优先级', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'gender', '性别', 'common', '性别选项', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'education', '学历', 'common', '学历等级', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'marital_status', '婚姻状况', 'common', '婚姻状态', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'nationality', '国籍', 'common', '国家/地区', 'active', NOW(), NOW()),
-- 通知相关
(uuid_generate_v4(), 'notification_type', '通知类型', 'notification', '消息通知类型', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'notification_status', '通知状态', 'notification', '通知阅读状态', 'active', NOW(), NOW()),
-- 审计相关
(uuid_generate_v4(), 'audit_action', '审计动作', 'audit', '审计操作类型', 'active', NOW(), NOW()),
(uuid_generate_v4(), 'audit_result', '审计结果', 'audit', '审计结果状态', 'active', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- 系统状态字典项
-- ========================================

-- 系统状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'system_status'), (SELECT id FROM erp.dict_types WHERE code = 'system_status'), 'running', '运行中', 'running', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'system_status'), (SELECT id FROM erp.dict_types WHERE code = 'system_status'), 'maintenance', '维护中', 'maintenance', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'system_status'), (SELECT id FROM erp.dict_types WHERE code = 'system_status'), 'stopped', '已停止', 'stopped', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'system_status'), (SELECT id FROM erp.dict_types WHERE code = 'system_status'), 'error', '异常', 'error', 4, 'active', NOW(), NOW());

-- 用户状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'user_status'), (SELECT id FROM erp.dict_types WHERE code = 'user_status'), 'active', '正常', 'active', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'user_status'), (SELECT id FROM erp.dict_types WHERE code = 'user_status'), 'locked', '已锁定', 'locked', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'user_status'), (SELECT id FROM erp.dict_types WHERE code = 'user_status'), 'disabled', '已禁用', 'disabled', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'user_status'), (SELECT id FROM erp.dict_types WHERE code = 'user_status'), 'pending', '待审核', 'pending', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'user_status'), (SELECT id FROM erp.dict_types WHERE code = 'user_status'), 'expired', '已过期', 'expired', 5, 'active', NOW(), NOW());

-- 用户角色
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'user_role'), (SELECT id FROM erp.dict_types WHERE code = 'user_role'), 'super_admin', '超级管理员', 'super_admin', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'user_role'), (SELECT id FROM erp.dict_types WHERE code = 'user_role'), 'tenant_admin', '租户管理员', 'tenant_admin', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'user_role'), (SELECT id FROM erp.dict_types WHERE code = 'user_role'), 'department_admin', '部门管理员', 'department_admin', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'user_role'), (SELECT id FROM erp.dict_types WHERE code = 'user_role'), 'manager', '主管', 'manager', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'user_role'), (SELECT id FROM erp.dict_types WHERE code = 'user_role'), 'user', '普通用户', 'user', 5, 'active', NOW(), NOW());

-- 权限级别
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'permission_level'), (SELECT id FROM erp.dict_types WHERE code = 'permission_level'), 'system', '系统级', 'system', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'permission_level'), (SELECT id FROM erp.dict_types WHERE code = 'permission_level'), 'tenant', '租户级', 'tenant', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'permission_level'), (SELECT id FROM erp.dict_types WHERE code = 'permission_level'), 'department', '部门级', 'department', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'permission_level'), (SELECT id FROM erp.dict_types WHERE code = 'permission_level'), 'user', '用户级', 'user', 4, 'active', NOW(), NOW());

-- ========================================
-- 审批状态字典项
-- ========================================

-- 审批状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'approval_status'), (SELECT id FROM erp.dict_types WHERE code = 'approval_status'), 'pending', '待审批', 'pending', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'approval_status'), (SELECT id FROM erp.dict_types WHERE code = 'approval_status'), 'approved', '已通过', 'approved', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'approval_status'), (SELECT id FROM erp.dict_types WHERE code = 'approval_status'), 'rejected', '已拒绝', 'rejected', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'approval_status'), (SELECT id FROM erp.dict_types WHERE code = 'approval_status'), 'in_progress', '审批中', 'in_progress', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'approval_status'), (SELECT id FROM erp.dict_types WHERE code = 'approval_status'), 'canceled', '已取消', 'canceled', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'approval_status'), (SELECT id FROM erp.dict_types WHERE code = 'approval_status'), 'draft', '草稿', 'draft', 6, 'active', NOW(), NOW());

-- 审批结果
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'approval_result'), (SELECT id FROM erp.dict_types WHERE code = 'approval_result'), 'pass', '通过', 'pass', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'approval_result'), (SELECT id FROM erp.dict_types WHERE code = 'approval_result'), 'reject', '拒绝', 'reject', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'approval_result'), (SELECT id FROM erp.dict_types WHERE code = 'approval_result'), 'delegate', '转办', 'delegate', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'approval_result'), (SELECT id FROM erp.dict_types WHERE code = 'approval_result'), 'hold', '搁置', 'hold', 4, 'active', NOW(), NOW());

-- 审批动作
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'approval_action'), (SELECT id FROM erp.dict_types WHERE code = 'approval_action'), 'approve', '批准', 'approve', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'approval_action'), (SELECT id FROM erp.dict_types WHERE code = 'approval_action'), 'reject', '拒绝', 'reject', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'approval_action'), (SELECT id FROM erp.dict_types WHERE code = 'approval_action'), 'delegate', '转办', 'delegate', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'approval_action'), (SELECT id FROM erp.dict_types WHERE code = 'approval_action'), 'withdraw', '撤回', 'withdraw', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'approval_action'), (SELECT id FROM erp.dict_types WHERE code = 'approval_action'), 'resubmit', '重新提交', 'resubmit', 5, 'active', NOW(), NOW());

-- ========================================
-- HRM 状态字典项
-- ========================================

-- 员工状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'employee_status'), (SELECT id FROM erp.dict_types WHERE code = 'employee_status'), 'active', '在职', 'active', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'employee_status'), (SELECT id FROM erp.dict_types WHERE code = 'employee_status'), 'probation', '试用期', 'probation', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'employee_status'), (SELECT id FROM erp.dict_types WHERE code = 'employee_status'), 'on_leave', '休假中', 'on_leave', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'employee_status'), (SELECT id FROM erp.dict_types WHERE code = 'employee_status'), 'resigned', '已离职', 'resigned', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'employee_status'), (SELECT id FROM erp.dict_types WHERE code = 'employee_status'), 'retired', '已退休', 'retired', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'employee_status'), (SELECT id FROM erp.dict_types WHERE code = 'employee_status'), 'dismissed', '已辞退', 'dismissed', 6, 'active', NOW(), NOW());

-- 员工类型
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'employee_type'), (SELECT id FROM erp.dict_types WHERE code = 'employee_type'), 'full_time', '正式员工', 'full_time', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'employee_type'), (SELECT id FROM erp.dict_types WHERE code = 'employee_type'), 'part_time', '兼职员工', 'part_time', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'employee_type'), (SELECT id FROM erp.dict_types WHERE code = 'employee_type'), 'intern', '实习生', 'intern', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'employee_type'), (SELECT id FROM erp.dict_types WHERE code = 'employee_type'), 'contract', '合同工', 'contract', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'employee_type'), (SELECT id FROM erp.dict_types WHERE code = 'employee_type'), 'temporary', '临时工', 'temporary', 5, 'active', NOW(), NOW());

-- 考勤状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'attendance_status'), (SELECT id FROM erp.dict_types WHERE code = 'attendance_status'), 'normal', '正常', 'normal', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'attendance_status'), (SELECT id FROM erp.dict_types WHERE code = 'attendance_status'), 'late', '迟到', 'late', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'attendance_status'), (SELECT id FROM erp.dict_types WHERE code = 'attendance_status'), 'early_leave', '早退', 'early_leave', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'attendance_status'), (SELECT id FROM erp.dict_types WHERE code = 'attendance_status'), 'absent', '旷工', 'absent', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'attendance_status'), (SELECT id FROM erp.dict_types WHERE code = 'attendance_status'), 'on_leave', '休假', 'on_leave', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'attendance_status'), (SELECT id FROM erp.dict_types WHERE code = 'attendance_status'), 'business_trip', '出差', 'business_trip', 6, 'active', NOW(), NOW());

-- 休假类型
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'leave_type'), (SELECT id FROM erp.dict_types WHERE code = 'leave_type'), 'annual', '年假', 'annual', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'leave_type'), (SELECT id FROM erp.dict_types WHERE code = 'leave_type'), 'sick', '病假', 'sick', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'leave_type'), (SELECT id FROM erp.dict_types WHERE code = 'leave_type'), 'maternity', '产假', 'maternity', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'leave_type'), (SELECT id FROM erp.dict_types WHERE code = 'leave_type'), 'paternity', '陪产假', 'paternity', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'leave_type'), (SELECT id FROM erp.dict_types WHERE code = 'leave_type'), 'funeral', '丧假', 'funeral', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'leave_type'), (SELECT id FROM erp.dict_types WHERE code = 'leave_type'), 'personal', '事假', 'personal', 6, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'leave_type'), (SELECT id FROM erp.dict_types WHERE code = 'leave_type'), 'marriage', '婚假', 'marriage', 7, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'leave_type'), (SELECT id FROM erp.dict_types WHERE code = 'leave_type'), 'study', '学习假', 'study', 8, 'active', NOW(), NOW());

-- 合同状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'contract_status'), (SELECT id FROM erp.dict_types WHERE code = 'contract_status'), 'draft', '草稿', 'draft', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'contract_status'), (SELECT id FROM erp.dict_types WHERE code = 'contract_status'), 'pending', '待审批', 'pending', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'contract_status'), (SELECT id FROM erp.dict_types WHERE code = 'contract_status'), 'active', '生效中', 'active', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'contract_status'), (SELECT id FROM erp.dict_types WHERE code = 'contract_status'), 'expired', '已到期', 'expired', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'contract_status'), (SELECT id FROM erp.dict_types WHERE code = 'contract_status'), 'terminated', '已终止', 'terminated', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'contract_status'), (SELECT id FROM erp.dict_types WHERE code = 'contract_status'), 'renewed', '已续签', 'renewed', 6, 'active', NOW(), NOW());

-- ========================================
-- CRM 状态字典项
-- ========================================

-- 客户级别
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'customer_level'), (SELECT id FROM erp.dict_types WHERE code = 'customer_level'), 'vip', 'VIP客户', 'vip', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'customer_level'), (SELECT id FROM erp.dict_types WHERE code = 'customer_level'), 'important', '重要客户', 'important', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'customer_level'), (SELECT id FROM erp.dict_types WHERE code = 'customer_level'), 'normal', '普通客户', 'normal', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'customer_level'), (SELECT id FROM erp.dict_types WHERE code = 'customer_level'), 'potential', '潜在客户', 'potential', 4, 'active', NOW(), NOW());

-- 客户状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'customer_status'), (SELECT id FROM erp.dict_types WHERE code = 'customer_status'), 'active', '合作中', 'active', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'customer_status'), (SELECT id FROM erp.dict_types WHERE code = 'customer_status'), 'inactive', '暂停合作', 'inactive', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'customer_status'), (SELECT id FROM erp.dict_types WHERE code = 'customer_status'), 'lost', '已流失', 'lost', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'customer_status'), (SELECT id FROM erp.dict_types WHERE code = 'customer_status'), 'pending', '待开发', 'pending', 4, 'active', NOW(), NOW());

-- 线索状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'lead_status'), (SELECT id FROM erp.dict_types WHERE code = 'lead_status'), 'new', '新线索', 'new', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'lead_status'), (SELECT id FROM erp.dict_types WHERE code = 'lead_status'), 'contacted', '已联系', 'contacted', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'lead_status'), (SELECT id FROM erp.dict_types WHERE code = 'lead_status'), 'qualified', '已确认', 'qualified', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'lead_status'), (SELECT id FROM erp.dict_types WHERE code = 'lead_status'), 'converted', '已转化', 'converted', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'lead_status'), (SELECT id FROM erp.dict_types WHERE code = 'lead_status'), 'rejected', '已拒绝', 'rejected', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'lead_status'), (SELECT id FROM erp.dict_types WHERE code = 'lead_status'), 'archived', '已归档', 'archived', 6, 'active', NOW(), NOW());

-- 商机阶段
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'opportunity_stage'), (SELECT id FROM erp.dict_types WHERE code = 'opportunity_stage'), 'discovery', '发现商机', 'discovery', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'opportunity_stage'), (SELECT id FROM erp.dict_types WHERE code = 'opportunity_stage'), 'qualification', '需求确认', 'qualification', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'opportunity_stage'), (SELECT id FROM erp.dict_types WHERE code = 'opportunity_stage'), 'proposal', '方案报价', 'proposal', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'opportunity_stage'), (SELECT id FROM erp.dict_types WHERE code = 'opportunity_stage'), 'negotiation', '商务谈判', 'negotiation', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'opportunity_stage'), (SELECT id FROM erp.dict_types WHERE code = 'opportunity_stage'), 'closed_won', '成功成交', 'closed_won', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'opportunity_stage'), (SELECT id FROM erp.dict_types WHERE code = 'opportunity_stage'), 'closed_lost', '失败流失', 'closed_lost', 6, 'active', NOW(), NOW());

-- 交易状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'deal_status'), (SELECT id FROM erp.dict_types WHERE code = 'deal_status'), 'pending', '待确认', 'pending', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'deal_status'), (SELECT id FROM erp.dict_types WHERE code = 'deal_status'), 'confirmed', '已确认', 'confirmed', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'deal_status'), (SELECT id FROM erp.dict_types WHERE code = 'deal_status'), 'paid', '已付款', 'paid', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'deal_status'), (SELECT id FROM erp.dict_types WHERE code = 'deal_status'), 'shipped', '已发货', 'shipped', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'deal_status'), (SELECT id FROM erp.dict_types WHERE code = 'deal_status'), 'completed', '已完成', 'completed', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'deal_status'), (SELECT id FROM erp.dict_types WHERE code = 'deal_status'), 'cancelled', '已取消', 'cancelled', 6, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'deal_status'), (SELECT id FROM erp.dict_types WHERE code = 'deal_status'), 'refunded', '已退款', 'refunded', 7, 'active', NOW(), NOW());

-- ========================================
-- ERP 状态字典项
-- ========================================

-- 供应商状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'supplier_status'), (SELECT id FROM erp.dict_types WHERE code = 'supplier_status'), 'active', '合作中', 'active', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'supplier_status'), (SELECT id FROM erp.dict_types WHERE code = 'supplier_status'), 'pending', '待审核', 'pending', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'supplier_status'), (SELECT id FROM erp.dict_types WHERE code = 'supplier_status'), 'inactive', '暂停合作', 'inactive', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'supplier_status'), (SELECT id FROM erp.dict_types WHERE code = 'supplier_status'), 'terminated', '已终止', 'terminated', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'supplier_status'), (SELECT id FROM erp.dict_types WHERE code = 'supplier_status'), 'blacklisted', '已拉黑', 'blacklisted', 5, 'active', NOW(), NOW());

-- 供应商级别
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'supplier_level'), (SELECT id FROM erp.dict_types WHERE code = 'supplier_level'), 'strategic', '战略供应商', 'strategic', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'supplier_level'), (SELECT id FROM erp.dict_types WHERE code = 'supplier_level'), 'key', '核心供应商', 'key', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'supplier_level'), (SELECT id FROM erp.dict_types WHERE code = 'supplier_level'), 'qualified', '合格供应商', 'qualified', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'supplier_level'), (SELECT id FROM erp.dict_types WHERE code = 'supplier_level'), 'trial', '试用供应商', 'trial', 4, 'active', NOW(), NOW());

-- 采购订单状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'purchase_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'purchase_order_status'), 'draft', '草稿', 'draft', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'purchase_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'purchase_order_status'), 'pending_approval', '待审批', 'pending_approval', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'purchase_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'purchase_order_status'), 'approved', '已审批', 'approved', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'purchase_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'purchase_order_status'), 'ordered', '已下单', 'ordered', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'purchase_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'purchase_order_status'), 'partial_received', '部分收货', 'partial_received', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'purchase_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'purchase_order_status'), 'completed', '已完成', 'completed', 6, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'purchase_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'purchase_order_status'), 'cancelled', '已取消', 'cancelled', 7, 'active', NOW(), NOW());

-- 销售订单状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'sales_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'sales_order_status'), 'draft', '草稿', 'draft', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'sales_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'sales_order_status'), 'confirmed', '已确认', 'confirmed', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'sales_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'sales_order_status'), 'partial_shipped', '部分发货', 'partial_shipped', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'sales_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'sales_order_status'), 'shipped', '已发货', 'shipped', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'sales_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'sales_order_status'), 'completed', '已完成', 'completed', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'sales_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'sales_order_status'), 'cancelled', '已取消', 'cancelled', 6, 'active', NOW(), NOW());

-- 库存状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'inventory_status'), (SELECT id FROM erp.dict_types WHERE code = 'inventory_status'), 'in_stock', '在库', 'in_stock', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'inventory_status'), (SELECT id FROM erp.dict_types WHERE code = 'inventory_status'), 'reserved', '已预留', 'reserved', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'inventory_status'), (SELECT id FROM erp.dict_types WHERE code = 'inventory_status'), 'locked', '已锁定', 'locked', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'inventory_status'), (SELECT id FROM erp.dict_types WHERE code = 'inventory_status'), 'damaged', '已损坏', 'damaged', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'inventory_status'), (SELECT id FROM erp.dict_types WHERE code = 'inventory_status'), 'scrapped', '已报废', 'scrapped', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'inventory_status'), (SELECT id FROM erp.dict_types WHERE code = 'inventory_status'), 'out_of_stock', '缺货', 'out_of_stock', 6, 'active', NOW(), NOW());

-- 资产状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'asset_status'), (SELECT id FROM erp.dict_types WHERE code = 'asset_status'), 'in_use', '使用中', 'in_use', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'asset_status'), (SELECT id FROM erp.dict_types WHERE code = 'asset_status'), 'idle', '闲置', 'idle', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'asset_status'), (SELECT id FROM erp.dict_types WHERE code = 'asset_status'), 'maintenance', '维修中', 'maintenance', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'asset_status'), (SELECT id FROM erp.dict_types WHERE code = 'asset_status'), 'scrapped', '已报废', 'scrapped', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'asset_status'), (SELECT id FROM erp.dict_types WHERE code = 'asset_status'), 'disposed', '已处置', 'disposed', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'asset_status'), (SELECT id FROM erp.dict_types WHERE code = 'asset_status'), 'pending', '待入库', 'pending', 6, 'active', NOW(), NOW());

-- 凭证状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'voucher_status'), (SELECT id FROM erp.dict_types WHERE code = 'voucher_status'), 'draft', '草稿', 'draft', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'voucher_status'), (SELECT id FROM erp.dict_types WHERE code = 'voucher_status'), 'pending_approval', '待审核', 'pending_approval', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'voucher_status'), (SELECT id FROM erp.dict_types WHERE code = 'voucher_status'), 'approved', '已审核', 'approved', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'voucher_status'), (SELECT id FROM erp.dict_types WHERE code = 'voucher_status'), 'posted', '已记账', 'posted', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'voucher_status'), (SELECT id FROM erp.dict_types WHERE code = 'voucher_status'), 'cancelled', '已作废', 'cancelled', 5, 'active', NOW(), NOW());

-- 费用类型
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'expense_type'), (SELECT id FROM erp.dict_types WHERE code = 'expense_type'), 'travel', '差旅费', 'travel', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'expense_type'), (SELECT id FROM erp.dict_types WHERE code = 'expense_type'), 'entertainment', '招待费', 'entertainment', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'expense_type'), (SELECT id FROM erp.dict_types WHERE code = 'expense_type'), 'office', '办公费', 'office', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'expense_type'), (SELECT id FROM erp.dict_types WHERE code = 'expense_type'), 'transport', '交通费', 'transport', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'expense_type'), (SELECT id FROM erp.dict_types WHERE code = 'expense_type'), 'communication', '通讯费', 'communication', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'expense_type'), (SELECT id FROM erp.dict_types WHERE code = 'expense_type'), 'training', '培训费', 'training', 6, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'expense_type'), (SELECT id FROM erp.dict_types WHERE code = 'expense_type'), 'equipment', '设备费', 'equipment', 7, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'expense_type'), (SELECT id FROM erp.dict_types WHERE code = 'expense_type'), 'other', '其他费用', 'other', 8, 'active', NOW(), NOW());

-- 预算状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'budget_status'), (SELECT id FROM erp.dict_types WHERE code = 'budget_status'), 'draft', '编制中', 'draft', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'budget_status'), (SELECT id FROM erp.dict_types WHERE code = 'budget_status'), 'approved', '已批准', 'approved', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'budget_status'), (SELECT id FROM erp.dict_types WHERE code = 'budget_status'), 'active', '执行中', 'active', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'budget_status'), (SELECT id FROM erp.dict_types WHERE code = 'budget_status'), 'completed', '已完成', 'completed', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'budget_status'), (SELECT id FROM erp.dict_types WHERE code = 'budget_status'), 'adjusted', '已调整', 'adjusted', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'budget_status'), (SELECT id FROM erp.dict_types WHERE code = 'budget_status'), 'cancelled', '已取消', 'cancelled', 6, 'active', NOW(), NOW());

-- ========================================
-- WMS 状态字典项
-- ========================================

-- 仓库类型
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'warehouse_type'), (SELECT id FROM erp.dict_types WHERE code = 'warehouse_type'), 'main', '主仓库', 'main', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'warehouse_type'), (SELECT id FROM erp.dict_types WHERE code = 'warehouse_type'), 'regional', '区域仓', 'regional', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'warehouse_type'), (SELECT id FROM erp.dict_types WHERE code = 'warehouse_type'), 'transit', '中转仓', 'transit', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'warehouse_type'), (SELECT id FROM erp.dict_types WHERE code = 'warehouse_type'), 'cold_storage', '冷库', 'cold_storage', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'warehouse_type'), (SELECT id FROM erp.dict_types WHERE code = 'warehouse_type'), 'special', '特殊仓', 'special', 5, 'active', NOW(), NOW());

-- 库存变动类型
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'stock_movement_type'), (SELECT id FROM erp.dict_types WHERE code = 'stock_movement_type'), 'receipt', '入库', 'receipt', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'stock_movement_type'), (SELECT id FROM erp.dict_types WHERE code = 'stock_movement_type'), 'issue', '出库', 'issue', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'stock_movement_type'), (SELECT id FROM erp.dict_types WHERE code = 'stock_movement_type'), 'transfer', '调拨', 'transfer', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'stock_movement_type'), (SELECT id FROM erp.dict_types WHERE code = 'stock_movement_type'), 'count', '盘点', 'count', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'stock_movement_type'), (SELECT id FROM erp.dict_types WHERE code = 'stock_movement_type'), 'adjustment', '调整', 'adjustment', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'stock_movement_type'), (SELECT id FROM erp.dict_types WHERE code = 'stock_movement_type'), 'return', '退货', 'return', 6, 'active', NOW(), NOW());

-- 调拨状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'transfer_status'), (SELECT id FROM erp.dict_types WHERE code = 'transfer_status'), 'pending', '待调拨', 'pending', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'transfer_status'), (SELECT id FROM erp.dict_types WHERE code = 'transfer_status'), 'in_transit', '在途', 'in_transit', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'transfer_status'), (SELECT id FROM erp.dict_types WHERE code = 'transfer_status'), 'arrived', '已到达', 'arrived', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'transfer_status'), (SELECT id FROM erp.dict_types WHERE code = 'transfer_status'), 'completed', '已完成', 'completed', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'transfer_status'), (SELECT id FROM erp.dict_types WHERE code = 'transfer_status'), 'cancelled', '已取消', 'cancelled', 5, 'active', NOW(), NOW());

-- ========================================
-- MES 状态字典项
-- ========================================

-- 生产订单状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'production_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'production_order_status'), 'draft', '草稿', 'draft', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'production_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'production_order_status'), 'released', '已下达', 'released', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'production_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'production_order_status'), 'in_progress', '生产中', 'in_progress', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'production_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'production_order_status'), 'completed', '已完成', 'completed', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'production_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'production_order_status'), 'cancelled', '已取消', 'cancelled', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'production_order_status'), (SELECT id FROM erp.dict_types WHERE code = 'production_order_status'), 'paused', '已暂停', 'paused', 6, 'active', NOW(), NOW());

-- 车间状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'workshop_status'), (SELECT id FROM erp.dict_types WHERE code = 'workshop_status'), 'running', '运行中', 'running', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'workshop_status'), (SELECT id FROM erp.dict_types WHERE code = 'workshop_status'), 'idle', '空闲', 'idle', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'workshop_status'), (SELECT id FROM erp.dict_types WHERE code = 'workshop_status'), 'maintenance', '维护中', 'maintenance', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'workshop_status'), (SELECT id FROM erp.dict_types WHERE code = 'workshop_status'), 'closed', '已关闭', 'closed', 4, 'active', NOW(), NOW());

-- 设备状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'equipment_status'), (SELECT id FROM erp.dict_types WHERE code = 'equipment_status'), 'running', '运行中', 'running', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'equipment_status'), (SELECT id FROM erp.dict_types WHERE code = 'equipment_status'), 'idle', '空闲', 'idle', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'equipment_status'), (SELECT id FROM erp.dict_types WHERE code = 'equipment_status'), 'maintenance', '维护中', 'maintenance', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'equipment_status'), (SELECT id FROM erp.dict_types WHERE code = 'equipment_status'), 'repair', '维修中', 'repair', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'equipment_status'), (SELECT id FROM erp.dict_types WHERE code = 'equipment_status'), 'scrapped', '已报废', 'scrapped', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'equipment_status'), (SELECT id FROM erp.dict_types WHERE code = 'equipment_status'), 'offline', '离线', 'offline', 6, 'active', NOW(), NOW());

-- 质检状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'quality_inspection_status'), (SELECT id FROM erp.dict_types WHERE code = 'quality_inspection_status'), 'pending', '待检验', 'pending', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'quality_inspection_status'), (SELECT id FROM erp.dict_types WHERE code = 'quality_inspection_status'), 'in_progress', '检验中', 'in_progress', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'quality_inspection_status'), (SELECT id FROM erp.dict_types WHERE code = 'quality_inspection_status'), 'passed', '合格', 'passed', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'quality_inspection_status'), (SELECT id FROM erp.dict_types WHERE code = 'quality_inspection_status'), 'failed', '不合格', 'failed', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'quality_inspection_status'), (SELECT id FROM erp.dict_types WHERE code = 'quality_inspection_status'), 're_inspect', '待复检', 're_inspect', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'quality_inspection_status'), (SELECT id FROM erp.dict_types WHERE code = 'quality_inspection_status'), 'closed', '已关闭', 'closed', 6, 'active', NOW(), NOW());

-- ========================================
-- 通用状态字典项
-- ========================================

-- 启用禁用
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'enabled_disabled'), (SELECT id FROM erp.dict_types WHERE code = 'enabled_disabled'), 'enabled', '启用', 'enabled', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'enabled_disabled'), (SELECT id FROM erp.dict_types WHERE code = 'enabled_disabled'), 'disabled', '禁用', 'disabled', 2, 'active', NOW(), NOW());

-- 是否
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'yes_no'), (SELECT id FROM erp.dict_types WHERE code = 'yes_no'), 'yes', '是', 'yes', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'yes_no'), (SELECT id FROM erp.dict_types WHERE code = 'yes_no'), 'no', '否', 'no', 2, 'active', NOW(), NOW());

-- 优先级
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'priority'), (SELECT id FROM erp.dict_types WHERE code = 'priority'), 'critical', '紧急', 'critical', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'priority'), (SELECT id FROM erp.dict_types WHERE code = 'priority'), 'high', '高', 'high', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'priority'), (SELECT id FROM erp.dict_types WHERE code = 'priority'), 'medium', '中', 'medium', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'priority'), (SELECT id FROM erp.dict_types WHERE code = 'priority'), 'low', '低', 'low', 4, 'active', NOW(), NOW());

-- 性别
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'gender'), (SELECT id FROM erp.dict_types WHERE code = 'gender'), 'male', '男', 'male', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'gender'), (SELECT id FROM erp.dict_types WHERE code = 'gender'), 'female', '女', 'female', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'gender'), (SELECT id FROM erp.dict_types WHERE code = 'gender'), 'other', '其他', 'other', 3, 'active', NOW(), NOW());

-- 学历
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'education'), (SELECT id FROM erp.dict_types WHERE code = 'education'), 'primary', '小学', 'primary', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'education'), (SELECT id FROM erp.dict_types WHERE code = 'education'), 'junior', '初中', 'junior', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'education'), (SELECT id FROM erp.dict_types WHERE code = 'education'), 'senior', '高中', 'senior', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'education'), (SELECT id FROM erp.dict_types WHERE code = 'education'), 'college', '大专', 'college', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'education'), (SELECT id FROM erp.dict_types WHERE code = 'education'), 'bachelor', '本科', 'bachelor', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'education'), (SELECT id FROM erp.dict_types WHERE code = 'education'), 'master', '硕士', 'master', 6, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'education'), (SELECT id FROM erp.dict_types WHERE code = 'education'), 'phd', '博士', 'phd', 7, 'active', NOW(), NOW());

-- 婚姻状况
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'marital_status'), (SELECT id FROM erp.dict_types WHERE code = 'marital_status'), 'single', '未婚', 'single', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'marital_status'), (SELECT id FROM erp.dict_types WHERE code = 'marital_status'), 'married', '已婚', 'married', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'marital_status'), (SELECT id FROM erp.dict_types WHERE code = 'marital_status'), 'divorced', '离婚', 'divorced', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'marital_status'), (SELECT id FROM erp.dict_types WHERE code = 'marital_status'), 'widowed', '丧偶', 'widowed', 4, 'active', NOW(), NOW());

-- ========================================
-- 通知相关字典项
-- ========================================

-- 通知类型
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'notification_type'), (SELECT id FROM erp.dict_types WHERE code = 'notification_type'), 'system', '系统通知', 'system', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'notification_type'), (SELECT id FROM erp.dict_types WHERE code = 'notification_type'), 'approval', '审批通知', 'approval', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'notification_type'), (SELECT id FROM erp.dict_types WHERE code = 'notification_type'), 'task', '任务通知', 'task', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'notification_type'), (SELECT id FROM erp.dict_types WHERE code = 'notification_type'), 'message', '消息通知', 'message', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'notification_type'), (SELECT id FROM erp.dict_types WHERE code = 'notification_type'), 'alert', '告警通知', 'alert', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'notification_type'), (SELECT id FROM erp.dict_types WHERE code = 'notification_type'), 'news', '新闻通知', 'news', 6, 'active', NOW(), NOW());

-- 通知状态
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'notification_status'), (SELECT id FROM erp.dict_types WHERE code = 'notification_status'), 'unread', '未读', 'unread', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'notification_status'), (SELECT id FROM erp.dict_types WHERE code = 'notification_status'), 'read', '已读', 'read', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'notification_status'), (SELECT id FROM erp.dict_types WHERE code = 'notification_status'), 'archived', '已归档', 'archived', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'notification_status'), (SELECT id FROM erp.dict_types WHERE code = 'notification_status'), 'deleted', '已删除', 'deleted', 4, 'active', NOW(), NOW());

-- ========================================
-- 审计相关字典项
-- ========================================

-- 审计动作
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'audit_action'), (SELECT id FROM erp.dict_types WHERE code = 'audit_action'), 'create', '创建', 'create', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'audit_action'), (SELECT id FROM erp.dict_types WHERE code = 'audit_action'), 'update', '更新', 'update', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'audit_action'), (SELECT id FROM erp.dict_types WHERE code = 'audit_action'), 'delete', '删除', 'delete', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'audit_action'), (SELECT id FROM erp.dict_types WHERE code = 'audit_action'), 'query', '查询', 'query', 4, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'audit_action'), (SELECT id FROM erp.dict_types WHERE code = 'audit_action'), 'login', '登录', 'login', 5, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'audit_action'), (SELECT id FROM erp.dict_types WHERE code = 'audit_action'), 'logout', '登出', 'logout', 6, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'audit_action'), (SELECT id FROM erp.dict_types WHERE code = 'audit_action'), 'export', '导出', 'export', 7, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'audit_action'), (SELECT id FROM erp.dict_types WHERE code = 'audit_action'), 'import', '导入', 'import', 8, 'active', NOW(), NOW());

-- 审计结果
INSERT INTO erp.dict_items (id, dict_type_id, code, name, value, sort_order, status, created_at, updated_at) VALUES
((SELECT id FROM erp.dict_types WHERE code = 'audit_result'), (SELECT id FROM erp.dict_types WHERE code = 'audit_result'), 'success', '成功', 'success', 1, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'audit_result'), (SELECT id FROM erp.dict_types WHERE code = 'audit_result'), 'failure', '失败', 'failure', 2, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'audit_result'), (SELECT id FROM erp.dict_types WHERE code = 'audit_result'), 'warning', '警告', 'warning', 3, 'active', NOW(), NOW()),
((SELECT id FROM erp.dict_types WHERE code = 'audit_result'), (SELECT id FROM erp.dict_types WHERE code = 'audit_result'), 'denied', '拒绝', 'denied', 4, 'active', NOW(), NOW());