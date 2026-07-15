import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Building2, Mail, Phone, MapPin, Globe } from 'lucide-react';
import FormPageTemplate from '@/components/templates/FormPageTemplate';
import type { FormSection, FormField } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { crmApi } from '@/api/crm';
import { logger } from '@/utils/logger';
import { CRM_PATHS } from '@/modules/crm/config';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const customerSchema = z.object({
  name: z.string().min(1, '客户名称不能为空'),
  code: z.string().optional(),
  type: z.enum(['enterprise', 'personal', 'government']),
  industry: z.enum(['it', 'finance', 'manufacture', 'retail', 'other']).optional(),
  source: z.enum(['website', 'referral', 'exhibition', 'cold_call', 'other']).optional(),
  website: z.string().url('请输入有效的网址').optional(),
  phone: z.string().optional(),
  email: z.string().email('请输入有效的邮箱地址').optional(),
  address: z.string().optional(),
  description: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

const CUSTOMER_TYPES = [
  { value: 'enterprise', label: '企业客户' },
  { value: 'personal', label: '个人客户' },
  { value: 'government', label: '政府机构' },
];

const INDUSTRIES = [
  { value: 'it', label: '信息技术' },
  { value: 'finance', label: '金融' },
  { value: 'manufacture', label: '制造业' },
  { value: 'retail', label: '零售' },
  { value: 'other', label: '其他' },
];

const SOURCES = [
  { value: 'website', label: '官网' },
  { value: 'referral', label: '客户推荐' },
  { value: 'exhibition', label: '展会' },
  { value: 'cold_call', label: '电话营销' },
  { value: 'other', label: '其他' },
];

const CustomerCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CRM.CUSTOMERS });
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
      title: '基本信息',
      description: '客户基本信息',
      icon: <Building2 style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'name',
          label: '客户名称',
          type: 'text',
          required: true,
          placeholder: '请输入客户名称',
        },
        {
          name: 'code',
          label: '客户编码',
          type: 'text',
          placeholder: '请输入客户编码',
        },
        {
          name: 'type',
          label: '客户类型',
          type: 'select',
          options: CUSTOMER_TYPES.map((type) => ({
            label: type.label,
            value: type.value,
          })),
          defaultValue: 'enterprise',
        },
        {
          name: 'industry',
          label: '行业',
          type: 'select',
          options: INDUSTRIES.map((industry) => ({
            label: industry.label,
            value: industry.value,
          })),
          placeholder: '请选择行业',
        },
        {
          name: 'source',
          label: '客户来源',
          type: 'select',
          options: SOURCES.map((source) => ({
            label: source.label,
            value: source.value,
          })),
          placeholder: '请选择客户来源',
        },
        {
          name: 'website',
          label: '网站',
          type: 'text',
          placeholder: '请输入网站地址',
        },
      ],
    },
    {
      id: 'contact',
      title: '联系方式',
      description: '客户联系信息',
      icon: <Mail style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'phone',
          label: '电话',
          type: 'text',
          placeholder: '请输入电话号码',
        },
        {
          name: 'email',
          label: '邮箱',
          type: 'email',
          placeholder: '请输入邮箱地址',
        },
        {
          name: 'address',
          label: '地址',
          type: 'text',
          placeholder: '请输入地址',
          span: 2,
        },
      ],
    },
    {
      id: 'description',
      title: '备注',
      description: '客户备注信息',
      collapsible: false,
      fields: [
        {
          name: 'description',
          label: '描述',
          type: 'textarea',
          rows: 3,
          placeholder: '请输入描述...',
        },
      ],
    },
  ];

  return (
    <PageContainer
      title='新建客户'
      subtitle='创建新的客户档案'
      autoTitle
      autoBreadcrumbs
    >
      <FormPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '客户管理', href: CRM_PATHS.root },
          { label: '客户列表', href: CRM_PATHS.customers },
          { label: '新建客户' },
        ]}
        sections={sections}
        schema={customerSchema}
        submitting={createMutation.isPending}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText='创建客户'
        cancelText='取消'
        columns={3}
        stickyFooter={true}
      />
    </PageContainer>
  );
};

export default CustomerCreatePage;
