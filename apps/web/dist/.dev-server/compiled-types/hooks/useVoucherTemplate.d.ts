/**
 * 凭证模板Hook
 * 封装凭证模板管理的React Query hooks
 */
import type { VoucherTemplate, VoucherTemplateType } from "../types/erp-finance";
/**
 * 获取凭证模板列表
 */
export declare function useVoucherTemplates(params?: {
    type?: VoucherTemplateType | VoucherTemplateType[];
    module?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取模板详情
 */
export declare function useVoucherTemplate(templateId: string): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 创建凭证模板
 */
export declare function useCreateVoucherTemplate(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    code: string;
    name: string;
    type: VoucherTemplateType;
    description?: string;
    applicable_modules?: string[];
    applicable_companies?: string[];
    condition?: string;
    entries: any[];
}, unknown>;
/**
 * 更新凭证模板
 */
export declare function useUpdateVoucherTemplate(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    templateId: string;
    data: Partial<VoucherTemplate>;
}, unknown>;
/**
 * 删除凭证模板
 */
export declare function useDeleteVoucherTemplate(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, string, unknown>;
/**
 * 复制凭证模板
 */
export declare function useCopyVoucherTemplate(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    templateId: string;
    newCode: string;
    newName: string;
}, unknown>;
/**
 * 设置默认模板
 */
export declare function useSetDefaultVoucherTemplate(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    templateId: string;
    isDefault: boolean;
}, unknown>;
/**
 * 启用/禁用模板
 */
export declare function useToggleVoucherTemplate(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    templateId: string;
    isActive: boolean;
}, unknown>;
/**
 * 预览生成的凭证
 */
export declare function usePreviewGeneratedVouchers(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    template_id: string;
    source_module: string;
    source_id: string;
    company_id?: string;
    voucher_date?: string;
}, unknown>;
/**
 * 从源单据生成凭证
 */
export declare function useGenerateVoucherFromSource(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    template_id?: string;
    source_module: "pm" | "crm" | "srm" | "hrm" | "finance";
    source_id: string;
    company_id?: string;
    voucher_date?: string;
    force_regenerate?: boolean;
}, unknown>;
/**
 * 批量从源单据生成凭证
 */
export declare function useBatchGenerateVouchers(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    template_id?: string;
    source_module: "pm" | "crm" | "srm" | "hrm" | "finance";
    source_ids: string[];
    company_id?: string;
    voucher_date?: string;
}, unknown>;
/**
 * 自动生成凭证
 */
export declare function useAutoGenerateVouchers(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    template_id?: string;
    company_id?: string;
    period: string;
    modules?: ("pm" | "crm" | "srm" | "hrm" | "finance")[];
    dry_run?: boolean;
}, unknown>;
/**
 * 重新生成已冲销凭证
 */
export declare function useRegenerateReversedVoucher(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    originalVoucherId: string;
    voucherDate?: string;
}, unknown>;
/**
 * 根据源单据匹配模板
 */
export declare function useMatchVoucherTemplate(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, Error, {
    source_module: string;
    source_type: string;
    company_id?: string;
    amount?: number;
    extra_data?: Record<string, any>;
}, unknown>;
/**
 * 获取模板使用统计
 */
export declare function useVoucherTemplateUsageStats(templateId: string, params?: {
    start_date?: string;
    end_date?: string;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 获取生成规则列表
 */
export declare function useGenerationRules(params?: {
    source_module?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<any>>, Error>;
/**
 * 创建生成规则
 */
export declare function useCreateGenerationRule(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    name: string;
    source_module: string;
    source_type: string;
    template_id: string;
    condition?: string;
    priority?: number;
    is_active?: boolean;
}, unknown>;
/**
 * 更新生成规则
 */
export declare function useUpdateGenerationRule(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    ruleId: string;
    data: any;
}, unknown>;
/**
 * 删除生成规则
 */
export declare function useDeleteGenerationRule(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, string, unknown>;
/**
 * 启用/禁用生成规则
 */
export declare function useToggleGenerationRule(): import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<any>, any, {
    ruleId: string;
    isActive: boolean;
}, unknown>;
