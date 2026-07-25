import React from 'react';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import { milestoneSchema } from '@/schemas/rd';
import { rdApi } from '@/api/rd';
import type { Build, CreateBuildRequest } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';

interface Milestone {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  progress: number;
  related_project: string;
  status: string;
}

const transformBuildToMilestone = (b: Build): Milestone => ({
  id: b.id,
  name: `${b.build_no} - ${b.project_name}`,
  start_date: b.created_at?.split('T')[0] || '',
  end_date: b.created_at?.split('T')[0] || '',
  progress:
    b.status === 'success' ? 100 : b.status === 'failed' ? 0 : b.status === 'running' ? 50 : 0,
  related_project: b.project_name,
  status: b.status === 'success' ? 'completed' : b.status === 'running' ? 'active' : 'planning',
});

const STATUS_FILTER_TO_BUILD_STATUS: Record<string, string> = {
  active: 'running',
  completed: 'success',
};

const milestoneApiAdapter: CrudApiAdapter<Milestone> = {
  list: async (params) => {
    const queryParams: Record<string, unknown> = {
      page: params?.page,
      pagesize: params?.pageSize,
    };
    if (params?.search) queryParams.search = params.search;
    if (params?.status) {
      const buildStatus = STATUS_FILTER_TO_BUILD_STATUS[params.status as string];
      if (buildStatus) queryParams.status = buildStatus;
    }

    const response = await rdApi.listBuilds(queryParams);
    if (!response.success || !response.data) {
      throw new Error(response.message || '加载里程碑数据失败');
    }
    const builds = response.data.builds || [];
    return {
      data: builds.map(transformBuildToMilestone),
      total: response.data.total || 0,
    };
  },

  create: async () => {
    const createData: CreateBuildRequest = {
      project_id: 'default',
      branch: 'main',
      commit_hash: 'HEAD',
      build_type: 'manual',
    };
    const response = await rdApi.createBuild(createData);
    if (!response.success || !response.data) {
      throw new Error(response.message || '创建里程碑失败');
    }
    return transformBuildToMilestone(response.data);
  },

  update: async () => {
    throw new Error('里程碑不支持编辑');
  },

  delete: async () => {
    throw new Error('里程碑不支持删除');
  },
};

const RsMilestonePage: React.FC = () => {
  return (
    <CrudPage
      schema={milestoneSchema}
      apiAdapter={milestoneApiAdapter}
      breadcrumbs={[{ label: '研发管理', href: RD_PATHS.root }, { label: '里程碑' }]}
    />
  );
};

export default RsMilestonePage;
