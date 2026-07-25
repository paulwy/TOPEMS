import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil } from 'lucide-react';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { projectSchema } from '@/schemas/rd';
import { rdApi } from '@/api/rd';
import type { Project } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';

const projectApiAdapter: CrudApiAdapter<Project> = {
  list: async (params) => {
    const queryParams: Record<string, unknown> = {
      page: params?.page,
      pagesize: params?.pageSize,
    };
    if (params?.search) queryParams.search = params.search;
    if (params?.status) queryParams.status = params.status;

    const response = await rdApi.listProjects(queryParams);
    if (!response.success || !response.data) {
      throw new Error(response.message || '加载项目列表失败');
    }
    return {
      data: response.data.projects || [],
      total: response.data.total || 0,
    };
  },

  create: async (data) => {
    const response = await rdApi.createProject(data as Parameters<typeof rdApi.createProject>[0]);
    if (!response.success || !response.data) {
      throw new Error(response.message || '创建项目失败');
    }
    return response.data;
  },

  update: async (id, data) => {
    const response = await rdApi.updateProject(
      id,
      data as Parameters<typeof rdApi.updateProject>[1]
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || '更新项目失败');
    }
    return response.data;
  },

  delete: async (id) => {
    const response = await rdApi.deleteProject(id);
    if (!response.success) {
      throw new Error(response.message || '删除项目失败');
    }
  },
};

const RsProjectListPage: React.FC = () => {
  const navigate = useNavigate();

  const customRowActions: RowAction[] = [
    {
      key: 'view-detail',
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: (row) => navigate(`${RD_PATHS.project}/${row.id}`),
    },
    {
      key: 'edit-page',
      label: '编辑(跳转)',
      icon: <Pencil size={16} />,
      onClick: (row) => navigate(`${RD_PATHS.project}/${row.id}/edit`),
    },
  ];

  return (
    <CrudPage
      schema={projectSchema}
      apiAdapter={projectApiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[{ label: '研发管理', href: RD_PATHS.root }, { label: '项目列表' }]}
    />
  );
};

export default RsProjectListPage;
