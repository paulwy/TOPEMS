import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FormPageTemplate,
  type FormSection,
  type FormField,
} from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { rdApi } from '@/api/rd';
import { useNotificationStore } from '@/store';
import type { Project, TeamMember, CreateProjectRequest, UpdateProjectRequest } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { logger } from '@/utils/logger';

const projectTypes = ['新产品研发', '工艺改进', '配方优化', '技术攻关', '设备改造', '其他'];
const riskLevels = ['低', '中', '高', '极高'];
const priorities = [
  { label: '普通', value: 2 },
  { label: '重要', value: 3 },
  { label: '紧急', value: 4 },
  { label: '战略级', value: 5 },
];

const RsProjectCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tags, setTags] = useState<string[]>([]);

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
  const availableTags = ['催化剂', '聚合物', '纳米材料', '环保', '新能源', '生物医药', '电子材料'];

  const projectQuery = useQuery({
    queryKey: QUERY_KEYS.RD.PROJECT(id || ''),
    queryFn: async () => {
      const response = await rdApi.getProject(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载项目数据失败');
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
          throw new Error(response.message || '更新项目失败');
        }
        return response;
      } else {
        const response = await rdApi.createProject(
          params.requestData as unknown as CreateProjectRequest
        );
        if (!response.success) {
          throw new Error(response.message || '创建项目失败');
        }
        return response;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.PROJECTS });
      addNotification({
        type: 'success',
        title: isEdit ? '更新成功' : '创建成功',
        message: isEdit ? '项目信息已更新' : '项目已创建',
      });
      navigate(RD_PATHS.project);
    },
    onError: (error: unknown) => {
      logger.error('提交项目数据失败:', error);
      addNotification({
        type: 'error',
        title: '提交失败',
        message: error instanceof Error ? error.message : '无法提交项目数据',
      });
    },
  });

  const loading = projectQuery.isLoading;
  const submitting = submitMutation.isPending;
  const error = projectQuery.error ? '加载项目数据失败' : undefined;

  const defaultValues = {
    name: '',
    code: '',
    description: '',
    project_type: '新产品研发',
    leader: '',
    start_date: '',
    end_date: '',
    budget: '',
    risklevel: '中',
    priority: 2,
  };

  const sections: FormSection[] = [
    {
      id: 'basic',
      title: '基本信息',
      description: '项目核心信息',
      collapsible: true,
      defaultExpanded: true,
      fields: [
        {
          name: 'name',
          label: '项目名称',
          type: 'text',
          required: true,
          placeholder: '请输入项目名称',
        },
        {
          name: 'code',
          label: '项目编码',
          type: 'text',
          required: true,
          disabled: isEdit,
          placeholder: '例如: RS-2024-001',
          helperText: '编辑时编码不可修改',
        },
        {
          name: 'project_type',
          label: '项目类型',
          type: 'select',
          required: true,
          options: projectTypes.map((type) => ({ label: type, value: type })),
        },
        {
          name: 'leader',
          label: '项目负责人',
          type: 'text',
          required: true,
          placeholder: '请输入负责人姓名',
        },
        {
          name: 'description',
          label: '项目描述',
          type: 'textarea',
          rows: 4,
          placeholder: '请输入项目描述，包括目标、背景、预期成果等',
        },
      ],
    },
    {
      id: 'timing',
      title: '时间和预算',
      description: '项目时间安排和预算规划',
      collapsible: true,
      defaultExpanded: true,
      fields: [
        {
          name: 'start_date',
          label: '开始日期',
          type: 'date',
          required: true,
        },
        {
          name: 'end_date',
          label: '结束日期',
          type: 'date',
        },
        {
          name: 'budget',
          label: '预算金额',
          type: 'number',
          placeholder: '请输入预算金额',
          helperText: '单位：元',
        },
      ],
    },
    {
      id: 'risk',
      title: '风险评估',
      description: '项目风险等级和优先级',
      collapsible: true,
      defaultExpanded: true,
      fields: [
        {
          name: 'risklevel',
          label: '风险等级',
          type: 'select',
          options: riskLevels.map((level) => ({ label: level, value: level })),
        },
        {
          name: 'priority',
          label: '优先级',
          type: 'select',
          options: priorities.map((p) => ({ label: p.label, value: p.value })),
        },
      ],
    },
  ];

  const handleSubmit = async (data: unknown) => {
    const formData = data as Record<string, unknown>;

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
      title={isEdit ? '编辑研发项目' : '新建研发项目'}
      subtitle={isEdit ? '修改项目基本信息和配置' : '创建新的研发项目，设置基本信息和团队'}
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
        submitText={isEdit ? '保存修改' : '创建项目'}
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

export default RsProjectCreatePage;
