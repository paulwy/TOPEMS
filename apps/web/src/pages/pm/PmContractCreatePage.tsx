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
import {QUERY_KEYS, CACHE_DURATIONS} from '@/lib/reactQuery';
import i18n from '@/i18n';
const contractSchema = z.object({
  project_id: z.string().optional(),
  contract_code: z.string().min(1, i18n.t('pm.pm_contract_create_page.k0')),
  contract_name: z.string().min(1, i18n.t('pm.pm_contract_create_page.k1')),
  contract_type: z.enum(['construction', 'service', 'purchase', 'sales']),
  contract_category: z.enum(['main', 'supplement', 'servicelevel']),
  party_a_name: z.string().optional(),
  party_b_name: z.string().optional(),
  amount: z.string().refine((val) => parseFloat(val) > 0, i18n.t('pm.pm_contract_create_page.0_2')),
  currency: z.enum(['CNY', 'USD', 'EUR']),
  tax_rate: z
    .string()
    .refine((val) => parseFloat(val) >= 0 && parseFloat(val) <= 100, i18n.t('pm.pm_contract_create_page.0100_3')),
  signing_date: z.string().optional(),
  effective_date: z.string().optional(),
  end_date: z.string().optional(),
  description: z.string().optional(),
});
type ContractFormData = z.infer<typeof contractSchema>;
const CONTRACT_TYPES = [
  { value: 'construction', label: i18n.t('pm.pm_contract_create_page.k4') },
  { value: 'service', label: i18n.t('pm.pm_contract_create_page.k5') },
  { value: 'purchase', label: i18n.t('pm.pm_contract_create_page.k6') },
  { value: 'sales', label: i18n.t('pm.pm_contract_create_page.k7') },
];
const CONTRACT_CATEGORIES = [
  { value: 'main', label: i18n.t('pm.pm_contract_create_page.k8') },
  { value: 'supplement', label: i18n.t('pm.pm_contract_create_page.k9') },
  { value: 'servicelevel', label: i18n.t('pm.pm_contract_create_page.k10') },
];
const CURRENCIES = [
  { value: 'CNY', label: i18n.t('pm.pm_contract_create_page.k11') },
  { value: 'USD', label: i18n.t('pm.pm_contract_create_page.k12') },
  { value: 'EUR', label: i18n.t('pm.pm_contract_create_page.k13') },
];
const PmContractCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const queryClient = useQueryClient();
  const { data: projectsData, isPending: loading} = useQuery({
    queryKey: QUERY_KEYS.PM.PROJECTS,
    queryFn: async (): Promise<Project[]> => {
      const response = await pmApi.projects.list();
      return (response.data?.items ?? []) as Project[];
    },
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PM.CONTRACTS ,
  exact: false,
  refetchType: 'active',
});
      if (response.code === 200 || response.code === 201) {
        success(i18n.t('pm.pm_contract_create_page.k14'));
        navigate(PM_PATHS.contracts);
      } else {
        error(response.message || i18n.t('pm.pm_contract_create_page.k15'));
      }
    },
    onError: (err: unknown) => {
      logger.error('Failed to create contract:', err);
      error(i18n.t('pm.pm_contract_create_page.k16'));
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
      title: i18n.t('pm.pm_contract_create_page.k17'),
      description: i18n.t('pm.pm_contract_create_page.k18'),
      icon: <FileText style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'project_id',
          label: i18n.t('pm.pm_contract_create_page.k19'),
          type: 'select',
          options: [{ label: i18n.t('pm.pm_contract_create_page.k20'), value: '' }, ...projectOptions],
          placeholder: i18n.t('pm.pm_contract_create_page.k21'),
        },
        {
          name: 'contract_code',
          label: i18n.t('pm.pm_contract_create_page.k22'),
          type: 'text',
          required: true,
          placeholder: i18n.t('pm.pm_contract_create_page.k23'),
        },
        {
          name: 'contract_name',
          label: i18n.t('pm.pm_contract_create_page.k24'),
          type: 'text',
          required: true,
          placeholder: i18n.t('pm.pm_contract_create_page.k25'),
        },
        {
          name: 'contract_type',
          label: i18n.t('pm.pm_contract_create_page.k26'),
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
          label: i18n.t('pm.pm_contract_create_page.k27'),
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
      title: i18n.t('pm.pm_contract_create_page.k28'),
      description: i18n.t('pm.pm_contract_create_page.k29'),
      icon: <Users style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'party_a_name',
          label: i18n.t('pm.pm_contract_create_page.k30'),
          type: 'text',
          placeholder: i18n.t('pm.pm_contract_create_page.k31'),
        },
        {
          name: 'party_b_name',
          label: i18n.t('pm.pm_contract_create_page.k32'),
          type: 'text',
          placeholder: i18n.t('pm.pm_contract_create_page.k33'),
        },
      ],
    },
    {
      id: 'amount',
      title: i18n.t('pm.pm_contract_create_page.k34'),
      description: i18n.t('pm.pm_contract_create_page.k35'),
      collapsible: false,
      fields: [
        {
          name: 'amount',
          label: i18n.t('pm.pm_contract_create_page.k36'),
          type: 'number',
          required: true,
          placeholder: i18n.t('pm.pm_contract_create_page.k37'),
        },
        {
          name: 'currency',
          label: i18n.t('pm.pm_contract_create_page.k38'),
          type: 'select',
          options: CURRENCIES.map((currency) => ({
            label: currency.label,
            value: currency.value,
          })),
          defaultValue: 'CNY',
        },
        {
          name: 'tax_rate',
          label: i18n.t('pm.pm_contract_create_page.k39'),
          type: 'number',
          defaultValue: '13',
          placeholder: i18n.t('pm.pm_contract_create_page.k40'),
        },
      ],
    },
    {
      id: 'dates',
      title: i18n.t('pm.pm_contract_create_page.k41'),
      description: i18n.t('pm.pm_contract_create_page.k42'),
      icon: <Calendar style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'signing_date',
          label: i18n.t('pm.pm_contract_create_page.k43'),
          type: 'date',
          placeholder: i18n.t('pm.pm_contract_create_page.k44'),
        },
        {
          name: 'effective_date',
          label: i18n.t('pm.pm_contract_create_page.k45'),
          type: 'date',
          placeholder: i18n.t('pm.pm_contract_create_page.k46'),
        },
        {
          name: 'end_date',
          label: i18n.t('pm.pm_contract_create_page.k47'),
          type: 'date',
          placeholder: i18n.t('pm.pm_contract_create_page.k48'),
        },
      ],
    },
    {
      id: 'description',
      title: i18n.t('pm.pm_contract_create_page.k49'),
      description: i18n.t('pm.pm_contract_create_page.k50'),
      collapsible: false,
      fields: [
        {
          name: 'description',
          label: i18n.t('pm.pm_contract_create_page.k51'),
          type: 'textarea',
          rows: 4,
          placeholder: i18n.t('pages.pm_contract_create_page.k0'),
        },
      ],
    },
  ];
  return (
    <PageContainer
      title={i18n.t('pm.pm_contract_create_page.k52')}
      subtitle={i18n.t('pm.pm_contract_create_page.k53')}
    >
      <FormPageTemplate
        title=''
        subtitle=''
        backHref={PM_PATHS.contracts}
        breadcrumbs={[
          { label: i18n.t('pm.pm_contract_create_page.k54'), href: '/dashboard' },
          { label: i18n.t('pm.pm_contract_create_page.k55'), href: PM_PATHS.root },
          { label: i18n.t('pm.pm_contract_create_page.k56'), href: PM_PATHS.contracts },
          { label: i18n.t('pm.pm_contract_create_page.k57') },
        ]}
        sections={sections}
        schema={contractSchema}
        loading={loading}
        submitting={createMutation.isPending}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText={i18n.t('pm.pm_contract_create_page.k58')}
        cancelText={i18n.t('pm.pm_contract_create_page.k59')}
        columns={2}
        stickyFooter={true}
      />
    </PageContainer>
  );
};
export default PmContractCreatePage;