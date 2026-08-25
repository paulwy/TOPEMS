/**
 * 合并报表React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ConsolidationScope,
  GenerateConsolidationReportRequest,
  ConsolidationScopeQueryParams,
  ConsolidationReportQueryParams,
  CompanyRelationType,
} from '@/types/consolidation';
import * as consolidationApi from '@/api/consolidation';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';

// ============================================
// 一、合并范围Hook
// ============================================

/**
 * 获取合并范围列表
 */
export const useConsolidationScopes = (params?: ConsolidationScopeQueryParams) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.CONSOLIDATION_SCOPES_BASE, params],
    queryFn: () => consolidationApi.getConsolidationScopes(params),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
};

/**
 * 获取合并范围详情
 */
export const useConsolidationScope = (scopeId: string) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.CONSOLIDATION_SCOPE_BASE, scopeId],
    queryFn: () => consolidationApi.getConsolidationScope(scopeId),
    enabled: !!scopeId,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
};

/**
 * 创建合并范围
 */
export const useCreateConsolidationScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ConsolidationScope>) =>
      consolidationApi.createConsolidationScope(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CONSOLIDATION_SCOPES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });
};

/**
 * 更新合并范围
 */
export const useUpdateConsolidationScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scopeId, data }: { scopeId: string; data: Partial<ConsolidationScope> }) =>
      consolidationApi.updateConsolidationScope(scopeId, data),
    onSuccess: (_, { scopeId }) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CONSOLIDATION_SCOPES_BASE,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.AD_HOC.CONSOLIDATION_SCOPE_BASE, scopeId],

        exact: false,
        refetchType: 'active',
      });
    },
  });
};

/**
 * 删除合并范围
 */
export const useDeleteConsolidationScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scopeId: string) => consolidationApi.deleteConsolidationScope(scopeId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CONSOLIDATION_SCOPES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });
};

// ============================================
// 二、合并范围公司Hook
// ============================================

/**
 * 获取合并范围内的公司列表
 */
export const useScopeCompanies = (scopeId: string) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.SCOPE_COMPANIES_BASE, scopeId],
    queryFn: () => consolidationApi.getScopeCompanies(scopeId),
    enabled: !!scopeId,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
};

/**
 * 添加公司到合并范围
 */
export const useAddCompanyToScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      scope_id: string;
      company_id: string;
      ownership_percentage: number;
      consolidation_percentage: number;
      control_type: 'full_control' | 'joint_venture' | 'associate';
    }) => consolidationApi.addCompanyToScope(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.AD_HOC.SCOPE_COMPANIES_BASE, data.scope_id],

        exact: false,
        refetchType: 'active',
      });
    },
  });
};

/**
 * 从合并范围移除公司
 */
export const useRemoveCompanyFromScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) => consolidationApi.removeCompanyFromScope(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.SCOPE_COMPANIES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });
};

// ============================================
// 三、抵消规则Hook
// ============================================

// ============================================
// 四、内部交易Hook
// ============================================

// ============================================
// 五、合并报表Hook
// ============================================

/**
 * 获取合并报表列表
 */
export const useConsolidationReports = (params?: ConsolidationReportQueryParams) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.CONSOLIDATION_REPORTS_BASE, params],
    queryFn: () => consolidationApi.getConsolidationReports(params),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
};

/**
 * 生成合并报表
 */
export const useGenerateConsolidationReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateConsolidationReportRequest) =>
      consolidationApi.generateConsolidationReport(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CONSOLIDATION_REPORTS_BASE,

        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.AD_HOC.CONSOLIDATION_REPORT_BASE, result.data?.report_id],

        exact: false,
        refetchType: 'active',
      });
    },
  });
};

/**
 * 获取合并报表行项目
 */
export const useConsolidationReportLines = (reportId: string) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.CONSOLIDATION_REPORT_LINES_BASE, reportId],
    queryFn: () => consolidationApi.getConsolidationReportLines(reportId),
    enabled: !!reportId,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
};

/**
 * 审批合并报表
 */
export const useApproveConsolidationReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => consolidationApi.approveConsolidationReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CONSOLIDATION_REPORTS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });
};

/**
 * 发布合并报表
 */
export const usePublishConsolidationReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => consolidationApi.publishConsolidationReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CONSOLIDATION_REPORTS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });
};

// ============================================
// 六、公司架构Hook
// ============================================

/**
 * 获取公司关系列表
 */
export const useCompanyRelations = (params?: {
  company_id?: string;
  relation_type?: string;
  keyword?: string;
}) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.COMPANY_RELATIONS_BASE, params],
    queryFn: () => consolidationApi.getCompanyRelations(params),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
};

/**
 * 创建公司关系
 */
export const useCreateCompanyRelation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Partial<{
        parent_company_id: string;
        child_company_id: string;
        relation_type: CompanyRelationType;
        ownership_percentage: number;
      }>
    ) => consolidationApi.createCompanyRelation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.COMPANY_RELATIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.COMPANY_TREE_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });
};

/**
 * 更新公司关系
 */
export const useUpdateCompanyRelation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      relationId,
      data,
    }: {
      relationId: string;
      data: Partial<{
        ownership_percentage: number;
        status: 'active' | 'inactive';
      }>;
    }) => consolidationApi.updateCompanyRelation(relationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.COMPANY_RELATIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });
};

/**
 * 删除公司关系
 */
export const useDeleteCompanyRelation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (relationId: string) => consolidationApi.deleteCompanyRelation(relationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.COMPANY_RELATIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.COMPANY_TREE_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });
};

/**
 * 获取公司架构树
 */
export const useCompanyTree = () => {
  return useQuery({
    queryKey: QUERY_KEYS.AD_HOC.COMPANY_TREE_BASE,
    queryFn: () => consolidationApi.getCompanyTree(),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
};
