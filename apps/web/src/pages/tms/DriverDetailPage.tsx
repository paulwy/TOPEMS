/**
 * 司机详情页
 *
 * 包含：基本信息、状态机操作
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 TMS API client。
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { driverApi } from '@/api/tms';
import type { Driver } from '@/api/tms/types';
import { StatusBadge } from '@/components/tms/StatusBadge';
import { FSMActionButtons } from '@/components/tms/FSMActionButtons';
import { DetailPageTemplate } from '@/components/templates';
import type { SectionConfig } from '@/components/templates/DetailPageTemplate';
import { TMS_PATHS } from '@/modules/tms/config';
import { useTranslation } from 'react-i18next';

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(['tms', 'common']);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    driverApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setDriver(res.data);
        } else {
          setError(res.message || t('tms.driver_detail_page.k0'));
        }
      })
      .catch(() => setError(t('tms.driver_detail_page.k1')))
      .finally(() => setLoading(false));
  }, [id, t]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  const headerContent = driver ? (
    <Box sx={{ mt: 2 }}>
      <StatusBadge
        fsm='driver'
        status={driver.status ?? 'active'}
      />
    </Box>
  ) : null;

  const sections: SectionConfig[] = driver
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
                  label={t('tms.driver_detail_page.k4')}
                  value={driver.driver_no}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.driver_detail_page.k5')}
                  value={driver.name}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.driver_detail_page.k6')}
                  value={driver.phone ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.driver_detail_page.k7')}
                  value={driver.license_no ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.driver_detail_page.k8')}
                  value={driver.license_type ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.driver_detail_page.k9')}
                  value={driver.status ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.driver_detail_page.id_10')}
                  value={driver.carrier_id ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.driver_detail_page.k11')}
                  value={
                    driver.created_at ? new Date(driver.created_at).toLocaleString('zh-CN') : '-'
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.driver_detail_page.k12')}
                  value={
                    driver.updated_at ? new Date(driver.updated_at).toLocaleString('zh-CN') : '-'
                  }
                />
              </Grid>
            </Grid>
          ),
        },
        {
          id: 'actions',
          title: t('tms.driver_detail_page.k3'),
          content: (
            <FSMActionButtons
              fsm='driver'
              currentStatus={driver.status ?? 'active'}
              onAction={handleAction}
            />
          ),
        },
      ]
    : [];

  return (
    <DetailPageTemplate
      title={driver?.name ?? ''}
      subtitle={driver?.driver_no ?? ''}
      loading={loading}
      error={error ?? undefined}
      backHref={TMS_PATHS.drivers}
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
