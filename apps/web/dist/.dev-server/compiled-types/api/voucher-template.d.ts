/**
 * 凭证模板API
 * 提供凭证模板的CRUD操作和自动生成凭证功能
 */
import type { VoucherTemplate, VoucherTemplateType, VoucherTemplateEntry } from "../types/erp-finance";
export declare const voucherTemplateApi: {
    /**
     * 获取凭证模板列表
     */
    getTemplates: (params?: {
        type?: VoucherTemplateType | VoucherTemplateType[];
        module?: string;
        is_active?: boolean;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取模板详情
     */
    getTemplate: (templateId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 创建凭证模板
     */
    createTemplate: (data: {
        code: string;
        name: string;
        type: VoucherTemplateType;
        description?: string;
        applicable_modules?: string[];
        applicable_companies?: string[];
        condition?: string;
        entries: Partial<VoucherTemplateEntry>[];
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新凭证模板
     */
    updateTemplate: (templateId: string, data: Partial<VoucherTemplate>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 删除凭证模板
     */
    deleteTemplate: (templateId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 复制凭证模板
     */
    copyTemplate: (templateId: string, newCode: string, newName: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 设置默认模板
     */
    setDefaultTemplate: (templateId: string, isDefault: boolean) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 启用/禁用模板
     */
    toggleTemplate: (templateId: string, isActive: boolean) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 添加模板分录
     */
    addTemplateEntry: (templateId: string, entry: Partial<VoucherTemplateEntry>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新模板分录
     */
    updateTemplateEntry: (templateId: string, entryId: string, entry: Partial<VoucherTemplateEntry>) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 删除模板分录
     */
    deleteTemplateEntry: (templateId: string, entryId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 重新排序模板分录
     */
    reorderTemplateEntries: (templateId: string, entryIds: string[]) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 预览生成的凭证
     */
    previewGeneratedVouchers: (data: {
        template_id: string;
        source_module: string;
        source_id: string;
        company_id?: string;
        voucher_date?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 从源单据生成凭证
     * 支持从PM、CRM、SRM、HRM等模块的源单据生成凭证
     */
    generateVoucherFromSource: (data: {
        template_id?: string;
        source_module: "pm" | "crm" | "srm" | "hrm" | "finance";
        source_id: string;
        company_id?: string;
        voucher_date?: string;
        force_regenerate?: boolean;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 批量从源单据生成凭证
     */
    batchGenerateVouchers: (data: {
        template_id?: string;
        source_module: "pm" | "crm" | "srm" | "hrm" | "finance";
        source_ids: string[];
        company_id?: string;
        voucher_date?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 根据规则自动生成凭证
     * 支持按期间、公司等维度自动生成凭证
     */
    autoGenerateVouchers: (data: {
        template_id?: string;
        company_id?: string;
        period: string;
        modules?: ("pm" | "crm" | "srm" | "hrm" | "finance")[];
        dry_run?: boolean;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 重新生成已冲销的凭证
     */
    regenerateReversedVoucher: (originalVoucherId: string, voucherDate?: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 根据源单据信息匹配模板
     */
    matchTemplate: (data: {
        source_module: string;
        source_type: string;
        company_id?: string;
        amount?: number;
        extra_data?: Record<string, any>;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取模板使用统计
     */
    getTemplateUsageStats: (templateId: string, params?: {
        start_date?: string;
        end_date?: string;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 获取凭证生成规则列表
     */
    getGenerationRules: (params?: {
        source_module?: string;
        is_active?: boolean;
        page?: number;
        page_size?: number;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 创建凭证生成规则
     */
    createGenerationRule: (data: {
        name: string;
        source_module: string;
        source_type: string;
        template_id: string;
        condition?: string;
        priority?: number;
        is_active?: boolean;
    }) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 更新凭证生成规则
     */
    updateGenerationRule: (ruleId: string, data: any) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 删除凭证生成规则
     */
    deleteGenerationRule: (ruleId: string) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 启用/禁用生成规则
     */
    toggleGenerationRule: (ruleId: string, isActive: boolean) => Promise<import("./client").ApiResponse<any>>;
    /**
     * 导出模板
     */
    exportTemplate: (templateId: string, format: "json" | "yaml") => Promise<Blob>;
    /**
     * 导入模板
     */
    importTemplate: (data: FormData) => Promise<import("./client").ApiResponse<any>>;
};
export default voucherTemplateApi;
