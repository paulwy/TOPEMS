import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';

import { incomingInspectionSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';
import type {
  IncomingInspection,
  CreateIncomingInspectionRequest,
  UpdateIncomingInspectionRequest,
} from '@/api/scm';
import { useNotificationStore } from '@/store/notificationStore';
import i18n from '@/i18n';

const apiAdapter: CrudApiAdapter<IncomingInspection> = {
  list: async (params) => {
    const response = await scmApi.incomingInspections.list(params);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('scm.scm_incoming_inspection_page.k0'));
    }
    // 后端返回 { inspections, total, page, page_size }（非共享 items 结构）
    const data = response.data as unknown as {
      inspections?: IncomingInspection[];
      total?: number;
    };
    return {
      data: data.inspections || [],
      total: data.total || 0,
    };
  },
  create: async (data) => {
    const response = await scmApi.incomingInspections.create(
      data as unknown as CreateIncomingInspectionRequest
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('scm.scm_incoming_inspection_page.k1'));
    }
    return response.data;
  },
  update: async (id, data) => {
    const response = await scmApi.incomingInspections.update(
      id,
      data as unknown as UpdateIncomingInspectionRequest
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('scm.scm_incoming_inspection_page.k2'));
    }
    return response.data;
  },
  delete: async () => {
    // 后端未提供 DELETE /incoming-inspections/{id} 路由，来料检验不支持删除
    throw new Error(i18n.t('scm.scm_incoming_inspection_page.k3'));
  },
};

const ScmIncomingInspectionPage: React.FC = () => {
  const { t } = useTranslation('scm');
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: [incomingInspectionSchema.entity],
      refetchType: 'active',
    });
  };

  const customRowActions: RowAction[] = [
    {
      key: 'pass',
      label: t('scm.scm_incoming_inspection_page.k4'),
      icon: <CheckCircle size={16} />,
      color: 'success',
      show: (row) => (row as unknown as IncomingInspection).status === 'pending',
      confirm: true,
      confirmMessage: t('scm.scm_incoming_inspection_page.k5'),
      onClick: async (row) => {
        const item = row as unknown as IncomingInspection;
        const response = await scmApi.incomingInspections.pass(item.id, {
          passed_quantity: item.inspected_quantity ?? 0,
          remarks: t('scm.scm_incoming_inspection_page.k8'),
        });
        if (response.success) {
          addNotification({
            type: 'success',
            message: t('scm.scm_incoming_inspection_page.k6'),
          });
          invalidate();
        } else {
          addNotification({
            type: 'error',
            message: response.message || t('scm.scm_incoming_inspection_page.k7'),
          });
        }
      },
    },
    {
      key: 'reject',
      label: t('scm.scm_incoming_inspection_page.k9'),
      icon: <XCircle size={16} />,
      color: 'error',
      show: (row) => (row as unknown as IncomingInspection).status === 'pending',
      confirm: true,
      confirmMessage: t('scm.scm_incoming_inspection_page.k10'),
      onClick: async (row) => {
        const item = row as unknown as IncomingInspection;
        const response = await scmApi.incomingInspections.reject(item.id, {
          passed_quantity: 0,
          failed_quantity: item.inspected_quantity ?? 0,
          remarks: t('scm.scm_incoming_inspection_page.k11'),
        });
        if (response.success) {
          addNotification({
            type: 'success',
            message: t('scm.scm_incoming_inspection_page.k12'),
          });
          invalidate();
        } else {
          addNotification({
            type: 'error',
            message: response.message || t('scm.scm_incoming_inspection_page.k13'),
          });
        }
      },
    },
  ];

  return (
    <CrudPage
      schema={incomingInspectionSchema}
      apiAdapter={apiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[{ label: 'SCM' }, { label: t('scm.scm_incoming_inspection_page.k14') }]}
    />
  );
};

export default ScmIncomingInspectionPage;
