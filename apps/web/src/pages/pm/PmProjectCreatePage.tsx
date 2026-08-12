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

const projectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空'),
  code: z.string().min(1, '项目编号不能为空'),
  project_type: z.enum(['RESEARCH', 'PRODUCTION', 'CONSTRUCTION', 'DESIGN', 'SERVICE']),
  description: z.string().optional(),
  budget: z.string().refine((val) => !val || parseFloat(val) >= 0, '预算金额必须为非负数'),
  leader: z.string().optional(),
  start_date: z.string().min(1, '开始日期不能为空'),
  end_date: z.string().min(1, '结束日期不能为空'),
  tags: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

const PROJECT_TYPES = [
  { value: 'RESEARCH', label: '科研项目', description: '实验驱动、创新研究、专利申请' },
  { value: 'PRODUCTION', label: '生产项目', description: '标准化生产、质量控制、量产' },
  { value: 'CONSTRUCTION', label: '施工项目', description: '资源密集、周期长、工程建设' },
  { value: 'DESIGN', label: '设计项目', description: '迭代设计、版本管理、产品设计' },
  { value: 'SERVICE', label: '服务项目', description: '客户导向、灵活交付、咨询服务' },
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
        success('项目创建成功');
        navigate(`${PM_PATHS.projects}/${response.data?.id}`);
      } else {
        error(response.message || '创建失败');
      }
    },
    onError: (err: unknown) => {
      logger.error('Failed to create project:', err);
      error('创建项目失败');
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
      title: '基本信息',
      description: '项目基本信息',
      icon: <FolderOpen style={{ width: 18, height: 18 }} />,
      collapsible: false,
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
          label: '项目编号',
          type: 'text',
          required: true,
          placeholder: '请输入项目编号',
        },
        {
          name: 'project_type',
          label: '项目类型',
          type: 'select',
          required: true,
          options: PROJECT_TYPES.map((type) => ({
            label: type.label,
            value: type.value,
          })),
          defaultValue: 'RESEARCH',
        },
      ],
    },
    {
      id: 'description',
      title: '项目描述',
      description: '项目详细描述',
      icon: <FileText style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'description',
          label: '描述',
          type: 'textarea',
          rows: 3,
          placeholder: '请输入项目描述...',
        },
      ],
    },
    {
      id: 'budget',
      title: '预算与负责人',
      description: '项目预算和负责人信息',
      icon: <DollarSign style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'budget',
          label: '项目预算',
          type: 'number',
          required: true,
          placeholder: '请输入预算金额',
        },
        {
          name: 'leader',
          label: '项目负责人',
          type: 'text',
          placeholder: '请输入负责人姓名',
        },
      ],
    },
    {
      id: 'dates',
      title: '时间安排',
      description: '项目开始和结束时间',
      icon: <Calendar style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'start_date',
          label: '开始日期',
          type: 'date',
          required: true,
          placeholder: '请选择开始日期',
        },
        {
          name: 'end_date',
          label: '结束日期',
          type: 'date',
          required: true,
          placeholder: '请选择结束日期',
        },
      ],
    },
    {
      id: 'tags',
      title: '标签',
      description: '项目标签',
      icon: <Tag style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'tags',
          label: '标签',
          type: 'text',
          placeholder: '多个标签用逗号分隔',
        },
      ],
    },
  ];

  return (
    <PageContainer
      title='创建项目'
      subtitle='填写项目基本信息'
    >
      <FormPageTemplate
        title=''
        subtitle=''
        backHref={PM_PATHS.projects}
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '项目管理', href: PM_PATHS.root },
          { label: '项目列表', href: PM_PATHS.projects },
          { label: '创建项目' },
        ]}
        sections={sections}
        schema={projectSchema}
        submitting={createMutation.isPending}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText='保存项目'
        cancelText='取消'
        columns={2}
        stickyFooter={true}
      />
    </PageContainer>
  );
};

export default PmProjectCreatePage;
