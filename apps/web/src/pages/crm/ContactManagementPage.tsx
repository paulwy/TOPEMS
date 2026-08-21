/**
 * 联系人管理页面 — Schema 驱动的 CRUD 页面
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { contactSchema } from '@/schemas/crm/contact';
import { crmApi } from '@/api/crm';

const ContactManagementPage: React.FC = () => {
  const { t } = useTranslation();

    const contactApiAdapter = createCrudPageAdapter(crmApi.contacts);

  return (
    <CrudPage
      schema={contactSchema}
      apiAdapter={contactApiAdapter}
      breadcrumbs={[
        { label: t('crm.common.home'), href: '/dashboard' },
        { label: t('crm.common.crm'), href: '/crm' },
        { label: t('crm.contactList.title') },
      ]}
    />
  );
};

export default ContactManagementPage;
