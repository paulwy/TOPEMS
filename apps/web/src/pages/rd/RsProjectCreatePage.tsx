import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormPageTemplate, type FormSection } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { rdApi } from '@/api/rd';
import { useNotificationStore } from '@/store';
import type { TeamMember, CreateProjectRequest, UpdateProjectRequest } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';
import {QUERY_KEYS, CACHE_DURATIONS} from '@/lib/reactQuery';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';
const RsProjectCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const projectTypes = [
    i18n.t('rd.project_type.new_product'),
    i18n.t('rd.project_type.process_improvement'),
    i18n.t('rd.project_type.formula_optimization'),
    i18n.t('rd.project_type.technical_breakthrough'),
    i18n.t('rd.project_type.equipment_modification'),
    i18n.t('rd.project_type.other'),
  ];
  const riskLevels = [
    i18n.t('rd.risk_level.low'),
    i18n.t('rd.risk_level.medium'),
    i18n.t('rd.risk_level.high'),
    i18n.t('rd.risk_level.extreme'),
  ];
  const priorities = [
    { label: i18n.t('rd.priority.normal'), value: 2 },
    { label: i18n.t('rd.priority.important'), value: 3 },
    { label: i18n.t('rd.priority.urgent'), value: 4 },
    { label: i18n.t('rd.priority.strategic'), value: 5 },
  ];
  const availableMembers = [
    { id: '1', name: i18n.t('rd.rs_project_create_page.k0') },
    { id: '2', name: i18n.t('rd.rs_project_create_page.k1') },
    { id: '3', name: i18n.t('rd.rs_project_create_page.k2') },
    { id: '4', name: i18n.t('rd.rs_project_create_page.k3') },
    { id: '5', name: i18n.t('rd.rs_project_create_page.k4') },
    { id: '6', name: i18n.t('rd.rs_project_create_page.k5') },
    { id: '7', name: i18n.t('rd.rs_project_create_page.k6') },
    { id: '8', name: i18n.t('rd.rs_project_create_page.k7') },
  ];
  const projectQuery = useQuery({
    queryKey: QUERY_KEYS.RD.PROJECT(id || ''),
    queryFn: async () => {
      const response = await rdApi.getProject(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('rd.project_create_page.error.load_project_failed'));
      }
      return response.data;
    },
    enabled: isEdit && !!id,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
  useEffect(() => {
    if (projectQuery.data) {
      setTeamMembers(projectQuery.data.team_members || []);
      setTags(projectQuery.data.tags || []);
    }
  }, [projectQuery.data]);
  const submitMutation = useMutation({
    mutationFn: async (params: {
      isEdit: boolean;
      id?: string;
      requestData: Record<string, unknown>;
    }) => {
      if (params.isEdit && params.id) {
        const response = await rdApi.updateProject(
          params.id,
          params.requestData as unknown as UpdateProjectRequest
        );
        if (!response.success) {
          throw new Error(response.message || i18n.t('rd.project_create_page.error.update_failed'));
        }
        return response;
      } else {
        const response = await rdApi.createProject(
          params.requestData as unknown as CreateProjectRequest
        );
        if (!response.success) {
          throw new Error(response.message || i18n.t('rd.project_create_page.error.create_failed'));
        }
        return response;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.PROJECTS ,
  exact: false,
  refetchType: 'active',
});
      addNotification({
        type: 'success',
        title: isEdit
          ? i18n.t('rd.project_create_page.notification.update_success_title')
          : i18n.t('rd.project_create_page.notification.create_success_title'),
        message: isEdit
          ? i18n.t('rd.project_create_page.notification.update_success_message')
          : i18n.t('rd.project_create_page.notification.create_success_message'),
      });
      navigate(RD_PATHS.project);
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('pages.rs_project_create_page.k0'), error);
      addNotification({
        type: 'error',
        title: i18n.t('rd.project_create_page.notification.submit_failed_title'),
        message:
          error instanceof Error
            ? error.message
            : i18n.t('rd.project_create_page.notification.submit_failed_message'),
      });
    },
  });
  const loading = projectQuery.isLoading;
  const submitting = submitMutation.isPending;
  const error = projectQuery.error
    ? i18n.t('rd.project_create_page.error.load_project_failed')
    : undefined;
  const defaultValues = {
    name: '',
    code: '',
    description: '',
    project_type: i18n.t('rd.project_type.new_product'),
    leader: '',
    start_date: '',
    end_date: '',
    budget: '',
    risklevel: i18n.t('rd.risk_level.medium'),
    priority: 2,
  };
  const sections: FormSection[] = [
    {
      id: 'basic',
      title: i18n.t('rd.project_create_page.section.basic_title'),
      description: i18n.t('rd.project_create_page.section.basic_description'),
      collapsible: true,
      defaultExpanded: true,
      fields: [
        {
          name: 'name',
          label: i18n.t('rd.project_create_page.field.name'),
          type: 'text',
          required: true,
          placeholder: i18n.t('rd.project_create_page.field.name_placeholder'),
        },
        {
          name: 'code',
          label: i18n.t('rd.project_create_page.field.code'),
          type: 'text',
          required: true,
          disabled: isEdit,
          placeholder: i18n.t('rd.project_create_page.field.code_placeholder'),
          helperText: i18n.t('rd.project_create_page.field.code_helper'),
        },
        {
          name: 'project_type',
          label: i18n.t('rd.project_create_page.field.project_type'),
          type: 'select',
          required: true,
          options: projectTypes.map((type) => ({ label: type, value: type })),
        },
        {
          name: 'leader',
          label: i18n.t('rd.project_create_page.field.leader'),
          type: 'text',
          required: true,
          placeholder: i18n.t('rd.project_create_page.field.leader_placeholder'),
        },
        {
          name: 'description',
          label: i18n.t('rd.project_create_page.field.description'),
          type: 'textarea',
          rows: 4,
          placeholder: i18n.t('rd.project_create_page.field.description_placeholder'),
        },
      ],
    },
    {
      id: 'timing',
      title: i18n.t('rd.project_create_page.section.timing_title'),
      description: i18n.t('rd.project_create_page.section.timing_description'),
      collapsible: true,
      defaultExpanded: true,
      fields: [
        {
          name: 'start_date',
          label: i18n.t('rd.project_create_page.field.start_date'),
          type: 'date',
          required: true,
        },
        {
          name: 'end_date',
          label: i18n.t('rd.project_create_page.field.end_date'),
          type: 'date',
        },
        {
          name: 'budget',
          label: i18n.t('rd.project_create_page.field.budget'),
          type: 'number',
          placeholder: i18n.t('rd.project_create_page.field.budget_placeholder'),
          helperText: i18n.t('rd.project_create_page.field.budget_helper'),
        },
      ],
    },
    {
      id: 'risk',
      title: i18n.t('rd.project_create_page.section.risk_title'),
      description: i18n.t('rd.project_create_page.section.risk_description'),
      collapsible: true,
      defaultExpanded: true,
      fields: [
        {
          name: 'risklevel',
          label: i18n.t('rd.project_create_page.field.risklevel'),
          type: 'select',
          options: riskLevels.map((level) => ({ label: level, value: level })),
        },
        {
          name: 'priority',
          label: i18n.t('rd.project_create_page.field.priority'),
          type: 'select',
          options: priorities.map((p) => ({ label: p.label, value: p.value })),
        },
      ],
    },
  ];
  const handleSubmit = async (data: unknown) => {
    const formData = data as unknown as Record<string, unknown>;
    const requestData = {
      name: formData.name as string,
      code: formData.code as string,
      description: (formData.description as string) || undefined,
      project_type: formData.project_type as string,
      leader: formData.leader as string,
      team_members: teamMembers.length > 0 ? teamMembers : undefined,
      start_date: formData.start_date as string,
      end_date: (formData.end_date as string) || undefined,
      budget: formData.budget ? Number(formData.budget) : undefined,
      risklevel: formData.risklevel as string,
      priority: formData.priority as number,
      tags: tags.length > 0 ? tags : undefined,
    };
    await submitMutation.mutateAsync({ isEdit, id, requestData });
  };
  const handleCancel = () => {
    navigate(RD_PATHS.project);
  };
  return (
    <PageContainer
      title={
        isEdit ? i18n.t('rd.project_create_page.title_edit') : i18n.t('rd.project_create_page.title_create')
      }
      subtitle={
        isEdit
          ? i18n.t('rd.project_create_page.subtitle_edit')
          : i18n.t('rd.project_create_page.subtitle_create')
      }
    >
      <FormPageTemplate
        title=''
        subtitle=''
        backHref={RD_PATHS.project}
        sections={sections}
        defaultValues={defaultValues}
        loading={loading}
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText={
          isEdit
            ? i18n.t('rd.project_create_page.submit_text_edit')
            : i18n.t('rd.project_create_page.submit_text_create')
        }
        columns={2}
        showValidationHints
        validationToasts={[
          { message: i18n.t('rd.project_create_page.validation.submit_success'), type: 'success' },
          { message: i18n.t('rd.project_create_page.validation.submit_failed'), type: 'error' },
        ]}
      />
    </PageContainer>
  );
};
export default RsProjectCreatePage;