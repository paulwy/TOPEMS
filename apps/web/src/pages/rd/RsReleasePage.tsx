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
import i18n from '@/i18n';

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
  released: i18n.t('rd.rs_release_page.k0'),
  planning: i18n.t('rd.rs_release_page.k1'),
  rolled_back: i18n.t('rd.rs_release_page.k2'),
};
const ENV_COLOR_MAP: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  production: 'error',
  staging: 'warning',
  development: 'success',
};
const ENV_LABEL_MAP: Record<string, string> = {
  production: i18n.t('rd.rs_release_page.k3'),
  staging: i18n.t('rd.rs_release_page.k4'),
  development: i18n.t('rd.rs_release_page.k5'),
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
        throw new Error(response.message || i18n.t('rd.rs_release_page.k6'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.RD.RELEASES,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.RD.DEPLOYS,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('pages.rs_release_page.k0'), error);
      addNotification({
        type: 'error',
        title: i18n.t('rd.rs_release_page.k7'),
        message: error instanceof Error ? error.message : i18n.t('rd.rs_release_page.k8'),
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
        title: i18n.t('rd.rs_release_page.k9'),
        message: i18n.t('rd.rs_release_page.k10'),
      });
    } catch (e) {
      console.error('[RD] Failed to submit rollback deployment', e);
    }
  };
  const customRowActions: RowAction<Record<string, unknown>>[] = [
    {
      label: i18n.t('rd.rs_release_page.k11'),
      icon: <Eye size={16} />,
      onClick: () => {},
    },
    {
      label: i18n.t('rd.rs_release_page.k12'),
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
            {i18n.t('pages.rs_release_page.k0')}
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
              {i18n.t('pages.rs_release_page.k1')}
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
              {i18n.t('pages.rs_release_page.k2')}
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
      title={i18n.t('rd.rs_release_page.k13')}
      subtitle={i18n.t('rd.rs_release_page.k14')}
      maxWidth='xl'
    >
      <CrudPage
        schema={releaseSchema}
        apiAdapter={releaseAdapter}
        breadcrumbs={[
          { label: i18n.t('rd.rs_release_page.k15'), href: '/dashboard' },
          { label: i18n.t('rd.rs_release_page.k16'), href: '/rs' },
          { label: i18n.t('rd.rs_release_page.k17') },
        ]}
        customRowActions={customRowActions}
        detailContent={detailContent}
        detailMaxWidth='md'
      />
    </PageContainer>
  );
};
export default RsReleasePage;
