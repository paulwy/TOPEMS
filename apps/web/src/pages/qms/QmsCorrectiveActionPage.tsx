import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { correctiveActionSchema } from '@/schemas/qms';
import { correctiveActionApi } from '@/api/qms';
import type { CorrectiveActionRecord } from '@/api/qms/correctiveAction';
import i18n from '@/i18n';

const actionAdapter: CrudApiAdapter<CorrectiveActionRecord> = {
  list: async (params) => {
    const filter = (params as Record<string, unknown> | undefined) ?? {};
    const status = filter.status === 'all' ? undefined : (filter.status as string | undefined);
    const priority =
      filter.priority === 'all' ? undefined : (filter.priority as string | undefined);
    const response = await correctiveActionApi.list({
      page: Number(params?.page) || 1,
      page_size: Number(params?.pageSize) || 10,
      search: params?.search,
      status,
      priority,
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('qms.corrective_action.load_fail'));
    }
    return { data: response.data.actions, total: response.data.total };
  },
  create: async (data) => {
    const response = await correctiveActionApi.create(
      data as Parameters<typeof correctiveActionApi.create>[0]
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('qms.corrective_action.create_fail'));
    }
    return response.data;
  },
  update: async (id, data) => {
    const response = await correctiveActionApi.update(
      id,
      data as Parameters<typeof correctiveActionApi.update>[1]
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('qms.corrective_action.update_fail'));
    }
    return response.data;
  },
  delete: async (id) => {
    const response = await correctiveActionApi.delete(id);
    if (!response.success) {
      throw new Error(response.message || i18n.t('qms.corrective_action.delete_fail'));
    }
  },
};

const QmsCorrectiveActionPage: React.FC = () => {
  return (
    <CrudPage
      schema={correctiveActionSchema}
      apiAdapter={actionAdapter}
      breadcrumbs={[{ label: 'QMS' }, { label: i18n.t('qms.nav.qms-corrective-actions') }]}
      detailMaxWidth='lg'
    />
  );
};

export default QmsCorrectiveActionPage;
