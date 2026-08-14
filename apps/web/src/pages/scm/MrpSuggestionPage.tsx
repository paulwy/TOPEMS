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
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

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
    throw new Error(i18n.t('scm.mrp_suggestion_page.k0'));
  },
  update: async () => {
    throw new Error(i18n.t('scm.mrp_suggestion_page.k1'));
  },
  delete: async () => {
    throw new Error(i18n.t('scm.mrp_suggestion_page.k2'));
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
  const { t } = useTranslation('scm');
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
          label: i18n.t('scm.mrp_suggestion_page.k3'),
          icon: <CheckCircle size={14} />,
          color: 'success' as const,
          onClick: (ids: string[]) => {
            addNotification({
              type: 'success',
              title: i18n.t('scm.mrp_suggestion_page.k4'),
              message: `已确认 ${ids.length} 条建议`,
            });
          },
          confirm: true,
          confirmMessage: i18n.t('scm.mrp_suggestion_page.k5'),
        },
        {
          key: 'generatePurchase',
          label: i18n.t('scm.mrp_suggestion_page.k6'),
          icon: <ShoppingCart size={14} />,
          color: 'primary' as const,
          onClick: (ids: string[]) => {
            addNotification({
              type: 'success',
              title: i18n.t('scm.mrp_suggestion_page.k7'),
              message: `已生成 ${ids.length} 条采购单`,
            });
          },
          confirm: true,
          confirmMessage: i18n.t('scm.mrp_suggestion_page.k8'),
        },
        {
          key: 'generateProduction',
          label: i18n.t('scm.mrp_suggestion_page.k9'),
          icon: <Factory size={14} />,
          color: 'success' as const,
          onClick: (ids: string[]) => {
            addNotification({
              type: 'success',
              title: i18n.t('scm.mrp_suggestion_page.k10'),
              message: `已生成 ${ids.length} 条工单`,
            });
          },
          confirm: true,
          confirmMessage: i18n.t('scm.mrp_suggestion_page.k11'),
        },
      ],
    }),
    [addNotification]
  );

  const handleConfirm = (suggestion: MrpSuggestion) => {
    setPendingAction({
      title: t('scm.mrp_suggestion_page.k12'),
      message: `确定要确认这条${suggestion.suggestion_type === 'purchase' ? t('scm.mrp_suggestion_page.k14') : t('scm.mrp_suggestion_page.k13')}建议吗？`,
      onConfirm: () => {
        addNotification({
          type: 'success',
          title: t('scm.mrp_suggestion_page.k15'),
          message: t('scm.mrp_suggestion_page.k16'),
        });
      },
    });
  };

  const handleReject = (suggestion: MrpSuggestion) => {
    setPendingAction({
      title: t('scm.mrp_suggestion_page.k17'),
      message: `确定要拒绝这条${suggestion.suggestion_type === 'purchase' ? t('scm.mrp_suggestion_page.k19') : t('scm.mrp_suggestion_page.k18')}建议吗？`,
      onConfirm: () => {
        addNotification({
          type: 'success',
          title: t('scm.mrp_suggestion_page.k20'),
          message: t('scm.mrp_suggestion_page.k21'),
        });
      },
      danger: true,
    });
  };

  const handleGeneratePurchaseOrder = (_suggestion: MrpSuggestion) => {
    setPendingAction({
      title: t('scm.mrp_suggestion_page.k22'),
      message: t('scm.mrp_suggestion_page.k23'),
      onConfirm: () => {
        addNotification({
          type: 'success',
          title: t('scm.mrp_suggestion_page.k24'),
          message: t('scm.mrp_suggestion_page.k25'),
        });
      },
    });
  };

  const handleGenerateProductionOrder = (_suggestion: MrpSuggestion) => {
    setPendingAction({
      title: t('scm.mrp_suggestion_page.k26'),
      message: t('scm.mrp_suggestion_page.k27'),
      onConfirm: () => {
        addNotification({
          type: 'success',
          title: t('scm.mrp_suggestion_page.k28'),
          message: t('scm.mrp_suggestion_page.k29'),
        });
      },
    });
  };

  const customRowActions: RowAction<MrpSuggestion>[] = [
    {
      key: 'confirm',
      label: t('scm.mrp_suggestion_page.k30'),
      icon: <Check size={14} />,
      color: 'success',
      show: (row) => row.status === 'pending',
      onClick: (row) => handleConfirm(row),
    },
    {
      key: 'reject',
      label: t('scm.mrp_suggestion_page.k31'),
      icon: <X size={14} />,
      color: 'error',
      show: (row) => row.status === 'pending',
      onClick: (row) => handleReject(row),
    },
    {
      key: 'generatePurchase',
      label: t('scm.mrp_suggestion_page.k32'),
      icon: <ShoppingCart size={14} />,
      color: 'primary',
      show: (row) => row.status === 'confirmed' && row.suggestion_type === 'purchase',
      onClick: (row) => handleGeneratePurchaseOrder(row),
    },
    {
      key: 'generateProduction',
      label: t('scm.mrp_suggestion_page.k33'),
      icon: <Factory size={14} />,
      color: 'success',
      show: (row) => row.status === 'confirmed' && row.suggestion_type === 'production',
      onClick: (row) => handleGenerateProductionOrder(row),
    },
  ];

  const tabs: CrudTab[] = [
    { id: 'list', label: t('scm.mrp_suggestion_page.k34'), content: null },
    {
      id: 'summary',
      label: t('scm.mrp_suggestion_page.k35'),
      content: <MrpMaterialSummaryTab planId={planId || undefined} />,
    },
  ];

  return (
    <>
      <CrudPage
        schema={schema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions as unknown as RowAction<Record<string, unknown>>[]}
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
