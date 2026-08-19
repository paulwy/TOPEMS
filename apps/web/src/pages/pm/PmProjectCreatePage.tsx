import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { FolderOpen, Calendar, DollarSign, Tag, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import FormPageTemplate from '@/components/templates/FormPageTemplate';
import type { FormSection, FormField } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { pmApi } from '@/api/pm';
import { useNotification } from '@/hooks/useNotification';
import { logger } from '@/utils/logger';
import { PM_PATHS } from '@/modules/pm/config';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';
const getProjectSchema = () => z.object({
  name: z.string().min(1, i18n.t('pm.pm_project_create_page.k0')),
  code: z.string().min(1, i18n.t('pm.pm_project_create_page.k1')),
  project_type: z.enum(['RESEARCH', 'PRODUCTION', 'CONSTRUCTION', 'DESIGN', 'SERVICE']),
  description: z.string().optional(),
  budget: z.string().refine((val) => !val || parseFloat(val) >= 0, i18n.t('pm.pm_project_create_page.k2')),
  leader: z.string().optional(),
  start_date: z.string().min(1, i18n.t('pm.pm_project_create_page.k3')),
  end_date: z.string().min(1, i18n.t('pm.pm_project_create_page.k4')),
  tags: z.string().optional(),
});
type ProjectFormData = z.infer<ReturnType<typeof getProjectSchema>>;
const getProjectTypes = () => [
  { value: 'RESEARCH', label: i18n.t('pm.pm_project_create_page.k6'), description: i18n.t('pm.pm_project_create_page.k5') },
  { value: 'PRODUCTION', label: i18n.t('pm.pm_project_create_page.k8'), description: i18n.t('pm.pm_project_create_page.k7') },
  { value: 'CONSTRUCTION', label: i18n.t('pm.pm_project_create_page.k10'), description: i18n.t('pm.pm_project_create_page.k9') },
  { value: 'DESIGN', label: i18n.t('pm.pm_project_create_page.k12'), description: i18n.t('pm.pm_project_create_page.k11') },
  { value: 'SERVICE', label: i18n.t('pm.pm_project_create_page.k14'), description: i18n.t('pm.pm_project_create_page.k13') },
];
const PmProjectCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      return pmApi.projects.create({
        name: data.name.trim(),
        code: data.code.trim(),
        project_type: data.project_type,
        description: data.description?.trim() || undefined,
        budget: data.budget ? parseFloat(data.budget) : undefined,
        leader: data.leader?.trim() || undefined,
        start_date: data.start_date,
        end_date: data.end_date,
        tags: data.tags?.trim() ? data.tags.split(',').map((t) => t.trim()) : undefined,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PM.PROJECTS ,
  exact: false,
  refetchType: 'active',
});
      if (response.code === 200 || response.code === 201) {
        success(i18n.t('pm.pm_project_create_page.k15'));
        navigate(`${PM_PATHS.projects}/${response.data?.id}`);
      } else {
        error(response.message || i18n.t('pm.pm_project_create_page.k16'));
      }
    },
    onError: (err: unknown) => {
      logger.error('Failed to create project:', err);
      error(i18n.t('pm.pm_project_create_page.k17'));
    },
  });
  const handleSubmit = useCallback(
    (data: unknown) => {
      createMutation.mutate(data as ProjectFormData);
    },
    [createMutation]
  );
  const handleCancel = () => {
    navigate(PM_PATHS.projects);
  };
  const sections: FormSection[] = [
    {
      id: 'basic',
      title: i18n.t('pm.pm_project_create_page.k18'),
      description: i18n.t('pm.pm_project_create_page.k19'),
      icon: <FolderOpen style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'name',
          label: i18n.t('pm.pm_project_create_page.k20'),
          type: 'text',
          required: true,
          placeholder: i18n.t('pm.pm_project_create_page.k21'),
        },
        {
          name: 'code',
          label: i18n.t('pm.pm_project_create_page.k22'),
          type: 'text',
          required: true,
          placeholder: i18n.t('pm.pm_project_create_page.k23'),
        },
        {
          name: 'project_type',
          label: i18n.t('pm.pm_project_create_page.k24'),
          type: 'select',
          required: true,
          options: getProjectTypes().map((type) => ({
            label: type.label,
            value: type.value,
          })),
          defaultValue: 'RESEARCH',
        },
      ],
    },
    {
      id: 'description',
      title: i18n.t('pm.pm_project_create_page.k25'),
      description: i18n.t('pm.pm_project_create_page.k26'),
      icon: <FileText style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'description',
          label: i18n.t('pm.pm_project_create_page.k27'),
          type: 'textarea',
          rows: 3,
          placeholder: i18n.t('pages.pm_project_create_page.k0'),
        },
      ],
    },
    {
      id: 'budget',
      title: i18n.t('pm.pm_project_create_page.k28'),
      description: i18n.t('pm.pm_project_create_page.k29'),
      icon: <DollarSign style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'budget',
          label: i18n.t('pm.pm_project_create_page.k30'),
          type: 'number',
          required: true,
          placeholder: i18n.t('pm.pm_project_create_page.k31'),
        },
        {
          name: 'leader',
          label: i18n.t('pm.pm_project_create_page.k32'),
          type: 'text',
          placeholder: i18n.t('pm.pm_project_create_page.k33'),
        },
      ],
    },
    {
      id: 'dates',
      title: i18n.t('pm.pm_project_create_page.k34'),
      description: i18n.t('pm.pm_project_create_page.k35'),
      icon: <Calendar style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'start_date',
          label: i18n.t('pm.pm_project_create_page.k36'),
          type: 'date',
          required: true,
          placeholder: i18n.t('pm.pm_project_create_page.k37'),
        },
        {
          name: 'end_date',
          label: i18n.t('pm.pm_project_create_page.k38'),
          type: 'date',
          required: true,
          placeholder: i18n.t('pm.pm_project_create_page.k39'),
        },
      ],
    },
    {
      id: 'tags',
      title: i18n.t('pm.pm_project_create_page.k40'),
      description: i18n.t('pm.pm_project_create_page.k41'),
      icon: <Tag style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'tags',
          label: i18n.t('pm.pm_project_create_page.k42'),
          type: 'text',
          placeholder: i18n.t('pm.pm_project_create_page.k43'),
        },
      ],
    },
  ];
  return (
    <PageContainer
      title={i18n.t('pm.pm_project_create_page.k44')}
      subtitle={i18n.t('pm.pm_project_create_page.k45')}
    >
      <FormPageTemplate
        title=''
        subtitle=''
        backHref={PM_PATHS.projects}
        breadcrumbs={[
          { label: i18n.t('pm.pm_project_create_page.k46'), href: '/dashboard' },
          { label: i18n.t('pm.pm_project_create_page.k47'), href: PM_PATHS.root },
          { label: i18n.t('pm.pm_project_create_page.k48'), href: PM_PATHS.projects },
          { label: i18n.t('pm.pm_project_create_page.k49') },
        ]}
        sections={sections}
        schema={getProjectSchema()}
        submitting={createMutation.isPending}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText={i18n.t('pm.pm_project_create_page.k50')}
        cancelText={i18n.t('pm.pm_project_create_page.k51')}
        columns={2}
        stickyFooter={true}
      />
    </PageContainer>
  );
};
export default PmProjectCreatePage;