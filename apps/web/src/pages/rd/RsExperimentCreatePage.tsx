import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormPageTemplate, type FormSection } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { rdApi, formulaApi } from '@/api/rd';
import { useNotificationStore } from '@/store';
import type { Project, Formula, CreateExperimentRequest, UpdateExperimentRequest } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

const experimentTypes = [
  i18n.t('rd.rs_experiment_create_page.k5'),
  i18n.t('rd.rs_experiment_create_page.k4'),
  i18n.t('rd.rs_experiment_create_page.k3'),
  i18n.t('rd.rs_experiment_create_page.k2'),
  i18n.t('rd.rs_experiment_create_page.k1'),
  i18n.t('rd.rs_experiment_create_page.k0'),
];
const phases = [
  i18n.t('rd.rs_experiment_create_page.k9'),
  i18n.t('rd.rs_experiment_create_page.k8'),
  i18n.t('rd.rs_experiment_create_page.k7'),
  i18n.t('rd.rs_experiment_create_page.k6'),
];
const scaleUnits = ['g', 'kg', 't', 'mL', 'L'];
const RsExperimentCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const projectsQuery = useQuery({
    queryKey: QUERY_KEYS.RD.PROJECTS,
    queryFn: async () => {
      const response = await rdApi.listProjects();
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('rd.rs_experiment_create_page.k10'));
      }
      return response.data.projects || [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const formulasQuery = useQuery({
    queryKey: QUERY_KEYS.RD.FORMULAS,
    queryFn: async () => {
      const response = await formulaApi.listFormulas();
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('rd.rs_experiment_create_page.k11'));
      }
      return response.data || [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const experimentQuery = useQuery({
    queryKey: QUERY_KEYS.RD.EXPERIMENT(id || ''),
    queryFn: async () => {
      const response = await rdApi.getExperiment(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('rd.rs_experiment_create_page.k12'));
      }
      return response.data;
    },
    enabled: isEdit && !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const submitMutation = useMutation({
    mutationFn: async (params: {
      isEdit: boolean;
      id?: string;
      requestData: Record<string, unknown>;
    }) => {
      if (params.isEdit && params.id) {
        const response = await rdApi.updateExperiment(
          params.id,
          params.requestData as unknown as UpdateExperimentRequest
        );
        if (!response.success) {
          throw new Error(response.message || i18n.t('rd.rs_experiment_create_page.k13'));
        }
        return response;
      } else {
        const response = await rdApi.createExperiment(
          params.requestData as unknown as CreateExperimentRequest
        );
        if (!response.success) {
          throw new Error(response.message || i18n.t('rd.rs_experiment_create_page.k14'));
        }
        return response;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.RD.EXPERIMENTS,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        type: 'success',
        title: isEdit
          ? i18n.t('rd.rs_experiment_create_page.k16')
          : i18n.t('rd.rs_experiment_create_page.k15'),
        message: isEdit
          ? i18n.t('rd.rs_experiment_create_page.k18')
          : i18n.t('rd.rs_experiment_create_page.k17'),
      });
      navigate(RD_PATHS.experiment);
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('pages.rs_experiment_create_page.k0'), error);
      addNotification({
        type: 'error',
        title: i18n.t('rd.rs_experiment_create_page.k19'),
        message:
          error instanceof Error ? error.message : i18n.t('rd.rs_experiment_create_page.k20'),
      });
    },
  });
  const projects = projectsQuery.data || [];
  const formulas = formulasQuery.data || [];
  const projectsLoading = projectsQuery.isLoading;
  const formulasLoading = formulasQuery.isLoading;
  const loading = experimentQuery.isLoading;
  const submitting = submitMutation.isPending;
  const error = experimentQuery.error ? i18n.t('rd.rs_experiment_create_page.k21') : undefined;
  const defaultValues = {
    name: '',
    code: '',
    project_id: '',
    formula_id: '',
    experiment_type: i18n.t('rd.rs_experiment_create_page.k22'),
    phase: i18n.t('rd.rs_experiment_create_page.k23'),
    objective: '',
    method: '',
    experimenter: '',
    batch_number: '',
    scale: '',
    scale_unit: 'kg',
  };
  const sections: FormSection[] = useMemo(
    () => [
      {
        id: 'basic',
        title: i18n.t('rd.rs_experiment_create_page.k24'),
        description: i18n.t('rd.rs_experiment_create_page.k25'),
        collapsible: true,
        defaultExpanded: true,
        fields: [
          {
            name: 'name',
            label: i18n.t('rd.rs_experiment_create_page.k26'),
            type: 'text',
            required: true,
            placeholder: i18n.t('rd.rs_experiment_create_page.k27'),
          },
          {
            name: 'code',
            label: i18n.t('rd.rs_experiment_create_page.k28'),
            type: 'text',
            required: true,
            disabled: isEdit,
            placeholder: i18n.t('pages.rs_experiment_create_page.exp2024001_1'),
            helperText: i18n.t('rd.rs_experiment_create_page.k29'),
          },
          {
            name: 'project_id',
            label: i18n.t('rd.rs_experiment_create_page.k30'),
            type: 'select',
            required: true,
            options: projectsLoading
              ? [{ label: i18n.t('pages.rs_experiment_create_page.k2'), value: '' }]
              : projects.map((p) => ({
                  label: p.name || p.project_name || p.code,
                  value: p.id,
                })),
          },
          {
            name: 'formula_id',
            label: i18n.t('rd.rs_experiment_create_page.k31'),
            type: 'select',
            options: formulasLoading
              ? [{ label: i18n.t('pages.rs_experiment_create_page.k3'), value: '' }]
              : [
                  { label: i18n.t('rd.rs_experiment_create_page.k32'), value: '' },
                  ...formulas.map((f) => ({
                    label: `${f.name} (${f.version})`,
                    value: f.id,
                  })),
                ],
          },
          {
            name: 'experiment_type',
            label: i18n.t('rd.rs_experiment_create_page.k33'),
            type: 'select',
            options: experimentTypes.map((type) => ({ label: type, value: type })),
          },
          {
            name: 'phase',
            label: i18n.t('rd.rs_experiment_create_page.k34'),
            type: 'select',
            options: phases.map((phase) => ({ label: phase, value: phase })),
          },
        ],
      },
      {
        id: 'content',
        title: i18n.t('rd.rs_experiment_create_page.k35'),
        description: i18n.t('rd.rs_experiment_create_page.k36'),
        collapsible: true,
        defaultExpanded: true,
        fields: [
          {
            name: 'objective',
            label: i18n.t('rd.rs_experiment_create_page.k37'),
            type: 'textarea',
            rows: 3,
            placeholder: i18n.t('rd.rs_experiment_create_page.k38'),
          },
          {
            name: 'method',
            label: i18n.t('rd.rs_experiment_create_page.k39'),
            type: 'textarea',
            rows: 4,
            placeholder: i18n.t('rd.rs_experiment_create_page.k40'),
          },
        ],
      },
      {
        id: 'execution',
        title: i18n.t('rd.rs_experiment_create_page.k41'),
        description: i18n.t('rd.rs_experiment_create_page.k42'),
        collapsible: true,
        defaultExpanded: true,
        fields: [
          {
            name: 'experimenter',
            label: i18n.t('rd.rs_experiment_create_page.k43'),
            type: 'text',
            placeholder: i18n.t('rd.rs_experiment_create_page.k44'),
          },
          {
            name: 'batch_number',
            label: i18n.t('rd.rs_experiment_create_page.k45'),
            type: 'text',
            placeholder: i18n.t('pages.rs_experiment_create_page.b2024001_4'),
          },
          {
            name: 'scale',
            label: i18n.t('rd.rs_experiment_create_page.k46'),
            type: 'number',
            placeholder: i18n.t('rd.rs_experiment_create_page.k47'),
          },
          {
            name: 'scale_unit',
            label: i18n.t('rd.rs_experiment_create_page.k48'),
            type: 'select',
            options: scaleUnits.map((unit) => ({ label: unit, value: unit })),
          },
        ],
      },
    ],
    [projects, formulas, projectsLoading, formulasLoading, isEdit]
  );
  const handleSubmit = async (data: unknown) => {
    const formData = data as unknown as Record<string, unknown>;
    const requestData = {
      name: formData.name as string,
      code: formData.code as string,
      project_id: formData.project_id as string,
      formula_id: (formData.formula_id as string) || undefined,
      experiment_type: formData.experiment_type as string,
      phase: formData.phase as string,
      objective: formData.objective as string,
      method: formData.method as string,
      experimenter: formData.experimenter as string,
      batch_number: (formData.batch_number as string) || undefined,
      scale: formData.scale ? Number(formData.scale) : undefined,
      scale_unit: formData.scale_unit as string,
    };
    await submitMutation.mutateAsync({ isEdit, id, requestData });
  };
  const handleCancel = () => {
    navigate(RD_PATHS.experiment);
  };
  return (
    <PageContainer
      title={
        isEdit
          ? i18n.t('rd.rs_experiment_create_page.k50')
          : i18n.t('rd.rs_experiment_create_page.k49')
      }
      subtitle={
        isEdit
          ? i18n.t('rd.rs_experiment_create_page.k52')
          : i18n.t('rd.rs_experiment_create_page.k51')
      }
    >
      <FormPageTemplate
        title=''
        subtitle=''
        backHref={RD_PATHS.experiment}
        sections={sections}
        defaultValues={defaultValues}
        loading={loading}
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText={
          isEdit
            ? i18n.t('rd.rs_experiment_create_page.k54')
            : i18n.t('rd.rs_experiment_create_page.k53')
        }
        columns={2}
        showValidationHints
        validationToasts={[
          { message: i18n.t('rd.rs_experiment_create_page.k55'), type: 'success' },
          { message: i18n.t('rd.rs_experiment_create_page.k56'), type: 'error' },
        ]}
      />
    </PageContainer>
  );
};
export default RsExperimentCreatePage;
