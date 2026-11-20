import React from 'react';
import { Box, Chip, Stack, Typography, Paper } from '@mui/material';
import { Eye } from 'lucide-react';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates';
import { createCrudPageAdapter } from '@/schema-dsl/crudPageAdapter';
import { releaseSchema } from '@/schemas/rd';
import { deployApi } from '@/api/rd';
import type { Deploy, CreateDeployRequest } from '@/api/rd';
import { PageContainer } from '@/components/common';
import i18n from '@/i18n';

/**
 * 批 38：发布页保留 rd.deploys 作为数据源。
 * - 新增「发布配方」列，展示 LEFT JOIN 带出的 formula_name（为空显示 —）。
 * - 删除把 success/failed/running 硬映射为 已发布/已回滚/规划中 的逻辑；
 *   状态列按 rd.deploys.status 真实值（active/inactive/archived）如实展示。
 * - 删除基于假状态的「回滚」按钮（后端无对应端点，原按钮永不显示）。
 */
const baseAdapter = createCrudPageAdapter<Deploy, CreateDeployRequest>({
  list: deployApi.listDeploys,
  create: deployApi.createDeploy,
  update: async () => {
    throw new Error(i18n.t('rd.rs_release_page.k18'));
  },
  delete: async () => {
    throw new Error(i18n.t('rd.rs_release_page.k19'));
  },
});
const releaseAdapter = baseAdapter as unknown as CrudApiAdapter<Record<string, unknown>>;

function getDeployStatusLabel(raw: string): string {
  switch (raw) {
    case 'active':
      return i18n.t('rd.rs_release_page.k20');
    case 'inactive':
      return i18n.t('rd.rs_release_page.k21');
    case 'archived':
      return i18n.t('rd.rs_release_page.k22');
    default:
      return raw || '-';
  }
}

function getDeployStatusColor(
  raw: string
): 'default' | 'primary' | 'success' | 'error' | 'warning' {
  switch (raw) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'warning';
    case 'archived':
      return 'default';
    default:
      return 'default';
  }
}

function getEnvLabel(env: string): string {
  switch (env) {
    case 'production':
      return i18n.t('rd.rs_release_page.k3');
    case 'staging':
      return i18n.t('rd.rs_release_page.k4');
    case 'development':
      return i18n.t('rd.rs_release_page.k5');
    default:
      return env || '-';
  }
}

function getEnvColor(env: string): 'error' | 'warning' | 'success' | 'default' {
  switch (env) {
    case 'production':
      return 'error';
    case 'staging':
      return 'warning';
    case 'development':
      return 'success';
    default:
      return 'default';
  }
}

const RsReleasePage: React.FC = () => {
  const customRowActions: RowAction<Record<string, unknown>>[] = [
    {
      label: i18n.t('rd.rs_release_page.k11'),
      icon: <Eye size={16} />,
      onClick: () => {},
    },
  ];

  const detailContent = (row: Record<string, unknown>) => {
    const statusRaw = String(row.status ?? '');
    const statusLabel = getDeployStatusLabel(statusRaw);
    const statusColor = getDeployStatusColor(statusRaw);
    const env = String(row.environment || row.env || '');
    const envLabel = getEnvLabel(env);
    const envColor = getEnvColor(env);
    const formulaName = row.formula_name ? String(row.formula_name) : '-';
    const formulaCode = row.formula_code ? String(row.formula_code) : '-';
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
        <Paper sx={{ p: 2, mt: 3, bgcolor: 'grey.100' }}>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {i18n.t('rd.rs_release_page.k23')}
          </Typography>
          <Typography
            variant='body2'
            sx={{ mt: 1 }}
          >
            {formulaName}
            {formulaCode !== '-' ? ` (${formulaCode})` : ''}
          </Typography>
        </Paper>
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
              {i18n.t('rd.rs_release_page.k9')}
            </Typography>
            <Typography
              variant='body1'
              sx={{ fontWeight: 'bold' }}
            >
              {String(row.deploy_time || row.created_at || '-')}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('rd.rs_release_page.k10')}
            </Typography>
            <Typography
              variant='body1'
              sx={{ fontWeight: 'bold' }}
            >
              {String(row.deployer || row.operator || '-')}
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
