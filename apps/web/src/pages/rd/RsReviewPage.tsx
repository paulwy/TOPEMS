import React from 'react';
import { Box, Chip, Stack, Typography, Paper } from '@mui/material';
import { Eye, Check, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { reviewSchema } from '@/schemas/rd';
import { formulaApi } from '@/api/rd';
import type { Formula, CreateFormulaRequest } from '@/api/rd';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

/**
 * 批 38：评审页数据源从 rd.builds 切换为 rs.formulas。
 * - 列表字段：配方名称 / 编码 / 版本 / 评审状态 / 评审人 / 评审时间
 * - 评审动作：通过 / 驳回 → POST /api/rd/formulas/{id}/review
 * - 不再使用 buildApi，不再做 success/failed/running 硬映射。
 */
const baseAdapter = createCrudPageAdapter<Formula, CreateFormulaRequest>({
  list: formulaApi.listFormulas,
  create: async () => {
    throw new Error(i18n.t('rd.rs_review_page.k20'));
  },
  update: async () => {
    throw new Error(i18n.t('rd.rs_review_page.k21'));
  },
  delete: async () => {
    throw new Error(i18n.t('rd.rs_review_page.k22'));
  },
});
const reviewAdapter = baseAdapter as unknown as CrudApiAdapter<Record<string, unknown>>;

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'none';

function normalizeApprovalStatus(raw: unknown): ApprovalStatus {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (s === 'pending') return 'pending';
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  return 'none';
}

function getApprovalStatusLabel(status: ApprovalStatus): string {
  switch (status) {
    case 'pending':
      return i18n.t('rd.rs_review_page.k0');
    case 'approved':
      return i18n.t('rd.rs_review_page.k1');
    case 'rejected':
      return i18n.t('rd.rs_review_page.k2');
    case 'none':
    default:
      return i18n.t('rd.rs_review_page.k17');
  }
}

function getApprovalStatusColor(
  status: ApprovalStatus
): 'default' | 'primary' | 'success' | 'error' | 'warning' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'error';
    case 'none':
    default:
      return 'default';
  }
}

const RsReviewPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const { user } = useAuth();
  const reviewerName =
    user?.full_name || user?.realName || user?.username || i18n.t('rd.rs_review_page.k18');

  const reviewMutation = useMutation({
    mutationFn: async (vars: { id: string; action: 'approve' | 'reject' }) => {
      const response = await formulaApi.reviewFormula(vars.id, vars.action, reviewerName);
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('rd.rs_review_page.k19'));
      }
      return response.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: [reviewSchema.entity],
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        type: 'success',
        title: i18n.t('rd.rs_review_page.k4'),
        message:
          vars.action === 'approve'
            ? i18n.t('rd.rs_review_page.k5')
            : i18n.t('rd.rs_review_page.k7'),
      });
    },
    onError: (error: unknown) => {
      logger.error('[RD] review formula failed', error);
      addNotification({
        type: 'error',
        title: i18n.t('rd.rs_review_page.k19'),
        message: error instanceof Error ? error.message : i18n.t('rd.rs_review_page.k19'),
      });
    },
  });

  const handleApprove = async (row: Record<string, unknown>) => {
    const id = String(row.id ?? '');
    if (!id) return;
    reviewMutation.mutate({ id, action: 'approve' });
  };
  const handleReject = async (row: Record<string, unknown>) => {
    const id = String(row.id ?? '');
    if (!id) return;
    reviewMutation.mutate({ id, action: 'reject' });
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
      show: (row) => normalizeApprovalStatus(row.approval_status) === 'pending',
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
      show: (row) => normalizeApprovalStatus(row.approval_status) === 'pending',
    },
  ];

  const detailContent = (row: Record<string, unknown>) => {
    const status = normalizeApprovalStatus(row.approval_status);
    const statusLabel = getApprovalStatusLabel(status);
    const statusColor = getApprovalStatusColor(status);
    const formulaName = String(row.name ?? '');
    const formulaCode = String(row.code ?? '');
    const version = String(row.version ?? '');
    const approvedBy = row.approved_by ? String(row.approved_by) : '-';
    const approvedAt = row.approved_at ? String(row.approved_at) : '-';
    const description = row.description ? String(row.description) : '-';
    return (
      <Box sx={{ py: 2 }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 'bold' }}
        >
          {formulaName}
          {version ? ` · v${version}` : ''}
        </Typography>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mt: 2 }}
        >
          <Chip
            label={statusLabel}
            color={statusColor}
            size='small'
          />
          {formulaCode ? (
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('rd.rs_review_page.k23')}: {formulaCode}
            </Typography>
          ) : null}
        </Stack>
        <Paper sx={{ p: 2, mt: 3, bgcolor: 'grey.100' }}>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {i18n.t('rd.rs_review_page.k24')}
          </Typography>
          <Typography
            variant='body2'
            sx={{ mt: 1 }}
          >
            {description}
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
              {i18n.t('rd.rs_review_page.k25')}
            </Typography>
            <Typography
              variant='body1'
              sx={{ fontWeight: 'bold' }}
            >
              {approvedBy}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('rd.rs_review_page.k26')}
            </Typography>
            <Typography
              variant='body1'
              sx={{ fontWeight: 'bold' }}
            >
              {approvedAt}
            </Typography>
          </Box>
        </Stack>
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
