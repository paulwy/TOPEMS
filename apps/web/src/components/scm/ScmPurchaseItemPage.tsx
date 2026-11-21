import React from 'react';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';

import { purchaseItemSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';
import type {
  PurchaseItem,
  CreatePurchaseItemRequest,
  UpdatePurchaseItemRequest,
  PurchaseItemQueryParams,
} from '@/api/scm';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const apiAdapter: CrudApiAdapter<PurchaseItem> = {
  list: async (params) => {
    const response = await scmApi.purchaseItems.list(params as PurchaseItemQueryParams);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('scm.scm_purchase_item_page.k0'));
    }
    return {
      data: response.data.items || [],
      total: response.data.total || 0,
    };
  },
  create: async (data) => {
    const response = await scmApi.purchaseItems.create(data as CreatePurchaseItemRequest);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('scm.scm_purchase_item_page.k1'));
    }
    return response.data;
  },
  update: async (id, data) => {
    const response = await scmApi.purchaseItems.update(id, data as UpdatePurchaseItemRequest);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('scm.scm_purchase_item_page.k2'));
    }
    return response.data;
  },
  delete: async () => {
    throw new Error(i18n.t('scm.scm_purchase_item_page.k3'));
  },
};

const ScmPurchaseItemPage: React.FC = () => {
  const { t } = useTranslation('scm');
  return (
    <CrudPage
      schema={purchaseItemSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: t('scm.scm_purchase_item_page.k4') }]}
    />
  );
};

export default ScmPurchaseItemPage;
