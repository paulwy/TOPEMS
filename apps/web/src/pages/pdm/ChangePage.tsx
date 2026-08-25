import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { FileWarning, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { changeSchema } from '@/schemas/pdm';
import { pdmApi } from '@/api/pdm';
import type { ChangeOrder, CreateChangeOrderRequest } from '@/api/pdm';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useNotificationStore } from '@/store';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const ct = designTokens.colors;

const baseAdapter = createCrudPageAdapter<ChangeOrder, CreateChangeOrderRequest>({
  list: pdmApi.listChangeOrders,
  create: pdmApi.createChangeOrder,
  update: pdmApi.updateChangeOrder,
  delete: pdmApi.deleteChangeOrder,
});

const changeAdapter: CrudApiAdapter<Record<string, unknown>> = {
  ...baseAdapter,
};

const statusColorMap: Record<string, { bg: string; color: string }> = {
  pending: { bg: 'warning.lighter', color: 'warning.dark' },

  reviewing: { bg: 'info.lighter', color: 'info.dark' },
  approved: { bg: 'success.lighter', color: 'success.dark' },
  rejected: { bg: 'error.lighter', color: 'error.dark' },
  implemented: { bg: 'primary.lighter', color: 'primary.dark' },
  closed: { bg: 'grey.100', color: 'text.secondary' },
};

const statusLabelMap: Record<string, string> = {
  pending: i18n.t('pdm.change_page.k0'),
  reviewing: i18n.t('pdm.change_page.k1'),
  approved: i18n.t('pdm.change_page.k2'),
  rejected: i18n.t('pdm.change_page.k3'),
  implemented: i18n.t('pdm.change_page.k4'),
  closed: i18n.t('pdm.change_page.k5'),
};

function extractListData(response: unknown): ChangeOrder[] {
  if (!response || typeof response !== 'object') return [];
  const obj = response as Record<string, unknown>;
  const data = obj.data;
  if (!data) return [];
  if (Array.isArray(data)) return data as ChangeOrder[];
  if (typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.items)) return d.items as ChangeOrder[];
    if (Array.isArray(d.data)) return d.data as ChangeOrder[];
    if (Array.isArray(d.changeOrders)) return d.changeOrders as ChangeOrder[];
  }
  return [];
}

export const ChangePage: React.FC = () => {
  const { t } = useTranslation('pdm');
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const { data: changesResp } = useQuery({
    queryKey: QUERY_KEYS.PDM.CHANGE_ORDERS,
    queryFn: async () => pdmApi.listChangeOrders(),
    staleTime: 5 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const changes = extractListData(changesResp);
    return {
      total: changes.length,
      pending: changes.filter((c) => c.status === 'pending').length,
      approved: changes.filter((c) => c.status === 'approved').length,
      implemented: changes.filter((c) => c.status === 'implemented').length,
    };
  }, [changesResp]);

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      pdmApi.updateChangeOrder(id, { status: 'approved' } as Partial<CreateChangeOrderRequest>),
    onSuccess: () => {
      addNotification({
        title: t('pdm.change_page.k7'),
        message: t('pdm.change_page.k6'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PDM.CHANGE_ORDERS,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: () => {
      addNotification({
        title: t('pdm.change_page.k9'),
        message: t('pdm.change_page.k8'),
        type: 'error',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      pdmApi.updateChangeOrder(id, { status: 'rejected' } as Partial<CreateChangeOrderRequest>),
    onSuccess: () => {
      addNotification({
        title: t('pdm.change_page.k11'),
        message: t('pdm.change_page.k10'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PDM.CHANGE_ORDERS,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: () => {
      addNotification({
        title: t('pdm.change_page.k13'),
        message: t('pdm.change_page.k12'),
        type: 'error',
      });
    },
  });

  const customRowActions = [
    {
      label: t('pdm.change_page.k14'),
      icon: <CheckCircle size={16} />,
      color: 'success' as const,
      onClick: (row: Record<string, unknown>) => {
        const change = row as unknown as ChangeOrder;
        if (window.confirm(t('pdm.change_page.k15'))) {
          approveMutation.mutate(change.id);
        }
      },
      show: (row: Record<string, unknown>) => {
        const change = row as unknown as ChangeOrder;
        return change.status === 'pending' || change.status === 'reviewing';
      },
    },
    {
      label: t('pdm.change_page.k16'),
      icon: <XCircle size={16} />,
      color: 'error' as const,
      onClick: (row: Record<string, unknown>) => {
        const change = row as unknown as ChangeOrder;
        if (window.confirm(t('pdm.change_page.k17'))) {
          rejectMutation.mutate(change.id);
        }
      },
      show: (row: Record<string, unknown>) => {
        const change = row as unknown as ChangeOrder;
        return change.status === 'pending' || change.status === 'reviewing';
      },
      divider: true,
    },
  ];

  const headerContent = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'warning.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileWarning sx={{ width: 20, height: 20, color: 'warning.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'text.secondary',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {t('pdm.change_page.e1')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {stats.total}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'warning.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle sx={{ width: 20, height: 20, color: 'warning.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'text.secondary',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {t('pdm.change_page.e2')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'warning.main' }}
              >
                {stats.pending}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'success.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'text.secondary',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {t('pdm.change_page.e3')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'success.main' }}
              >
                {stats.approved}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'text.secondary',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {t('pdm.change_page.e4')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'primary.main' }}
              >
                {stats.implemented}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const detailContent = (row: Record<string, unknown>) => {
    const change = row as unknown as ChangeOrder;
    const statusColors = statusColorMap[change.status] || {
      bg: 'grey.100',
      color: 'text.secondary',
    };
    const statusLabel = statusLabelMap[change.status] || change.status;

    return (
      <Box
        sx={{
          pt: 2,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
        }}
      >
        <Box>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.change_page.e5')}
          </Box>
          <Box sx={{ fontWeight: 500 }}>{change.change_no}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.change_page.e6')}
          </Box>
          <Box>
            {change.apply_date ? new Date(change.apply_date).toLocaleDateString('zh-CN') : '-'}
          </Box>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.change_page.e7')}
          </Box>
          <Box>{change.title}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.change_page.e8')}
          </Box>
          <Box>{change.type}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.change_page.e9')}
          </Box>
          <Box>{change.priority}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.change_page.e10')}
          </Box>
          <Box>{change.applicant_name || change.applicant || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.bom_page.e6')}
          </Box>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={statusLabel}
              size='small'
              sx={{
                backgroundColor: statusColors.bg,
                color: statusColors.color,
                fontWeight: 500,
              }}
            />
          </Box>
        </Box>
        {change.approved_by && (
          <Box>
            <Box
              component='span'
              sx={{
                color: 'text.secondary',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {t('pdm.change_page.e12')}
            </Box>
            <Box>{change.approved_by}</Box>
          </Box>
        )}
        {change.approved_date && (
          <Box>
            <Box
              component='span'
              sx={{
                color: 'text.secondary',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {t('pdm.change_page.e13')}
            </Box>
            <Box>{new Date(change.approved_date).toLocaleDateString('zh-CN')}</Box>
          </Box>
        )}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.change_page.e14')}
          </Box>
          <Box>{change.reason || '-'}</Box>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.change_page.e15')}
          </Box>
          <Box>{change.description || '-'}</Box>
        </Box>
        {change.impact_analysis && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Box
              component='span'
              sx={{
                color: 'text.secondary',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {t('pdm.change_page.e16')}
            </Box>
            <Box>{change.impact_analysis}</Box>
          </Box>
        )}
        {change.remarks && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Box
              component='span'
              sx={{
                color: 'text.secondary',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {t('pdm.change_page.e17')}
            </Box>
            <Box>{change.remarks}</Box>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <PageContainer
      headerProps={{
        pageIcon: <FileWarning style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
      maxWidth='xl'
    >
      <CrudPage
        schema={changeSchema}
        apiAdapter={changeAdapter}
        breadcrumbs={[{ label: 'PDM' }, { label: t('pdm.change_page.k18') }]}
        headerContent={headerContent}
        detailContent={detailContent}
        detailMaxWidth='lg'
        customRowActions={customRowActions}
      />
    </PageContainer>
  );
};

export default ChangePage;
