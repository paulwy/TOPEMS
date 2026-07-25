import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { buildSchema } from '@/schemas/rd';
import { rdApi } from '@/api/rd';
import type { Build, CreateBuildRequest } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';

const buildApiAdapter: CrudApiAdapter<Build> = {
  list: async (params) => {
    const queryParams: Record<string, unknown> = {
      page: params?.page,
      pagesize: params?.pageSize,
    };
    if (params?.search) queryParams.search = params.search;
    if (params?.status) queryParams.status = params.status;

    const response = await rdApi.listBuilds(queryParams);
    if (!response.success || !response.data) {
      throw new Error(response.message || '加载构建记录失败');
    }
    return {
      data: response.data.builds || [],
      total: response.data.total || 0,
    };
  },

  create: async (data) => {
    const createData: CreateBuildRequest = {
      project_id: String(data.project_id ?? ''),
      branch: String(data.branch ?? ''),
      commit_hash: String(data.commit_hash ?? ''),
      build_type: String(data.build_type ?? 'manual'),
    };
    const response = await rdApi.createBuild(createData);
    if (!response.success || !response.data) {
      throw new Error(response.message || '创建构建任务失败');
    }
    return response.data;
  },

  update: async () => {
    throw new Error('构建记录不支持编辑');
  },

  delete: async () => {
    throw new Error('构建记录不支持删除');
  },
};

const RsBuildPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const rebuildMutation = useMutation({
    mutationFn: async (build: Build) => {
      const createData: CreateBuildRequest = {
        project_id: build.project_id,
        branch: build.branch,
        commit_hash: build.commit_hash,
        build_type: 'manual',
      };
      const response = await rdApi.createBuild(createData);
      if (!response.success) {
        throw new Error(response.message || '重新构建失败');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.BUILDS });
      addNotification({
        type: 'success',
        title: '操作成功',
        message: '构建任务已提交',
      });
    },
    onError: (error: unknown) => {
      logger.error('重新构建失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: error instanceof Error ? error.message : '无法提交构建任务',
      });
    },
  });

  const handleRebuild = (row: Record<string, unknown>) => {
    rebuildMutation.mutate(row as unknown as Build);
  };

  const customRowActions: RowAction[] = [
    {
      key: 'rebuild',
      label: '重新构建',
      icon: <RotateCcw size={16} />,
      color: 'primary',
      onClick: handleRebuild,
    },
  ];

  return (
    <CrudPage
      schema={buildSchema}
      apiAdapter={buildApiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[{ label: '研发管理', href: RD_PATHS.root }, { label: '构建管理' }]}
    />
  );
};

export default RsBuildPage;
