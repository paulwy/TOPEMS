/**
 * 外部ERP系统适配器类型定义
 * 支持金蝶(Kingdee)、用友(Yonyou)、SAP等主流ERP系统
 */
/**
 * 外部ERP系统类型
 */
export type ExternalErpType = "kingdee" | "yonyou" | "sap";
/**
 * ERP连接状态
 */
export type ErpConnectionStatus = "connected" | "disconnected" | "error" | "syncing";
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
export type AccountMappingDirection = "to_external" | "from_external" | "bidirectional";
/**
 * ERP连接配置基类
 */
export interface ErpConnectionConfig {
    id: string;
    name: string;
    type: ExternalErpType;
    status: ErpConnectionStatus;
    api_url: string;
    api_version?: string;
    timeout: number;
    app_key?: string;
    app_secret?: string;
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: string;
    sync_direction: SyncDirection;
    sync_mode: SyncMode;
    sync_interval?: number;
    last_sync_at?: string;
    company_mappings: CompanyMapping[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
/**
 * 金蝶连接配置
 */
export interface KingdeeConnectionConfig extends ErpConnectionConfig {
    type: "kingdee";
    datacenter_id?: string;
    language?: string;
    format?: string;
}
/**
 * 用友连接配置
 */
export interface YonyouConnectionConfig extends ErpConnectionConfig {
    type: "yonyou";
    tenant_id?: string;
    region?: string;
    environment?: "sandbox" | "production";
}
/**
 * SAP连接配置
 */
export interface SapConnectionConfig extends ErpConnectionConfig {
    type: "sap";
    client: string;
    system_number?: string;
    router?: string;
    plantMappings?: PlantMapping[];
}
/**
 * 公司映射
 */
export interface CompanyMapping {
    local_company_id: string;
    local_company_name: string;
    external_company_code: string;
    external_company_name: string;
    is_default?: boolean;
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
/**
 * 映射规则通用字段
 */
export interface BaseMappingRule {
    id: string;
    name: string;
    description?: string;
    is_active: boolean;
    priority: number;
    condition?: string;
    created_at: string;
    updated_at: string;
}
/**
 * 科目映射规则
 */
export interface AccountMappingRule extends BaseMappingRule {
    local_account_id: string;
    local_account_code: string;
    local_account_name: string;
    external_account_code: string;
    external_account_name: string;
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
/**
 * 同步日志类型
 */
export type SyncLogType = "account" | "customer" | "supplier" | "employee" | "voucher" | "invoice" | "project" | "department" | "full";
/**
 * 同步日志状态
 */
export type SyncLogStatus = "pending" | "syncing" | "completed" | "failed" | "partial_failed";
/**
 * 同步日志详情
 */
export interface SyncLog {
    id: string;
    config_id: string;
    type: SyncLogType;
    direction: SyncDirection;
    total_records: number;
    success_count: number;
    fail_count: number;
    status: SyncLogStatus;
    started_at: string;
    completed_at?: string;
    duration_ms?: number;
    errors?: SyncError[];
    initiated_by?: string;
    initiated_by_name?: string;
}
/**
 * 同步错误详情
 */
export interface SyncError {
    record_id?: string;
    record_code?: string;
    error_code: string;
    error_message: string;
    stack_trace?: string;
}
/**
 * 同步请求基类
 */
export interface BaseSyncRequest {
    config_id: string;
    company_id?: string;
    force_sync?: boolean;
}
/**
 * 科目同步请求
 */
export interface AccountSyncRequest extends BaseSyncRequest {
    account_ids?: string[];
    include_disabled?: boolean;
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
    period_from?: string;
    period_to?: string;
    status?: string[];
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
    log_id: string;
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
/**
 * 外部ERP凭证数据
 */
export interface ExternalVoucher {
    voucher_no: string;
    voucher_date: string;
    period: string;
    voucher_type: string;
    kingdee_data?: {
        vouchertype?: string;
        tran_type?: number;
        entrys?: KingdeeVoucherEntry[];
    };
    yonyou_data?: {
        dtohead?: YonyouVoucherEntry[];
    };
    sap_data?: {
        bukrs?: string;
        belnr?: string;
        budat?: string;
        bktxt?: string;
        entrys?: SapVoucherEntry[];
    };
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
    department_id?: string;
    project_id?: string;
    customer_id?: string;
    supplier_id?: string;
}
/**
 * SAP凭证分录
 */
export interface SapVoucherEntry {
    buzei: number;
    hkont: string;
    kunnr?: string;
    lifnr?: string;
    prctr?: string;
    kostl?: string;
    anln1?: string;
    aufnr?: string;
    racct: string;
    drcrk: "S" | "H";
    wrbtr: number;
    mwskz?: string;
    dmbtr: number;
    hwbas?: number;
}
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
