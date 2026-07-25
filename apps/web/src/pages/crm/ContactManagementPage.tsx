/**
 * 联系人管理页面 — Schema 驱动的 CRUD 页面
 */

import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { contactSchema } from '@/schemas/crm/contact';
import { crmApi } from '@/api/crm';

const contactApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await crmApi.contacts.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    } as Parameters<typeof crmApi.contacts.list>[0]);
    if (!response.success || !response.data) {
      throw new Error('加载联系人列表失败');
    }
    return {
      data: (response.data?.items || []) as unknown as Record<string, unknown>[],
      total: response.data?.total || 0,
    };
  },

  create: async (data) => {
    const response = await crmApi.contacts.create(
      data as unknown as Parameters<typeof crmApi.contacts.create>[0]
    );
    if (!response.success) {
      throw new Error('创建联系人失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await crmApi.contacts.update(
      id,
      data as unknown as Parameters<typeof crmApi.contacts.update>[1]
    );
    if (!response.success) {
      throw new Error('更新联系人失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await crmApi.contacts.delete(id);
    if (!response.success) {
      throw new Error('删除联系人失败');
    }
  },
};

const ContactManagementPage: React.FC = () => {
  return (
    <CrudPage
      schema={contactSchema}
      apiAdapter={contactApiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'CRM', href: '/crm' },
        { label: '联系人管理' },
      ]}
    />
  );
};

export default ContactManagementPage;
