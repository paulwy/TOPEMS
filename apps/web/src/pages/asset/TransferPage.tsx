import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Building2, MapPin, FileText, Calendar, User } from 'lucide-react';
import FormPageTemplate from '@/components/templates/FormPageTemplate';
import type { FormSection, FormField } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { logger } from '@/utils/logger';
import { ASSET_PATHS } from '@/modules/asset/config';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';

import { useTranslation } from 'react-i18next';

const transferSchema = z.object({
  asset_id: z.string().min(1, '请选择资产'),
  asset_name: z.string().optional(),
  from_department: z.string().min(1, '请选择调出部门'),
  to_department: z.string().min(1, '请选择调入部门'),
  from_location: z.string().optional(),
  to_location: z.string().optional(),
  responsible_person: z.string().optional(),
  transfer_date: z.string().min(1, '请选择调拨日期'),
  reason: z.string().min(1, '请填写调拨原因'),
  description: z.string().optional(),
});

type TransferFormData = z.infer<typeof transferSchema>;

const DEPARTMENTS = [
  { value: '研发部', label: '研发部' },
  { value: '市场部', label: '市场部' },
  { value: '财务部', label: '财务部' },
  { value: '行政部', label: '行政部' },
  { value: '生产部', label: '生产部' },
  { value: '采购部', label: '采购部' },
];

const ASSETS = [
  { value: 'AST-001', label: 'AST-001 - 办公电脑-01' },
  { value: 'AST-002', label: 'AST-002 - 服务器-01' },
  { value: 'AST-003', label: 'AST-003 - 打印机-01' },
  { value: 'AST-004', label: 'AST-004 - 投影仪-01' },
  { value: 'AST-005', label: 'AST-005 - 空调-01' },
  { value: 'AST-006', label: 'AST-006 - 办公桌-01' },
  { value: 'AST-007', label: 'AST-007 - 笔记本电脑-01' },
  { value: 'AST-008', label: 'AST-008 - 监控摄像头-01' },
];

const TransferPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const createMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('asset.transfer_page.success'),
        message: t('asset.transfer_page.submit'),
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ERP.ASSETS] });
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
