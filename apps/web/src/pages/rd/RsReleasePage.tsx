import React, { useState } from 'react';
import { Box, Chip, Stack, Typography, Paper } from '@mui/material';
import { Eye, RotateCcw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { releaseSchema } from '@/schemas/rd';
import { deployApi } from '@/api/rd';
import type { Deploy, CreateDeployRequest } from '@/api/rd';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { logger } from '@/utils/logger';

const baseAdapter = createCrudPageAdapter<Deploy, CreateDeployRequest>({
  list: deployApi.listDeploys,
  create: deployApi.createDeploy,
  update: async () => {
    throw new Error('Deploy update not supported');
  },
  delete: async () => {
    throw new Error('Deploy delete not supported');
  },
});

const releaseAdapter = baseAdapter as unknown as CrudApiAdapter<Deploy>;

const STATUS_COLOR_MAP: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  released: 'success',
  planning: 'warning',
  rolled_back: 'error',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  released: '已发布',
  planning: '规划中',
  rolled_back: '已回滚',
};

const ENV_COLOR_MAP: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  production: 'error',
  staging: 'warning',
  development: 'success',
};

const ENV_LABEL_MAP: Record<string, string> = {
  production: '生产环境',
  staging: '预发布环境',
  development: '开发环境',
};

function transformStatus(status: string): string {
  if (status === 'success') return 'released';
  if (status === 'failed') return 'rolled_back';
  return 'planning';
}

const RsReleasePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const createDeployMutation = useMutation({
    mutationFn: async (data: CreateDeployRequest) => {
      const response = await deployApi.createDeploy(data);
      if (!response.success) {
        throw new Error(response.message || '创建发布失败');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.RELEASES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.DEPLOYS });
    },
    onError: (error: unknown) => {
      logger.error('创建发布失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: error instanceof Error ? error.message : '创建发布失败',
      });
    },
  });

  const handleRollback = async (row: Record<string, unknown>) => {
    try {
      const createData: CreateDeployRequest = {
        project_id: 'default',
        build_id: 'default',
        env: String(row.environment || row.env || ''),
        deploy_type: 'full',
        environment: String(row.environment || row.env || ''),
        app_name: String(row.release_note || row.app_name || ''),
        version: String(row.version || ''),
      };
      await createDeployMutation.mutateAsync(createData);
      addNotification({
        type: 'success',
        title: '操作成功',
        message: '回滚任务已提交',
      });
    } catch {}
  };

  const customRowActions: RowAction<Record<string, unknown>>[] = [
    {
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: () => {},
    },
    {
      label: '回滚',
      icon: <RotateCcw size={16} />,
      onClick: handleRollback,
      show: (row) => transformStatus(String(row.status ?? '')) === 'released',
    },
  ];

  const detailContent = (row: Record<string, unknown>) => {
    const status = transformStatus(String(row.status ?? ''));
    const statusLabel = STATUS_LABEL_MAP[status] || status;
    const statusColor = STATUS_COLOR_MAP[status] || 'default';
    const env = String(row.environment || row.env || '');
    const envLabel = ENV_LABEL_MAP[env] || env;
    const envColor = ENV_COLOR_MAP[env] || 'default';

    return (
      <Box sx={{ py: 2 }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 'bold' }}
        >
          {String(row.version || row.deploy_no || '')}
        </Typography>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mt: 2 }}
        >
          <Chip
            label={envLabel}
            size='small'
            color={envColor}
          />
          <Chip
            label={statusLabel}
            size='small'
            color={statusColor}
          />
        </Stack>
        <Box sx={{ mt: 3 }}>
          <Typography
            variant='subtitle2'
            color='text.secondary'
          >
            发布说明
          </Typography>
          <Paper sx={{ p: 2, mt: 1, bgcolor: 'grey.100' }}>
            <Typography variant='body2'>
              {String(row.release_note || row.app_name || '-')}
            </Typography>
          </Paper>
        </Box>
        <Stack
          direction='row'
          spacing={4}
          sx={{ mt: 3 }}
        >
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              发布时间
            </Typography>
            <Typography
              variant='body1'
              sx={{ fontWeight: 'bold' }}
            >
              {String(row.deploy_time || row.release_time || row.created_at || '-')}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              发布人
            </Typography>
            <Typography
              variant='body1'
              sx={{ fontWeight: 'bold' }}
            >
              {String(row.deployer || row.operator || row.release_by || '-')}
            </Typography>
          </Box>
        </Stack>
      </Box>
    );
  };

  return (
    <PageContainer
      title='配方发布'
      subtitle='管理配方发布和版本部署'
      maxWidth='xl'
    >
      <CrudPage
        schema={releaseSchema}
        apiAdapter={releaseAdapter}
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '研发', href: '/rs' },
          { label: '配方发布' },
        ]}
        customRowActions={customRowActions}
        detailContent={detailContent}
        detailMaxWidth='md'
      />
    </PageContainer>
  );
};

export default RsReleasePage;
