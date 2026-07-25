import React, { useState } from 'react';
import { Box, Chip, Stack, Typography, Paper } from '@mui/material';
import { Eye, Check, X, GitPullRequest, Clock, User } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { reviewSchema } from '@/schemas/rd';
import { buildApi } from '@/api/rd';
import type { Build, CreateBuildRequest } from '@/api/rd';
import { PageContainer } from '@/components/common/PageContainer';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';

const baseAdapter = createCrudPageAdapter<Build, CreateBuildRequest>(buildApi);

const reviewAdapter: CrudApiAdapter<Build> = {
  list: baseAdapter.list,
  create: baseAdapter.create,
  update: baseAdapter.update,
  delete: baseAdapter.delete,
};

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  in_progress: 'primary',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: '待评审',
  approved: '已通过',
  rejected: '已拒绝',
  in_progress: '评审中',
};

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
        title: '操作成功',
        message: '评审已通过',
      });
    } catch (error) {
      console.error('评审操作失败:', error);
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
        title: '操作成功',
        message: '评审已拒绝',
      });
    } catch (error) {
      console.error('评审操作失败:', error);
    }
  };

  const customRowActions: RowAction<Record<string, unknown>>[] = [
    {
      label: '查看评审',
      icon: <Eye size={16} />,
      onClick: () => {},
    },
    {
      label: '通过',
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
      label: '拒绝',
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
    const statusLabel = STATUS_LABEL_MAP[status] || status;
    const statusColor = STATUS_COLOR_MAP[status] || 'default';

    return (
      <Box sx={{ py: 2 }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 'bold' }}
        >
          {row.build_no} - {row.project_name}
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
            作者: {row.project_name}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            评审人: 系统自动
          </Typography>
        </Stack>
        <Paper sx={{ p: 2, mt: 3, bgcolor: 'grey.100' }}>
          <Typography variant='body2'>评审内容区域 - 待实现</Typography>
        </Paper>
      </Box>
    );
  };

  return (
    <PageContainer
      title='配方评审'
      subtitle='管理配方评审流程'
      maxWidth='xl'
    >
      <CrudPage
        schema={reviewSchema}
        apiAdapter={reviewAdapter}
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '研发', href: '/rs' },
          { label: '配方评审' },
        ]}
        customRowActions={customRowActions}
        detailContent={detailContent}
        detailMaxWidth='md'
      />
    </PageContainer>
  );
};

export default RsReviewPage;
