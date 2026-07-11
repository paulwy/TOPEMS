# TOPEMS 前后端字段映射对照表

> 最后更新：2026-07-10
> 适用版本：V5.6

---

## 目录

1. [金融模块 (Finance)](#1-金融模块-finance)
2. [HRM 模块 (Employee)](#2-hrm-模块-employee)
3. [CRM 模块 (Customer)](#3-crm-模块-customer)
4. [移动端模块 (Mobile)](#4-移动端模块-mobile)
5. [通用类型映射](#5-通用类型映射)
6. [命名规范说明](#6-命名规范说明)

---

## 1. 金融模块 (Finance)

### 1.1 Voucher / FinancialVoucher

| 后端字段 (snake_case) | 前端字段 (camelCase) | 类型 | 说明 |
|---|---|---|---|
| `id` | `id` | string/Uuid | 主键 |
| `voucher_number` | `voucher_no` / `voucher_number` | string | 凭证编号（双字段兼容） |
| `voucher_date` | `voucher_date` | DateTime/string | 凭证日期 |
| `period` | `period` | string | 期间 |
| `attachment_count` | `attachment_count` | Option<i32>/number | 附件数量 |
| `summary` | `summary` | Option<string> | 摘要 |
| `maker_id` | `submitter_id` / `maker_id` | Option<Uuid>/string | 制单人ID |
| `maker_name` | `submitter_name` / `maker_name` | Option<string> | 制单人姓名 |
| `checker_id` | `approver_id` / `checker_id` | Option<Uuid>/string | 审核人ID |
| `checker_name` | `approver_name` / `checker_name` | Option<string> | 审核人姓名 |
| `bookkeeper_id` | `poster_id` / `bookkeeper_id` | Option<Uuid>/string | 记账人ID |
| `bookkeeper_name` | `poster_name` / `bookkeeper_name` | Option<string> | 记账人姓名 |
| `status` | `status` | string | 状态 |
| `total_debit` | `total_debit` | f64/number | 借方合计 |
| `total_credit` | `total_credit` | f64/number | 贷方合计 |
| `source_system` | `source_module` | Option<string> | 来源系统 |
| `source_id` | `source_id` | Option<string> | 来源ID |
| `project_id` | - | Option<Uuid> | 项目ID（前端通过 VoucherEntry 获取） |
| `contract_id` | - | Option<Uuid> | 合同ID（前端通过 VoucherEntry 获取） |
| `created_at` | `created_at` | DateTime/string | 创建时间 |
| `updated_at` | `updated_at` | DateTime/string | 更新时间 |

### 1.2 VoucherItem / VoucherEntry

| 后端字段 | 前端字段 | 类型 | 说明 |
|---|---|---|---|
| `id` | `id` | string/Uuid | 主键 |
| `voucher_id` | `voucher_id` | Uuid/string | 凭证ID |
| `line_number` | `line_no` | i32/number | 行号 |
| `subject_code` | `account_code` | string | 科目编码 |
| `subject_name` | `account_name` | string | 科目名称 |
| `summary` | `summary` | Option<string> | 摘要 |
| `debit_amount` | `debit_amount` | f64/number | 借方金额 |
| `credit_amount` | `credit_amount` | f64/number | 贷方金额 |
| `quantity` | `quantity` | Option<f64>/number | 数量 |
| `unit` | `unit_price` | Option<string>/number | 单位/单价（含义不同） |
| `price` | - | Option<f64> | 单价（前端使用 unit_price） |
| `department_id` | `department_id` | Option<Uuid>/string | 部门ID |
| `project_id` | `project_id` | Option<Uuid>/string | 项目ID |
| `contract_id` | `contract_id` | Option<Uuid>/string | 合同ID |

### 1.3 CollectionRecord

| 后端字段 | 前端字段 | 类型 | 说明 |
|---|---|---|---|
| `id` | `id` | string/Uuid | 主键 |
| `collection_no` | `collection_no` | string | 收款单号 |
| `customer_id` | `customer_id` | Option<Uuid>/string | 客户ID（可选） |
| `customer_name` | `customer_name` | Option<string> | 客户名称（可选） |
| `amount` | `amount` | f64/number | 金额 |
| `collection_date` | `collection_date` | Option<DateTime>/string | 收款日期 |
| `invoice_ids` | `invoice_ids` | Option<serde_json::Value>/string[] | 发票ID列表（可选） |
| `bank_account_id` | `bank_account_id` | Option<Uuid>/string | 银行账户ID（可选） |
| `bank_account_no` | `bank_account_no` | Option<string> | 银行账号（可选） |
| `bank_name` | `bank_name` | Option<string> | 银行名称（可选） |
| `voucher_id` | `voucher_id` | Option<Uuid>/string | 凭证ID |
| `voucher_no` | `voucher_no` | Option<string> | 凭证号 |
| `status` | `status` | string | 状态 |
| `created_at` | `created_at` | DateTime/string | 创建时间 |
| `created_by` | `created_by` | Option<Uuid>/string | 创建人 |

### 1.4 PaymentRecord

| 后端字段 | 前端字段 | 类型 | 说明 |
|---|---|---|---|
| `id` | `id` | string/Uuid | 主键 |
| `payment_no` | `payment_no` | string | 付款单号 |
| `supplier_id` | `supplier_id` | Option<Uuid>/string | 供应商ID（可选） |
| `supplier_name` | `supplier_name` | Option<string> | 供应商名称（可选） |
| `amount` | `amount` | f64/number | 金额 |
| `payment_date` | `payment_date` | Option<DateTime>/string | 付款日期 |
| `invoice_ids` | `invoice_ids` | Option<serde_json::Value>/string[] | 发票ID列表（可选） |
| `bank_account_id` | `bank_account_id` | Option<Uuid>/string | 银行账户ID（可选） |
| `bank_account_no` | `bank_account_no` | Option<string> | 银行账号（可选） |
| `bank_name` | `bank_name` | Option<string> | 银行名称（可选） |
| `voucher_id` | `voucher_id` | Option<Uuid>/string | 凭证ID |
| `voucher_no` | `voucher_no` | Option<string> | 凭证号 |
| `status` | `status` | string | 状态 |
| `created_at` | `created_at` | DateTime/string | 创建时间 |
| `created_by` | `created_by` | Option<Uuid>/string | 创建人 |

### 1.5 Expense

| 后端字段 | 前端字段 | 类型 | 说明 |
|---|---|---|---|
| `id` | `id` | string/Uuid | 主键 |
| `expense_number` | - | string | 费用单号（前端未定义） |
| `applicant_name` | - | Option<string> | 申请人名称 |
| `department_id` | - | Option<Uuid> | 部门ID |
| `project_id` | - | Option<Uuid> | 项目ID |
| `contract_id` | - | Option<Uuid> | 合同ID |
| `budget_item_id` | - | Option<Uuid> | 预算项ID |
| `expense_type` | - | Option<string> | 费用类型 |
| `amount` | - | f64 | 金额 |
| `description` | - | Option<string> | 描述 |
| `expense_date` | - | Option<DateTime> | 费用日期 |
| `receipt_count` | - | Option<i32> | 票据数量 |
| `status` | - | string | 状态 |
| `approver_id` | - | Option<Uuid> | 审批人ID |
| `approved_at` | - | Option<DateTime> | 审批时间 |
| `reimbursed_at` | - | Option<DateTime> | 报销时间 |

---

## 2. HRM 模块 (Employee)

### 2.1 Employee

| 后端字段 | 前端字段 | 类型 | 说明 |
|---|---|---|---|
| `id` | `id` | string/Uuid | 主键 |
| `tenant_id` | `tenant_id` | Uuid/string | 租户ID |
| `company_id` | `company_id` | Option<Uuid>/string | 公司ID |
| `department_id` | `department_id` | Option<Uuid>/string | 部门ID |
| `position_id` | `position_id` | Option<Uuid>/string | 职位ID |
| `employee_number` | - | string | 员工编号 |
| `name` | `name` | string | 姓名 |
| `gender` | `gender` | Option<string> | 性别 |
| `hire_date` | `hire_date` | Option<NaiveDate>/string | 入职日期 |
| `email` | `email` | Option<string> | 邮箱 |
| `phone` | `phone` | Option<string> | 电话 |
| `id_card_number` | - | Option<string> | 身份证号 |
| `address` | - | Option<string> | 地址 |
| `status` | `status` | string | 状态 |
| `created_at` | `created_at` | DateTime/string | 创建时间 |
| `updated_at` | `updated_at` | DateTime/string | 更新时间 |

### 2.2 EmployeeFinance

| 后端字段 | 前端字段 | 类型 | 说明 |
|---|---|---|---|
| `employee_id` | `employee_id` | Uuid/string | 员工ID |
| `base_salary` | `base_salary` | Option<Decimal>/number | 基本工资 |
| `bonus` | `bonus` | Option<Decimal>/number | 奖金 |
| `allowance` | `allowance` | Option<Decimal>/number | 津贴 |
| `social_security` | `social_security` | Option<Decimal>/number | 社保 |
| `housing_fund` | `housing_fund` | Option<Decimal>/number | 公积金 |
| `personal_income_tax` | `personal_income_tax` | Option<Decimal>/number | 个税 |
| `net_salary` | `net_salary` | Option<Decimal>/number | 实发工资 |
| `bank_account` | `bank_account` | Option<string> | 银行账号 |
| `bank_name` | `bank_name` | Option<string> | 银行名称 |
| `cost_center` | `cost_center` | Option<string> | 成本中心 |
| `payroll_bank_account` | `payroll_bank_account` | Option<string> | 发薪银行账号 |
| `salary_payment_status` | `salary_payment_status` | string | 薪资发放状态 |
| `annual_salary` | `annual_salary` | Option<Decimal>/number | 年薪 |
| `hourly_rate` | `hourly_rate` | Option<Decimal>/number | 小时费率 |
| `tax_exempt_allowance` | `tax_exempt_allowance` | Option<Decimal>/number | 免税津贴 |
| `social_security_company` | `social_security_company` | Option<Decimal>/number | 公司承担社保 |
| `housing_fund_company` | `housing_fund_company` | Option<Decimal>/number | 公司承担公积金 |
| `total_compensation` | `total_compensation` | Option<Decimal>/number | 总薪酬 |

---

## 3. CRM 模块 (Customer)

### 3.1 Customer

| 后端字段 | 前端字段 | 类型 | 说明 |
|---|---|---|---|
| `id` | `id` | string/Uuid | 主键 |
| `tenant_id` | `tenant_id` | Uuid/string | 租户ID |
| `name` | `name` | string | 客户名称 |
| `code` | `code` | Option<string> | 客户编码 |
| `industry` | `industry` | Option<string> | 行业 |
| `company_size` | - | Option<string> | 公司规模 |
| `website` | - | Option<string> | 网站 |
| `email` | `contact_email` | Option<string> | 邮箱 |
| `phone` | `contact_phone` | Option<string> | 电话 |
| `fax` | - | Option<string> | 传真 |
| `address` | `address` | Option<string> | 地址 |
| `city` | `city` | Option<string> | 城市 |
| `province` | `province` | Option<string> | 省份 |
| `country` | - | Option<string> | 国家 |
| `postal_code` | - | Option<string> | 邮编 |
| `status` | `status` | string | 状态 |
| `customer_type` | - | Option<string> | 客户类型 |
| `source` | - | Option<string> | 来源 |
| `rating` | - | Option<string> | 评级 |
| `revenue` | - | Option<f64> | 收入 |
| `employee_count` | - | Option<i32> | 员工数 |
| `notes` | - | Option<string> | 备注 |
| `created_at` | `created_at` | DateTime/string | 创建时间 |
| `updated_at` | `updated_at` | DateTime/string | 更新时间 |

---

## 4. 移动端模块 (Mobile)

### 4.1 MobileTask / Task

| 后端字段 | 前端字段 | 类型 | 说明 |
|---|---|---|---|
| `id` | `id` | string/Uuid | 主键 |
| `tenant_id` | `tenant_id` | Uuid/string | 租户ID |
| `title` | `title` | string | 标题 |
| `description` | `description` | Option<string> | 描述 |
| `task_type` | `task_type` | string | 任务类型 |
| `priority` | `priority` | string | 优先级 |
| `status` | `status` | string | 状态 |
| `assignee` | `assignee` | string | 负责人 |
| `location_lat` | `location_lat` | f64/number | 纬度 |
| `location_lng` | `location_lng` | f64/number | 经度 |
| `due_date` | `due_date` | Option<NaiveDate>/string | 截止日期 |
| `completed_at` | `completed_at` | Option<DateTime>/string | 完成时间 |
| `created_at` | `created_at` | DateTime/string | 创建时间 |
| `updated_at` | `updated_at` | DateTime/string | 更新时间 |

### 4.2 MobileApproval / ApprovalTask

| 后端字段 | 前端字段 | 类型 | 说明 |
|---|---|---|---|
| `id` | `id` | string/Uuid | 主键 |
| `tenant_id` | `tenant_id` | Uuid/string | 租户ID |
| `user_id` | - | Uuid | 用户ID |
| `approval_type` | `approval_type` | string | 审批类型 |
| `status` | `status` | string | 状态 |
| `title` | `title` | string | 标题 |
| `description` | `description` | Option<string> | 描述 |
| `data` | `data` | Option<serde_json::Value>/Record | 业务数据 |
| `task_name` | `task_name` | Option<string> | 任务名称 |
| `task_id` | `task_id` | Option<string> | 任务ID |
| `process_name` | - | Option<string> | 流程名称 |
| `process_instance_id` | - | Option<string> | 流程实例ID |
| `process_definition_id` | - | Option<string> | 流程定义ID |
| `priority` | `priority` | Option<string> | 优先级 |
| `due_date` | `due_date` | Option<DateTime>/string | 截止日期 |
| `comment` | - | Option<string> | 评论 |
| `business_title` | - | Option<string> | 业务标题 |
| `business_key` | - | Option<string> | 业务Key |
| `assignee_name` | `assignee_name` | Option<string> | 处理人姓名 |
| `assignee_id` | `assignee_id` | Option<string> | 处理人ID |
| `applicant_name` | `applicant_name` | Option<string> | 申请人姓名 |
| `applicant_id` | `applicant_id` | Option<string> | 申请人ID |
| `created_at` | `created_at` | DateTime/string | 创建时间 |
| `updated_at` | - | DateTime | 更新时间 |

### 4.3 PushNotification / Notification

| 后端字段 | 前端字段 | 类型 | 说明 |
|---|---|---|---|
| `id` | `id` | string/Uuid | 主键 |
| `tenant_id` | `tenant_id` | Uuid/string | 租户ID |
| `title` | `title` | string | 标题 |
| `body` | `body` | string | 内容 |
| `notification_type` | `notification_type` | string | 通知类型 |
| `data` | `data` | Option<serde_json::Value>/Record | 附加数据 |
| `target_type` | `target_type` | string | 目标类型 |
| `target_ids` | - | Vec<String> | 目标ID列表 |
| `status` | - | string | 状态 |
| `sent_count` | - | i32 | 发送数量 |
| `delivered_count` | - | i32 | 送达数量 |
| `clicked_count` | - | i32 | 点击数量 |
| `created_at` | `created_at` | DateTime/string | 创建时间 |
| `sent_at` | - | Option<DateTime> | 发送时间 |

### 4.4 PushDevice / DeviceInfo

| 后端字段 | 前端字段 | 类型 | 说明 |
|---|---|---|---|
| `id` | `id` | string/Uuid | 主键 |
| `tenant_id` | `tenant_id` | Uuid/string | 租户ID |
| `user_id` | - | Uuid | 用户ID |
| `device_token` | `device_token` | string | 设备Token |
| `platform` | `platform` | string | 平台 |
| `device_model` | `device_model` | Option<string> | 设备型号 |
| `app_version` | `app_version` | Option<string> | 应用版本 |
| `os_version` | `os_version` | Option<string> | 系统版本 |
| `is_active` | `is_active` | bool | 是否激活 |
| `created_at` | `created_at` | DateTime/string | 创建时间 |
| `updated_at` | `updated_at` | DateTime/string | 更新时间 |

---

## 5. 通用类型映射

### 5.1 基础类型映射

| Rust 类型 | TypeScript 类型 | 说明 |
|---|---|---|
| `Uuid` | `string` | UUID 字符串 |
| `String` | `string` | 字符串 |
| `i32` | `number` | 32位整数 |
| `i64` | `number` | 64位整数 |
| `f64` | `number` | 浮点数 |
| `bool` | `boolean` | 布尔值 |
| `DateTime<Utc>` | `string` | ISO 8601 日期时间 |
| `NaiveDate` | `string` | ISO 8601 日期 |
| `Option<T>` | `T \| undefined` | 可选值 |
| `Vec<T>` | `T[]` | 数组 |
| `serde_json::Value` | `Record<string, unknown>` | JSON 值 |
| `Decimal` | `number` | 高精度小数 |

### 5.2 枚举类型映射

| 后端枚举 | 前端类型 | 说明 |
|---|---|---|
| `ExpenseStatus` | `'pending' \| 'approved' \| 'reimbursed' \| 'rejected'` | 费用状态 |
| `ReceivableStatus` | `'pending' \| 'partial' \| 'paid' \| 'overdue'` | 应收状态 |
| `PayableStatus` | `'pending' \| 'partial' \| 'paid' \| 'overdue'` | 应付状态 |

---

## 6. 命名规范说明

### 6.1 字段命名差异

| 场景 | 后端 (Rust) | 前端 (TypeScript) | 示例 |
|---|---|---|---|
| 标准字段 | snake_case | camelCase | `tenant_id` → `tenantId` |
| 角色命名 | maker/checker/bookkeeper | submitter/approver/poster | 制单/审核/记账角色 |
| 编号字段 | `voucher_number` | `voucher_no` | 凭证编号 |

### 6.2 兼容策略

为确保前后端兼容，前端类型采用以下策略：
1. **双字段兼容**：同时保留 snake_case 和 camelCase 字段（如 `voucher_no` 和 `voucher_number`）
2. **角色别名**：保留两种角色命名方式（如 `maker_id` 和 `submitter_id`）
3. **可选字段**：后端 `Option<T>` 对应前端 `T \| undefined`
4. **日期格式**：统一使用 ISO 8601 字符串格式

### 6.3 注意事项

1. **tenant_id**：所有后端模型均包含 `tenant_id`，前端类型应确保包含此字段以支持多租户
2. **日期类型**：后端 `DateTime<Utc>` 序列化后为 ISO 8601 字符串（带时区），`NaiveDate` 为不带时区的日期字符串
3. **金额类型**：后端使用 `f64` 或 `Decimal`，前端统一使用 `number`，注意精度问题
4. **JSON 字段**：后端 `serde_json::Value` 对应前端 `Record<string, unknown>`，使用时需进行类型断言

---

## 附录：字段映射检查清单

### ✅ 已对齐的类型

| 类型 | 对齐状态 | 备注 |
|---|---|---|
| `Voucher` / `FinancialVoucher` | ✅ | 已添加双字段兼容 |
| `Customer` | ✅ | 已添加 `tenant_id` |
| `Supplier` | ✅ | 已添加 `tenant_id` |
| `CollectionRecord` | ✅ | 已修正字段可选性 |
| `PaymentRecord` | ✅ | 已修正字段可选性 |
| `Employee` | ✅ | 字段基本一致 |
| `Task` | ✅ | 字段基本一致 |
| `ApprovalTask` | ✅ | 字段基本一致 |

### ⚠️ 需要关注的差异

| 类型 | 差异说明 | 建议 |
|---|---|---|
| `VoucherItem` vs `VoucherEntry` | 科目字段命名不同 (`subject_*` vs `account_*`) | 前端使用 `account_*` 命名 |
| `EmployeeFinance` | 后端使用 `Decimal`，前端使用 `number` | 注意精度问题 |
| `Customer` | 后端有较多业务字段前端未定义 | 根据需求逐步添加 |

---

> **文档维护**：此文档应在每次前后端类型变更时同步更新，确保开发团队使用一致的字段定义。