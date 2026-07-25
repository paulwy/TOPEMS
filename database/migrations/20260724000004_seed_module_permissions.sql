-- =============================================
-- Module Roles
-- =============================================

INSERT INTO core_roles (id, name, description, tenant_id)
SELECT gen_random_uuid(), 'finance_manager', '财务管理角色', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM core_roles WHERE name = 'finance_manager');

INSERT INTO core_roles (id, name, description, tenant_id)
SELECT gen_random_uuid(), 'mes_manager', '生产执行管理角色', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM core_roles WHERE name = 'mes_manager');

INSERT INTO core_roles (id, name, description, tenant_id)
SELECT gen_random_uuid(), 'hrm_manager', '人力资源管理角色', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM core_roles WHERE name = 'hrm_manager');

INSERT INTO core_roles (id, name, description, tenant_id)
SELECT gen_random_uuid(), 'pdm_manager', '产品数据管理角色', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM core_roles WHERE name = 'pdm_manager');

INSERT INTO core_roles (id, name, description, tenant_id)
SELECT gen_random_uuid(), 'wms_manager', '仓储管理角色', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM core_roles WHERE name = 'wms_manager');

INSERT INTO core_roles (id, name, description, tenant_id)
SELECT gen_random_uuid(), 'ehs_manager', '安全环保管理角色', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM core_roles WHERE name = 'ehs_manager');

INSERT INTO core_roles (id, name, description, tenant_id)
SELECT gen_random_uuid(), 'lims_manager', '实验室管理角色', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM core_roles WHERE name = 'lims_manager');

INSERT INTO core_roles (id, name, description, tenant_id)
SELECT gen_random_uuid(), 'crm_manager', '客户关系管理角色', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM core_roles WHERE name = 'crm_manager');

INSERT INTO core_roles (id, name, description, tenant_id)
SELECT gen_random_uuid(), 'qms_manager', '质量管理角色', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM core_roles WHERE name = 'qms_manager');

INSERT INTO core_roles (id, name, description, tenant_id)
SELECT gen_random_uuid(), 'scm_manager', '供应链管理角色', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM core_roles WHERE name = 'scm_manager');

INSERT INTO core_roles (id, name, description, tenant_id)
SELECT gen_random_uuid(), 'srm_manager', '供应商关系管理角色', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM core_roles WHERE name = 'srm_manager');

INSERT INTO core_roles (id, name, description, tenant_id)
SELECT gen_random_uuid(), 'report_manager', '报表中心管理角色', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM core_roles WHERE name = 'report_manager');

INSERT INTO core_roles (id, name, description, tenant_id)
SELECT gen_random_uuid(), 'pm_manager', '项目管理角色', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM core_roles WHERE name = 'pm_manager');


-- =============================================
-- Permissions: Finance
-- =============================================

INSERT INTO core_permissions (id, code, name, resource, action) VALUES
(gen_random_uuid(), 'finance:read', '财务模块访问', 'finance', 'read'),
(gen_random_uuid(), 'finance:dashboard:read', '财务仪表盘', 'finance_dashboard', 'read'),
(gen_random_uuid(), 'finance:voucher:read', '凭证读取', 'finance_voucher', 'read'),
(gen_random_uuid(), 'finance:voucher:create', '凭证创建', 'finance_voucher', 'create'),
(gen_random_uuid(), 'finance:voucher:update', '凭证更新', 'finance_voucher', 'update'),
(gen_random_uuid(), 'finance:voucher:delete', '凭证删除', 'finance_voucher', 'delete'),
(gen_random_uuid(), 'finance:ledger:read', '总账读取', 'finance_ledger', 'read'),
(gen_random_uuid(), 'finance:ledger:create', '总账创建', 'finance_ledger', 'create'),
(gen_random_uuid(), 'finance:ledger:update', '总账更新', 'finance_ledger', 'update'),
(gen_random_uuid(), 'finance:ledger:delete', '总账删除', 'finance_ledger', 'delete'),
(gen_random_uuid(), 'finance:receivable:read', '应收应付读取', 'finance_receivable', 'read'),
(gen_random_uuid(), 'finance:receivable:create', '应收应付创建', 'finance_receivable', 'create'),
(gen_random_uuid(), 'finance:receivable:update', '应收应付更新', 'finance_receivable', 'update'),
(gen_random_uuid(), 'finance:receivable:delete', '应收应付删除', 'finance_receivable', 'delete'),
(gen_random_uuid(), 'finance:receipt:read', '收款读取', 'finance_receipt', 'read'),
(gen_random_uuid(), 'finance:receipt:create', '收款创建', 'finance_receipt', 'create'),
(gen_random_uuid(), 'finance:receipt:update', '收款更新', 'finance_receipt', 'update'),
(gen_random_uuid(), 'finance:receipt:delete', '收款删除', 'finance_receipt', 'delete'),
(gen_random_uuid(), 'finance:payment:read', '付款读取', 'finance_payment', 'read'),
(gen_random_uuid(), 'finance:payment:create', '付款创建', 'finance_payment', 'create'),
(gen_random_uuid(), 'finance:payment:update', '付款更新', 'finance_payment', 'update'),
(gen_random_uuid(), 'finance:payment:delete', '付款删除', 'finance_payment', 'delete'),
(gen_random_uuid(), 'finance:approval_config:read', '审批配置读取', 'finance_approval_config', 'read'),
(gen_random_uuid(), 'finance:approval_config:create', '审批配置创建', 'finance_approval_config', 'create'),
(gen_random_uuid(), 'finance:approval_config:update', '审批配置更新', 'finance_approval_config', 'update'),
(gen_random_uuid(), 'finance:approval_config:delete', '审批配置删除', 'finance_approval_config', 'delete'),
(gen_random_uuid(), 'finance:invoice:read', '发票读取', 'finance_invoice', 'read'),
(gen_random_uuid(), 'finance:invoice:create', '发票创建', 'finance_invoice', 'create'),
(gen_random_uuid(), 'finance:invoice:update', '发票更新', 'finance_invoice', 'update'),
(gen_random_uuid(), 'finance:invoice:delete', '发票删除', 'finance_invoice', 'delete'),
(gen_random_uuid(), 'finance:tax:read', '税务读取', 'finance_tax', 'read'),
(gen_random_uuid(), 'finance:tax:create', '税务创建', 'finance_tax', 'create'),
(gen_random_uuid(), 'finance:tax:update', '税务更新', 'finance_tax', 'update'),
(gen_random_uuid(), 'finance:tax:delete', '税务删除', 'finance_tax', 'delete'),
(gen_random_uuid(), 'finance:expense:read', '费用读取', 'finance_expense', 'read'),
(gen_random_uuid(), 'finance:expense:create', '费用创建', 'finance_expense', 'create'),
(gen_random_uuid(), 'finance:expense:update', '费用更新', 'finance_expense', 'update'),
(gen_random_uuid(), 'finance:expense:delete', '费用删除', 'finance_expense', 'delete'),
(gen_random_uuid(), 'finance:expense_approval:read', '费用审批读取', 'finance_expense_approval', 'read'),
(gen_random_uuid(), 'finance:expense_approval:create', '费用审批创建', 'finance_expense_approval', 'create'),
(gen_random_uuid(), 'finance:expense_approval:update', '费用审批更新', 'finance_expense_approval', 'update'),
(gen_random_uuid(), 'finance:expense_approval:delete', '费用审批删除', 'finance_expense_approval', 'delete'),
(gen_random_uuid(), 'finance:cost:read', '成本读取', 'finance_cost', 'read'),
(gen_random_uuid(), 'finance:cost:create', '成本创建', 'finance_cost', 'create'),
(gen_random_uuid(), 'finance:cost:update', '成本更新', 'finance_cost', 'update'),
(gen_random_uuid(), 'finance:cost:delete', '成本删除', 'finance_cost', 'delete'),
(gen_random_uuid(), 'finance:asset:read', '资产读取', 'finance_asset', 'read'),
(gen_random_uuid(), 'finance:asset:create', '资产创建', 'finance_asset', 'create'),
(gen_random_uuid(), 'finance:asset:update', '资产更新', 'finance_asset', 'update'),
(gen_random_uuid(), 'finance:asset:delete', '资产删除', 'finance_asset', 'delete'),
(gen_random_uuid(), 'finance:budget:read', '预算读取', 'finance_budget', 'read'),
(gen_random_uuid(), 'finance:budget:create', '预算创建', 'finance_budget', 'create'),
(gen_random_uuid(), 'finance:budget:update', '预算更新', 'finance_budget', 'update'),
(gen_random_uuid(), 'finance:budget:delete', '预算删除', 'finance_budget', 'delete'),
(gen_random_uuid(), 'finance:opening_balance:read', '期初余额读取', 'finance_opening_balance', 'read'),
(gen_random_uuid(), 'finance:opening_balance:create', '期初余额创建', 'finance_opening_balance', 'create'),
(gen_random_uuid(), 'finance:opening_balance:update', '期初余额更新', 'finance_opening_balance', 'update'),
(gen_random_uuid(), 'finance:opening_balance:delete', '期初余额删除', 'finance_opening_balance', 'delete'),
(gen_random_uuid(), 'finance:consolidation:read', '合并报表读取', 'finance_consolidation', 'read'),
(gen_random_uuid(), 'finance:consolidation:create', '合并报表创建', 'finance_consolidation', 'create'),
(gen_random_uuid(), 'finance:consolidation:update', '合并报表更新', 'finance_consolidation', 'update'),
(gen_random_uuid(), 'finance:consolidation:delete', '合并报表删除', 'finance_consolidation', 'delete'),
(gen_random_uuid(), 'finance:report:read', '财务报表读取', 'finance_report', 'read'),
(gen_random_uuid(), 'finance:report:create', '财务报表创建', 'finance_report', 'create'),
(gen_random_uuid(), 'finance:report:update', '财务报表更新', 'finance_report', 'update'),
(gen_random_uuid(), 'finance:report:delete', '财务报表删除', 'finance_report', 'delete')
ON CONFLICT (code) DO NOTHING;


-- =============================================
-- Permissions: MES
-- =============================================

INSERT INTO core_permissions (id, code, name, resource, action) VALUES
(gen_random_uuid(), 'mes:read', '生产执行模块访问', 'mes', 'read'),
(gen_random_uuid(), 'mes:dashboard:read', 'MES仪表盘', 'mes_dashboard', 'read'),
(gen_random_uuid(), 'mes:production_order:read', '生产订单读取', 'mes_production_order', 'read'),
(gen_random_uuid(), 'mes:production_order:create', '生产订单创建', 'mes_production_order', 'create'),
(gen_random_uuid(), 'mes:production_order:update', '生产订单更新', 'mes_production_order', 'update'),
(gen_random_uuid(), 'mes:production_order:delete', '生产订单删除', 'mes_production_order', 'delete'),
(gen_random_uuid(), 'mes:work_order:read', '工单读取', 'mes_work_order', 'read'),
(gen_random_uuid(), 'mes:work_order:create', '工单创建', 'mes_work_order', 'create'),
(gen_random_uuid(), 'mes:work_order:update', '工单更新', 'mes_work_order', 'update'),
(gen_random_uuid(), 'mes:work_order:delete', '工单删除', 'mes_work_order', 'delete'),
(gen_random_uuid(), 'mes:equipment:read', '设备读取', 'mes_equipment', 'read'),
(gen_random_uuid(), 'mes:equipment:create', '设备创建', 'mes_equipment', 'create'),
(gen_random_uuid(), 'mes:equipment:update', '设备更新', 'mes_equipment', 'update'),
(gen_random_uuid(), 'mes:equipment:delete', '设备删除', 'mes_equipment', 'delete'),
(gen_random_uuid(), 'mes:work_station:read', '工位读取', 'mes_work_station', 'read'),
(gen_random_uuid(), 'mes:work_station:create', '工位创建', 'mes_work_station', 'create'),
(gen_random_uuid(), 'mes:work_station:update', '工位更新', 'mes_work_station', 'update'),
(gen_random_uuid(), 'mes:work_station:delete', '工位删除', 'mes_work_station', 'delete'),
(gen_random_uuid(), 'mes:team:read', '班组读取', 'mes_team', 'read'),
(gen_random_uuid(), 'mes:team:create', '班组创建', 'mes_team', 'create'),
(gen_random_uuid(), 'mes:team:update', '班组更新', 'mes_team', 'update'),
(gen_random_uuid(), 'mes:team:delete', '班组删除', 'mes_team', 'delete'),
(gen_random_uuid(), 'mes:material:read', '物料读取', 'mes_material', 'read'),
(gen_random_uuid(), 'mes:material:create', '物料创建', 'mes_material', 'create'),
(gen_random_uuid(), 'mes:material:update', '物料更新', 'mes_material', 'update'),
(gen_random_uuid(), 'mes:material:delete', '物料删除', 'mes_material', 'delete'),
(gen_random_uuid(), 'mes:process_route:read', '工艺路线读取', 'mes_process_route', 'read'),
(gen_random_uuid(), 'mes:process_route:create', '工艺路线创建', 'mes_process_route', 'create'),
(gen_random_uuid(), 'mes:process_route:update', '工艺路线更新', 'mes_process_route', 'update'),
(gen_random_uuid(), 'mes:process_route:delete', '工艺路线删除', 'mes_process_route', 'delete'),
(gen_random_uuid(), 'mes:process_flow:read', '工艺流程读取', 'mes_process_flow', 'read'),
(gen_random_uuid(), 'mes:process_flow:create', '工艺流程创建', 'mes_process_flow', 'create'),
(gen_random_uuid(), 'mes:process_flow:update', '工艺流程更新', 'mes_process_flow', 'update'),
(gen_random_uuid(), 'mes:process_flow:delete', '工艺流程删除', 'mes_process_flow', 'delete'),
(gen_random_uuid(), 'mes:production_process:read', '生产过程读取', 'mes_production_process', 'read'),
(gen_random_uuid(), 'mes:production_process:create', '生产过程创建', 'mes_production_process', 'create'),
(gen_random_uuid(), 'mes:production_process:update', '生产过程更新', 'mes_production_process', 'update'),
(gen_random_uuid(), 'mes:production_process:delete', '生产过程删除', 'mes_production_process', 'delete'),
(gen_random_uuid(), 'mes:production_schedule:read', '生产计划读取', 'mes_production_schedule', 'read'),
(gen_random_uuid(), 'mes:production_schedule:create', '生产计划创建', 'mes_production_schedule', 'create'),
(gen_random_uuid(), 'mes:production_schedule:update', '生产计划更新', 'mes_production_schedule', 'update'),
(gen_random_uuid(), 'mes:production_schedule:delete', '生产计划删除', 'mes_production_schedule', 'delete'),
(gen_random_uuid(), 'mes:wip:read', '在制品读取', 'mes_wip', 'read'),
(gen_random_uuid(), 'mes:wip:create', '在制品创建', 'mes_wip', 'create'),
(gen_random_uuid(), 'mes:wip:update', '在制品更新', 'mes_wip', 'update'),
(gen_random_uuid(), 'mes:wip:delete', '在制品删除', 'mes_wip', 'delete'),
(gen_random_uuid(), 'mes:quality:read', '质量读取', 'mes_quality', 'read'),
(gen_random_uuid(), 'mes:quality:create', '质量创建', 'mes_quality', 'create'),
(gen_random_uuid(), 'mes:quality:update', '质量更新', 'mes_quality', 'update'),
(gen_random_uuid(), 'mes:quality:delete', '质量删除', 'mes_quality', 'delete'),
(gen_random_uuid(), 'mes:traceability:read', '质量追溯读取', 'mes_traceability', 'read'),
(gen_random_uuid(), 'mes:traceability:create', '质量追溯创建', 'mes_traceability', 'create'),
(gen_random_uuid(), 'mes:traceability:update', '质量追溯更新', 'mes_traceability', 'update'),
(gen_random_uuid(), 'mes:traceability:delete', '质量追溯删除', 'mes_traceability', 'delete'),
(gen_random_uuid(), 'mes:kanban:read', '生产看板读取', 'mes_kanban', 'read'),
(gen_random_uuid(), 'mes:kanban:create', '生产看板创建', 'mes_kanban', 'create'),
(gen_random_uuid(), 'mes:kanban:update', '生产看板更新', 'mes_kanban', 'update'),
(gen_random_uuid(), 'mes:kanban:delete', '生产看板删除', 'mes_kanban', 'delete'),
(gen_random_uuid(), 'mes:production_record:read', '生产记录读取', 'mes_production_record', 'read'),
(gen_random_uuid(), 'mes:production_record:create', '生产记录创建', 'mes_production_record', 'create'),
(gen_random_uuid(), 'mes:production_record:update', '生产记录更新', 'mes_production_record', 'update'),
(gen_random_uuid(), 'mes:production_record:delete', '生产记录删除', 'mes_production_record', 'delete'),
(gen_random_uuid(), 'mes:work_report:read', '工作报告读取', 'mes_work_report', 'read'),
(gen_random_uuid(), 'mes:work_report:create', '工作报告创建', 'mes_work_report', 'create'),
(gen_random_uuid(), 'mes:work_report:update', '工作报告更新', 'mes_work_report', 'update'),
(gen_random_uuid(), 'mes:work_report:delete', '工作报告删除', 'mes_work_report', 'delete'),
(gen_random_uuid(), 'mes:oee:read', '设备OEE读取', 'mes_oee', 'read'),
(gen_random_uuid(), 'mes:oee:create', '设备OEE创建', 'mes_oee', 'create'),
(gen_random_uuid(), 'mes:oee:update', '设备OEE更新', 'mes_oee', 'update'),
(gen_random_uuid(), 'mes:oee:delete', '设备OEE删除', 'mes_oee', 'delete'),
(gen_random_uuid(), 'mes:energy:read', '能耗管理读取', 'mes_energy', 'read'),
(gen_random_uuid(), 'mes:energy:create', '能耗管理创建', 'mes_energy', 'create'),
(gen_random_uuid(), 'mes:energy:update', '能耗管理更新', 'mes_energy', 'update'),
(gen_random_uuid(), 'mes:energy:delete', '能耗管理删除', 'mes_energy', 'delete'),
(gen_random_uuid(), 'mes:anomaly:read', '异常预警读取', 'mes_anomaly', 'read'),
(gen_random_uuid(), 'mes:anomaly:create', '异常预警创建', 'mes_anomaly', 'create'),
(gen_random_uuid(), 'mes:anomaly:update', '异常预警更新', 'mes_anomaly', 'update'),
(gen_random_uuid(), 'mes:anomaly:delete', '异常预警删除', 'mes_anomaly', 'delete')
ON CONFLICT (code) DO NOTHING;
-- =============================================
-- Permissions: HRM (人力资源)
-- =============================================

INSERT INTO core_permissions (id, code, name, resource, action) VALUES
(gen_random_uuid(), 'hrm:read', '人力资源模块访问', 'hrm', 'read'),
(gen_random_uuid(), 'hrm:dashboard:read', '人力资源仪表盘', 'hrm_dashboard', 'read'),
(gen_random_uuid(), 'hrm:employee:read', 'employee读取', 'hrm_employee', 'read'),
(gen_random_uuid(), 'hrm:employee:create', 'employee创建', 'hrm_employee', 'create'),
(gen_random_uuid(), 'hrm:employee:update', 'employee更新', 'hrm_employee', 'update'),
(gen_random_uuid(), 'hrm:employee:delete', 'employee删除', 'hrm_employee', 'delete'),
(gen_random_uuid(), 'hrm:department:read', 'department读取', 'hrm_department', 'read'),
(gen_random_uuid(), 'hrm:department:create', 'department创建', 'hrm_department', 'create'),
(gen_random_uuid(), 'hrm:department:update', 'department更新', 'hrm_department', 'update'),
(gen_random_uuid(), 'hrm:department:delete', 'department删除', 'hrm_department', 'delete'),
(gen_random_uuid(), 'hrm:organization:read', 'organization读取', 'hrm_organization', 'read'),
(gen_random_uuid(), 'hrm:organization:create', 'organization创建', 'hrm_organization', 'create'),
(gen_random_uuid(), 'hrm:organization:update', 'organization更新', 'hrm_organization', 'update'),
(gen_random_uuid(), 'hrm:organization:delete', 'organization删除', 'hrm_organization', 'delete'),
(gen_random_uuid(), 'hrm:position:read', 'position读取', 'hrm_position', 'read'),
(gen_random_uuid(), 'hrm:position:create', 'position创建', 'hrm_position', 'create'),
(gen_random_uuid(), 'hrm:position:update', 'position更新', 'hrm_position', 'update'),
(gen_random_uuid(), 'hrm:position:delete', 'position删除', 'hrm_position', 'delete'),
(gen_random_uuid(), 'hrm:contract:read', 'contract读取', 'hrm_contract', 'read'),
(gen_random_uuid(), 'hrm:contract:create', 'contract创建', 'hrm_contract', 'create'),
(gen_random_uuid(), 'hrm:contract:update', 'contract更新', 'hrm_contract', 'update'),
(gen_random_uuid(), 'hrm:contract:delete', 'contract删除', 'hrm_contract', 'delete'),
(gen_random_uuid(), 'hrm:company:read', 'company读取', 'hrm_company', 'read'),
(gen_random_uuid(), 'hrm:company:create', 'company创建', 'hrm_company', 'create'),
(gen_random_uuid(), 'hrm:company:update', 'company更新', 'hrm_company', 'update'),
(gen_random_uuid(), 'hrm:company:delete', 'company删除', 'hrm_company', 'delete'),
(gen_random_uuid(), 'hrm:attendance:read', 'attendance读取', 'hrm_attendance', 'read'),
(gen_random_uuid(), 'hrm:attendance:create', 'attendance创建', 'hrm_attendance', 'create'),
(gen_random_uuid(), 'hrm:attendance:update', 'attendance更新', 'hrm_attendance', 'update'),
(gen_random_uuid(), 'hrm:attendance:delete', 'attendance删除', 'hrm_attendance', 'delete'),
(gen_random_uuid(), 'hrm:leave:read', 'leave读取', 'hrm_leave', 'read'),
(gen_random_uuid(), 'hrm:leave:create', 'leave创建', 'hrm_leave', 'create'),
(gen_random_uuid(), 'hrm:leave:update', 'leave更新', 'hrm_leave', 'update'),
(gen_random_uuid(), 'hrm:leave:delete', 'leave删除', 'hrm_leave', 'delete'),
(gen_random_uuid(), 'hrm:payroll:read', 'payroll读取', 'hrm_payroll', 'read'),
(gen_random_uuid(), 'hrm:payroll:create', 'payroll创建', 'hrm_payroll', 'create'),
(gen_random_uuid(), 'hrm:payroll:update', 'payroll更新', 'hrm_payroll', 'update'),
(gen_random_uuid(), 'hrm:payroll:delete', 'payroll删除', 'hrm_payroll', 'delete'),
(gen_random_uuid(), 'hrm:salary_adjustment:read', 'salary adjustment读取', 'hrm_salary_adjustment', 'read'),
(gen_random_uuid(), 'hrm:salary_adjustment:create', 'salary adjustment创建', 'hrm_salary_adjustment', 'create'),
(gen_random_uuid(), 'hrm:salary_adjustment:update', 'salary adjustment更新', 'hrm_salary_adjustment', 'update'),
(gen_random_uuid(), 'hrm:salary_adjustment:delete', 'salary adjustment删除', 'hrm_salary_adjustment', 'delete'),
(gen_random_uuid(), 'hrm:recruitment:read', 'recruitment读取', 'hrm_recruitment', 'read'),
(gen_random_uuid(), 'hrm:recruitment:create', 'recruitment创建', 'hrm_recruitment', 'create'),
(gen_random_uuid(), 'hrm:recruitment:update', 'recruitment更新', 'hrm_recruitment', 'update'),
(gen_random_uuid(), 'hrm:recruitment:delete', 'recruitment删除', 'hrm_recruitment', 'delete'),
(gen_random_uuid(), 'hrm:training:read', 'training读取', 'hrm_training', 'read'),
(gen_random_uuid(), 'hrm:training:create', 'training创建', 'hrm_training', 'create'),
(gen_random_uuid(), 'hrm:training:update', 'training更新', 'hrm_training', 'update'),
(gen_random_uuid(), 'hrm:training:delete', 'training删除', 'hrm_training', 'delete'),
(gen_random_uuid(), 'hrm:performance:read', 'performance读取', 'hrm_performance', 'read'),
(gen_random_uuid(), 'hrm:performance:create', 'performance创建', 'hrm_performance', 'create'),
(gen_random_uuid(), 'hrm:performance:update', 'performance更新', 'hrm_performance', 'update'),
(gen_random_uuid(), 'hrm:performance:delete', 'performance删除', 'hrm_performance', 'delete'),
(gen_random_uuid(), 'hrm:report:read', 'report读取', 'hrm_report', 'read'),
(gen_random_uuid(), 'hrm:report:create', 'report创建', 'hrm_report', 'create'),
(gen_random_uuid(), 'hrm:report:update', 'report更新', 'hrm_report', 'update'),
(gen_random_uuid(), 'hrm:report:delete', 'report删除', 'hrm_report', 'delete')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Permissions: PDM (产品数据)
-- =============================================

INSERT INTO core_permissions (id, code, name, resource, action) VALUES
(gen_random_uuid(), 'pdm:read', '产品数据模块访问', 'pdm', 'read'),
(gen_random_uuid(), 'pdm:dashboard:read', '产品数据仪表盘', 'pdm_dashboard', 'read'),
(gen_random_uuid(), 'pdm:product:read', 'product读取', 'pdm_product', 'read'),
(gen_random_uuid(), 'pdm:product:create', 'product创建', 'pdm_product', 'create'),
(gen_random_uuid(), 'pdm:product:update', 'product更新', 'pdm_product', 'update'),
(gen_random_uuid(), 'pdm:product:delete', 'product删除', 'pdm_product', 'delete'),
(gen_random_uuid(), 'pdm:material:read', 'material读取', 'pdm_material', 'read'),
(gen_random_uuid(), 'pdm:material:create', 'material创建', 'pdm_material', 'create'),
(gen_random_uuid(), 'pdm:material:update', 'material更新', 'pdm_material', 'update'),
(gen_random_uuid(), 'pdm:material:delete', 'material删除', 'pdm_material', 'delete'),
(gen_random_uuid(), 'pdm:bom:read', 'bom读取', 'pdm_bom', 'read'),
(gen_random_uuid(), 'pdm:bom:create', 'bom创建', 'pdm_bom', 'create'),
(gen_random_uuid(), 'pdm:bom:update', 'bom更新', 'pdm_bom', 'update'),
(gen_random_uuid(), 'pdm:bom:delete', 'bom删除', 'pdm_bom', 'delete'),
(gen_random_uuid(), 'pdm:document:read', 'document读取', 'pdm_document', 'read'),
(gen_random_uuid(), 'pdm:document:create', 'document创建', 'pdm_document', 'create'),
(gen_random_uuid(), 'pdm:document:update', 'document更新', 'pdm_document', 'update'),
(gen_random_uuid(), 'pdm:document:delete', 'document删除', 'pdm_document', 'delete'),
(gen_random_uuid(), 'pdm:version:read', 'version读取', 'pdm_version', 'read'),
(gen_random_uuid(), 'pdm:version:create', 'version创建', 'pdm_version', 'create'),
(gen_random_uuid(), 'pdm:version:update', 'version更新', 'pdm_version', 'update'),
(gen_random_uuid(), 'pdm:version:delete', 'version删除', 'pdm_version', 'delete'),
(gen_random_uuid(), 'pdm:change:read', 'change读取', 'pdm_change', 'read'),
(gen_random_uuid(), 'pdm:change:create', 'change创建', 'pdm_change', 'create'),
(gen_random_uuid(), 'pdm:change:update', 'change更新', 'pdm_change', 'update'),
(gen_random_uuid(), 'pdm:change:delete', 'change删除', 'pdm_change', 'delete'),
(gen_random_uuid(), 'pdm:project:read', 'project读取', 'pdm_project', 'read'),
(gen_random_uuid(), 'pdm:project:create', 'project创建', 'pdm_project', 'create'),
(gen_random_uuid(), 'pdm:project:update', 'project更新', 'pdm_project', 'update'),
(gen_random_uuid(), 'pdm:project:delete', 'project删除', 'pdm_project', 'delete'),
(gen_random_uuid(), 'pdm:formula:read', 'formula读取', 'pdm_formula', 'read'),
(gen_random_uuid(), 'pdm:formula:create', 'formula创建', 'pdm_formula', 'create'),
(gen_random_uuid(), 'pdm:formula:update', 'formula更新', 'pdm_formula', 'update'),
(gen_random_uuid(), 'pdm:formula:delete', 'formula删除', 'pdm_formula', 'delete'),
(gen_random_uuid(), 'pdm:process:read', 'process读取', 'pdm_process', 'read'),
(gen_random_uuid(), 'pdm:process:create', 'process创建', 'pdm_process', 'create'),
(gen_random_uuid(), 'pdm:process:update', 'process更新', 'pdm_process', 'update'),
(gen_random_uuid(), 'pdm:process:delete', 'process删除', 'pdm_process', 'delete'),
(gen_random_uuid(), 'pdm:batch:read', 'batch读取', 'pdm_batch', 'read'),
(gen_random_uuid(), 'pdm:batch:create', 'batch创建', 'pdm_batch', 'create'),
(gen_random_uuid(), 'pdm:batch:update', 'batch更新', 'pdm_batch', 'update'),
(gen_random_uuid(), 'pdm:batch:delete', 'batch删除', 'pdm_batch', 'delete'),
(gen_random_uuid(), 'pdm:step:read', 'step读取', 'pdm_step', 'read'),
(gen_random_uuid(), 'pdm:step:create', 'step创建', 'pdm_step', 'create'),
(gen_random_uuid(), 'pdm:step:update', 'step更新', 'pdm_step', 'update'),
(gen_random_uuid(), 'pdm:step:delete', 'step删除', 'pdm_step', 'delete'),
(gen_random_uuid(), 'pdm:stats:read', 'stats读取', 'pdm_stats', 'read'),
(gen_random_uuid(), 'pdm:stats:create', 'stats创建', 'pdm_stats', 'create'),
(gen_random_uuid(), 'pdm:stats:update', 'stats更新', 'pdm_stats', 'update'),
(gen_random_uuid(), 'pdm:stats:delete', 'stats删除', 'pdm_stats', 'delete'),
(gen_random_uuid(), 'pdm:product_category:read', 'product category读取', 'pdm_product_category', 'read'),
(gen_random_uuid(), 'pdm:product_category:create', 'product category创建', 'pdm_product_category', 'create'),
(gen_random_uuid(), 'pdm:product_category:update', 'product category更新', 'pdm_product_category', 'update'),
(gen_random_uuid(), 'pdm:product_category:delete', 'product category删除', 'pdm_product_category', 'delete')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Permissions: WMS (仓储管理)
-- =============================================

INSERT INTO core_permissions (id, code, name, resource, action) VALUES
(gen_random_uuid(), 'wms:read', '仓储管理模块访问', 'wms', 'read'),
(gen_random_uuid(), 'wms:dashboard:read', '仓储管理仪表盘', 'wms_dashboard', 'read'),
(gen_random_uuid(), 'wms:warehouse:read', 'warehouse读取', 'wms_warehouse', 'read'),
(gen_random_uuid(), 'wms:warehouse:create', 'warehouse创建', 'wms_warehouse', 'create'),
(gen_random_uuid(), 'wms:warehouse:update', 'warehouse更新', 'wms_warehouse', 'update'),
(gen_random_uuid(), 'wms:warehouse:delete', 'warehouse删除', 'wms_warehouse', 'delete'),
(gen_random_uuid(), 'wms:location:read', 'location读取', 'wms_location', 'read'),
(gen_random_uuid(), 'wms:location:create', 'location创建', 'wms_location', 'create'),
(gen_random_uuid(), 'wms:location:update', 'location更新', 'wms_location', 'update'),
(gen_random_uuid(), 'wms:location:delete', 'location删除', 'wms_location', 'delete'),
(gen_random_uuid(), 'wms:batch:read', 'batch读取', 'wms_batch', 'read'),
(gen_random_uuid(), 'wms:batch:create', 'batch创建', 'wms_batch', 'create'),
(gen_random_uuid(), 'wms:batch:update', 'batch更新', 'wms_batch', 'update'),
(gen_random_uuid(), 'wms:batch:delete', 'batch删除', 'wms_batch', 'delete'),
(gen_random_uuid(), 'wms:serial_number:read', 'serial number读取', 'wms_serial_number', 'read'),
(gen_random_uuid(), 'wms:serial_number:create', 'serial number创建', 'wms_serial_number', 'create'),
(gen_random_uuid(), 'wms:serial_number:update', 'serial number更新', 'wms_serial_number', 'update'),
(gen_random_uuid(), 'wms:serial_number:delete', 'serial number删除', 'wms_serial_number', 'delete'),
(gen_random_uuid(), 'wms:inbound:read', 'inbound读取', 'wms_inbound', 'read'),
(gen_random_uuid(), 'wms:inbound:create', 'inbound创建', 'wms_inbound', 'create'),
(gen_random_uuid(), 'wms:inbound:update', 'inbound更新', 'wms_inbound', 'update'),
(gen_random_uuid(), 'wms:inbound:delete', 'inbound删除', 'wms_inbound', 'delete'),
(gen_random_uuid(), 'wms:outbound:read', 'outbound读取', 'wms_outbound', 'read'),
(gen_random_uuid(), 'wms:outbound:create', 'outbound创建', 'wms_outbound', 'create'),
(gen_random_uuid(), 'wms:outbound:update', 'outbound更新', 'wms_outbound', 'update'),
(gen_random_uuid(), 'wms:outbound:delete', 'outbound删除', 'wms_outbound', 'delete'),
(gen_random_uuid(), 'wms:transfer:read', 'transfer读取', 'wms_transfer', 'read'),
(gen_random_uuid(), 'wms:transfer:create', 'transfer创建', 'wms_transfer', 'create'),
(gen_random_uuid(), 'wms:transfer:update', 'transfer更新', 'wms_transfer', 'update'),
(gen_random_uuid(), 'wms:transfer:delete', 'transfer删除', 'wms_transfer', 'delete'),
(gen_random_uuid(), 'wms:inventory_check:read', 'inventory check读取', 'wms_inventory_check', 'read'),
(gen_random_uuid(), 'wms:inventory_check:create', 'inventory check创建', 'wms_inventory_check', 'create'),
(gen_random_uuid(), 'wms:inventory_check:update', 'inventory check更新', 'wms_inventory_check', 'update'),
(gen_random_uuid(), 'wms:inventory_check:delete', 'inventory check删除', 'wms_inventory_check', 'delete'),
(gen_random_uuid(), 'wms:replenishment:read', 'replenishment读取', 'wms_replenishment', 'read'),
(gen_random_uuid(), 'wms:replenishment:create', 'replenishment创建', 'wms_replenishment', 'create'),
(gen_random_uuid(), 'wms:replenishment:update', 'replenishment更新', 'wms_replenishment', 'update'),
(gen_random_uuid(), 'wms:replenishment:delete', 'replenishment删除', 'wms_replenishment', 'delete'),
(gen_random_uuid(), 'wms:inventory:read', 'inventory读取', 'wms_inventory', 'read'),
(gen_random_uuid(), 'wms:inventory:create', 'inventory创建', 'wms_inventory', 'create'),
(gen_random_uuid(), 'wms:inventory:update', 'inventory更新', 'wms_inventory', 'update'),
(gen_random_uuid(), 'wms:inventory:delete', 'inventory删除', 'wms_inventory', 'delete'),
(gen_random_uuid(), 'wms:report:read', 'report读取', 'wms_report', 'read'),
(gen_random_uuid(), 'wms:report:create', 'report创建', 'wms_report', 'create'),
(gen_random_uuid(), 'wms:report:update', 'report更新', 'wms_report', 'update'),
(gen_random_uuid(), 'wms:report:delete', 'report删除', 'wms_report', 'delete'),
(gen_random_uuid(), 'wms:supplier:read', 'supplier读取', 'wms_supplier', 'read'),
(gen_random_uuid(), 'wms:supplier:create', 'supplier创建', 'wms_supplier', 'create'),
(gen_random_uuid(), 'wms:supplier:update', 'supplier更新', 'wms_supplier', 'update'),
(gen_random_uuid(), 'wms:supplier:delete', 'supplier删除', 'wms_supplier', 'delete'),
(gen_random_uuid(), 'wms:area:read', 'area读取', 'wms_area', 'read'),
(gen_random_uuid(), 'wms:area:create', 'area创建', 'wms_area', 'create'),
(gen_random_uuid(), 'wms:area:update', 'area更新', 'wms_area', 'update'),
(gen_random_uuid(), 'wms:area:delete', 'area删除', 'wms_area', 'delete')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Permissions: EHS (安全环保)
-- =============================================

INSERT INTO core_permissions (id, code, name, resource, action) VALUES
(gen_random_uuid(), 'ehs:read', '安全环保模块访问', 'ehs', 'read'),
(gen_random_uuid(), 'ehs:dashboard:read', '安全环保仪表盘', 'ehs_dashboard', 'read'),
(gen_random_uuid(), 'ehs:check:read', 'check读取', 'ehs_check', 'read'),
(gen_random_uuid(), 'ehs:check:create', 'check创建', 'ehs_check', 'create'),
(gen_random_uuid(), 'ehs:check:update', 'check更新', 'ehs_check', 'update'),
(gen_random_uuid(), 'ehs:check:delete', 'check删除', 'ehs_check', 'delete'),
(gen_random_uuid(), 'ehs:hazard:read', 'hazard读取', 'ehs_hazard', 'read'),
(gen_random_uuid(), 'ehs:hazard:create', 'hazard创建', 'ehs_hazard', 'create'),
(gen_random_uuid(), 'ehs:hazard:update', 'hazard更新', 'ehs_hazard', 'update'),
(gen_random_uuid(), 'ehs:hazard:delete', 'hazard删除', 'ehs_hazard', 'delete'),
(gen_random_uuid(), 'ehs:accident:read', 'accident读取', 'ehs_accident', 'read'),
(gen_random_uuid(), 'ehs:accident:create', 'accident创建', 'ehs_accident', 'create'),
(gen_random_uuid(), 'ehs:accident:update', 'accident更新', 'ehs_accident', 'update'),
(gen_random_uuid(), 'ehs:accident:delete', 'accident删除', 'ehs_accident', 'delete'),
(gen_random_uuid(), 'ehs:plan:read', 'plan读取', 'ehs_plan', 'read'),
(gen_random_uuid(), 'ehs:plan:create', 'plan创建', 'ehs_plan', 'create'),
(gen_random_uuid(), 'ehs:plan:update', 'plan更新', 'ehs_plan', 'update'),
(gen_random_uuid(), 'ehs:plan:delete', 'plan删除', 'ehs_plan', 'delete'),
(gen_random_uuid(), 'ehs:compliance:read', 'compliance读取', 'ehs_compliance', 'read'),
(gen_random_uuid(), 'ehs:compliance:create', 'compliance创建', 'ehs_compliance', 'create'),
(gen_random_uuid(), 'ehs:compliance:update', 'compliance更新', 'ehs_compliance', 'update'),
(gen_random_uuid(), 'ehs:compliance:delete', 'compliance删除', 'ehs_compliance', 'delete'),
(gen_random_uuid(), 'ehs:environment:read', 'environment读取', 'ehs_environment', 'read'),
(gen_random_uuid(), 'ehs:environment:create', 'environment创建', 'ehs_environment', 'create'),
(gen_random_uuid(), 'ehs:environment:update', 'environment更新', 'ehs_environment', 'update'),
(gen_random_uuid(), 'ehs:environment:delete', 'environment删除', 'ehs_environment', 'delete'),
(gen_random_uuid(), 'ehs:training:read', 'training读取', 'ehs_training', 'read'),
(gen_random_uuid(), 'ehs:training:create', 'training创建', 'ehs_training', 'create'),
(gen_random_uuid(), 'ehs:training:update', 'training更新', 'ehs_training', 'update'),
(gen_random_uuid(), 'ehs:training:delete', 'training删除', 'ehs_training', 'delete'),
(gen_random_uuid(), 'ehs:occupational_disease:read', 'occupational disease读取', 'ehs_occupational_disease', 'read'),
(gen_random_uuid(), 'ehs:occupational_disease:create', 'occupational disease创建', 'ehs_occupational_disease', 'create'),
(gen_random_uuid(), 'ehs:occupational_disease:update', 'occupational disease更新', 'ehs_occupational_disease', 'update'),
(gen_random_uuid(), 'ehs:occupational_disease:delete', 'occupational disease删除', 'ehs_occupational_disease', 'delete'),
(gen_random_uuid(), 'ehs:health:read', 'health读取', 'ehs_health', 'read'),
(gen_random_uuid(), 'ehs:health:create', 'health创建', 'ehs_health', 'create'),
(gen_random_uuid(), 'ehs:health:update', 'health更新', 'ehs_health', 'update'),
(gen_random_uuid(), 'ehs:health:delete', 'health删除', 'ehs_health', 'delete'),
(gen_random_uuid(), 'ehs:hazardous_material:read', 'hazardous material读取', 'ehs_hazardous_material', 'read'),
(gen_random_uuid(), 'ehs:hazardous_material:create', 'hazardous material创建', 'ehs_hazardous_material', 'create'),
(gen_random_uuid(), 'ehs:hazardous_material:update', 'hazardous material更新', 'ehs_hazardous_material', 'update'),
(gen_random_uuid(), 'ehs:hazardous_material:delete', 'hazardous material删除', 'ehs_hazardous_material', 'delete'),
(gen_random_uuid(), 'ehs:emergency:read', 'emergency读取', 'ehs_emergency', 'read'),
(gen_random_uuid(), 'ehs:emergency:create', 'emergency创建', 'ehs_emergency', 'create'),
(gen_random_uuid(), 'ehs:emergency:update', 'emergency更新', 'ehs_emergency', 'update'),
(gen_random_uuid(), 'ehs:emergency:delete', 'emergency删除', 'ehs_emergency', 'delete'),
(gen_random_uuid(), 'ehs:drill:read', 'drill读取', 'ehs_drill', 'read'),
(gen_random_uuid(), 'ehs:drill:create', 'drill创建', 'ehs_drill', 'create'),
(gen_random_uuid(), 'ehs:drill:update', 'drill更新', 'ehs_drill', 'update'),
(gen_random_uuid(), 'ehs:drill:delete', 'drill删除', 'ehs_drill', 'delete'),
(gen_random_uuid(), 'ehs:incident:read', 'incident读取', 'ehs_incident', 'read'),
(gen_random_uuid(), 'ehs:incident:create', 'incident创建', 'ehs_incident', 'create'),
(gen_random_uuid(), 'ehs:incident:update', 'incident更新', 'ehs_incident', 'update'),
(gen_random_uuid(), 'ehs:incident:delete', 'incident删除', 'ehs_incident', 'delete')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Permissions: LIMS (实验室管理)
-- =============================================

INSERT INTO core_permissions (id, code, name, resource, action) VALUES
(gen_random_uuid(), 'lims:read', '实验室管理模块访问', 'lims', 'read'),
(gen_random_uuid(), 'lims:dashboard:read', '实验室管理仪表盘', 'lims_dashboard', 'read'),
(gen_random_uuid(), 'lims:sample:read', 'sample读取', 'lims_sample', 'read'),
(gen_random_uuid(), 'lims:sample:create', 'sample创建', 'lims_sample', 'create'),
(gen_random_uuid(), 'lims:sample:update', 'sample更新', 'lims_sample', 'update'),
(gen_random_uuid(), 'lims:sample:delete', 'sample删除', 'lims_sample', 'delete'),
(gen_random_uuid(), 'lims:task:read', 'task读取', 'lims_task', 'read'),
(gen_random_uuid(), 'lims:task:create', 'task创建', 'lims_task', 'create'),
(gen_random_uuid(), 'lims:task:update', 'task更新', 'lims_task', 'update'),
(gen_random_uuid(), 'lims:task:delete', 'task删除', 'lims_task', 'delete'),
(gen_random_uuid(), 'lims:process:read', 'process读取', 'lims_process', 'read'),
(gen_random_uuid(), 'lims:process:create', 'process创建', 'lims_process', 'create'),
(gen_random_uuid(), 'lims:process:update', 'process更新', 'lims_process', 'update'),
(gen_random_uuid(), 'lims:process:delete', 'process删除', 'lims_process', 'delete'),
(gen_random_uuid(), 'lims:instrument:read', 'instrument读取', 'lims_instrument', 'read'),
(gen_random_uuid(), 'lims:instrument:create', 'instrument创建', 'lims_instrument', 'create'),
(gen_random_uuid(), 'lims:instrument:update', 'instrument更新', 'lims_instrument', 'update'),
(gen_random_uuid(), 'lims:instrument:delete', 'instrument删除', 'lims_instrument', 'delete'),
(gen_random_uuid(), 'lims:reagent:read', 'reagent读取', 'lims_reagent', 'read'),
(gen_random_uuid(), 'lims:reagent:create', 'reagent创建', 'lims_reagent', 'create'),
(gen_random_uuid(), 'lims:reagent:update', 'reagent更新', 'lims_reagent', 'update'),
(gen_random_uuid(), 'lims:reagent:delete', 'reagent删除', 'lims_reagent', 'delete'),
(gen_random_uuid(), 'lims:test_method:read', 'test method读取', 'lims_test_method', 'read'),
(gen_random_uuid(), 'lims:test_method:create', 'test method创建', 'lims_test_method', 'create'),
(gen_random_uuid(), 'lims:test_method:update', 'test method更新', 'lims_test_method', 'update'),
(gen_random_uuid(), 'lims:test_method:delete', 'test method删除', 'lims_test_method', 'delete'),
(gen_random_uuid(), 'lims:barcode:read', 'barcode读取', 'lims_barcode', 'read'),
(gen_random_uuid(), 'lims:barcode:create', 'barcode创建', 'lims_barcode', 'create'),
(gen_random_uuid(), 'lims:barcode:update', 'barcode更新', 'lims_barcode', 'update'),
(gen_random_uuid(), 'lims:barcode:delete', 'barcode删除', 'lims_barcode', 'delete'),
(gen_random_uuid(), 'lims:uncertainty:read', 'uncertainty读取', 'lims_uncertainty', 'read'),
(gen_random_uuid(), 'lims:uncertainty:create', 'uncertainty创建', 'lims_uncertainty', 'create'),
(gen_random_uuid(), 'lims:uncertainty:update', 'uncertainty更新', 'lims_uncertainty', 'update'),
(gen_random_uuid(), 'lims:uncertainty:delete', 'uncertainty删除', 'lims_uncertainty', 'delete'),
(gen_random_uuid(), 'lims:result:read', 'result读取', 'lims_result', 'read'),
(gen_random_uuid(), 'lims:result:create', 'result创建', 'lims_result', 'create'),
(gen_random_uuid(), 'lims:result:update', 'result更新', 'lims_result', 'update'),
(gen_random_uuid(), 'lims:result:delete', 'result删除', 'lims_result', 'delete'),
(gen_random_uuid(), 'lims:proficiency:read', 'proficiency读取', 'lims_proficiency', 'read'),
(gen_random_uuid(), 'lims:proficiency:create', 'proficiency创建', 'lims_proficiency', 'create'),
(gen_random_uuid(), 'lims:proficiency:update', 'proficiency更新', 'lims_proficiency', 'update'),
(gen_random_uuid(), 'lims:proficiency:delete', 'proficiency删除', 'lims_proficiency', 'delete')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Permissions: CRM (客户关系)
-- =============================================

INSERT INTO core_permissions (id, code, name, resource, action) VALUES
(gen_random_uuid(), 'crm:read', '客户关系模块访问', 'crm', 'read'),
(gen_random_uuid(), 'crm:dashboard:read', '客户关系仪表盘', 'crm_dashboard', 'read'),
(gen_random_uuid(), 'crm:customer:read', 'customer读取', 'crm_customer', 'read'),
(gen_random_uuid(), 'crm:customer:create', 'customer创建', 'crm_customer', 'create'),
(gen_random_uuid(), 'crm:customer:update', 'customer更新', 'crm_customer', 'update'),
(gen_random_uuid(), 'crm:customer:delete', 'customer删除', 'crm_customer', 'delete'),
(gen_random_uuid(), 'crm:contact:read', 'contact读取', 'crm_contact', 'read'),
(gen_random_uuid(), 'crm:contact:create', 'contact创建', 'crm_contact', 'create'),
(gen_random_uuid(), 'crm:contact:update', 'contact更新', 'crm_contact', 'update'),
(gen_random_uuid(), 'crm:contact:delete', 'contact删除', 'crm_contact', 'delete'),
(gen_random_uuid(), 'crm:opportunity:read', 'opportunity读取', 'crm_opportunity', 'read'),
(gen_random_uuid(), 'crm:opportunity:create', 'opportunity创建', 'crm_opportunity', 'create'),
(gen_random_uuid(), 'crm:opportunity:update', 'opportunity更新', 'crm_opportunity', 'update'),
(gen_random_uuid(), 'crm:opportunity:delete', 'opportunity删除', 'crm_opportunity', 'delete'),
(gen_random_uuid(), 'crm:interaction:read', 'interaction读取', 'crm_interaction', 'read'),
(gen_random_uuid(), 'crm:interaction:create', 'interaction创建', 'crm_interaction', 'create'),
(gen_random_uuid(), 'crm:interaction:update', 'interaction更新', 'crm_interaction', 'update'),
(gen_random_uuid(), 'crm:interaction:delete', 'interaction删除', 'crm_interaction', 'delete'),
(gen_random_uuid(), 'crm:billing:read', 'billing读取', 'crm_billing', 'read'),
(gen_random_uuid(), 'crm:billing:create', 'billing创建', 'crm_billing', 'create'),
(gen_random_uuid(), 'crm:billing:update', 'billing更新', 'crm_billing', 'update'),
(gen_random_uuid(), 'crm:billing:delete', 'billing删除', 'crm_billing', 'delete'),
(gen_random_uuid(), 'crm:sales_funnel:read', 'sales funnel读取', 'crm_sales_funnel', 'read'),
(gen_random_uuid(), 'crm:sales_funnel:create', 'sales funnel创建', 'crm_sales_funnel', 'create'),
(gen_random_uuid(), 'crm:sales_funnel:update', 'sales funnel更新', 'crm_sales_funnel', 'update'),
(gen_random_uuid(), 'crm:sales_funnel:delete', 'sales funnel删除', 'crm_sales_funnel', 'delete'),
(gen_random_uuid(), 'crm:customer_scoring:read', 'customer scoring读取', 'crm_customer_scoring', 'read'),
(gen_random_uuid(), 'crm:customer_scoring:create', 'customer scoring创建', 'crm_customer_scoring', 'create'),
(gen_random_uuid(), 'crm:customer_scoring:update', 'customer scoring更新', 'crm_customer_scoring', 'update'),
(gen_random_uuid(), 'crm:customer_scoring:delete', 'customer scoring删除', 'crm_customer_scoring', 'delete'),
(gen_random_uuid(), 'crm:sales_forecast:read', 'sales forecast读取', 'crm_sales_forecast', 'read'),
(gen_random_uuid(), 'crm:sales_forecast:create', 'sales forecast创建', 'crm_sales_forecast', 'create'),
(gen_random_uuid(), 'crm:sales_forecast:update', 'sales forecast更新', 'crm_sales_forecast', 'update'),
(gen_random_uuid(), 'crm:sales_forecast:delete', 'sales forecast删除', 'crm_sales_forecast', 'delete'),
(gen_random_uuid(), 'crm:customer_segmentation:read', 'customer segmentation读取', 'crm_customer_segmentation', 'read'),
(gen_random_uuid(), 'crm:customer_segmentation:create', 'customer segmentation创建', 'crm_customer_segmentation', 'create'),
(gen_random_uuid(), 'crm:customer_segmentation:update', 'customer segmentation更新', 'crm_customer_segmentation', 'update'),
(gen_random_uuid(), 'crm:customer_segmentation:delete', 'customer segmentation删除', 'crm_customer_segmentation', 'delete'),
(gen_random_uuid(), 'crm:recommendation:read', 'recommendation读取', 'crm_recommendation', 'read'),
(gen_random_uuid(), 'crm:recommendation:create', 'recommendation创建', 'crm_recommendation', 'create'),
(gen_random_uuid(), 'crm:recommendation:update', 'recommendation更新', 'crm_recommendation', 'update'),
(gen_random_uuid(), 'crm:recommendation:delete', 'recommendation删除', 'crm_recommendation', 'delete'),
(gen_random_uuid(), 'crm:return:read', 'return读取', 'crm_return', 'read'),
(gen_random_uuid(), 'crm:return:create', 'return创建', 'crm_return', 'create'),
(gen_random_uuid(), 'crm:return:update', 'return更新', 'crm_return', 'update'),
(gen_random_uuid(), 'crm:return:delete', 'return删除', 'crm_return', 'delete')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Permissions: QMS (质量管理)
-- =============================================

INSERT INTO core_permissions (id, code, name, resource, action) VALUES
(gen_random_uuid(), 'qms:read', '质量管理模块访问', 'qms', 'read'),
(gen_random_uuid(), 'qms:dashboard:read', '质量管理仪表盘', 'qms_dashboard', 'read'),
(gen_random_uuid(), 'qms:inspection:read', 'inspection读取', 'qms_inspection', 'read'),
(gen_random_uuid(), 'qms:inspection:create', 'inspection创建', 'qms_inspection', 'create'),
(gen_random_uuid(), 'qms:inspection:update', 'inspection更新', 'qms_inspection', 'update'),
(gen_random_uuid(), 'qms:inspection:delete', 'inspection删除', 'qms_inspection', 'delete'),
(gen_random_uuid(), 'qms:quality_control:read', 'quality control读取', 'qms_quality_control', 'read'),
(gen_random_uuid(), 'qms:quality_control:create', 'quality control创建', 'qms_quality_control', 'create'),
(gen_random_uuid(), 'qms:quality_control:update', 'quality control更新', 'qms_quality_control', 'update'),
(gen_random_uuid(), 'qms:quality_control:delete', 'quality control删除', 'qms_quality_control', 'delete'),
(gen_random_uuid(), 'qms:nonconformance:read', 'nonconformance读取', 'qms_nonconformance', 'read'),
(gen_random_uuid(), 'qms:nonconformance:create', 'nonconformance创建', 'qms_nonconformance', 'create'),
(gen_random_uuid(), 'qms:nonconformance:update', 'nonconformance更新', 'qms_nonconformance', 'update'),
(gen_random_uuid(), 'qms:nonconformance:delete', 'nonconformance删除', 'qms_nonconformance', 'delete'),
(gen_random_uuid(), 'qms:audit:read', 'audit读取', 'qms_audit', 'read'),
(gen_random_uuid(), 'qms:audit:create', 'audit创建', 'qms_audit', 'create'),
(gen_random_uuid(), 'qms:audit:update', 'audit更新', 'qms_audit', 'update'),
(gen_random_uuid(), 'qms:audit:delete', 'audit删除', 'qms_audit', 'delete'),
(gen_random_uuid(), 'qms:standard:read', 'standard读取', 'qms_standard', 'read'),
(gen_random_uuid(), 'qms:standard:create', 'standard创建', 'qms_standard', 'create'),
(gen_random_uuid(), 'qms:standard:update', 'standard更新', 'qms_standard', 'update'),
(gen_random_uuid(), 'qms:standard:delete', 'standard删除', 'qms_standard', 'delete'),
(gen_random_uuid(), 'qms:apqp:read', 'apqp读取', 'qms_apqp', 'read'),
(gen_random_uuid(), 'qms:apqp:create', 'apqp创建', 'qms_apqp', 'create'),
(gen_random_uuid(), 'qms:apqp:update', 'apqp更新', 'qms_apqp', 'update'),
(gen_random_uuid(), 'qms:apqp:delete', 'apqp删除', 'qms_apqp', 'delete'),
(gen_random_uuid(), 'qms:fmea:read', 'fmea读取', 'qms_fmea', 'read'),
(gen_random_uuid(), 'qms:fmea:create', 'fmea创建', 'qms_fmea', 'create'),
(gen_random_uuid(), 'qms:fmea:update', 'fmea更新', 'qms_fmea', 'update'),
(gen_random_uuid(), 'qms:fmea:delete', 'fmea删除', 'qms_fmea', 'delete'),
(gen_random_uuid(), 'qms:spc:read', 'spc读取', 'qms_spc', 'read'),
(gen_random_uuid(), 'qms:spc:create', 'spc创建', 'qms_spc', 'create'),
(gen_random_uuid(), 'qms:spc:update', 'spc更新', 'qms_spc', 'update'),
(gen_random_uuid(), 'qms:spc:delete', 'spc删除', 'qms_spc', 'delete'),
(gen_random_uuid(), 'qms:eightd:read', 'eightd读取', 'qms_eightd', 'read'),
(gen_random_uuid(), 'qms:eightd:create', 'eightd创建', 'qms_eightd', 'create'),
(gen_random_uuid(), 'qms:eightd:update', 'eightd更新', 'qms_eightd', 'update'),
(gen_random_uuid(), 'qms:eightd:delete', 'eightd删除', 'qms_eightd', 'delete'),
(gen_random_uuid(), 'qms:quality_cost:read', 'quality cost读取', 'qms_quality_cost', 'read'),
(gen_random_uuid(), 'qms:quality_cost:create', 'quality cost创建', 'qms_quality_cost', 'create'),
(gen_random_uuid(), 'qms:quality_cost:update', 'quality cost更新', 'qms_quality_cost', 'update'),
(gen_random_uuid(), 'qms:quality_cost:delete', 'quality cost删除', 'qms_quality_cost', 'delete')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Permissions: SCM (供应链管理)
-- =============================================

INSERT INTO core_permissions (id, code, name, resource, action) VALUES
(gen_random_uuid(), 'scm:read', '供应链管理模块访问', 'scm', 'read'),
(gen_random_uuid(), 'scm:dashboard:read', '供应链管理仪表盘', 'scm_dashboard', 'read'),
(gen_random_uuid(), 'scm:purchase_order:read', 'purchase order读取', 'scm_purchase_order', 'read'),
(gen_random_uuid(), 'scm:purchase_order:create', 'purchase order创建', 'scm_purchase_order', 'create'),
(gen_random_uuid(), 'scm:purchase_order:update', 'purchase order更新', 'scm_purchase_order', 'update'),
(gen_random_uuid(), 'scm:purchase_order:delete', 'purchase order删除', 'scm_purchase_order', 'delete'),
(gen_random_uuid(), 'scm:purchase_requisition:read', 'purchase requisition读取', 'scm_purchase_requisition', 'read'),
(gen_random_uuid(), 'scm:purchase_requisition:create', 'purchase requisition创建', 'scm_purchase_requisition', 'create'),
(gen_random_uuid(), 'scm:purchase_requisition:update', 'purchase requisition更新', 'scm_purchase_requisition', 'update'),
(gen_random_uuid(), 'scm:purchase_requisition:delete', 'purchase requisition删除', 'scm_purchase_requisition', 'delete'),
(gen_random_uuid(), 'scm:purchase_item:read', 'purchase item读取', 'scm_purchase_item', 'read'),
(gen_random_uuid(), 'scm:purchase_item:create', 'purchase item创建', 'scm_purchase_item', 'create'),
(gen_random_uuid(), 'scm:purchase_item:update', 'purchase item更新', 'scm_purchase_item', 'update'),
(gen_random_uuid(), 'scm:purchase_item:delete', 'purchase item删除', 'scm_purchase_item', 'delete'),
(gen_random_uuid(), 'scm:supplier:read', 'supplier读取', 'scm_supplier', 'read'),
(gen_random_uuid(), 'scm:supplier:create', 'supplier创建', 'scm_supplier', 'create'),
(gen_random_uuid(), 'scm:supplier:update', 'supplier更新', 'scm_supplier', 'update'),
(gen_random_uuid(), 'scm:supplier:delete', 'supplier删除', 'scm_supplier', 'delete'),
(gen_random_uuid(), 'scm:supplier_admission:read', 'supplier admission读取', 'scm_supplier_admission', 'read'),
(gen_random_uuid(), 'scm:supplier_admission:create', 'supplier admission创建', 'scm_supplier_admission', 'create'),
(gen_random_uuid(), 'scm:supplier_admission:update', 'supplier admission更新', 'scm_supplier_admission', 'update'),
(gen_random_uuid(), 'scm:supplier_admission:delete', 'supplier admission删除', 'scm_supplier_admission', 'delete'),
(gen_random_uuid(), 'scm:supplier_evaluation:read', 'supplier evaluation读取', 'scm_supplier_evaluation', 'read'),
(gen_random_uuid(), 'scm:supplier_evaluation:create', 'supplier evaluation创建', 'scm_supplier_evaluation', 'create'),
(gen_random_uuid(), 'scm:supplier_evaluation:update', 'supplier evaluation更新', 'scm_supplier_evaluation', 'update'),
(gen_random_uuid(), 'scm:supplier_evaluation:delete', 'supplier evaluation删除', 'scm_supplier_evaluation', 'delete'),
(gen_random_uuid(), 'scm:contract:read', 'contract读取', 'scm_contract', 'read'),
(gen_random_uuid(), 'scm:contract:create', 'contract创建', 'scm_contract', 'create'),
(gen_random_uuid(), 'scm:contract:update', 'contract更新', 'scm_contract', 'update'),
(gen_random_uuid(), 'scm:contract:delete', 'contract删除', 'scm_contract', 'delete'),
(gen_random_uuid(), 'scm:delivery_appointment:read', 'delivery appointment读取', 'scm_delivery_appointment', 'read'),
(gen_random_uuid(), 'scm:delivery_appointment:create', 'delivery appointment创建', 'scm_delivery_appointment', 'create'),
(gen_random_uuid(), 'scm:delivery_appointment:update', 'delivery appointment更新', 'scm_delivery_appointment', 'update'),
(gen_random_uuid(), 'scm:delivery_appointment:delete', 'delivery appointment删除', 'scm_delivery_appointment', 'delete'),
(gen_random_uuid(), 'scm:mrp_plan:read', 'mrp plan读取', 'scm_mrp_plan', 'read'),
(gen_random_uuid(), 'scm:mrp_plan:create', 'mrp plan创建', 'scm_mrp_plan', 'create'),
(gen_random_uuid(), 'scm:mrp_plan:update', 'mrp plan更新', 'scm_mrp_plan', 'update'),
(gen_random_uuid(), 'scm:mrp_plan:delete', 'mrp plan删除', 'scm_mrp_plan', 'delete'),
(gen_random_uuid(), 'scm:mrp_suggestion:read', 'mrp suggestion读取', 'scm_mrp_suggestion', 'read'),
(gen_random_uuid(), 'scm:mrp_suggestion:create', 'mrp suggestion创建', 'scm_mrp_suggestion', 'create'),
(gen_random_uuid(), 'scm:mrp_suggestion:update', 'mrp suggestion更新', 'scm_mrp_suggestion', 'update'),
(gen_random_uuid(), 'scm:mrp_suggestion:delete', 'mrp suggestion删除', 'scm_mrp_suggestion', 'delete'),
(gen_random_uuid(), 'scm:inventory_turnover:read', 'inventory turnover读取', 'scm_inventory_turnover', 'read'),
(gen_random_uuid(), 'scm:inventory_turnover:create', 'inventory turnover创建', 'scm_inventory_turnover', 'create'),
(gen_random_uuid(), 'scm:inventory_turnover:update', 'inventory turnover更新', 'scm_inventory_turnover', 'update'),
(gen_random_uuid(), 'scm:inventory_turnover:delete', 'inventory turnover删除', 'scm_inventory_turnover', 'delete'),
(gen_random_uuid(), 'scm:price_comparison:read', 'price comparison读取', 'scm_price_comparison', 'read'),
(gen_random_uuid(), 'scm:price_comparison:create', 'price comparison创建', 'scm_price_comparison', 'create'),
(gen_random_uuid(), 'scm:price_comparison:update', 'price comparison更新', 'scm_price_comparison', 'update'),
(gen_random_uuid(), 'scm:price_comparison:delete', 'price comparison删除', 'scm_price_comparison', 'delete')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Permissions: SRM (供应商关系)
-- =============================================

INSERT INTO core_permissions (id, code, name, resource, action) VALUES
(gen_random_uuid(), 'srm:read', '供应商关系模块访问', 'srm', 'read'),
(gen_random_uuid(), 'srm:dashboard:read', '供应商关系仪表盘', 'srm_dashboard', 'read'),
(gen_random_uuid(), 'srm:supplier:read', 'supplier读取', 'srm_supplier', 'read'),
(gen_random_uuid(), 'srm:supplier:create', 'supplier创建', 'srm_supplier', 'create'),
(gen_random_uuid(), 'srm:supplier:update', 'supplier更新', 'srm_supplier', 'update'),
(gen_random_uuid(), 'srm:supplier:delete', 'supplier删除', 'srm_supplier', 'delete'),
(gen_random_uuid(), 'srm:category:read', 'category读取', 'srm_category', 'read'),
(gen_random_uuid(), 'srm:category:create', 'category创建', 'srm_category', 'create'),
(gen_random_uuid(), 'srm:category:update', 'category更新', 'srm_category', 'update'),
(gen_random_uuid(), 'srm:category:delete', 'category删除', 'srm_category', 'delete'),
(gen_random_uuid(), 'srm:product:read', 'product读取', 'srm_product', 'read'),
(gen_random_uuid(), 'srm:product:create', 'product创建', 'srm_product', 'create'),
(gen_random_uuid(), 'srm:product:update', 'product更新', 'srm_product', 'update'),
(gen_random_uuid(), 'srm:product:delete', 'product删除', 'srm_product', 'delete'),
(gen_random_uuid(), 'srm:contract:read', 'contract读取', 'srm_contract', 'read'),
(gen_random_uuid(), 'srm:contract:create', 'contract创建', 'srm_contract', 'create'),
(gen_random_uuid(), 'srm:contract:update', 'contract更新', 'srm_contract', 'update'),
(gen_random_uuid(), 'srm:contract:delete', 'contract删除', 'srm_contract', 'delete'),
(gen_random_uuid(), 'srm:order:read', 'order读取', 'srm_order', 'read'),
(gen_random_uuid(), 'srm:order:create', 'order创建', 'srm_order', 'create'),
(gen_random_uuid(), 'srm:order:update', 'order更新', 'srm_order', 'update'),
(gen_random_uuid(), 'srm:order:delete', 'order删除', 'srm_order', 'delete'),
(gen_random_uuid(), 'srm:evaluation:read', 'evaluation读取', 'srm_evaluation', 'read'),
(gen_random_uuid(), 'srm:evaluation:create', 'evaluation创建', 'srm_evaluation', 'create'),
(gen_random_uuid(), 'srm:evaluation:update', 'evaluation更新', 'srm_evaluation', 'update'),
(gen_random_uuid(), 'srm:evaluation:delete', 'evaluation删除', 'srm_evaluation', 'delete'),
(gen_random_uuid(), 'srm:performance:read', 'performance读取', 'srm_performance', 'read'),
(gen_random_uuid(), 'srm:performance:create', 'performance创建', 'srm_performance', 'create'),
(gen_random_uuid(), 'srm:performance:update', 'performance更新', 'srm_performance', 'update'),
(gen_random_uuid(), 'srm:performance:delete', 'performance删除', 'srm_performance', 'delete'),
(gen_random_uuid(), 'srm:inquiry:read', 'inquiry读取', 'srm_inquiry', 'read'),
(gen_random_uuid(), 'srm:inquiry:create', 'inquiry创建', 'srm_inquiry', 'create'),
(gen_random_uuid(), 'srm:inquiry:update', 'inquiry更新', 'srm_inquiry', 'update'),
(gen_random_uuid(), 'srm:inquiry:delete', 'inquiry删除', 'srm_inquiry', 'delete'),
(gen_random_uuid(), 'srm:bidding:read', 'bidding读取', 'srm_bidding', 'read'),
(gen_random_uuid(), 'srm:bidding:create', 'bidding创建', 'srm_bidding', 'create'),
(gen_random_uuid(), 'srm:bidding:update', 'bidding更新', 'srm_bidding', 'update'),
(gen_random_uuid(), 'srm:bidding:delete', 'bidding删除', 'srm_bidding', 'delete'),
(gen_random_uuid(), 'srm:finance:read', 'finance读取', 'srm_finance', 'read'),
(gen_random_uuid(), 'srm:finance:create', 'finance创建', 'srm_finance', 'create'),
(gen_random_uuid(), 'srm:finance:update', 'finance更新', 'srm_finance', 'update'),
(gen_random_uuid(), 'srm:finance:delete', 'finance删除', 'srm_finance', 'delete'),
(gen_random_uuid(), 'srm:portal:read', 'portal读取', 'srm_portal', 'read'),
(gen_random_uuid(), 'srm:portal:create', 'portal创建', 'srm_portal', 'create'),
(gen_random_uuid(), 'srm:portal:update', 'portal更新', 'srm_portal', 'update'),
(gen_random_uuid(), 'srm:portal:delete', 'portal删除', 'srm_portal', 'delete'),
(gen_random_uuid(), 'srm:quotation:read', 'quotation读取', 'srm_quotation', 'read'),
(gen_random_uuid(), 'srm:quotation:create', 'quotation创建', 'srm_quotation', 'create'),
(gen_random_uuid(), 'srm:quotation:update', 'quotation更新', 'srm_quotation', 'update'),
(gen_random_uuid(), 'srm:quotation:delete', 'quotation删除', 'srm_quotation', 'delete')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Permissions: REPORT (报表中心)
-- =============================================

INSERT INTO core_permissions (id, code, name, resource, action) VALUES
(gen_random_uuid(), 'report:read', '报表中心模块访问', 'report', 'read'),
(gen_random_uuid(), 'report:dashboard:read', '报表中心仪表盘', 'report_dashboard', 'read'),
(gen_random_uuid(), 'report:design:read', 'design读取', 'report_design', 'read'),
(gen_random_uuid(), 'report:design:create', 'design创建', 'report_design', 'create'),
(gen_random_uuid(), 'report:design:update', 'design更新', 'report_design', 'update'),
(gen_random_uuid(), 'report:design:delete', 'design删除', 'report_design', 'delete'),
(gen_random_uuid(), 'report:builder:read', 'builder读取', 'report_builder', 'read'),
(gen_random_uuid(), 'report:builder:create', 'builder创建', 'report_builder', 'create'),
(gen_random_uuid(), 'report:builder:update', 'builder更新', 'report_builder', 'update'),
(gen_random_uuid(), 'report:builder:delete', 'builder删除', 'report_builder', 'delete'),
(gen_random_uuid(), 'report:schedule:read', 'schedule读取', 'report_schedule', 'read'),
(gen_random_uuid(), 'report:schedule:create', 'schedule创建', 'report_schedule', 'create'),
(gen_random_uuid(), 'report:schedule:update', 'schedule更新', 'report_schedule', 'update'),
(gen_random_uuid(), 'report:schedule:delete', 'schedule删除', 'report_schedule', 'delete'),
(gen_random_uuid(), 'report:subscription:read', 'subscription读取', 'report_subscription', 'read'),
(gen_random_uuid(), 'report:subscription:create', 'subscription创建', 'report_subscription', 'create'),
(gen_random_uuid(), 'report:subscription:update', 'subscription更新', 'report_subscription', 'update'),
(gen_random_uuid(), 'report:subscription:delete', 'subscription删除', 'report_subscription', 'delete'),
(gen_random_uuid(), 'report:template:read', 'template读取', 'report_template', 'read'),
(gen_random_uuid(), 'report:template:create', 'template创建', 'report_template', 'create'),
(gen_random_uuid(), 'report:template:update', 'template更新', 'report_template', 'update'),
(gen_random_uuid(), 'report:template:delete', 'template删除', 'report_template', 'delete')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Permissions: PM (项目管理)
-- =============================================

INSERT INTO core_permissions (id, code, name, resource, action) VALUES
(gen_random_uuid(), 'pm:read', '项目管理模块访问', 'pm', 'read'),
(gen_random_uuid(), 'pm:dashboard:read', '项目管理仪表盘', 'pm_dashboard', 'read'),
(gen_random_uuid(), 'pm:project:read', 'project读取', 'pm_project', 'read'),
(gen_random_uuid(), 'pm:project:create', 'project创建', 'pm_project', 'create'),
(gen_random_uuid(), 'pm:project:update', 'project更新', 'pm_project', 'update'),
(gen_random_uuid(), 'pm:project:delete', 'project删除', 'pm_project', 'delete'),
(gen_random_uuid(), 'pm:contract:read', 'contract读取', 'pm_contract', 'read'),
(gen_random_uuid(), 'pm:contract:create', 'contract创建', 'pm_contract', 'create'),
(gen_random_uuid(), 'pm:contract:update', 'contract更新', 'pm_contract', 'update'),
(gen_random_uuid(), 'pm:contract:delete', 'contract删除', 'pm_contract', 'delete'),
(gen_random_uuid(), 'pm:resource:read', 'resource读取', 'pm_resource', 'read'),
(gen_random_uuid(), 'pm:resource:create', 'resource创建', 'pm_resource', 'create'),
(gen_random_uuid(), 'pm:resource:update', 'resource更新', 'pm_resource', 'update'),
(gen_random_uuid(), 'pm:resource:delete', 'resource删除', 'pm_resource', 'delete'),
(gen_random_uuid(), 'pm:template:read', 'template读取', 'pm_template', 'read'),
(gen_random_uuid(), 'pm:template:create', 'template创建', 'pm_template', 'create'),
(gen_random_uuid(), 'pm:template:update', 'template更新', 'pm_template', 'update'),
(gen_random_uuid(), 'pm:template:delete', 'template删除', 'pm_template', 'delete'),
(gen_random_uuid(), 'pm:report:read', 'report读取', 'pm_report', 'read'),
(gen_random_uuid(), 'pm:report:create', 'report创建', 'pm_report', 'create'),
(gen_random_uuid(), 'pm:report:update', 'report更新', 'pm_report', 'update'),
(gen_random_uuid(), 'pm:report:delete', 'report删除', 'pm_report', 'delete'),
(gen_random_uuid(), 'pm:task:read', 'task读取', 'pm_task', 'read'),
(gen_random_uuid(), 'pm:task:create', 'task创建', 'pm_task', 'create'),
(gen_random_uuid(), 'pm:task:update', 'task更新', 'pm_task', 'update'),
(gen_random_uuid(), 'pm:task:delete', 'task删除', 'pm_task', 'delete')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Role Permission Mappings
-- =============================================

-- finance_manager -> finance
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
JOIN core_permissions p ON p.code LIKE 'finance:%'
WHERE r.name = 'finance_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- mes_manager -> mes
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
JOIN core_permissions p ON p.code LIKE 'mes:%'
WHERE r.name = 'mes_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- hrm_manager -> hrm
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
JOIN core_permissions p ON p.code LIKE 'hrm:%'
WHERE r.name = 'hrm_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- pdm_manager -> pdm
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
JOIN core_permissions p ON p.code LIKE 'pdm:%'
WHERE r.name = 'pdm_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- wms_manager -> wms
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
JOIN core_permissions p ON p.code LIKE 'wms:%'
WHERE r.name = 'wms_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ehs_manager -> ehs
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
JOIN core_permissions p ON p.code LIKE 'ehs:%'
WHERE r.name = 'ehs_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- lims_manager -> lims
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
JOIN core_permissions p ON p.code LIKE 'lims:%'
WHERE r.name = 'lims_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- crm_manager -> crm
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
JOIN core_permissions p ON p.code LIKE 'crm:%'
WHERE r.name = 'crm_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- qms_manager -> qms
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
JOIN core_permissions p ON p.code LIKE 'qms:%'
WHERE r.name = 'qms_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- scm_manager -> scm
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
JOIN core_permissions p ON p.code LIKE 'scm:%'
WHERE r.name = 'scm_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- srm_manager -> srm
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
JOIN core_permissions p ON p.code LIKE 'srm:%'
WHERE r.name = 'srm_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- report_manager -> report
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
JOIN core_permissions p ON p.code LIKE 'report:%'
WHERE r.name = 'report_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- pm_manager -> pm
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
JOIN core_permissions p ON p.code LIKE 'pm:%'
WHERE r.name = 'pm_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

