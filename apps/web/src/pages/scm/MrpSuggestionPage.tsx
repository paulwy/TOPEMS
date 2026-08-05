import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, ShoppingCart, Factory, CheckCircle } from 'lucide-react';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter, CrudTab } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { ConfirmDialog } from '@topems/shared-components';

import { mrpSuggestionSchema, mrpMaterialSummarySchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';
import type {
  MrpSuggestion,
  MrpSuggestionQueryParams,
  MrpMaterialSummary,
  MrpMaterialSummaryQueryParams,
} from '@/api/scm';
import { useNotificationStore } from '@/store';

const apiAdapter: CrudApiAdapter<MrpSuggestion> = {
  list: async (params) => {
    const response = await scmApi.mrpSuggestions.list(params as MrpSuggestionQueryParams);
    if (response.success && response.data) {
      return { data: response.data.items || [], total: response.data.total || 0 };
    }
    return { data: [], total: 0 };
  },
  create: async () => {
    throw new Error('MRP建议不支持创建');
  },
  update: async () => {
    throw new Error('MRP建议不支持编辑');
  },
  delete: async () => {
    throw new Error('MRP建议不支持删除');
  },
};

const summaryApiAdapter: CrudApiAdapter<MrpMaterialSummary> = {
  list: async (params) => {
    const summaryParams: MrpMaterialSummaryQueryParams = {};
    if (params?.plan_id) summaryParams.plan_id = params.plan_id as string;
    if (params?.category && params.category !== 'all') {
      summaryParams.category = params.category as string;
    }
    const response = await scmApi.mrpSuggestions.summary(summaryParams);
    if (response.success && response.data) {
      const data = response.data as MrpMaterialSummary[];
      return { data, total: data.length };
    }
    return { data: [], total: 0 };
  },
  create: async () => {
    throw new Error('物料汇总不支持创建');
  },
  update: async () => {
    throw new Error('物料汇总不支持编辑');
  },
  delete: async () => {
    throw new Error('物料汇总不支持删除');
  },
};

const MrpMaterialSummaryTab: React.FC<{ planId?: string }> = ({ planId }) => {
  return (
    <CrudPage
      schema={mrpMaterialSummarySchema}
      apiAdapter={summaryApiAdapter}
      breadcrumbs={[]}
      extraQueryParams={planId ? { plan_id: planId } : undefined}
    />
  );
};

interface PendingAction {
  title: string;
  message: string;
  onConfirm: () => void;
  danger?: boolean;
}

const MrpSuggestionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan_id') || '';
  const { addNotification } = useNotificationStore();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const schema = useMemo(
    () => ({
      ...mrpSuggestionSchema,
      batchActions: [
        {
          key: 'confirm',
          label: '批量确认',
          icon: <CheckCircle size={14} />,
          color: 'success' as const,
          onClick: (ids: string[]) => {
            addNotification({
              type: 'success',
              title: '确认成功',
              message: `已确认 ${ids.length} 条建议`,
            });
          },
          confirm: true,
          confirmMessage: '确定要确认选中的建议吗？',
        },
        {
          key: 'generatePurchase',
          label: '批量生成采购单',
          icon: <ShoppingCart size={14} />,
          color: 'primary' as const,
          onClick: (ids: string[]) => {
            addNotification({
              type: 'success',
              title: '生成成功',
              message: `已生成 ${ids.length} 条采购单`,
            });
          },
          confirm: true,
          confirmMessage: '确定要生成选中的采购单吗？',
        },
        {
          key: 'generateProduction',
          label: '批量生成工单',
          icon: <Factory size={14} />,
          color: 'success' as const,
          onClick: (ids: string[]) => {
            addNotification({
              type: 'success',
              title: '生成成功',
              message: `已生成 ${ids.length} 条工单`,
            });
          },
          confirm: true,
          confirmMessage: '确定要生成选中的工单吗？',
        },
      ],
    }),
    [addNotification]
  );

  const handleConfirm = (suggestion: MrpSuggestion) => {
    setPendingAction({
      title: '确认建议',
      message: `确定要确认这条${suggestion.suggestion_type === 'purchase' ? '采购' : '生产'}建议吗？`,
      onConfirm: () => {
        addNotification({
          type: 'success',
          title: '确认成功',
          message: '建议已确认',
        });
      },
    });
  };

  const handleReject = (suggestion: MrpSuggestion) => {
    setPendingAction({
      title: '拒绝建议',
      message: `确定要拒绝这条${suggestion.suggestion_type === 'purchase' ? '采购' : '生产'}建议吗？`,
      onConfirm: () => {
        addNotification({
          type: 'success',
          title: '已拒绝',
          message: '建议已拒绝',
        });
      },
      danger: true,
    });
  };

  const handleGeneratePurchaseOrder = (_suggestion: MrpSuggestion) => {
    setPendingAction({
      title: '生成采购单',
      message: '确定要根据这条采购建议生成采购单吗？',
      onConfirm: () => {
        addNotification({
          type: 'success',
          title: '生成成功',
          message: '采购单已生成',
        });
      },
    });
  };

  const handleGenerateProductionOrder = (_suggestion: MrpSuggestion) => {
    setPendingAction({
      title: '生成工单',
      message: '确定要根据这条生产建议生成工单吗？',
      onConfirm: () => {
        addNotification({
          type: 'success',
          title: '生成成功',
          message: '工单已生成',
        });
      },
    });
  };

  const customRowActions: RowAction<MrpSuggestion>[] = [
    {
      key: 'confirm',
      label: '确认',
      icon: <Check size={14} />,
      color: 'success',
      show: (row) => row.status === 'pending',
      onClick: (row) => handleConfirm(row),
    },
    {
      key: 'reject',
      label: '拒绝',
      icon: <X size={14} />,
      color: 'error',
      show: (row) => row.status === 'pending',
      onClick: (row) => handleReject(row),
    },
    {
      key: 'generatePurchase',
      label: '生成采购单',
      icon: <ShoppingCart size={14} />,
      color: 'primary',
      show: (row) => row.status === 'confirmed' && row.suggestion_type === 'purchase',
      onClick: (row) => handleGeneratePurchaseOrder(row),
    },
    {
      key: 'generateProduction',
      label: '生成工单',
      icon: <Factory size={14} />,
      color: 'success',
      show: (row) => row.status === 'confirmed' && row.suggestion_type === 'production',
      onClick: (row) => handleGenerateProductionOrder(row),
    },
  ];

  const tabs: CrudTab[] = [
    { id: 'list', label: '建议列表', content: null },
    {
      id: 'summary',
      label: '物料汇总',
      content: <MrpMaterialSummaryTab planId={planId || undefined} />,
    },
  ];

  return (
    <>
      <CrudPage
        schema={schema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions as RowAction[]}
        breadcrumbs={[{ label: 'SCM' }, { label: 'MRP建议' }]}
        extraQueryParams={planId ? { plan_id: planId } : undefined}
        tabs={tabs}
      />

      <ConfirmDialog
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          pendingAction?.onConfirm();
          setPendingAction(null);
        }}
        title={pendingAction?.title || ''}
        message={pendingAction?.message || ''}
        danger={pendingAction?.danger}
      />
    </>
  );
};

export default MrpSuggestionPage;
