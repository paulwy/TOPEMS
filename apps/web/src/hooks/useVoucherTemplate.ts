/**
 * 凭证模板Hook
 * 封装凭证模板管理的React Query hooks
 */

import { useQuery } from '@tanstack/react-query';
import { voucherTemplateApi } from '../api/voucherTemplate';

import { QUERY_KEYS } from '@/lib/reactQuery';

// ============================================
// 一、模板管理
// ============================================

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

// ============================================
// 二、凭证生成
// ============================================

// ============================================
// 三、模板匹配
// ============================================

// ============================================
// 四、生成规则管理
// ============================================
