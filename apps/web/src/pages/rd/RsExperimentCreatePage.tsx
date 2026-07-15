import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FormPageTemplate,
  type FormSection,
  type FormField,
} from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { rdApi, formulaApi } from '@/api/rd';
import { useNotificationStore } from '@/store';
import type { Project, Formula, CreateExperimentRequest, UpdateExperimentRequest } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { logger } from '@/utils/logger';

const experimentTypes = ['活性测试', '稳定性测试', '配方优化', '工艺验证', '性能评估', '其他'];
const phases = ['小试', '中试', '放大', '生产验证'];
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
        throw new Error(response.message || '加载项目列表失败');
      }
      return response.data.projects || [];
    },
  });

  const formulasQuery = useQuery({
    queryKey: QUERY_KEYS.RD.FORMULAS,
    queryFn: async () => {
      const response = await formulaApi.listFormulas();
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载配方列表失败');
      }
      return response.data || [];
    },
  });

  const experimentQuery = useQuery({
    queryKey: QUERY_KEYS.RD.EXPERIMENT(id || ''),
    queryFn: async () => {
      const response = await rdApi.getExperiment(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载试验数据失败');
      }
      return response.data;
    },
    enabled: isEdit && !!id,
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
          throw new Error(response.message || '更新试验失败');
        }
        return response;
      } else {
        const response = await rdApi.createExperiment(
          params.requestData as unknown as CreateExperimentRequest
        );
        if (!response.success) {
          throw new Error(response.message || '创建试验失败');
        }
        return response;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.EXPERIMENTS });
      addNotification({
        type: 'success',
        title: isEdit ? '更新成功' : '创建成功',
        message: isEdit ? '试验信息已更新' : '试验已创建',
      });
      navigate(RD_PATHS.experiment);
    },
    onError: (error: unknown) => {
      logger.error('提交试验数据失败:', error);
      addNotification({
        type: 'error',
        title: '提交失败',
        message: error instanceof Error ? error.message : '无法提交试验数据',
      });
    },
  });

  const projects = projectsQuery.data || [];
  const formulas = formulasQuery.data || [];
  const projectsLoading = projectsQuery.isLoading;
  const formulasLoading = formulasQuery.isLoading;
  const loading = experimentQuery.isLoading;
  const submitting = submitMutation.isPending;
  const error = experimentQuery.error ? '加载试验数据失败' : undefined;

  const defaultValues = {
    name: '',
    code: '',
    project_id: '',
    formula_id: '',
    experiment_type: '活性测试',
    phase: '小试',
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
        title: '基本信息',
        description: '试验核心信息',
        collapsible: true,
        defaultExpanded: true,
        fields: [
          {
            name: 'name',
            label: '试验名称',
            type: 'text',
            required: true,
            placeholder: '请输入试验名称',
          },
          {
            name: 'code',
            label: '试验编码',
            type: 'text',
            required: true,
            disabled: isEdit,
            placeholder: '例如: EXP-2024-001',
            helperText: '编辑时编码不可修改',
          },
          {
            name: 'project_id',
            label: '所属项目',
            type: 'select',
            required: true,
            options: projectsLoading
              ? [{ label: '加载中...', value: '' }]
              : projects.map((p) => ({
                  label: p.name || p.project_name || p.code,
                  value: p.id,
                })),
          },
          {
            name: 'formula_id',
            label: '关联配方',
            type: 'select',
            options: formulasLoading
              ? [{ label: '加载中...', value: '' }]
              : [
                  { label: '无', value: '' },
                  ...formulas.map((f) => ({
                    label: `${f.name} (${f.version})`,
                    value: f.id,
                  })),
                ],
          },
          {
            name: 'experiment_type',
            label: '试验类型',
            type: 'select',
            options: experimentTypes.map((type) => ({ label: type, value: type })),
          },
          {
            name: 'phase',
            label: '试验阶段',
            type: 'select',
            options: phases.map((phase) => ({ label: phase, value: phase })),
          },
        ],
      },
      {
        id: 'content',
        title: '试验内容',
        description: '试验目标和方法',
        collapsible: true,
        defaultExpanded: true,
        fields: [
          {
            name: 'objective',
            label: '试验目标',
            type: 'textarea',
            rows: 3,
            placeholder: '请输入试验目标',
          },
          {
            name: 'method',
            label: '实验方法',
            type: 'textarea',
            rows: 4,
            placeholder: '请输入实验方法描述',
          },
        ],
      },
      {
        id: 'execution',
        title: '执行信息',
        description: '实验员和批次信息',
        collapsible: true,
        defaultExpanded: true,
        fields: [
          {
            name: 'experimenter',
            label: '实验员',
            type: 'text',
            placeholder: '请输入实验员姓名',
          },
          {
            name: 'batch_number',
            label: '批次号',
            type: 'text',
            placeholder: '例如: B-2024-001',
          },
          {
            name: 'scale',
            label: '试验规模',
            type: 'number',
            placeholder: '请输入规模数值',
          },
          {
            name: 'scale_unit',
            label: '规模单位',
            type: 'select',
            options: scaleUnits.map((unit) => ({ label: unit, value: unit })),
          },
        ],
      },
    ],
    [projects, formulas, projectsLoading, formulasLoading, isEdit]
  );

  const handleSubmit = async (data: unknown) => {
    const formData = data as Record<string, unknown>;

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
      title={isEdit ? '编辑试验' : '新建试验'}
      subtitle={isEdit ? '修改试验信息' : '创建新的研发试验记录'}
    >
      <FormPageTemplate
        title=''
        subtitle=''
        sections={sections}
        defaultValues={defaultValues}
        loading={loading}
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText={isEdit ? '保存修改' : '创建试验'}
        columns={2}
        showValidationHints
        validationToasts={[
          { message: '提交成功', type: 'success' },
          { message: '提交失败，请检查表单', type: 'error' },
        ]}
      />
    </PageContainer>
  );
};

export default RsExperimentCreatePage;
