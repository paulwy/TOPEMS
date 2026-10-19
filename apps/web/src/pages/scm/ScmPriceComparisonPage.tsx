import React, { useMemo } from 'react';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';

import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { priceComparisonSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';
import type {
  PriceComparison,
  CreatePriceComparisonRequest,
  UpdatePriceComparisonRequest,
} from '@/api/scm';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notificationStore';
import { CheckCircle } from 'lucide-react';

const apiAdapter = createCrudPageAdapter<
  PriceComparison,
  CreatePriceComparisonRequest,
  UpdatePriceComparisonRequest
>(scmApi.priceComparisons);

const ScmPriceComparisonPage: React.FC = () => {
  const { t } = useTranslation('scm');
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const schema = useMemo(
    () => ({
      ...priceComparisonSchema,
      exportConfig: {
        enabled: true,
        onExport: async () => {
          // 占位：实际导出逻辑可在此实现
        },
        fileName: t('scm.scm_price_comparison_page.k0'),
      },
    }),
    [t]
  );

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'approve',
        label: t('scm.scm_price_comparison_page.k2'),
        icon: <CheckCircle size={16} />,
        color: 'success',
        show: (row) => (row as unknown as PriceComparison).status === 'pending',
        onClick: async (row) => {
          const response = await scmApi.priceComparisons.approve(
            (row as unknown as PriceComparison).id
          );
          if (response.success) {
            addNotification({
              type: 'success',
              message: t('scm.scm_price_comparison_page.k3'),
            });
            queryClient.invalidateQueries({
              queryKey: [priceComparisonSchema.entity],
              refetchType: 'active',
            });
          } else {
            addNotification({
              type: 'error',
              message: response.message || t('scm.scm_price_comparison_page.k4'),
            });
          }
        },
      },
    ],
    [t, queryClient, addNotification]
  );

  return (
    <CrudPage
      schema={schema}
      apiAdapter={apiAdapter as CrudApiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[{ label: 'SCM' }, { label: t('scm.scm_price_comparison_page.k1') }]}
    />
  );
};

export default ScmPriceComparisonPage;
