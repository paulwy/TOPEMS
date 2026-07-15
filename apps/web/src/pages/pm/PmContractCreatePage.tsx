import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { FileText, Calendar, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FormPageTemplate from '@/components/templates/FormPageTemplate';
import type { FormSection, FormField } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { pmApi, type Project } from '@/api/pm';
import { useNotification } from '@/hooks/useNotification';
import { logger } from '@/utils/logger';
import { PM_PATHS } from '@/modules/pm/config';
import { QUERY_KEYS } from '@/lib/reactQuery';

const contractSchema = z.object({
  project_id: z.string().optional(),
  contract_code: z.string().min(1, '合同编号不能为空'),
  contract_name: z.string().min(1, '合同名称不能为空'),
  contract_type: z.enum(['construction', 'service', 'purchase', 'sales']),
  contract_category: z.enum(['main', 'supplement', 'servicelevel']),
  party_a_name: z.string().optional(),
  party_b_name: z.string().optional(),
  amount: z.string().refine((val) => parseFloat(val) > 0, '合同金额必须大于0'),
  currency: z.enum(['CNY', 'USD', 'EUR']),
  tax_rate: z
    .string()
    .refine((val) => parseFloat(val) >= 0 && parseFloat(val) <= 100, '税率必须在0-100之间'),
  signing_date: z.string().optional(),
  effective_date: z.string().optional(),
  end_date: z.string().optional(),
  description: z.string().optional(),
});

type ContractFormData = z.infer<typeof contractSchema>;

const CONTRACT_TYPES = [
  { value: 'construction', label: '工程合同' },
  { value: 'service', label: '服务合同' },
  { value: 'purchase', label: '采购合同' },
  { value: 'sales', label: '销售合同' },
];

const CONTRACT_CATEGORIES = [
  { value: 'main', label: '主合同' },
  { value: 'supplement', label: '补充协议' },
  { value: 'servicelevel', label: '服务协议' },
];

const CURRENCIES = [
  { value: 'CNY', label: '人民币' },
  { value: 'USD', label: '美元' },
  { value: 'EUR', label: '欧元' },
];

const PmContractCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.PM.PROJECTS,
    queryFn: async (): Promise<Project[]> => {
      const response = await pmApi.projects.list();
      return (response.data?.items ?? []) as Project[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: ContractFormData) => {
      return pmApi.contracts.create({
        project_id: formData.project_id || undefined,
        contract_code: formData.contract_code.trim(),
        contract_name: formData.contract_name.trim(),
        contract_type: formData.contract_type,
        contract_category: formData.contract_category,
        party_a_name: formData.party_a_name?.trim() || undefined,
        party_b_name: formData.party_b_name?.trim() || undefined,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        tax_rate: parseFloat(formData.tax_rate),
        signing_date: formData.signing_date || undefined,
        effective_date: formData.effective_date || undefined,
        end_date: formData.end_date || undefined,
        description: formData.description?.trim() || undefined,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PM.CONTRACTS });
      if (response.code === 200 || response.code === 201) {
        success('合同创建成功');
        navigate(PM_PATHS.contracts);
      } else {
        error(response.message || '创建失败');
      }
    },
    onError: (err: unknown) => {
      logger.error('Failed to create contract:', err);
      error('创建合同失败');
    },
  });

  const handleSubmit = useCallback(
    (data: unknown) => {
      createMutation.mutate(data as ContractFormData);
    },
    [createMutation]
  );

  const handleCancel = () => {
    navigate(PM_PATHS.contracts);
  };

  const projects = projectsData ?? [];
  const projectOptions = useMemo(() => {
    return projects.map((project: Project) => ({
      label: project.name,
      value: project.id,
    }));
  }, [projects]);

  const sections: FormSection[] = [
    {
      id: 'basic',
      title: '基本信息',
      description: '合同基本信息',
      icon: <FileText style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'project_id',
          label: '关联项目',
          type: 'select',
          options: [{ label: '请选择项目', value: '' }, ...projectOptions],
          placeholder: '请选择项目',
        },
        {
          name: 'contract_code',
          label: '合同编号',
          type: 'text',
          required: true,
          placeholder: '请输入合同编号',
        },
        {
          name: 'contract_name',
          label: '合同名称',
          type: 'text',
          required: true,
          placeholder: '请输入合同名称',
        },
        {
          name: 'contract_type',
          label: '合同类型',
          type: 'select',
          required: true,
          options: CONTRACT_TYPES.map((type) => ({
            label: type.label,
            value: type.value,
          })),
          defaultValue: 'construction',
        },
        {
          name: 'contract_category',
          label: '合同类别',
          type: 'select',
          options: CONTRACT_CATEGORIES.map((category) => ({
            label: category.label,
            value: category.value,
          })),
          defaultValue: 'main',
        },
      ],
    },
    {
      id: 'parties',
      title: '合同双方',
      description: '合同甲乙双方信息',
      icon: <Users style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'party_a_name',
          label: '甲方',
          type: 'text',
          placeholder: '请输入甲方名称',
        },
        {
          name: 'party_b_name',
          label: '乙方',
          type: 'text',
          placeholder: '请输入乙方名称',
        },
      ],
    },
    {
      id: 'amount',
      title: '金额与货币',
      description: '合同金额信息',
      collapsible: false,
      fields: [
        {
          name: 'amount',
          label: '合同金额',
          type: 'number',
          required: true,
          placeholder: '请输入合同金额',
        },
        {
          name: 'currency',
          label: '货币',
          type: 'select',
          options: CURRENCIES.map((currency) => ({
            label: currency.label,
            value: currency.value,
          })),
          defaultValue: 'CNY',
        },
        {
          name: 'tax_rate',
          label: '税率 (%)',
          type: 'number',
          defaultValue: '13',
          placeholder: '请输入税率',
        },
      ],
    },
    {
      id: 'dates',
      title: '日期信息',
      description: '合同日期相关信息',
      icon: <Calendar style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'signing_date',
          label: '签约日期',
          type: 'date',
          placeholder: '请选择签约日期',
        },
        {
          name: 'effective_date',
          label: '生效日期',
          type: 'date',
          placeholder: '请选择生效日期',
        },
        {
          name: 'end_date',
          label: '结束日期',
          type: 'date',
          placeholder: '请选择结束日期',
        },
      ],
    },
    {
      id: 'description',
      title: '合同描述',
      description: '合同详细描述',
      collapsible: false,
      fields: [
        {
          name: 'description',
          label: '描述',
          type: 'textarea',
          rows: 4,
          placeholder: '请输入合同描述...',
        },
      ],
    },
  ];

  return (
    <PageContainer
      title='创建合同'
      subtitle='填写合同基本信息'
    >
      <FormPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '项目管理', href: PM_PATHS.root },
          { label: '合同管理', href: PM_PATHS.contracts },
          { label: '创建合同' },
        ]}
        sections={sections}
        schema={contractSchema}
        loading={loading}
        submitting={createMutation.isPending}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText='创建合同'
        cancelText='取消'
        columns={2}
        stickyFooter={true}
      />
    </PageContainer>
  );
};

export default PmContractCreatePage;
