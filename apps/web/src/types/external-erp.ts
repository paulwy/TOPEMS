/**
 * 外部ERP系统适配器类型定义
 * 支持金蝶(Kingdee)、用友(Yonyou)、SAP等主流ERP系统
 */

// ============================================
// 一、ERP系统类型定义
// ============================================

/**
 * 外部ERP系统类型
 */
export type ExternalErpType = "kingdee" | "yonyou" | "sap";

/**
 * ERP连接状态
 */
export type ErpConnectionStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "syncing";

/**
 * ERP同步方向
 */
export type SyncDirection = "import" | "export" | "bidirectional";

/**
 * ERP同步模式
 */
export type SyncMode = "realtime" | "scheduled" | "manual";

/**
 * ERP数据同步状态
 */
export type ErpSyncStatus = "pending" | "syncing" | "completed" | "failed";

/**
 * ERP科目映射方向
 */
export type AccountMappingDirection =
  | "to_external"
  | "from_external"
  | "bidirectional";

// ============================================
// 二、连接配置
// ============================================

/**
 * ERP连接配置基类
 */
export interface ErpConnectionConfig {
  id: string;
  name: string; // 连接名称
  type: ExternalErpType; // ERP系统类型
  status: ErpConnectionStatus; // 连接状态

  // 连接信息
  api_url: string; // API地址
  api_version?: string; // API版本
  timeout: number; // 超时时间(ms)

  // 认证信息（加密存储）
  app_key?: string; // 应用Key
  app_secret?: string; // 应用密钥
  access_token?: string; // 访问令牌
  refresh_token?: string; // 刷新令牌
  token_expires_at?: string; // 令牌过期时间

  // 同步配置
  sync_direction: SyncDirection; // 同步方向
  sync_mode: SyncMode; // 同步模式
  sync_interval?: number; // 同步间隔(分钟)
  last_sync_at?: string; // 最后同步时间

  // 公司映射
  company_mappings: CompanyMapping[]; // 公司映射关系

  // 状态
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 金蝶连接配置
 */
export interface KingdeeConnectionConfig extends ErpConnectionConfig {
  type: "kingdee";
  datacenter_id?: string; // 数据中心ID
  language?: string; // 语言: zh_CN, en_US
  format?: string; // 数据格式: JSON, XML
}

/**
 * 用友连接配置
 */
export interface YonyouConnectionConfig extends ErpConnectionConfig {
  type: "yonyou";
  tenant_id?: string; // 租户ID
  region?: string; // 区域: cn, us
  environment?: "sandbox" | "production";
}

/**
 * SAP连接配置
 */
export interface SapConnectionConfig extends ErpConnectionConfig {
  type: "sap";
  client: string; // SAP Client
  system_number?: string; // 系统编号
  router?: string; // 路由器字符串
  plantMappings?: PlantMapping[]; // 工厂映射
}

/**
 * 公司映射
 */
export interface CompanyMapping {
  local_company_id: string; // 本地公司ID
  local_company_name: string; // 本地公司名称
  external_company_code: string; // 外部ERP公司编码
  external_company_name: string; // 外部ERP公司名称
  is_default?: boolean; // 是否默认公司
}

/**
 * 工厂映射（SAP）
 */
export interface PlantMapping {
  local_plant_id: string;
  local_plant_name: string;
  external_plant_code: string;
  external_plant_name: string;
}

// ============================================
// 三、数据映射规则
// ============================================

/**
 * 映射规则通用字段
 */
export interface BaseMappingRule {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  priority: number; // 优先级，数字越小优先级越高
  condition?: string; // 映射条件表达式
  created_at: string;
  updated_at: string;
}

/**
 * 科目映射规则
 */
export interface AccountMappingRule extends BaseMappingRule {
  local_account_id: string; // 本地科目ID
  local_account_code: string; // 本地科目编码
  local_account_name: string; // 本地科目名称
  external_account_code: string; // 外部科目编码
  external_account_name: string; // 外部科目名称
  direction: AccountMappingDirection;
}

/**
 * 客户映射规则
 */
export interface CustomerMappingRule extends BaseMappingRule {
  local_customer_id: string;
  local_customer_code: string;
  local_customer_name: string;
  external_customer_code: string;
  external_customer_name: string;
  direction: AccountMappingDirection;
}

/**
 * 供应商映射规则
 */
export interface SupplierMappingRule extends BaseMappingRule {
  local_supplier_id: string;
  local_supplier_code: string;
  local_supplier_name: string;
  external_supplier_code: string;
  external_supplier_name: string;
  direction: AccountMappingDirection;
}

/**
 * 项目映射规则
 */
export interface ProjectMappingRule extends BaseMappingRule {
  local_project_id: string;
  local_project_code: string;
  local_project_name: string;
  external_project_code: string;
  external_project_name: string;
  direction: AccountMappingDirection;
}

/**
 * 部门映射规则
 */
export interface DepartmentMappingRule extends BaseMappingRule {
  local_department_id: string;
  local_department_code: string;
  local_department_name: string;
  external_department_code: string;
  external_department_name: string;
  direction: AccountMappingDirection;
}

/**
 * 员工映射规则
 */
export interface EmployeeMappingRule extends BaseMappingRule {
  local_employee_id: string;
  local_employee_code: string;
  local_employee_name: string;
  external_employee_code: string;
  external_employee_name: string;
  direction: AccountMappingDirection;
}

// ============================================
// 四、同步日志
// ============================================

/**
 * 同步日志类型
 */
export type SyncLogType =
  | "account"
  | "customer"
  | "supplier"
  | "employee"
  | "voucher"
  | "invoice"
  | "project"
  | "department"
  | "full";

/**
 * 同步日志状态
 */
export type SyncLogStatus =
  | "pending"
  | "syncing"
  | "completed"
  | "failed"
  | "partial_failed";

/**
 * 同步日志详情
 */
export interface SyncLog {
  id: string;
  config_id: string; // 连接配置ID
  type: SyncLogType; // 同步类型
  direction: SyncDirection; // 同步方向

  // 统计
  total_records: number; // 总记录数
  success_count: number; // 成功数
  fail_count: number; // 失败数
  status: SyncLogStatus;

  // 时间
  started_at: string; // 开始时间
  completed_at?: string; // 完成时间
  duration_ms?: number; // 耗时(ms)

  // 错误信息
  errors?: SyncError[];

  // 审计
  initiated_by?: string;
  initiated_by_name?: string;
}

/**
 * 同步错误详情
 */
export interface SyncError {
  record_id?: string; // 记录ID
  record_code?: string; // 记录编码
  error_code: string; // 错误代码
  error_message: string; // 错误信息
  stack_trace?: string; // 堆栈跟踪
}

// ============================================
// 五、同步请求/响应
// ============================================

/**
 * 同步请求基类
 */
export interface BaseSyncRequest {
  config_id: string;
  company_id?: string; // 指定公司，不指定则同步所有公司
  force_sync?: boolean; // 是否强制同步
}

/**
 * 科目同步请求
 */
export interface AccountSyncRequest extends BaseSyncRequest {
  account_ids?: string[]; // 指定科目
  include_disabled?: boolean; // 包含禁用科目
}

/**
 * 客户同步请求
 */
export interface CustomerSyncRequest extends BaseSyncRequest {
  customer_ids?: string[];
  include_inactive?: boolean;
}

/**
 * 供应商同步请求
 */
export interface SupplierSyncRequest extends BaseSyncRequest {
  supplier_ids?: string[];
  include_inactive?: boolean;
}

/**
 * 凭证同步请求
 */
export interface VoucherSyncRequest extends BaseSyncRequest {
  voucher_ids?: string[];
  period_from?: string; // 期间从
  period_to?: string; // 期间到
  status?: string[]; // 凭证状态
}

/**
 * 发票同步请求
 */
export interface InvoiceSyncRequest extends BaseSyncRequest {
  invoice_ids?: string[];
  invoice_type?: "sales" | "purchase";
  period_from?: string;
  period_to?: string;
  status?: string[];
}

/**
 * 同步结果基类
 */
export interface BaseSyncResult {
  success: boolean;
  log_id: string; // 同步日志ID
  message?: string;
}

/**
 * 科目同步结果
 */
export interface AccountSyncResult extends BaseSyncResult {
  created_count: number;
  updated_count: number;
  skipped_count: number;
  records: {
    local_id: string;
    external_id: string;
    action: "created" | "updated" | "skipped";
  }[];
}

/**
 * 凭证同步结果
 */
export interface VoucherSyncResult extends BaseSyncResult {
  synced_count: number;
  failed_count: number;
  records: {
    local_voucher_id: string;
    external_voucher_id?: string;
    action: "synced" | "failed";
    error?: string;
  }[];
}

// ============================================
// 六、数据转换
// ============================================

/**
 * 外部ERP凭证数据
 */
export interface ExternalVoucher {
  voucher_no: string;
  voucher_date: string;
  period: string;
  voucher_type: string;

  // 金蝶格式
  kingdee_data?: {
    vouchertype?: string;
    tran_type?: number;
    entrys?: KingdeeVoucherEntry[];
  };

  // 用友格式
  yonyou_data?: {
    dtohead?: YonyouVoucherEntry[];
  };

  // SAP格式
  sap_data?: {
    bukrs?: string; // 公司代码
    belnr?: string; // 会计凭证编号
    budat?: string; // 凭证日期
    bktxt?: string; // 凭证文本
    entrys?: SapVoucherEntry[];
  };

  // 原始数据
  raw_data?: any;
}

/**
 * 金蝶凭证分录
 */
export interface KingdeeVoucherEntry {
  entry_id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  direction: "debit" | "credit";
  summary?: string;
  // 辅助核算
  department_id?: string;
  department_name?: string;
  project_id?: string;
  project_name?: string;
  customer_id?: string;
  customer_name?: string;
  supplier_id?: string;
  supplier_name?: string;
}

/**
 * 用友凭证分录
 */
export interface YonyouVoucherEntry {
  rownum: number;
  account_id: string;
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  direction: "debit" | "credit";
  digest?: string;
  // 辅助核算
  department_id?: string;
  project_id?: string;
  customer_id?: string;
  supplier_id?: string;
}

/**
 * SAP凭证分录
 */
export interface SapVoucherEntry {
  buzei: number; // 行项目编号
  hkont: string; // 科目
  kunnr?: string; // 客户编号
  lifnr?: string; // 供应商编号
  prctr?: string; // 利润中心
  kostl?: string; // 成本中心
  anln1?: string; // 资产编号
  aufnr?: string; // 订单编号
  racct: string; // 科目
  drcrk: "S" | "H"; // 借方/贷方 (S=借方, H=贷方)
  wrbtr: number; // 金额
  mwskz?: string; // 税码
  dmbtr: number; // 本位币金额
  hwbas?: number; // 业务货币金额
}

// ============================================
// 七、连接测试
// ============================================

/**
 * 连接测试请求
 */
export interface ConnectionTestRequest {
  api_url: string;
  app_key?: string;
  app_secret?: string;
  timeout?: number;
  additional_params?: Record<string, string>;
}

/**
 * 连接测试结果
 */
export interface ConnectionTestResult {
  success: boolean;
  response_time_ms: number;
  server_version?: string;
  database_name?: string;
  error_message?: string;
  error_code?: string;
}
