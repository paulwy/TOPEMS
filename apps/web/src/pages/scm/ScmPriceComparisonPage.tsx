import React, { useMemo } from 'react';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';

import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { priceComparisonSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';
import type {
  PriceComparison,
  CreatePriceComparisonRequest,
  UpdatePriceComparisonRequest,
} from '@/api/scm';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter<
  PriceComparison,
  CreatePriceComparisonRequest,
  UpdatePriceComparisonRequest
>(scmApi.priceComparisons);

const ScmPriceComparisonPage: React.FC = () => {
  const { t } = useTranslation('scm');
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

  return (
    <CrudPage
      schema={schema}
      apiAdapter={apiAdapter as CrudApiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: t('scm.scm_price_comparison_page.k1') }]}
    />
  );
};

export default ScmPriceComparisonPage;
