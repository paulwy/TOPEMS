import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Building2, MapPin, Calendar } from 'lucide-react';
import FormPageTemplate from '@/components/templates/FormPageTemplate';
import type { FormSection, FormField } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { logger } from '@/utils/logger';
import { ASSET_PATHS } from '@/modules/asset/config';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';
import { erpApi } from '@/api/erp';

import { useTranslation } from 'react-i18next';

type TransferFormData = {
  asset_id: string;
  asset_name?: string;
  from_department: string;
  to_department: string;
  from_location?: string;
  to_location?: string;
  responsible_person?: string;
  transfer_date: string;
  reason: string;
  description?: string;
};

const TransferPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const { data: backendData } = useQuery({
    queryKey: ['asset', 'transfer-backend'],
    queryFn: async () => {
      try {
        return await erpApi.assets.list();
      } catch {
        return {};
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const transferSchema = useMemo(
    () =>
      z.object({
        asset_id: z.string().min(1, t('asset:transfer.validation_select_asset')),
        asset_name: z.string().optional(),
        from_department: z.string().min(1, t('asset:transfer.validation_select_from_dept')),
        to_department: z.string().min(1, t('asset:transfer.validation_select_to_dept')),
        from_location: z.string().optional(),
        to_location: z.string().optional(),
        responsible_person: z.string().optional(),
        transfer_date: z.string().min(1, t('asset:transfer.validation_select_date')),
        reason: z.string().min(1, t('asset:transfer.validation_fill_reason')),
        description: z.string().optional(),
      }),
    [t]
  );

  const DEPARTMENTS = [
    { value: 'rd', label: t('asset:transfer.dept_rd') },
    { value: 'marketing', label: t('asset:transfer.dept_marketing') },
    { value: 'finance', label: t('asset:transfer.dept_finance') },
    { value: 'admin', label: t('asset:transfer.dept_admin') },
    { value: 'production', label: t('asset:transfer.dept_production') },
    { value: 'purchase', label: t('asset:transfer.dept_purchase') },
  ];

  const ASSETS = [
    { value: 'AST-001', label: t('asset:transfer.asset_ast_001') },
    { value: 'AST-002', label: t('asset:transfer.asset_ast_002') },
    { value: 'AST-003', label: t('asset:transfer.asset_ast_003') },
    { value: 'AST-004', label: t('asset:transfer.asset_ast_004') },
    { value: 'AST-005', label: t('asset:transfer.asset_ast_005') },
    { value: 'AST-006', label: t('asset:transfer.asset_ast_006') },
    { value: 'AST-007', label: t('asset:transfer.asset_ast_007') },
    { value: 'AST-008', label: t('asset:transfer.asset_ast_008') },
  ];

  const createMutation = useMutation({
    mutationFn: async (_data: TransferFormData) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('asset.transfer_page.success'),
        message: t('asset.transfer_page.submit'),
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ERP.ASSETS],
        exact: false,
        refetchType: 'active',
      });
      navigate(ASSET_PATHS.list);
    },
    onError: (error) => {
      logger.error('Failed to create transfer:', error);
      addNotification({
        type: 'error',
        title: t('asset.transfer_page.fail'),
        message: t('asset.transfer_page.submit_1'),
      });
    },
  });

  const handleSubmit = useCallback(
    async (data: unknown) => {
      const formData = data as TransferFormData;
      try {
        await createMutation.mutateAsync(formData);
      } catch (err: unknown) {
        logger.error('Failed to submit transfer:', err);
      }
    },
    [createMutation]
  );

  const handleCancel = () => {
    navigate(ASSET_PATHS.list);
  };

  const sections: FormSection[] = [
    {
      id: 'asset',
      title: t('asset.transfer_page.info'),
      description: t('asset.transfer_page.transfer'),
      icon: <Building2 style={{ width: 18, height: 18 }} />,
      collapsible: false,
      color: 'primary',
      fields: [
        {
          name: 'asset_id',
          label: t('asset.transfer_page.text_1b6830'),
          type: 'select',
          options: ASSETS.map((asset) => ({
            label: asset.label,
            value: asset.value,
          })),
          required: true,
          placeholder: t('asset.transfer_page.please_select'),
        },
      ],
    },
    {
      id: 'department',
      title: t('asset.transfer_page.info_1'),
      description: t('asset.transfer_page.text_035d60'),
      icon: <MapPin style={{ width: 18, height: 18 }} />,
      collapsible: false,
      color: 'secondary',
      fields: [
        {
          name: 'from_department',
          label: t('asset.transfer_page.text_ca25ca'),
          type: 'select',
          options: DEPARTMENTS.map((dept) => ({
            label: dept.label,
            value: dept.value,
          })),
          required: true,
          placeholder: t('asset.transfer_page.please_select_1'),
        },
        {
          name: 'to_department',
          label: t('asset.transfer_page.text_d619c4'),
          type: 'select',
          options: DEPARTMENTS.map((dept) => ({
            label: dept.label,
            value: dept.value,
          })),
          required: true,
          placeholder: t('asset.transfer_page.please_select_2'),
        },
        {
          name: 'from_location',
          label: t('asset.transfer_page.text_8d9da7'),
          type: 'text',
          placeholder: t('asset.transfer_page.please_input'),
        },
        {
          name: 'to_location',
          label: t('asset.transfer_page.text_0cc4cd'),
          type: 'text',
          placeholder: t('asset.transfer_page.please_input_1'),
        },
      ],
    },
    {
      id: 'transfer',
      title: t('asset.transfer_page.info_2'),
      description: t('asset.transfer_page.responsible_person'),
      icon: <Calendar style={{ width: 18, height: 18 }} />,
      collapsible: false,
      color: 'info',
      fields: [
        {
          name: 'transfer_date',
          label: t('asset.transfer_page.date'),
          type: 'date',
          required: true,
        },
        {
          name: 'responsible_person',
          label: t('asset.transfer_page.responsible_person_1'),
          type: 'text',
          placeholder: t('asset.transfer_page.please_input_2'),
        },
        {
          name: 'reason',
          label: t('asset.transfer_page.transfer_1'),
          type: 'textarea',
          rows: 3,
          required: true,
          placeholder: t('asset.transfer_page.please_fill_1'),
        },
        {
          name: 'description',
          label: t('asset.transfer_page.remark'),
          type: 'textarea',
          rows: 2,
          placeholder: t('asset.transfer_page.please_fill_2'),
        },
      ],
    },
  ];

  return (
    <PageContainer
      title={t('asset.transfer_page.transfer_2')}
      subtitle={t('asset.transfer_page.submit_2')}
      autoTitle
      autoBreadcrumbs
    >
      <FormPageTemplate
        title=''
        subtitle=''
        backHref={ASSET_PATHS.transfers}
        breadcrumbs={[
          { label: t('asset.transfer_page.home'), href: '/dashboard' },
          { label: t('asset.transfer_page.text_b1a8be'), href: ASSET_PATHS.root },
          { label: t('asset.transfer_page.list'), href: ASSET_PATHS.list },
          { label: t('asset.transfer_page.transfer_2') },
        ]}
        sections={sections}
        schema={transferSchema}
        submitting={createMutation.isPending}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText={t('asset.transfer_page.submit_3')}
        cancelText={t('asset.transfer_page.cancel')}
        columns={2}
        stickyFooter={true}
        showProgress={true}
      />
    </PageContainer>
  );
};

export default TransferPage;
