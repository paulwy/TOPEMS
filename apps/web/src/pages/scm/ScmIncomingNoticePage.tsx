import React from 'react';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';

import { incomingNoticeSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';
import type {
  IncomingNotice,
  CreateIncomingNoticeRequest,
  UpdateIncomingNoticeRequest,
} from '@/api/scm';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const apiAdapter: CrudApiAdapter<IncomingNotice> = {
  list: async (params) => {
    const response = await scmApi.incomingInspections.listNotices(params);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('scm.scm_incoming_notice_page.k0'));
    }
    return {
      data: response.data.items || [],
      total: response.data.total || 0,
    };
  },
  create: async (data) => {
    const response = await scmApi.incomingInspections.createNotice(
      data as unknown as CreateIncomingNoticeRequest
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('scm.scm_incoming_notice_page.k1'));
    }
    return response.data;
  },
  update: async (id, data) => {
    const response = await scmApi.incomingInspections.updateNotice(
      id,
      data as unknown as UpdateIncomingNoticeRequest
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('scm.scm_incoming_notice_page.k2'));
    }
    return response.data;
  },
  delete: async () => {
    // 后端未提供 DELETE /incoming-notices/{id} 路由，到货通知不支持删除
    throw new Error(i18n.t('scm.scm_incoming_notice_page.k3'));
  },
};

const ScmIncomingNoticePage: React.FC = () => {
  const { t } = useTranslation('scm');
  return (
    <CrudPage
      schema={incomingNoticeSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: t('scm.scm_incoming_notice_page.k4') }]}
    />
  );
};

export default ScmIncomingNoticePage;
