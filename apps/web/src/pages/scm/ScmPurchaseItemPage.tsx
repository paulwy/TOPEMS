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

const apiAdapter: CrudApiAdapter<PurchaseItem> = {
  list: async (params) => {
    const response = await scmApi.purchaseItems.list(params as PurchaseItemQueryParams);
    if (!response.success || !response.data) {
      throw new Error(response.message || '加载采购明细失败');
    }
    return {
      data: response.data.items || [],
      total: response.data.total || 0,
    };
  },
  create: async (data) => {
    const response = await scmApi.purchaseItems.create(data as CreatePurchaseItemRequest);
    if (!response.success || !response.data) {
      throw new Error(response.message || '创建采购明细失败');
    }
    return response.data;
  },
  update: async (id, data) => {
    const response = await scmApi.purchaseItems.update(id, data as UpdatePurchaseItemRequest);
    if (!response.success || !response.data) {
      throw new Error(response.message || '更新采购明细失败');
    }
    return response.data;
  },
  delete: async () => {
    throw new Error('采购明细暂不支持删除');
  },
};

const ScmPurchaseItemPage: React.FC = () => {
  return (
    <CrudPage
      schema={purchaseItemSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: '采购明细管理' }]}
    />
  );
};

export default ScmPurchaseItemPage;
