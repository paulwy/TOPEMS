/**
 * 路线详情页
 *
 * 包含：基本信息、状态机操作
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 TMS API client。
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { routeApi } from '@/api/tms';
import type { Route } from '@/api/tms/types';
import { StatusBadge } from '@/components/tms/StatusBadge';
import { FSMActionButtons } from '@/components/tms/FSMActionButtons';
import { DetailPageTemplate } from '@/components/templates';
import type { SectionConfig } from '@/components/templates/DetailPageTemplate';
import { TMS_PATHS } from '@/modules/tms/config';
import { useTranslation } from 'react-i18next';

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(['tms', 'common']);
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    routeApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setRoute(res.data);
        } else {
          setError(res.message || t('tms.route_detail_page.k0'));
        }
      })
      .catch(() => setError(t('tms.route_detail_page.k1')))
      .finally(() => setLoading(false));
  }, [id, t]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  const headerContent = route ? (
    <Box sx={{ mt: 2 }}>
      <StatusBadge
        fsm='route'
        status={route.status ?? 'planning'}
      />
    </Box>
  ) : null;

  const sections: SectionConfig[] = route
    ? [
        {
          id: 'basic-info',
          title: t('common.basic_info'),
          content: (
            <Grid
              container
              spacing={2}
            >
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.route_detail_page.k4')}
                  value={route.route_no}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.route_detail_page.k5')}
                  value={route.name}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.route_detail_page.k6')}
                  value={route.origin ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.route_detail_page.k7')}
                  value={route.destination ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.route_detail_page.k8')}
                  value={route.distance_km != null ? `${route.distance_km} km` : '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.route_detail_page.k9')}
                  value={route.estimated_hours != null ? `${route.estimated_hours} h` : '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.route_detail_page.k10')}
                  value={route.status ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.route_detail_page.k11')}
                  value={
                    route.created_at ? new Date(route.created_at).toLocaleString('zh-CN') : '-'
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.route_detail_page.k12')}
                  value={
                    route.updated_at ? new Date(route.updated_at).toLocaleString('zh-CN') : '-'
                  }
                />
              </Grid>
            </Grid>
          ),
        },
        {
          id: 'actions',
          title: t('tms.route_detail_page.k3'),
          content: (
            <FSMActionButtons
              fsm='route'
              currentStatus={route.status ?? 'planning'}
              onAction={handleAction}
            />
          ),
        },
      ]
    : [];

  return (
    <DetailPageTemplate
      title={route?.name ?? ''}
      subtitle={route?.route_no ?? ''}
      loading={loading}
      error={error ?? undefined}
      backHref={TMS_PATHS.routes}
      headerContent={headerContent}
      sections={sections}
    />
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <Paper
      sx={{ p: 2, borderRadius: 2 }}
      elevation={0}
      variant='outlined'
    >
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {label}
      </Typography>
      <Typography
        variant='body1'
        sx={{ mt: 0.5, fontWeight: 500 }}
      >
        {value}
      </Typography>
    </Paper>
  );
}
