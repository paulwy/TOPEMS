import React, { useState } from 'react';
import { Box, Chip, Stack, Typography, Paper } from '@mui/material';
import { Eye, Check, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { reviewSchema } from '@/schemas/rd';
import { buildApi } from '@/api/rd';
import type { Build, CreateBuildRequest } from '@/api/rd';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const baseAdapter = createCrudPageAdapter<Build, CreateBuildRequest>({
  list: buildApi.listBuilds,
  create: buildApi.createBuild,
  update: async () => {
    throw new Error('Build update not supported');
  },
  delete: async () => {
    throw new Error('Build delete not supported');
  },
});
const reviewAdapter = baseAdapter as unknown as CrudApiAdapter<Build>;
const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  in_progress: 'primary',
};
function getStatusLabelMap(): Record<string, string> {
  return {
    pending: i18n.t('rd.rs_review_page.k0'),
    approved: i18n.t('rd.rs_review_page.k1'),
    rejected: i18n.t('rd.rs_review_page.k2'),
    in_progress: i18n.t('rd.rs_review_page.k3'),
  };
}
function transformStatus(status: string): string {
  if (status === 'success') return 'approved';
  if (status === 'failed') return 'rejected';
  if (status === 'running') return 'in_progress';
  return status;
}
const RsReviewPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const handleApprove = async (row: Record<string, unknown>) => {
    try {
      queryClient.setQueryData(
        [...QUERY_KEYS.RD.REVIEWS],
        (oldData: { reviews: Build[]; total: number } | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            reviews: oldData.reviews.map((r) =>
              r.id === row.id ? { ...r, status: 'success' } : r
            ),
          };
        }
      );
      addNotification({
        type: 'success',
        title: i18n.t('rd.rs_review_page.k4'),
        message: i18n.t('rd.rs_review_page.k5'),
      });
    } catch (error) {
      console.error(i18n.t('pages.rs_review_page.k0'), error);
    }
  };
  const handleReject = async (row: Record<string, unknown>) => {
    try {
      queryClient.setQueryData(
        [...QUERY_KEYS.RD.REVIEWS],
        (oldData: { reviews: Build[]; total: number } | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            reviews: oldData.reviews.map((r) => (r.id === row.id ? { ...r, status: 'failed' } : r)),
          };
        }
      );
      addNotification({
        type: 'success',
        title: i18n.t('rd.rs_review_page.k6'),
        message: i18n.t('rd.rs_review_page.k7'),
      });
    } catch (error) {
      console.error(i18n.t('pages.rs_review_page.k1'), error);
    }
  };
  const customRowActions: RowAction<Record<string, unknown>>[] = [
    {
      label: i18n.t('rd.rs_review_page.k8'),
      icon: <Eye size={16} />,
      onClick: () => {},
    },
    {
      label: i18n.t('rd.rs_review_page.k9'),
      icon: (
        <Check
          size={16}
          color='green'
        />
      ),
      onClick: handleApprove,
      show: (row) => transformStatus(String(row.status ?? '')) === 'pending',
    },
    {
      label: i18n.t('rd.rs_review_page.k10'),
      icon: (
        <X
          size={16}
          color='red'
        />
      ),
      onClick: handleReject,
      show: (row) => transformStatus(String(row.status ?? '')) === 'pending',
    },
  ];
  const detailContent = (row: Record<string, unknown>) => {
    const status = transformStatus(String(row.status ?? ''));
    const statusLabel = getStatusLabelMap()[status] || status;
    const statusColor = STATUS_COLOR_MAP[status] || 'default';
    return (
      <Box sx={{ py: 2 }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 'bold' }}
        >
          {String(row.build_no ?? '')} - {String(row.project_name ?? '')}
        </Typography>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mt: 2 }}
        >
          <Chip
            label={statusLabel}
            color={statusColor}
          />
          <Typography
            variant='body2'
            color='text.secondary'
          >
            [i18n.t('pages.rs_review_page.k0')]: {String(row.project_name ?? '')}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            [i18n.t('pages.rs_review_page.k1')]: {i18n.t('pages.rs_review_page.k2')}
          </Typography>
        </Stack>
        <Paper sx={{ p: 2, mt: 3, bgcolor: 'grey.100' }}>
          <Typography variant='body2'>{i18n.t('rd.rs_review_page.k11')}</Typography>
        </Paper>
      </Box>
    );
  };
  return (
    <PageContainer
      title={i18n.t('rd.rs_review_page.k12')}
      subtitle={i18n.t('rd.rs_review_page.k13')}
      maxWidth='xl'
    >
      <CrudPage
        schema={reviewSchema}
        apiAdapter={reviewAdapter}
        breadcrumbs={[
          { label: i18n.t('rd.rs_review_page.k14'), href: '/dashboard' },
          { label: i18n.t('rd.rs_review_page.k15'), href: '/rs' },
          { label: i18n.t('rd.rs_review_page.k16') },
        ]}
        customRowActions={customRowActions}
        detailContent={detailContent}
        detailMaxWidth='md'
      />
    </PageContainer>
  );
};
export default RsReviewPage;
