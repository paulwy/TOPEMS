import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Building2, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FormPageTemplate from '@/components/templates/FormPageTemplate';
import type { FormSection, FormField } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { crmApi } from '@/api/crm';
import { logger } from '@/utils/logger';
import { CRM_PATHS } from '@/modules/crm/config';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/lib/reactQuery';

const CustomerCreatePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const customerSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('crm.customerCreate.validation_name_required')),
        code: z.string().optional(),
        type: z.enum(['enterprise', 'personal', 'government']),
        industry: z.enum(['it', 'finance', 'manufacture', 'retail', 'other']).optional(),
        source: z.enum(['website', 'referral', 'exhibition', 'cold_call', 'other']).optional(),
        website: z.string().url(t('crm.customerCreate.validation_website_invalid')).optional(),
        phone: z.string().optional(),
        email: z.string().email(t('crm.customerCreate.validation_email_invalid')).optional(),
        address: z.string().optional(),
        description: z.string().optional(),
      }),
    [t]
  );

  type CustomerFormData = z.infer<typeof customerSchema>;

  const CUSTOMER_TYPES = [
    { value: 'enterprise', label: t('crm.customerCreate.type_enterprise') },
    { value: 'personal', label: t('crm.customerCreate.type_personal') },
    { value: 'government', label: t('crm.customerCreate.type_government') },
  ];

  const INDUSTRIES = [
    { value: 'it', label: t('crm.customerCreate.industry_it') },
    { value: 'finance', label: t('crm.customerCreate.industry_finance') },
    { value: 'manufacture', label: t('crm.customerCreate.industry_manufacture') },
    { value: 'retail', label: t('crm.customerCreate.industry_retail') },
    { value: 'other', label: t('crm.customerCreate.industry_other') },
  ];

  const SOURCES = [
    { value: 'website', label: t('crm.customerCreate.source_website') },
    { value: 'referral', label: t('crm.customerCreate.source_referral') },
    { value: 'exhibition', label: t('crm.customerCreate.source_exhibition') },
    { value: 'cold_call', label: t('crm.customerCreate.source_cold_call') },
    { value: 'other', label: t('crm.customerCreate.source_other') },
  ];

  const createMutation = useMutation({
    mutationFn: (data: CustomerFormData) =>
      crmApi.customers.create({
        name: data.name.trim(),
        code: data.code?.trim() || undefined,
        customer_type: data.type,
        industry: data.industry || undefined,
        source: data.source || undefined,
        website: data.website?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        address: data.address?.trim() || undefined,
        notes: data.description?.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CRM.CUSTOMERS,
        exact: false,
        refetchType: 'active',
      });
      navigate(CRM_PATHS.customers);
    },
  });

  const handleSubmit = useCallback(
    async (data: unknown) => {
      const formData = data as CustomerFormData;
      try {
        await createMutation.mutateAsync(formData);
      } catch (err: unknown) {
        logger.error('Failed to create customer:', err);
      }
    },
    [createMutation]
  );

  const handleCancel = () => {
    navigate(CRM_PATHS.customers);
  };

  const sections: FormSection[] = [
    {
      id: 'basic',
      title: t('crm.customerCreate.section_basic_title'),
      description: t('crm.customerCreate.section_basic_desc'),
      icon: <Building2 style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'name',
          label: t('crm.customerCreate.field_name'),
          type: 'text',
          required: true,
          placeholder: t('crm.customerCreate.field_name_placeholder'),
        },
        {
          name: 'code',
          label: t('crm.customerCreate.field_code'),
          type: 'text',
          placeholder: t('crm.customerCreate.field_code_placeholder'),
        },
        {
          name: 'type',
          label: t('crm.customerCreate.field_type'),
          type: 'select',
          options: CUSTOMER_TYPES.map((type) => ({
            label: type.label,
            value: type.value,
          })),
          defaultValue: 'enterprise',
        },
        {
          name: 'industry',
          label: t('crm.customerCreate.field_industry'),
          type: 'select',
          options: INDUSTRIES.map((industry) => ({
            label: industry.label,
            value: industry.value,
          })),
          placeholder: t('crm.customerCreate.field_industry_placeholder'),
        },
        {
          name: 'source',
          label: t('crm.customerCreate.field_source'),
          type: 'select',
          options: SOURCES.map((source) => ({
            label: source.label,
            value: source.value,
          })),
          placeholder: t('crm.customerCreate.field_source_placeholder'),
        },
        {
          name: 'website',
          label: t('crm.customerCreate.field_website'),
          type: 'text',
          placeholder: t('crm.customerCreate.field_website_placeholder'),
        },
      ],
    },
    {
      id: 'contact',
      title: t('crm.customerCreate.section_contact_title'),
      description: t('crm.customerCreate.section_contact_desc'),
      icon: <Mail style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'phone',
          label: t('crm.customerCreate.field_phone'),
          type: 'text',
          placeholder: t('crm.customerCreate.field_phone_placeholder'),
        },
        {
          name: 'email',
          label: t('crm.customerCreate.field_email'),
          type: 'email',
          placeholder: t('crm.customerCreate.field_email_placeholder'),
        },
        {
          name: 'address',
          label: t('crm.customerCreate.field_address'),
          type: 'text',
          placeholder: t('crm.customerCreate.field_address_placeholder'),
          span: 2,
        },
      ],
    },
    {
      id: 'description',
      title: t('crm.customerCreate.section_notes_title'),
      description: t('crm.customerCreate.section_notes_desc'),
      collapsible: false,
      fields: [
        {
          name: 'description',
          label: t('crm.customerCreate.field_description'),
          type: 'textarea',
          rows: 3,
          placeholder: t('crm.customerCreate.field_description_placeholder'),
        },
      ],
    },
  ];

  return (
    <PageContainer
      title={t('crm.customerCreate.title')}
      subtitle={t('crm.customerCreate.subtitle')}
      autoTitle
      autoBreadcrumbs
    >
      <FormPageTemplate
        title=''
        subtitle=''
        backHref={CRM_PATHS.customers}
        breadcrumbs={[
          { label: t('crm.common.home'), href: '/dashboard' },
          { label: t('crm.customerList.title'), href: CRM_PATHS.root },
          { label: t('crm.customerCreate.breadcrumb_list'), href: CRM_PATHS.customers },
          { label: t('crm.customerCreate.breadcrumb_new') },
        ]}
        sections={sections}
        schema={customerSchema}
        submitting={createMutation.isPending}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText={t('crm.customerCreate.submit')}
        cancelText={t('crm.common.cancel')}
        columns={3}
        stickyFooter={true}
      />
    </PageContainer>
  );
};

export default CustomerCreatePage;
