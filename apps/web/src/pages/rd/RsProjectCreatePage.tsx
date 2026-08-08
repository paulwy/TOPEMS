import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormPageTemplate, type FormSection } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { rdApi } from '@/api/rd';
import { useNotificationStore } from '@/store';
import type { TeamMember, CreateProjectRequest, UpdateProjectRequest } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { logger } from '@/utils/logger';

const RsProjectCreatePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const projectTypes = [
    t('rd.project_type.new_product'),
    t('rd.project_type.process_improvement'),
    t('rd.project_type.formula_optimization'),
    t('rd.project_type.technical_breakthrough'),
    t('rd.project_type.equipment_modification'),
    t('rd.project_type.other'),
  ];
  const riskLevels = [
    t('rd.risk_level.low'),
    t('rd.risk_level.medium'),
    t('rd.risk_level.high'),
    t('rd.risk_level.extreme'),
  ];
  const priorities = [
    { label: t('rd.priority.normal'), value: 2 },
    { label: t('rd.priority.important'), value: 3 },
    { label: t('rd.priority.urgent'), value: 4 },
    { label: t('rd.priority.strategic'), value: 5 },
  ];

  const availableMembers = [
    { id: '1', name: '张三' },
    { id: '2', name: '李四' },
    { id: '3', name: '王五' },
    { id: '4', name: '赵六' },
    { id: '5', name: '孙七' },
    { id: '6', name: '周八' },
    { id: '7', name: '吴九' },
    { id: '8', name: '郑十' },
  ];

  const projectQuery = useQuery({
    queryKey: QUERY_KEYS.RD.PROJECT(id || ''),
    queryFn: async () => {
      const response = await rdApi.getProject(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || t('rd.project_create_page.error.load_project_failed'));
      }
      return response.data;
    },
    enabled: isEdit && !!id,
  });

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
          throw new Error(response.message || t('rd.project_create_page.error.update_failed'));
        }
        return response;
      } else {
        const response = await rdApi.createProject(
          params.requestData as unknown as CreateProjectRequest
        );
        if (!response.success) {
          throw new Error(response.message || t('rd.project_create_page.error.create_failed'));
        }
        return response;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.PROJECTS });
      addNotification({
        type: 'success',
        title: isEdit
          ? t('rd.project_create_page.notification.update_success_title')
          : t('rd.project_create_page.notification.create_success_title'),
        message: isEdit
          ? t('rd.project_create_page.notification.update_success_message')
          : t('rd.project_create_page.notification.create_success_message'),
      });
      navigate(RD_PATHS.project);
    },
    onError: (error: unknown) => {
      logger.error('提交项目数据失败:', error);
      addNotification({
        type: 'error',
        title: t('rd.project_create_page.notification.submit_failed_title'),
        message:
          error instanceof Error
            ? error.message
            : t('rd.project_create_page.notification.submit_failed_message'),
      });
    },
  });

  const loading = projectQuery.isLoading;
  const submitting = submitMutation.isPending;
  const error = projectQuery.error
    ? t('rd.project_create_page.error.load_project_failed')
    : undefined;

  const defaultValues = {
    name: '',
    code: '',
    description: '',
    project_type: t('rd.project_type.new_product'),
    leader: '',
    start_date: '',
    end_date: '',
    budget: '',
    risklevel: t('rd.risk_level.medium'),
    priority: 2,
  };

  const sections: FormSection[] = [
    {
      id: 'basic',
      title: t('rd.project_create_page.section.basic_title'),
      description: t('rd.project_create_page.section.basic_description'),
      collapsible: true,
      defaultExpanded: true,
      fields: [
        {
          name: 'name',
          label: t('rd.project_create_page.field.name'),
          type: 'text',
          required: true,
          placeholder: t('rd.project_create_page.field.name_placeholder'),
        },
        {
          name: 'code',
          label: t('rd.project_create_page.field.code'),
          type: 'text',
          required: true,
          disabled: isEdit,
          placeholder: t('rd.project_create_page.field.code_placeholder'),
          helperText: t('rd.project_create_page.field.code_helper'),
        },
        {
          name: 'project_type',
          label: t('rd.project_create_page.field.project_type'),
          type: 'select',
          required: true,
          options: projectTypes.map((type) => ({ label: type, value: type })),
        },
        {
          name: 'leader',
          label: t('rd.project_create_page.field.leader'),
          type: 'text',
          required: true,
          placeholder: t('rd.project_create_page.field.leader_placeholder'),
        },
        {
          name: 'description',
          label: t('rd.project_create_page.field.description'),
          type: 'textarea',
          rows: 4,
          placeholder: t('rd.project_create_page.field.description_placeholder'),
        },
      ],
    },
    {
      id: 'timing',
      title: t('rd.project_create_page.section.timing_title'),
      description: t('rd.project_create_page.section.timing_description'),
      collapsible: true,
      defaultExpanded: true,
      fields: [
        {
          name: 'start_date',
          label: t('rd.project_create_page.field.start_date'),
          type: 'date',
          required: true,
        },
        {
          name: 'end_date',
          label: t('rd.project_create_page.field.end_date'),
          type: 'date',
        },
        {
          name: 'budget',
          label: t('rd.project_create_page.field.budget'),
          type: 'number',
          placeholder: t('rd.project_create_page.field.budget_placeholder'),
          helperText: t('rd.project_create_page.field.budget_helper'),
        },
      ],
    },
    {
      id: 'risk',
      title: t('rd.project_create_page.section.risk_title'),
      description: t('rd.project_create_page.section.risk_description'),
      collapsible: true,
      defaultExpanded: true,
      fields: [
        {
          name: 'risklevel',
          label: t('rd.project_create_page.field.risklevel'),
          type: 'select',
          options: riskLevels.map((level) => ({ label: level, value: level })),
        },
        {
          name: 'priority',
          label: t('rd.project_create_page.field.priority'),
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
        isEdit ? t('rd.project_create_page.title_edit') : t('rd.project_create_page.title_create')
      }
      subtitle={
        isEdit
          ? t('rd.project_create_page.subtitle_edit')
          : t('rd.project_create_page.subtitle_create')
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
            ? t('rd.project_create_page.submit_text_edit')
            : t('rd.project_create_page.submit_text_create')
        }
        columns={2}
        showValidationHints
        validationToasts={[
          { message: t('rd.project_create_page.validation.submit_success'), type: 'success' },
          { message: t('rd.project_create_page.validation.submit_failed'), type: 'error' },
        ]}
      />
    </PageContainer>
  );
};

export default RsProjectCreatePage;
