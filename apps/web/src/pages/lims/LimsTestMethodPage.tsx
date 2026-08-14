/**
 * 检测方法管理页面 — Schema 驱动的 CRUD 页面
 */
import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { testMethodSchema } from '@/schemas/lims/testMethod';
import { limsApi } from '@/api/lims';
import i18n from '@/i18n';
const testMethodApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await limsApi.testMethods.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
      category: params?.category as string | undefined,
    } as Parameters<typeof limsApi.testMethods.list>[0]);
    if (!response.success) {
      throw new Error(i18n.t('lims.lims_test_method_page.k0'));
    }
    const data = response.data;
    return {
      data: (data?.items || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },
  create: async (data) => {
    const response = await limsApi.testMethods.create(
      data as unknown as Parameters<typeof limsApi.testMethods.create>[0]
    );
    if (!response.success) {
      throw new Error(i18n.t('lims.lims_test_method_page.k1'));
    }
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await limsApi.testMethods.update(
      id,
      data as unknown as Parameters<typeof limsApi.testMethods.update>[1]
    );
    if (!response.success) {
      throw new Error(i18n.t('lims.lims_test_method_page.k2'));
    }
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await limsApi.testMethods.delete(id);
    if (!response.success) {
      throw new Error(i18n.t('lims.lims_test_method_page.k3'));
    }
  },
};
const LimsTestMethodPage: React.FC = () => {
  return (
    <CrudPage
      schema={testMethodSchema}
      apiAdapter={testMethodApiAdapter}
      breadcrumbs={[
        { label: i18n.t('lims.lims_test_method_page.k4'), href: '/dashboard' },
        { label: 'LIMS', href: '/lims' },
        { label: i18n.t('lims.lims_test_method_page.k5') },
      ]}
    />
  );
};
export default LimsTestMethodPage;