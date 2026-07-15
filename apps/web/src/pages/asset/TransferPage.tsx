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
        title: '调拨成功',
        message: '资产调拨申请已提交',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ERP.ASSETS] });
      navigate(ASSET_PATHS.list);
    },
    onError: (error) => {
      logger.error('Failed to create transfer:', error);
      addNotification({
        type: 'error',
        title: '调拨失败',
        message: '无法提交调拨申请',
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
      title: '资产信息',
      description: '选择需要调拨的资产',
      icon: <Building2 style={{ width: 18, height: 18 }} />,
      collapsible: false,
      color: 'primary',
      fields: [
        {
          name: 'asset_id',
          label: '资产编号',
          type: 'select',
          options: ASSETS.map((asset) => ({
            label: asset.label,
            value: asset.value,
          })),
          required: true,
          placeholder: '请选择资产',
        },
      ],
    },
    {
      id: 'department',
      title: '部门信息',
      description: '选择调出和调入部门',
      icon: <MapPin style={{ width: 18, height: 18 }} />,
      collapsible: false,
      color: 'secondary',
      fields: [
        {
          name: 'from_department',
          label: '调出部门',
          type: 'select',
          options: DEPARTMENTS.map((dept) => ({
            label: dept.label,
            value: dept.value,
          })),
          required: true,
          placeholder: '请选择调出部门',
        },
        {
          name: 'to_department',
          label: '调入部门',
          type: 'select',
          options: DEPARTMENTS.map((dept) => ({
            label: dept.label,
            value: dept.value,
          })),
          required: true,
          placeholder: '请选择调入部门',
        },
        {
          name: 'from_location',
          label: '调出位置',
          type: 'text',
          placeholder: '请输入调出位置',
        },
        {
          name: 'to_location',
          label: '调入位置',
          type: 'text',
          placeholder: '请输入调入位置',
        },
      ],
    },
    {
      id: 'transfer',
      title: '调拨信息',
      description: '填写调拨日期、责任人及原因',
      icon: <Calendar style={{ width: 18, height: 18 }} />,
      collapsible: false,
      color: 'info',
      fields: [
        {
          name: 'transfer_date',
          label: '调拨日期',
          type: 'date',
          required: true,
        },
        {
          name: 'responsible_person',
          label: '责任人',
          type: 'text',
          placeholder: '请输入责任人姓名',
        },
        {
          name: 'reason',
          label: '调拨原因',
          type: 'textarea',
          rows: 3,
          required: true,
          placeholder: '请填写调拨原因...',
        },
        {
          name: 'description',
          label: '备注',
          type: 'textarea',
          rows: 2,
          placeholder: '请填写备注信息...',
        },
      ],
    },
  ];

  return (
    <PageContainer
      title='资产调拨'
      subtitle='提交资产调拨申请'
      autoTitle
      autoBreadcrumbs
    >
      <FormPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '资产管理', href: ASSET_PATHS.root },
          { label: '资产列表', href: ASSET_PATHS.list },
          { label: '资产调拨' },
        ]}
        sections={sections}
        schema={transferSchema}
        submitting={createMutation.isPending}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText='提交调拨申请'
        cancelText='取消'
        columns={2}
        stickyFooter={true}
        showProgress={true}
      />
    </PageContainer>
  );
};

export default TransferPage;
