-- =============================================================
-- TOPEMS 性能优化索引脚本
-- 为核心业务表添加优化索引，提升查询性能
-- =============================================================

-- =============================================================
-- IAM 模块索引优化
-- =============================================================

-- 用户表复合索引：按角色和状态查询
CREATE INDEX IF NOT EXISTS idx_users_role_active ON iam.users(role, is_active);

-- 用户表复合索引：按部门和状态查询
CREATE INDEX IF NOT EXISTS idx_users_department_active ON iam.users(department, is_active);

-- 用户表：上次登录时间索引（用于会话管理）
CREATE INDEX IF NOT EXISTS idx_users_last_login ON iam.users(last_login_at DESC);

-- 用户角色关联表：用户ID索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON iam.user_roles(user_id);

-- 用户角色关联表：角色ID索引
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON iam.user_roles(role_id);

-- 角色权限关联表：角色ID索引
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON iam.role_permissions(role_id);

-- 角色权限关联表：权限ID索引
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON iam.role_permissions(permission_id);

-- =============================================================
-- SCM 模块索引优化
-- =============================================================

-- 供应商表：名称搜索索引（支持模糊查询）
CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm ON scm.suppliers USING gin (name gin_trgm_ops);

-- 供应商表：联系人搜索索引
CREATE INDEX IF NOT EXISTS idx_suppliers_contact_trgm ON scm.suppliers USING gin (contact_person gin_trgm_ops);

-- 供应商表：状态+分类复合索引
CREATE INDEX IF NOT EXISTS idx_suppliers_status_category ON scm.suppliers(status, category);

-- 供应商表：创建时间索引（用于分页排序）
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON scm.suppliers(created_at DESC);

-- 供应商表：风险等级索引
CREATE INDEX IF NOT EXISTS idx_suppliers_risk_level ON scm.suppliers(risk_level);

-- 供应商评估表：评估日期索引
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_date ON scm.supplier_evaluations(evaluation_date DESC);

-- 供应商评估表：供应商ID+状态复合索引
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_supplier_status ON scm.supplier_evaluations(supplier_id, status);

-- 采购订单表：订单日期索引
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON scm.purchase_orders(order_date DESC);

-- 采购订单表：供应商+状态复合索引
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_status ON scm.purchase_orders(supplier_id, status);

-- 采购订单表：状态索引（用于订单状态筛选）
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status_date ON scm.purchase_orders(status, order_date DESC);

-- 采购明细表：订单ID+状态复合索引
CREATE INDEX IF NOT EXISTS idx_purchase_items_order_status ON scm.purchase_items(order_id, status);

-- 审计日志表：时间索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON scm.audit_logs(changed_at DESC);

-- 审计日志表：表名+时间复合索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_date ON scm.audit_logs(table_name, changed_at DESC);

-- =============================================================
-- RS 科研模块索引优化
-- =============================================================

-- 项目表：所有者+状态复合索引
CREATE INDEX IF NOT EXISTS idx_projects_owner_status ON rs.projects(owner_id, status);

-- 项目表：名称搜索索引
CREATE INDEX IF NOT EXISTS idx_projects_name_trgm ON rs.projects USING gin (name gin_trgm_ops);

-- 项目表：日期范围索引
CREATE INDEX IF NOT EXISTS idx_projects_date_range ON rs.projects(start_date, end_date);

-- 实验表：项目ID+状态复合索引
CREATE INDEX IF NOT EXISTS idx_experiments_project_status ON rs.experiments(project_id, status);

-- 实验表：实验日期索引
CREATE INDEX IF NOT EXISTS idx_experiments_date ON rs.experiments(experiment_date);

-- =============================================================
-- LIMS 实验室模块索引优化
-- =============================================================

-- 样品表：样品编号搜索索引
CREATE INDEX IF NOT EXISTS idx_samples_code_trgm ON lims.samples USING gin (sample_code gin_trgm_ops);

-- 样品表：采集日期索引
CREATE INDEX IF NOT EXISTS idx_samples_collection_date ON lims.samples(collection_date DESC);

-- 样品表：状态+存储位置复合索引
CREATE INDEX IF NOT EXISTS idx_samples_status_location ON lims.samples(status, storage_location);

-- 测试结果表：样品ID+测试日期复合索引
CREATE INDEX IF NOT EXISTS idx_test_results_sample_date ON lims.test_results(sample_id, test_date DESC);

-- 测试结果表：测试人员索引
CREATE INDEX IF NOT EXISTS idx_test_results_tester ON lims.test_results(tester_id);

-- =============================================================
-- QMS 质量管理模块索引优化
-- =============================================================

-- 质量标准表：分类+版本复合索引
CREATE INDEX IF NOT EXISTS idx_standards_category_version ON qms.standards(category, version DESC);

-- 质量标准表：生效日期索引
CREATE INDEX IF NOT EXISTS idx_standards_effective_date ON qms.standards(effective_date);

-- 质量检查表：标准ID+检查日期复合索引
CREATE INDEX IF NOT EXISTS idx_quality_checks_standard_date ON qms.quality_checks(standard_id, check_date DESC);

-- 质量检查表：检查人员索引
CREATE INDEX IF NOT EXISTS idx_quality_checks_inspector ON qms.quality_checks(inspector_id);

-- =============================================================
-- EHS 环境健康安全模块索引优化
-- =============================================================

-- 安全检查表：检查类型+状态复合索引
CREATE INDEX IF NOT EXISTS idx_safety_checks_type_status ON ehs.safety_checks(check_type, status);

-- 安全检查表：位置+风险等级复合索引
CREATE INDEX IF NOT EXISTS idx_safety_checks_location_risk ON ehs.safety_checks(location, risk_level);

-- 安全检查表：截止日期索引（用于预警）
CREATE INDEX IF NOT EXISTS idx_safety_checks_due_date ON ehs.safety_checks(due_date);

-- 事件报告表：事件类型+严重程度复合索引
CREATE INDEX IF NOT EXISTS idx_incidents_type_severity ON ehs.incidents(incident_type, severity);

-- 事件报告表：事件日期索引
CREATE INDEX IF NOT EXISTS idx_incidents_date ON ehs.incidents(incident_date DESC);

-- =============================================================
-- SRM 供应商关系模块索引优化
-- =============================================================

-- 供应商表：名称搜索索引
CREATE INDEX IF NOT EXISTS idx_srm_suppliers_name_trgm ON srm.suppliers USING gin (supplier_name gin_trgm_ops);

-- 供应商表：评分索引（用于排序）
CREATE INDEX IF NOT EXISTS idx_srm_suppliers_rating ON srm.suppliers(rating DESC);

-- 采购订单表：供应商+状态+日期复合索引
CREATE INDEX IF NOT EXISTS idx_srm_po_supplier_status_date ON srm.purchase_orders(supplier_id, status, order_date DESC);

-- =============================================================
-- PDM 产品数据模块索引优化
-- =============================================================

-- 产品表：分类+状态复合索引
CREATE INDEX IF NOT EXISTS idx_products_category_status ON pdm.products(category, status);

-- 产品表：名称搜索索引
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON pdm.products USING gin (product_name gin_trgm_ops);

-- =============================================================
-- Flow 工作流模块索引优化
-- =============================================================

-- 工作流实例表：状态+创建时间复合索引（用于查询待处理任务）
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status_created ON flow.workflow_instances(status, created_at DESC);

-- 审批表：审批人+状态复合索引（用于查询我的审批任务）
CREATE INDEX IF NOT EXISTS idx_approvals_assignee_status ON flow.approvals(assignee_id, status);

-- 审批表：超时时间索引（用于超时提醒）
CREATE INDEX IF NOT EXISTS idx_approvals_timeout ON flow.approvals(timeout_at);

-- =============================================================
-- Doc 文档模块索引优化
-- =============================================================

-- 文档表：父文档ID索引（用于树形结构查询）
CREATE INDEX IF NOT EXISTS idx_documents_parent ON doc.documents(parent_id);

-- 文档表：标题搜索索引
CREATE INDEX IF NOT EXISTS idx_documents_title_trgm ON doc.documents USING gin (title gin_trgm_ops);

-- =============================================================
-- 通知模块索引优化
-- =============================================================

-- [2026-09-08 遗留⑨闭环] idx_notifications_user_unread_date 已删除：public.notifications 已判死
-- （活版本 unified_core.notifications，索引见 database/init/01_rebuild_database.sql:776-778）

-- =============================================================
-- Mobile 模块索引优化
-- =============================================================

-- [2026-09-08 遗留⑨闭环] Mobile 悬空索引已删除：public.patrol_records / public.scan_records 已判死
-- （活版本 mobile schema；且下列索引引用的 location/patrol_time/code/scan_time 列在 public 版定义中本就不存在，
--  属历史桌面版结构残留，建表即失败）

-- 检验记录表：分类+状态复合索引
CREATE INDEX IF NOT EXISTS idx_inspection_records_category_status ON inspection_records(category, status);

-- 检验记录表：检验时间索引
CREATE INDEX IF NOT EXISTS idx_inspection_records_inspection_time ON inspection_records(inspection_time DESC);

-- =============================================================
-- ERP 模块索引优化
-- =============================================================

-- 生产计划表：产品编码索引
CREATE INDEX IF NOT EXISTS idx_production_plans_product_code ON production_plans(product_code);

-- 生产计划表：状态+日期复合索引
CREATE INDEX IF NOT EXISTS idx_production_plans_status_date ON production_plans(status, start_date, end_date);

-- 生产计划表：创建人索引
CREATE INDEX IF NOT EXISTS idx_production_plans_created_by ON production_plans(created_by);

-- 供应链订单表：订单类型+状态复合索引
CREATE INDEX IF NOT EXISTS idx_supply_chain_orders_type_status ON supply_chain_orders(order_type, status);

-- 供应链订单表：供应商/客户索引
CREATE INDEX IF NOT EXISTS idx_supply_chain_orders_supplier ON supply_chain_orders(supplier_customer);

-- 供应链订单表：订单日期索引
CREATE INDEX IF NOT EXISTS idx_supply_chain_orders_order_date ON supply_chain_orders(order_date DESC);

-- 财务记录表：记录类型+类别复合索引
CREATE INDEX IF NOT EXISTS idx_financial_records_type_category ON financial_records(record_type, category);

-- 财务记录表：交易日期索引
CREATE INDEX IF NOT EXISTS idx_financial_records_transaction_date ON financial_records(transaction_date DESC);

-- =============================================================
-- 启用 pg_trgm 扩展（用于模糊搜索索引）
-- =============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- =============================================================
-- 性能优化索引创建完成
-- =============================================================
