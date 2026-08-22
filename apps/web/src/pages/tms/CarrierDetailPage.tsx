/**
 * 承运商详情页
 *
 * 包含：基本信息、状态机操作
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 TMS API client。
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { carrierApi } from '@/api/tms';
import type { Carrier } from '@/api/tms/types';
import { StatusBadge } from '@/components/tms/StatusBadge';
import { FSMActionButtons } from '@/components/tms/FSMActionButtons';
import { DetailPageTemplate } from '@/components/templates';
import type { SectionConfig } from '@/components/templates/DetailPageTemplate';
import { TMS_PATHS } from '@/modules/tms/config';
import { useTranslation } from 'react-i18next';

export default function CarrierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(['tms', 'common']);
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    carrierApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setCarrier(res.data);
        } else {
          setError(res.message || t('tms.carrier_detail_page.k0'));
        }
      })
      .catch(() => setError(t('tms.carrier_detail_page.k1')))
      .finally(() => setLoading(false));
  }, [id, t]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  const headerContent = carrier ? (
    <Box sx={{ mt: 2 }}>
      <StatusBadge
        fsm='carrier'
        status={carrier.status ?? 'pending_review'}
      />
    </Box>
  ) : null;

  const sections: SectionConfig[] = carrier
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
                  label={t('tms.carrier_detail_page.k4')}
                  value={carrier.carrier_no}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.carrier_detail_page.k5')}
                  value={carrier.name}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.carrier_detail_page.k6')}
                  value={carrier.contact_person ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.carrier_detail_page.k7')}
                  value={carrier.contact_phone ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.carrier_detail_page.k8')}
                  value={carrier.status ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.carrier_detail_page.k9')}
                  value={carrier.service_area ?? '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.carrier_detail_page.k10')}
                  value={
                    carrier.created_at ? new Date(carrier.created_at).toLocaleString('zh-CN') : '-'
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField
                  label={t('tms.carrier_detail_page.k11')}
                  value={
                    carrier.updated_at ? new Date(carrier.updated_at).toLocaleString('zh-CN') : '-'
                  }
                />
              </Grid>
            </Grid>
          ),
        },
        {
          id: 'actions',
          title: t('tms.carrier_detail_page.k3'),
          content: (
            <FSMActionButtons
              fsm='carrier'
              currentStatus={carrier.status ?? 'pending_review'}
              onAction={handleAction}
            />
          ),
        },
      ]
    : [];

  return (
    <DetailPageTemplate
      title={carrier?.name ?? ''}
      subtitle={carrier?.carrier_no ?? ''}
      loading={loading}
      error={error ?? undefined}
      backHref={TMS_PATHS.carriers}
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
