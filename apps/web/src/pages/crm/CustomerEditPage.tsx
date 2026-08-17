import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Building2, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FormPageTemplate from '@/components/templates/FormPageTemplate';
import type { FormSection, FormField } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { customerApi, type UpdateCustomerRequest } from '@/api/crm';
import { useNotification } from '@/hooks/useNotification';
import { logger } from '@/utils/logger';
import { CRM_PATHS } from '@/modules/crm/config';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';

const CustomerEditPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const queryClient = useQueryClient();

  const customerSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('crm.customerEdit.validation_name_required')),
        code: z.string().optional(),
        type: z.enum(['enterprise', 'personal', 'government']),
        industry: z.enum(['it', 'finance', 'manufacture', 'retail', 'other']).optional(),
        source: z.enum(['website', 'referral', 'exhibition', 'cold_call', 'other']).optional(),
        website: z.string().url(t('crm.customerEdit.validation_website_invalid')).optional(),
        phone: z.string().optional(),
        email: z.string().email(t('crm.customerEdit.validation_email_invalid')).optional(),
        address: z.string().optional(),
        description: z.string().optional(),
      }),
    [t]
  );

  type CustomerFormData = z.infer<typeof customerSchema>;

  const CUSTOMER_TYPES = [
    { value: 'enterprise', label: t('crm.customerEdit.type_enterprise') },
    { value: 'personal', label: t('crm.customerEdit.type_personal') },
    { value: 'government', label: t('crm.customerEdit.type_government') },
  ];

  const INDUSTRIES = [
    { value: 'it', label: t('crm.customerEdit.industry_it') },
    { value: 'finance', label: t('crm.customerEdit.industry_finance') },
    { value: 'manufacture', label: t('crm.customerEdit.industry_manufacture') },
    { value: 'retail', label: t('crm.customerEdit.industry_retail') },
    { value: 'other', label: t('crm.customerEdit.industry_other') },
  ];

  const SOURCES = [
    { value: 'website', label: t('crm.customerEdit.source_website') },
    { value: 'referral', label: t('crm.customerEdit.source_referral') },
    { value: 'exhibition', label: t('crm.customerEdit.source_exhibition') },
    { value: 'cold_call', label: t('crm.customerEdit.source_cold_call') },
    { value: 'other', label: t('crm.customerEdit.source_other') },
  ];

  const customerQuery = useQuery({
    queryKey: QUERY_KEYS.CRM.CUSTOMER(id || ''),
    queryFn: async () => {
      const response = await customerApi.get(id!);
      if (response.code === 200 && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const customer = customerQuery.data ?? null;
  const loading = customerQuery.isLoading;

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: UpdateCustomerRequest }) =>
      customerApi.update(params.id, params.data),
    onSuccess: (response, variables) => {
      if (response.code === 200) {
        success(t('crm.customerEdit.msg_update_success'));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.CRM.CUSTOMER(variables.id),
          exact: false,
          refetchType: 'active',
        });
        navigate(CRM_PATHS.customerDetail.replace(':id', variables.id));
      } else {
        error(response.message || t('crm.customerEdit.msg_update_fail'));
      }
    },
    onError: (err: unknown) => {
      logger.error('Failed to update customer:', err);
      error(t('crm.customerEdit.msg_update_error'));
    },
  });

  const submitting = updateMutation.isPending;

  const defaultValues = useMemo(() => {
    if (!customer) return {};
    return {
      name: customer.name || '',
      code: customer.code || '',
      type: customer.customer_type || 'enterprise',
      industry: customer.industry || '',
      source: customer.source || '',
      website: customer.website || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      description: customer.notes || '',
    };
  }, [customer]);

  const handleSubmit = async (data: unknown) => {
    if (!id) {
      error(t('crm.customerEdit.error_invalid_id'));
      return;
    }

    const formData = data as CustomerFormData;

    await updateMutation
      .mutateAsync({
        id,
        data: {
          name: formData.name.trim(),
          code: formData.code?.trim() || undefined,
          customer_type: formData.type,
          industry: formData.industry || undefined,
          source: formData.source || undefined,
          website: formData.website?.trim() || undefined,
          phone: formData.phone?.trim() || undefined,
          email: formData.email?.trim() || undefined,
          address: formData.address?.trim() || undefined,
          notes: formData.description?.trim() || undefined,
        },
      })
      .catch(() => {
        // Error handled by onError
      });
  };

  const handleCancel = () => {
    if (id) {
      navigate(CRM_PATHS.customerDetail.replace(':id', id));
    } else {
      navigate(CRM_PATHS.customers);
    }
  };

  const sections: FormSection[] = [
    {
      id: 'basic',
      title: t('crm.customerEdit.section_basic_title'),
      description: t('crm.customerEdit.section_basic_desc'),
      icon: <Building2 style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'name',
          label: t('crm.customerEdit.field_name'),
          type: 'text',
          required: true,
          placeholder: t('crm.customerEdit.field_name_placeholder'),
        },
        {
          name: 'code',
          label: t('crm.customerEdit.field_code'),
          type: 'text',
          placeholder: t('crm.customerEdit.field_code_placeholder'),
        },
        {
          name: 'type',
          label: t('crm.customerEdit.field_type'),
          type: 'select',
          options: CUSTOMER_TYPES.map((type) => ({
            label: type.label,
            value: type.value,
          })),
        },
        {
          name: 'industry',
          label: t('crm.customerEdit.field_industry'),
          type: 'select',
          options: INDUSTRIES.map((industry) => ({
            label: industry.label,
            value: industry.value,
          })),
          placeholder: t('crm.customerEdit.field_industry_placeholder'),
        },
        {
          name: 'source',
          label: t('crm.customerEdit.field_source'),
          type: 'select',
          options: SOURCES.map((source) => ({
            label: source.label,
            value: source.value,
          })),
          placeholder: t('crm.customerEdit.field_source_placeholder'),
        },
        {
          name: 'website',
          label: t('crm.customerEdit.field_website'),
          type: 'text',
          placeholder: t('crm.customerEdit.field_website_placeholder'),
        },
      ],
    },
    {
      id: 'contact',
      title: t('crm.customerEdit.section_contact_title'),
      description: t('crm.customerEdit.section_contact_desc'),
      icon: <Mail style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'phone',
          label: t('crm.customerEdit.field_phone'),
          type: 'text',
          placeholder: t('crm.customerEdit.field_phone_placeholder'),
        },
        {
          name: 'email',
          label: t('crm.customerEdit.field_email'),
          type: 'email',
          placeholder: t('crm.customerEdit.field_email_placeholder'),
        },
        {
          name: 'address',
          label: t('crm.customerEdit.field_address'),
          type: 'text',
          placeholder: t('crm.customerEdit.field_address_placeholder'),
          span: 2,
        },
      ],
    },
    {
      id: 'description',
      title: t('crm.customerEdit.section_notes_title'),
      description: t('crm.customerEdit.section_notes_desc'),
      collapsible: false,
      fields: [
        {
          name: 'description',
          label: t('crm.customerEdit.field_description'),
          type: 'textarea',
          rows: 3,
          placeholder: t('crm.customerEdit.field_description_placeholder'),
        },
      ],
    },
  ];

  return (
    <PageContainer
      title={t('crm.customerEdit.title')}
      subtitle={t('crm.customerEdit.subtitle')}
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
          { label: t('crm.customerEdit.breadcrumb_list'), href: CRM_PATHS.customers },
          { label: t('crm.customerEdit.breadcrumb_edit') },
        ]}
        sections={sections}
        schema={customerSchema}
        defaultValues={defaultValues}
        loading={loading}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText={t('crm.customerEdit.submit')}
        cancelText={t('crm.common.cancel')}
        columns={3}
        stickyFooter={true}
      />
    </PageContainer>
  );
};

export default CustomerEditPage;
