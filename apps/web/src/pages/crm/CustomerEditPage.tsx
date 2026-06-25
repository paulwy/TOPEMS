import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Building2, Mail, Phone, MapPin, Globe } from 'lucide-react';
import FormPageTemplate from '@/components/templates/FormPageTemplate';
import type { FormSection, FormField } from '@/components/templates/FormPageTemplate';
import { customerApi, type Customer } from '@/api/crm';
import { useNotification } from '@/hooks/useNotification';
import { logger } from '@/utils/logger';

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

const CustomerEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadCustomer = useCallback(
    async (customerId: string) => {
      setLoading(true);
      try {
        const response = await customerApi.get(customerId);
        if (response.code === 200 && response.data) {
          setCustomer(response.data);
        }
      } catch (err: unknown) {
        logger.error('Failed to load customer:', err);
        error('加载客户信息失败');
      } finally {
        setLoading(false);
      }
    },
    [error]
  );

  useEffect(() => {
    if (id) {
      loadCustomer(id);
    }
  }, [id, loadCustomer]);

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

  const handleSubmit = useCallback(
    async (data: unknown) => {
      if (!id) {
        error('客户ID无效');
        return;
      }

      const formData = data as CustomerFormData;

      setSubmitting(true);
      try {
        const response = await customerApi.update(id, {
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
        });

        if (response.code === 200) {
          success('客户信息更新成功');
          navigate(`/crm/customers/${id}`);
        } else {
          error(response.message || '更新失败');
        }
      } catch (err: unknown) {
        logger.error('Failed to update customer:', err);
        error('更新客户信息失败');
      } finally {
        setSubmitting(false);
      }
    },
    [id, error, success, navigate]
  );

  const handleCancel = () => {
    if (id) {
      navigate(`/crm/customers/${id}`);
    } else {
      navigate('/crm/customers');
    }
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
    <FormPageTemplate
      title='编辑客户'
      subtitle='修改客户档案信息'
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: '客户管理', href: '/crm' },
        { label: '客户列表', href: '/crm/customers' },
        { label: '编辑客户' },
      ]}
      sections={sections}
      schema={customerSchema}
      defaultValues={defaultValues}
      loading={loading}
      submitting={submitting}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText='保存修改'
      cancelText='取消'
      columns={3}
      stickyFooter={true}
    />
  );
};

export default CustomerEditPage;