/**
 * 外部ERP适配器API
 * 提供与金蝶、用友、SAP等外部ERP系统的集成接口
 */
import type { KingdeeConnectionConfig, YonyouConnectionConfig, SapConnectionConfig, CompanyMapping, AccountMappingRule, CustomerMappingRule, SupplierMappingRule, ProjectMappingRule, DepartmentMappingRule, EmployeeMappingRule, AccountSyncRequest, CustomerSyncRequest, SupplierSyncRequest, VoucherSyncRequest, InvoiceSyncRequest, ConnectionTestRequest } from "../types/external-erp";
export declare const externalErpApi: {
    /**
     * 获取ERP连接列表
     */
    getConnections: (params?: {
        type?: string;
        status?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取连接详情
     */
    getConnection: (id: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 创建连接配置
     */
    createConnection: (data: {
        type: "kingdee" | "yonyou" | "sap";
        name: string;
        api_url: string;
        app_key?: string;
        app_secret?: string;
        sync_direction?: "import" | "export" | "bidirectional";
        sync_mode?: "realtime" | "scheduled" | "manual";
        company_mappings?: CompanyMapping[];
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新连接配置
     */
    updateConnection: (id: string, data: Partial<KingdeeConnectionConfig | YonyouConnectionConfig | SapConnectionConfig>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 删除连接配置
     */
    deleteConnection: (id: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 启用/禁用连接
     */
    toggleConnection: (id: string, enabled: boolean) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 测试连接
     */
    testConnection: (data: ConnectionTestRequest) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 同步连接状态
     */
    syncConnectionStatus: (id: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取公司映射列表
     */
    getCompanyMappings: (configId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 添加公司映射
     */
    addCompanyMapping: (configId: string, mapping: CompanyMapping) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新公司映射
     */
    updateCompanyMapping: (configId: string, mappingId: string, mapping: Partial<CompanyMapping>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 删除公司映射
     */
    deleteCompanyMapping: (configId: string, mappingId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取科目映射列表
     */
    getAccountMappings: (configId: string, params?: {
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 批量导入科目映射
     */
    importAccountMappings: (configId: string, data: Partial<AccountMappingRule>[]) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新科目映射
     */
    updateAccountMapping: (configId: string, mappingId: string, data: Partial<AccountMappingRule>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 删除科目映射
     */
    deleteAccountMapping: (configId: string, mappingId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 自动匹配科目映射
     */
    autoMatchAccountMappings: (configId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取客户映射列表
     */
    getCustomerMappings: (configId: string, params?: {
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 批量导入客户映射
     */
    importCustomerMappings: (configId: string, data: Partial<CustomerMappingRule>[]) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新客户映射
     */
    updateCustomerMapping: (configId: string, mappingId: string, data: Partial<CustomerMappingRule>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 删除客户映射
     */
    deleteCustomerMapping: (configId: string, mappingId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取供应商映射列表
     */
    getSupplierMappings: (configId: string, params?: {
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 批量导入供应商映射
     */
    importSupplierMappings: (configId: string, data: Partial<SupplierMappingRule>[]) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新供应商映射
     */
    updateSupplierMapping: (configId: string, mappingId: string, data: Partial<SupplierMappingRule>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 删除供应商映射
     */
    deleteSupplierMapping: (configId: string, mappingId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取项目映射列表
     */
    getProjectMappings: (configId: string, params?: {
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 批量导入项目映射
     */
    importProjectMappings: (configId: string, data: Partial<ProjectMappingRule>[]) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新项目映射
     */
    updateProjectMapping: (configId: string, mappingId: string, data: Partial<ProjectMappingRule>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 删除项目映射
     */
    deleteProjectMapping: (configId: string, mappingId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取部门映射列表
     */
    getDepartmentMappings: (configId: string, params?: {
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 批量导入部门映射
     */
    importDepartmentMappings: (configId: string, data: Partial<DepartmentMappingRule>[]) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新部门映射
     */
    updateDepartmentMapping: (configId: string, mappingId: string, data: Partial<DepartmentMappingRule>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 删除部门映射
     */
    deleteDepartmentMapping: (configId: string, mappingId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取员工映射列表
     */
    getEmployeeMappings: (configId: string, params?: {
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 批量导入员工映射
     */
    importEmployeeMappings: (configId: string, data: Partial<EmployeeMappingRule>[]) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新员工映射
     */
    updateEmployeeMapping: (configId: string, mappingId: string, data: Partial<EmployeeMappingRule>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 删除员工映射
     */
    deleteEmployeeMapping: (configId: string, mappingId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 同步科目
     */
    syncAccounts: (data: AccountSyncRequest) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 同步客户
     */
    syncCustomers: (data: CustomerSyncRequest) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 同步供应商
     */
    syncSuppliers: (data: SupplierSyncRequest) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 同步供应商
     */
    syncProjects: (data: {
        config_id: string;
        project_ids?: string[];
        company_id?: string;
        force_sync?: boolean;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 同步部门
     */
    syncDepartments: (data: {
        config_id: string;
        department_ids?: string[];
        company_id?: string;
        force_sync?: boolean;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 同步员工
     */
    syncEmployees: (data: {
        config_id: string;
        employee_ids?: string[];
        company_id?: string;
        force_sync?: boolean;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 同步凭证
     */
    syncVouchers: (data: VoucherSyncRequest) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 同步发票
     */
    syncInvoices: (data: InvoiceSyncRequest) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 全量同步
     */
    fullSync: (data: {
        config_id: string;
        company_id?: string;
        sync_modules?: string[];
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 取消同步
     */
    cancelSync: (logId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取同步日志列表
     */
    getSyncLogs: (params?: {
        config_id?: string;
        type?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取同步日志详情
     */
    getSyncLog: (logId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取同步统计
     */
    getSyncStatistics: (configId: string, params?: {
        start_date?: string;
        end_date?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 预览外部ERP科目
     */
    previewExternalAccounts: (configId: string, params?: {
        keyword?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 预览外部ERP客户
     */
    previewExternalCustomers: (configId: string, params?: {
        keyword?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 预览外部ERP供应商
     */
    previewExternalSuppliers: (configId: string, params?: {
        keyword?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 预览外部ERP凭证
     */
    previewExternalVouchers: (configId: string, params?: {
        period_from?: string;
        period_to?: string;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 导出同步日志
     */
    exportSyncLogs: (params: {
        config_id?: string;
        type?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
        format: "csv" | "xlsx";
    }) => Promise<Blob>;
    /**
     * 导出映射规则
     */
    exportMappingRules: (params: {
        config_id: string;
        mapping_type: "account" | "customer" | "supplier" | "project" | "department" | "employee";
        format: "csv" | "xlsx";
    }) => Promise<Blob>;
};
export default externalErpApi;
