/**
 * 车辆详情页
 *
 * 包含：基本信息、状态机操作
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 TMS API client。
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { vehicleApi } from '@/api/tms';
import type { Vehicle } from '@/api/tms/types';
import { StatusBadge } from '@/components/tms/StatusBadge';
import { FSMActionButtons } from '@/components/tms/FSMActionButtons';
import { DetailPageTemplate } from '@/components/templates';
import type { SectionConfig } from '@/components/templates/DetailPageTemplate';
import { TMS_PATHS } from '@/modules/tms/config';
import { useTranslation } from 'react-i18next';

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(['tms', 'common']);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    vehicleApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setVehicle(res.data);
        } else {
          setError(res.message || t('tms.vehicle_detail_page.k0'));
        }
      })
      .catch(() => setError(t('tms.vehicle_detail_page.k1')))
      .finally(() => setLoading(false));
  }, [id, t]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  const headerContent = vehicle ? (
    <Box sx={{ mt: 2 }}>
      <StatusBadge
        fsm='vehicle'
        status={vehicle.status ?? 'active'}
      />
    </Box>
  ) : null;

  const sections: SectionConfig[] = vehicle
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
                  label={t('tms.vehicle_detail_page.k4')}
                  value={vehicle.vehicle_no}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.vehicle_detail_page.k5')}
                  value={vehicle.plate_number ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.vehicle_detail_page.k6')}
                  value={vehicle.vehicle_type ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.vehicle_detail_page.k7')}
                  value={vehicle.capacity != null ? `${vehicle.capacity}` : '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.vehicle_detail_page.k8')}
                  value={vehicle.status ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.vehicle_detail_page.id_9')}
                  value={vehicle.carrier_id ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.vehicle_detail_page.k10')}
                  value={vehicle.notes ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.vehicle_detail_page.k11')}
                  value={
                    vehicle.created_at ? new Date(vehicle.created_at).toLocaleString('zh-CN') : '-'
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.vehicle_detail_page.k12')}
                  value={
                    vehicle.updated_at ? new Date(vehicle.updated_at).toLocaleString('zh-CN') : '-'
                  }
                />
              </Grid>
            </Grid>
          ),
        },
        {
          id: 'actions',
          title: t('tms.vehicle_detail_page.k3'),
          content: (
            <FSMActionButtons
              fsm='vehicle'
              currentStatus={vehicle.status ?? 'active'}
              onAction={handleAction}
            />
          ),
        },
      ]
    : [];

  return (
    <DetailPageTemplate
      title={vehicle?.vehicle_no ?? ''}
      subtitle={vehicle?.plate_number ?? ''}
      loading={loading}
      error={error ?? undefined}
      backHref={TMS_PATHS.vehicles}
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
