/**
 * 运单详情页
 *
 * 包含：基本信息、运输信息、状态机操作
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 TMS API client。
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { shipmentApi } from '@/api/tms';
import type { Shipment } from '@/api/tms/types';
import { StatusBadge } from '@/components/tms/StatusBadge';
import { FSMActionButtons } from '@/components/tms/FSMActionButtons';
import { DetailPageTemplate } from '@/components/templates';
import type { SectionConfig } from '@/components/templates/DetailPageTemplate';
import { TMS_PATHS } from '@/modules/tms/config';
import { useTranslation } from 'react-i18next';

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(['tms', 'common']);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    shipmentApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setShipment(res.data);
        } else {
          setError(res.message || t('tms.shipment_detail_page.k0'));
        }
      })
      .catch(() => setError(t('tms.shipment_detail_page.k1')))
      .finally(() => setLoading(false));
  }, [id, t]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  const headerContent = shipment ? (
    <Box sx={{ mt: 2 }}>
      <StatusBadge
        fsm='shipment'
        status={shipment.status ?? 'draft'}
      />
    </Box>
  ) : null;

  const subtitle = shipment ? `${shipment.origin ?? '-'} → ${shipment.destination ?? '-'}` : '';

  const sections: SectionConfig[] = shipment
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
                  label={t('tms.shipment_detail_page.k4')}
                  value={shipment.shipment_no}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.shipment_detail_page.k5')}
                  value={shipment.status ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.shipment_detail_page.k6')}
                  value={shipment.origin ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.shipment_detail_page.k7')}
                  value={shipment.destination ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.shipment_detail_page.k8')}
                  value={shipment.freight_amount != null ? `¥${shipment.freight_amount}` : '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.shipment_detail_page.id_9')}
                  value={shipment.carrier_id ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.shipment_detail_page.id_10')}
                  value={shipment.vehicle_id ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.shipment_detail_page.id_11')}
                  value={shipment.driver_id ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.shipment_detail_page.id_12')}
                  value={shipment.route_id ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.shipment_detail_page.id_13')}
                  value={shipment.order_id ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.shipment_detail_page.k14')}
                  value={
                    shipment.planned_departure
                      ? new Date(shipment.planned_departure).toLocaleString('zh-CN')
                      : '-'
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.shipment_detail_page.k15')}
                  value={
                    shipment.planned_arrival
                      ? new Date(shipment.planned_arrival).toLocaleString('zh-CN')
                      : '-'
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.shipment_detail_page.k16')}
                  value={
                    shipment.actual_departure
                      ? new Date(shipment.actual_departure).toLocaleString('zh-CN')
                      : '-'
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.shipment_detail_page.k17')}
                  value={
                    shipment.actual_arrival
                      ? new Date(shipment.actual_arrival).toLocaleString('zh-CN')
                      : '-'
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.shipment_detail_page.k18')}
                  value={shipment.notes ?? '-'}
                />
              </Grid>
            </Grid>
          ),
        },
        {
          id: 'actions',
          title: t('tms.shipment_detail_page.k3'),
          content: (
            <FSMActionButtons
              fsm='shipment'
              currentStatus={shipment.status ?? 'draft'}
              onAction={handleAction}
            />
          ),
        },
      ]
    : [];

  return (
    <DetailPageTemplate
      title={shipment?.shipment_no ?? ''}
      subtitle={subtitle}
      loading={loading}
      error={error ?? undefined}
      backHref={TMS_PATHS.shipments}
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
