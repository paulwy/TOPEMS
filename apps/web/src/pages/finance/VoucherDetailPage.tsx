import { FINANCE_PATHS } from '@/modules/finance/config';
import {
  Card,
  CardContent,
  Chip,
  Typography,
  Box,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from '@mui/material';
import { designTokens } from '@/theme/tokens';
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Check, User, Calendar, Building2, AlertCircle } from 'lucide-react';
import { DetailPageTemplate } from '@/components/templates';
import { voucherApi } from '@/api/finance';
import type { Voucher, VoucherEntry } from '@/types/finance';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';

import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/date';

import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

interface TabConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  content: React.ReactNode;
}

const VoucherDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const queryClient = useQueryClient();

  const voucherQuery = useQuery<Voucher | null>({
    queryKey: [...QUERY_KEYS.AD_HOC.FINANCE_VOUCHER_2_BASE, id],
    queryFn: async () => {
      if (!id) return null;
      const result = await voucherApi.get(id);
      return result.success && result.data ? result.data : null;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const voucher = voucherQuery.data ?? null;

  const voucherItemsQuery = useQuery<VoucherEntry[]>({
    queryKey: [...QUERY_KEYS.AD_HOC.FINANCE_VOUCHER_ITEMS_BASE, id],
    queryFn: async () => {
      if (!id) return [];
      const result = await voucherApi.getItems(id);
      return result.success && result.data ? result.data : [];
    },
    enabled: !!id && !(voucher?.entries && voucher.entries.length > 0),
    staleTime: 5 * 60 * 1000,
  });

  const voucherItems =
    voucher?.entries && voucher.entries.length > 0
      ? voucher.entries
      : (voucherItemsQuery.data ?? []);

  const loading = voucherQuery.isLoading;

  useEffect(() => {
    if (voucherQuery.isError) {
      apiLogger.error(t('finance.voucher_detail_page.detail'), voucherQuery.error);
      addNotification({
        title: t('finance.voucher_detail_page.error'),
        message: t('finance.voucher_detail_page.detail_1'),
        type: 'error',
      });
    }
  }, [voucherQuery.isError, voucherQuery.error, addNotification]);

  const handleEdit = () => {
    navigate(FINANCE_PATHS.voucherDetail.replace(':id', id!));
  };

  const deleteMutation = useMutation({
    mutationFn: (voucherId: string) => voucherApi.delete(voucherId),
    onSuccess: () => {
      addNotification({
        title: t('finance.voucher_detail_page.success'),
        message: t('finance.voucher_detail_page.delete_success'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.FINANCE_VOUCHERS_BASE,
        exact: false,
        refetchType: 'active',
      });
      navigate(FINANCE_PATHS.vouchers);
    },
    onError: (err: unknown) => {
      apiLogger.error(t('finance.voucher_detail_page.delete'), err);
      addNotification({
        title: t('finance.voucher_detail_page.error'),
        message: t('finance.voucher_detail_page.delete_1'),
        type: 'error',
      });
    },
  });

  const handleDelete = () => {
    if (!confirm(t('finance.voucher_detail_page.confirm'))) return;
    if (id) deleteMutation.mutate(id);
  };

  const auditMutation = useMutation({
    mutationFn: (voucherId: string) => voucherApi.approve(voucherId),
    onSuccess: () => {
      addNotification({
        title: t('finance.voucher_detail_page.success'),
        message: t('finance.voucher_detail_page.success_1'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.AD_HOC.FINANCE_VOUCHER_2_BASE, id],
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(t('finance.voucher_detail_page.fail'), err);
      addNotification({
        title: t('finance.voucher_detail_page.fail_1'),
        message: t('finance.voucher_detail_page.fail_2'),
        type: 'error',
      });
    },
  });

  const handleAudit = () => {
    if (!confirm(t('finance.voucher_detail_page.confirm_1'))) return;
    if (id) auditMutation.mutate(id);
  };

  const postMutation = useMutation({
    mutationFn: (voucherId: string) => voucherApi.post(voucherId),
    onSuccess: () => {
      addNotification({
        title: t('finance.voucher_detail_page.success'),
        message: t('finance.voucher_detail_page.success_2'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.AD_HOC.FINANCE_VOUCHER_2_BASE, id],
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(t('finance.voucher_detail_page.fail_3'), err);
      addNotification({
        title: t('finance.voucher_detail_page.fail_1'),
        message: t('finance.voucher_detail_page.fail_4'),
        type: 'error',
      });
    },
  });

  const handlePost = () => {
    if (!confirm(t('finance.voucher_detail_page.confirm_2'))) return;
    if (id) postMutation.mutate(id);
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        label: string;
        color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
      }
    > = {
      draft: { label: t('finance.voucher_detail_page.text_22b433'), color: 'default' },
      submitted: { label: t('finance.voucher_detail_page.pending_review'), color: 'warning' },
      approved: { label: t('finance.voucher_detail_page.approved'), color: 'info' },
      posted: { label: t('finance.voucher_detail_page.text_4ab08f'), color: 'success' },
      reversed: { label: t('finance.voucher_detail_page.text_247201'), color: 'secondary' },
      imported: { label: t('finance.voucher_detail_page.import'), color: 'secondary' },
    };
    const config = statusConfig[status] || { label: status, color: 'default' };
    return (
      <Chip
        size='small'
        color={config.color}
        label={config.label}
      />
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Typography>{t('finance.opening_balance_page.m1')}</Typography>
      </Box>
    );
  }

  if (!voucher) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <AlertCircle
            size={64}
            style={{ color: ct.error[700], marginBottom: 16 }}
          />
          <Typography
            variant='h6'
            color='text.secondary'
          >
            {t('finance.voucher_detail_page.e1')}
          </Typography>
          <Button
            onClick={() => navigate(FINANCE_PATHS.vouchers)}
            sx={{ mt: 2 }}
          >
            {t('finance.voucher_detail_page.e2')}
          </Button>
        </Box>
      </Box>
    );
  }

  const voucherNumber = voucher.voucher_no || voucher.voucher_number || '';

  const infoCard = {
    avatar: <FileText size={32} />,
    title: voucherNumber,
    subtitle: t('finance.voucher_detail_page.e3', { v1: voucher.period }),
    tags: [getStatusBadge(voucher.status)] as unknown as string[],
    stats: [
      {
        label: t('finance.voucher_detail_page.text_10afa4'),
        value: formatCurrency(voucher.total_debit),
      },
      {
        label: t('finance.voucher_detail_page.text_17daaa'),
        value: formatCurrency(voucher.total_credit),
      },
    ],
  };

  const basicInfoTab = (
    <Card>
      <CardContent>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 3 }}
        >
          {t('finance.voucher_create_page.e1')}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
            gap: 3,
          }}
        >
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {t('finance.finance_voucher_page_components_voucher_detail_modal.e1')}
            </Typography>
            <Typography
              variant='body1'
              sx={{ fontWeight: 600, color: 'primary.main' }}
            >
              {voucherNumber}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {t('finance.finance_voucher_page_components_voucher_detail_modal.e2')}
            </Typography>
            <Typography variant='body1'>{formatDate(voucher.voucher_date)}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {t('finance.voucher_detail_page.e7')}
            </Typography>
            <Typography variant='body1'>{voucher.period}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {t('finance.voucher_detail_page.e8')}
            </Typography>
            <Typography variant='body1'>
              {t('finance.voucher_detail_page.m2', { v1: voucher.attachment_count || 0 })}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {t('finance.voucher_detail_page.e9')}
            </Typography>
            <Box sx={{ mt: 0.5 }}>{getStatusBadge(voucher.status)}</Box>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {t('finance.voucher_detail_page.e10')}
            </Typography>
            <Typography variant='body1'>{voucher.summary || '-'}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 3 }}
        >
          {t('finance.voucher_detail_page.e11')}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: '50%',
                bgcolor: 'primary.light',
                display: 'flex',
              }}
            >
              <User
                size={20}
                style={{ color: ct.primary.dark }}
              />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('finance.finance_voucher_page_components_voucher_detail_modal.e6')}
              </Typography>
              <Typography
                variant='body1'
                sx={{ fontWeight: 500 }}
              >
                {voucher.maker_name || '-'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: '50%',
                bgcolor: 'info.light',
                display: 'flex',
              }}
            >
              <Check
                size={20}
                style={{ color: ct.info.dark }}
              />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('finance.finance_voucher_page_components_voucher_detail_modal.e7')}
              </Typography>
              <Typography
                variant='body1'
                sx={{ fontWeight: 500 }}
              >
                {voucher.checker_name || voucher.approver_name || '-'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: '50%',
                bgcolor: 'success.light',
                display: 'flex',
              }}
            >
              <Building2
                size={20}
                style={{ color: ct.success[700] }}
              />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('finance.voucher_detail_page.e14')}
              </Typography>
              <Typography
                variant='body1'
                sx={{ fontWeight: 500 }}
              >
                {voucher.bookkeeper_name || voucher.poster_name || '-'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const voucherItemsTab = (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {t('finance.finance_voucher_page_components_voucher_detail_modal.e8')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              {t('finance.voucher_detail_page.r1')}{' '}
              <Typography
                component='span'
                sx={{ fontWeight: 600, color: 'error.main' }}
              >
                {formatCurrency(voucher.total_debit)}
              </Typography>
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              {t('finance.voucher_detail_page.r2')}{' '}
              <Typography
                component='span'
                sx={{ fontWeight: 600, color: 'success.main' }}
              >
                {formatCurrency(voucher.total_credit)}
              </Typography>
            </Typography>
          </Box>
        </Box>

        <TableContainer
          component={Paper}
          variant='outlined'
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 600, width: 80 }}>
                  {t('finance.voucher_detail_page.k0')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, width: 150 }}>
                  {t('finance.voucher_detail_page.k1')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('finance.voucher_detail_page.k2')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('finance.voucher_detail_page.k3')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, width: 150, textAlign: 'right' }}>
                  {t('finance.voucher_create_page.e4')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, width: 150, textAlign: 'right' }}>
                  {t('finance.voucher_create_page.e5')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {voucherItems.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                >
                  <TableCell>{item.line_no || item.line_number || 0}</TableCell>
                  <TableCell sx={{ fontWeight: 500, color: 'primary.main' }}>
                    {item.subject_code || item.account_code}
                  </TableCell>
                  <TableCell>{item.subject_name || item.account_name}</TableCell>
                  <TableCell>{item.summary || '-'}</TableCell>
                  <TableCell
                    sx={{
                      textAlign: 'right',
                      color: 'error.main',
                      fontWeight: 500,
                    }}
                  >
                    {item.debit_amount > 0 ? formatCurrency(item.debit_amount) : ''}
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: 'right',
                      color: 'success.main',
                      fontWeight: 500,
                    }}
                  >
                    {item.credit_amount > 0 ? formatCurrency(item.credit_amount) : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 4,
            mt: 3,
            pt: 2,
            borderTop: 2,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('finance.finance_voucher_page_components_voucher_detail_modal.e9')}
            </Typography>
            <Typography
              variant='h6'
              sx={{ fontWeight: 'bold', color: 'error.main' }}
            >
              {formatCurrency(voucher.total_debit)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('finance.finance_voucher_page_components_voucher_detail_modal.e10')}
            </Typography>
            <Typography
              variant='h6'
              sx={{ fontWeight: 'bold', color: 'success.main' }}
            >
              {formatCurrency(voucher.total_credit)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const operationLogTab = (
    <Card>
      <CardContent>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 3 }}
        >
          {t('finance.voucher_detail_page.e20')}
        </Typography>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 3,
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: '50%',
                bgcolor: 'success.light',
                display: 'flex',
              }}
            >
              <Calendar
                size={16}
                style={{ color: ct.success[700] }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {t('finance.voucher_detail_page.e21')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {voucher.maker_name || t('finance.voucher_detail_page.text_8a8b89')} -{' '}
                {formatDate(voucher.created_at)}
              </Typography>
            </Box>
          </Box>
          {voucher.status !== 'draft' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 3,
              }}
            >
              <Box
                sx={{
                  p: 1,
                  borderRadius: '50%',
                  bgcolor: 'info.light',
                  display: 'flex',
                }}
              >
                <Check
                  size={16}
                  style={{ color: ct.info.dark }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {t('finance.voucher_detail_page.e22')}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {voucher.checker_name || voucher.approver_name || '-'} -{' '}
                  {formatDate(voucher.approved_at || '')}
                </Typography>
              </Box>
            </Box>
          )}
          {voucher.status === 'posted' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 3,
              }}
            >
              <Box
                sx={{
                  p: 1,
                  borderRadius: '50%',
                  bgcolor: 'primary.light',
                  display: 'flex',
                }}
              >
                <Building2
                  size={16}
                  style={{ color: ct.primary.dark }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {t('finance.voucher_detail_page.e23')}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {voucher.bookkeeper_name || voucher.poster_name || '-'} -{' '}
                  {formatDate(voucher.posted_at || '')}
                </Typography>
              </Box>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );

  const tabs: TabConfig[] = [
    { id: 'basic', label: t('finance.voucher_detail_page.info'), content: basicInfoTab },
    {
      id: 'items',
      label: t('finance.voucher_detail_page.text_5f3e09'),
      badge: voucherItems.length,
      content: voucherItemsTab,
    },
    { id: 'logs', label: t('finance.voucher_detail_page.action_log'), content: operationLogTab },
  ];

  return (
    <DetailPageTemplate
      title={voucherNumber}
      subtitle={t('finance.voucher_detail_page.e3', { v1: voucher.period })}
      detailItemName={
        voucher?.voucher_no ||
        voucher?.voucher_number ||
        voucher?.id ||
        t('finance.voucher_detail_page.k4')
      }
      breadcrumbs={[
        { label: t('finance.voucher_detail_page.home'), href: '/dashboard' },
        { label: t('finance.voucher_detail_page.text_b8fe8d'), href: '/finance' },
        { label: t('finance.voucher_detail_page.text_161d77'), href: FINANCE_PATHS.vouchers },
        { label: voucherNumber },
      ]}
      backHref={FINANCE_PATHS.vouchers}
      tabs={tabs}
      infoCard={infoCard}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
};

export default VoucherDetailPage;
