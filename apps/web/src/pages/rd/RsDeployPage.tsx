import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { deploySchema } from '@/schemas/rd';
import { rdApi } from '@/api/rd';
import type { Deploy, CreateDeployRequest } from '@/api/rd';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';

const deployApiAdapter: CrudApiAdapter<Deploy> = {
  list: async (params) => {
    const queryParams: Record<string, unknown> = {
      page: params?.page,
      pagesize: params?.pageSize,
    };
    if (params?.search) queryParams.search = params.search;
    if (params?.env) queryParams.env = params.env;
    if (params?.status) queryParams.status = params.status;

    const response = await rdApi.listDeploys(queryParams);
    if (!response.success || !response.data) {
      throw new Error(response.message || '加载部署记录失败');
    }
    return {
      data: response.data.deploys || [],
      total: response.data.total || 0,
    };
  },

  create: async (data) => {
    const createData: CreateDeployRequest = {
      project_id: String(data.project_id ?? ''),
      build_id: String(data.build_id ?? ''),
      env: String(data.env ?? 'prod'),
      deploy_type: data.deploy_type ? String(data.deploy_type) : 'full',
      environment: data.environment ? String(data.environment) : String(data.env ?? 'prod'),
      app_name: data.app_name ? String(data.app_name) : '',
      version: data.version ? String(data.version) : '',
    };
    const response = await rdApi.createDeploy(createData);
    if (!response.success || !response.data) {
      throw new Error(response.message || '创建部署任务失败');
    }
    return response.data;
  },

  update: async () => {
    throw new Error('部署记录不支持编辑');
  },

  delete: async () => {
    throw new Error('部署记录不支持删除');
  },
};

const RsDeployPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const redeployMutation = useMutation({
    mutationFn: async (deploy: Deploy) => {
      const createData: CreateDeployRequest = {
        project_id: deploy.project_id,
        build_id: deploy.build_id,
        env: deploy.env,
        deploy_type: deploy.deploy_type,
        environment: deploy.environment,
        app_name: deploy.app_name,
        version: deploy.version,
      };
      const response = await rdApi.createDeploy(createData);
      if (!response.success) {
        throw new Error(response.message || '重新部署失败');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.DEPLOYS ,
  exact: false,
  refetchType: 'active',
});
      addNotification({
        type: 'success',
        title: '操作成功',
        message: '部署任务已提交',
      });
    },
    onError: (error: unknown) => {
      logger.error('重新部署失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: error instanceof Error ? error.message : '无法重新部署',
      });
    },
  });

  const handleRedeploy = (row: Record<string, unknown>) => {
    redeployMutation.mutate(row as unknown as Deploy);
  };

  const customRowActions: RowAction[] = [
    {
      key: 'redeploy',
      label: '重新部署',
      icon: <RotateCcw size={16} />,
      color: 'primary',
      onClick: handleRedeploy,
    },
  ];

  return (
    <CrudPage
      schema={deploySchema}
      apiAdapter={deployApiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[{ label: '研发管理', href: '/rd' }, { label: '部署管理' }]}
    />
  );
};

export default RsDeployPage;
