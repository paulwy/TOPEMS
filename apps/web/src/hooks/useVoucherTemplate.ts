/**
 * 凭证模板Hook
 * 封装凭证模板管理的React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotification } from './useNotification';
import { voucherTemplateApi } from '../api/voucherTemplate';
import type { VoucherTemplate, VoucherTemplateType, VoucherTemplateEntry } from '../types/finance';

import { queryClient, QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

// ============================================
// 一、模板管理
// ============================================

/**
 * 获取凭证模板列表
 */
export function useVoucherTemplates(params?: {
  type?: VoucherTemplateType | VoucherTemplateType[];
  module?: string;
  isactive?: boolean;
  page?: number;
  pagesize?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.VOUCHER_TEMPLATES_BASE, params],
    queryFn: () => voucherTemplateApi.getTemplates(params),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * 获取模板详情
 */
export function useVoucherTemplate(templateId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.VOUCHER_TEMPLATE_BASE, templateId],
    queryFn: () => voucherTemplateApi.getTemplate(templateId),
    enabled: !!templateId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * 创建凭证模板
 */
export function useCreateVoucherTemplate() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      code: string;
      name: string;
      type: VoucherTemplateType;
      description?: string;
      applicable_modules?: string[];
      applicable_companies?: string[];
      condition?: string;
      entries: VoucherTemplateEntry[];
    }) => voucherTemplateApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHER_TEMPLATES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_voucher_template.k0'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k1'));
    },
  });
}

/**
 * 更新凭证模板
 */
export function useUpdateVoucherTemplate() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: Partial<VoucherTemplate> }) =>
      voucherTemplateApi.updateTemplate(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHER_TEMPLATES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_voucher_template.k2'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k3'));
    },
  });
}

/**
 * 删除凭证模板
 */
export function useDeleteVoucherTemplate() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (templateId: string) => voucherTemplateApi.deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHER_TEMPLATES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_voucher_template.k4'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k5'));
    },
  });
}

/**
 * 复制凭证模板
 */
export function useCopyVoucherTemplate() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      templateId,
      newCode,
      newName,
    }: {
      templateId: string;
      newCode: string;
      newName: string;
    }) => voucherTemplateApi.copyTemplate(templateId, newCode, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHER_TEMPLATES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_voucher_template.k6'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k7'));
    },
  });
}

/**
 * 设置默认模板
 */
export function useSetDefaultVoucherTemplate() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({ templateId, isDefault }: { templateId: string; isDefault: boolean }) =>
      voucherTemplateApi.setDefaultTemplate(templateId, isDefault),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHER_TEMPLATES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_voucher_template.k8'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k9'));
    },
  });
}

/**
 * 启用/禁用模板
 */
export function useToggleVoucherTemplate() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({ templateId, isActive }: { templateId: string; isActive: boolean }) =>
      voucherTemplateApi.toggleTemplate(templateId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHER_TEMPLATES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_voucher_template.k10'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k11'));
    },
  });
}

// ============================================
// 二、凭证生成
// ============================================

/**
 * 预览生成的凭证
 */
export function usePreviewGeneratedVouchers() {
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      template_id: string;
      source_module: string;
      source_id: string;
      company_id?: string;
      voucher_date?: string;
    }) => voucherTemplateApi.previewGeneratedVouchers(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHER_TEMPLATES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_voucher_template.k12'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k13'));
    },
  });
}

/**
 * 从源单据生成凭证
 */
export function useGenerateVoucherFromSource() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      template_id?: string;
      source_module: 'pm' | 'crm' | 'srm' | 'hrm' | 'finance';
      source_id: string;
      company_id?: string;
      voucher_date?: string;
      force_regenerate?: boolean;
    }) => voucherTemplateApi.generateVoucherFromSource(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHERS_BASE,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHER_TEMPLATES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(
        `${i18n.t('shared.use_voucher_template.k0')}${result.data.voucher_no}${i18n.t('shared.use_voucher_template.k1')}`
      );
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k14'));
    },
  });
}

/**
 * 批量从源单据生成凭证
 */
export function useBatchGenerateVouchers() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      template_id?: string;
      source_module: 'pm' | 'crm' | 'srm' | 'hrm' | 'finance';
      source_ids: string[];
      company_id?: string;
      voucher_date?: string;
    }) => voucherTemplateApi.batchGenerateVouchers(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHERS_BASE,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHER_TEMPLATES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(
        `${i18n.t('shared.use_voucher_template.k2')}${result.data?.success || 0}${i18n.t('shared.use_voucher_template.k3')}`
      );
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k15'));
    },
  });
}

/**
 * 自动生成凭证
 */
export function useAutoGenerateVouchers() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      template_id?: string;
      company_id?: string;
      period: string;
      modules?: ('pm' | 'crm' | 'srm' | 'hrm' | 'finance')[];
      dry_run?: boolean;
    }) => voucherTemplateApi.autoGenerateVouchers(data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHERS_BASE,
        exact: false,
        refetchType: 'active',
      });
      if (variables.dry_run) {
        success(i18n.t('shared.use_voucher_template.k16'));
      } else {
        success(i18n.t('shared.use_voucher_template.k17'));
      }
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k18'));
    },
  });
}

/**
 * 重新生成已冲销凭证
 */
export function useRegenerateReversedVoucher() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      originalVoucherId,
      voucherDate,
    }: {
      originalVoucherId: string;
      voucherDate?: string;
    }) => voucherTemplateApi.regenerateReversedVoucher(originalVoucherId, voucherDate),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHERS_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(
        `${i18n.t('shared.use_voucher_template.k4')}${result.data.voucher_no}${i18n.t('shared.use_voucher_template.k5')}`
      );
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k19'));
    },
  });
}

// ============================================
// 三、模板匹配
// ============================================

/**
 * 根据源单据匹配模板
 */
export function useMatchVoucherTemplate() {
  return useMutation({
    mutationFn: (data: {
      source_module: string;
      source_type: string;
      company_id?: string;
      amount?: number;
      extra_data?: Record<string, unknown>;
    }) => voucherTemplateApi.matchTemplate(data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHER_TEMPLATES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });
}

/**
 * 获取模板使用统计
 */
export function useVoucherTemplateUsageStats(
  templateId: string,
  params?: {
    start_date?: string;
    end_date?: string;
  }
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.VOUCHER_TEMPLATE_USAGE_STATS_BASE, templateId, params],
    queryFn: () => voucherTemplateApi.getTemplateUsageStats(templateId, params),
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// 四、生成规则管理
// ============================================

/**
 * 获取生成规则列表
 */
export function useGenerationRules(params?: {
  source_module?: string;
  isactive?: boolean;
  page?: number;
  pagesize?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.VOUCHER_GENERATION_RULES_BASE, params],
    queryFn: () => voucherTemplateApi.getGenerationRules(params),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * 创建生成规则
 */
export function useCreateGenerationRule() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      name: string;
      source_module: string;
      source_type: string;
      template_id: string;
      condition?: string;
      priority?: number;
      isactive?: boolean;
    }) => voucherTemplateApi.createGenerationRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHER_GENERATION_RULES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_voucher_template.k20'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k21'));
    },
  });
}

/**
 * 更新生成规则
 */
export function useUpdateGenerationRule() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({
      ruleId,
      data,
    }: {
      ruleId: string;
      data: Partial<{
        name?: string;
        source_module?: string;
        source_type?: string;
        template_id?: string;
        condition?: string;
        priority?: number;
        isactive?: boolean;
      }>;
    }) => voucherTemplateApi.updateGenerationRule(ruleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHER_GENERATION_RULES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_voucher_template.k22'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k23'));
    },
  });
}

/**
 * 删除生成规则
 */
export function useDeleteGenerationRule() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (ruleId: string) => voucherTemplateApi.deleteGenerationRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHER_GENERATION_RULES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_voucher_template.k24'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k25'));
    },
  });
}

/**
 * 启用/禁用生成规则
 */
export function useToggleGenerationRule() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) =>
      voucherTemplateApi.toggleGenerationRule(ruleId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.VOUCHER_GENERATION_RULES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_voucher_template.k26'));
    },
    onError: (err) => {
      error(err.message || i18n.t('shared.use_voucher_template.k27'));
    },
  });
}
