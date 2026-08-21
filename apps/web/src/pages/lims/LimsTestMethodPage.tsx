/**
 * 检测方法管理页面 — Schema 驱动的 CRUD 页面
 */
import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { testMethodSchema } from '@/schemas/lims/testMethod';
import { limsApi } from '@/api/lims';
import i18n from '@/i18n';

const testMethodApiAdapter = createCrudPageAdapter(limsApi.testMethods);
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
