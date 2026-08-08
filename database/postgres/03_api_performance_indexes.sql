-- =============================================================
-- TOPEMS API 性能优化索引脚本
-- 补充高频查询所需的索引，优化 API 响应时间
-- =============================================================

-- 启用 pg_trgm 扩展（用于模糊搜索）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================
-- HRM 模块索引优化
-- =============================================================

-- 员工表：姓名模糊搜索索引（用于员工列表搜索）
CREATE INDEX IF NOT EXISTS idx_employees_name_trgm ON hrm.employees USING gin (name gin_trgm_ops);

-- 员工表：工号模糊搜索索引
CREATE INDEX IF NOT EXISTS idx_employees_number_trgm ON hrm.employees USING gin (employee_number gin_trgm_ops);

-- 员工表：状态+创建时间复合索引（用于按状态筛选并按时间排序）
CREATE INDEX IF NOT EXISTS idx_employees_status_created ON hrm.employees(status, created_at DESC);

-- 员工表：租户ID+状态复合索引（多租户优化）
CREATE INDEX IF NOT EXISTS idx_employees_tenant_status ON hrm.employees(tenant_id, status);

-- 员工表：租户ID+部门ID+状态复合索引（多租户+部门筛选优化）
CREATE INDEX IF NOT EXISTS idx_employees_tenant_dept_status ON hrm.employees(tenant_id, department_id, status);

-- 合同表：员工ID+状态复合索引（查询员工合同）
CREATE INDEX IF NOT EXISTS idx_contracts_employee_status ON hrm.contracts(employee_id, status);

-- 合同表：到期日期索引（用于合同到期提醒）
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON hrm.contracts(end_date);

-- 考勤表：员工ID+日期唯一索引（防止重复考勤）
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_employee_date_unique ON hrm.attendance_records(employee_id, date);

-- 薪资表：员工ID+期间唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_employee_period_unique ON hrm.payroll_records(employee_id, period_year, period_month);

-- 请假表：审批状态+日期复合索引（查询待审批请假）
CREATE INDEX IF NOT EXISTS idx_leave_approval_status ON hrm.leave_records(approval_status, start_date);

-- =============================================================
-- ERP 模块索引优化
-- =============================================================

-- 费用报销表：申请人+状态复合索引
CREATE INDEX IF NOT EXISTS idx_expenses_applicant_status ON erp.expenses(applicant_name, status);

-- 费用报销表：部门ID+状态复合索引
CREATE INDEX IF NOT EXISTS idx_expenses_dept_status ON erp.expenses(department_id, status);

-- 费用报销表：费用类型+状态复合索引
CREATE INDEX IF NOT EXISTS idx_expenses_type_status ON erp.expenses(expense_type, status);

-- 费用报销表：报销单号模糊搜索
CREATE INDEX IF NOT EXISTS idx_expenses_number_trgm ON erp.expenses USING gin (expense_number gin_trgm_ops);

-- 预算表：部门ID+财年复合索引
CREATE INDEX IF NOT EXISTS idx_budgets_dept_year ON erp.budgets(department_id, fiscal_year);

-- 预算表：预算类型+状态复合索引
CREATE INDEX IF NOT EXISTS idx_budgets_type_status ON erp.budgets(budget_type, status);

-- 应收账款表：客户名称+状态复合索引
CREATE INDEX IF NOT EXISTS idx_receivables_customer_status ON erp.receivables(customer_name, status);

-- 应收账款表：发票号模糊搜索
CREATE INDEX IF NOT EXISTS idx_receivables_number_trgm ON erp.receivables USING gin (invoice_number gin_trgm_ops);

-- 应付账款表：供应商名称+状态复合索引
CREATE INDEX IF NOT EXISTS idx_payables_supplier_status ON erp.payables(supplier_name, status);

-- 应付账款表：发票号模糊搜索
CREATE INDEX IF NOT EXISTS idx_payables_number_trgm ON erp.payables USING gin (invoice_number gin_trgm_ops);

-- =============================================================
-- 财务凭证表索引优化
-- =============================================================

-- 凭证表：会计期间+状态复合索引
CREATE INDEX IF NOT EXISTS idx_financial_vouchers_period_status ON erp.financial_vouchers(period, status);

-- 凭证表：制单人ID+创建时间复合索引
CREATE INDEX IF NOT EXISTS idx_financial_vouchers_maker_created ON erp.financial_vouchers(maker_id, created_at DESC);

-- 凭证明细表：科目代码+日期复合索引（用于账簿查询）
CREATE INDEX IF NOT EXISTS idx_voucher_items_subject_date ON public.voucher_items(subject_code, created_at DESC);

-- =============================================================
-- 通用索引优化（适用于所有服务）
-- =============================================================

-- 审计日志表：实体类型+实体ID+时间复合索引（查询特定实体的变更历史）
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_time ON erp.audit_logs(entity_type, entity_id, created_at DESC);

-- 审计日志表：用户ID+操作+时间复合索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON erp.audit_logs(user_id, action, created_at DESC);

-- =============================================================
-- 分析完成
-- =============================================================
