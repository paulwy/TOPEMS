/**
 * 产能详情页
 *
 * 展示产能详细信息，包含 StatusBadge 和 FSMActionButtons。
 * 使用 APS API client 获取数据。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Grid, Typography, Alert, Button } from '@mui/material';
import { capacityApi } from '@/api/aps';
import type { Capacity } from '@/api/aps/types';
import { StatusBadge } from '@/components/aps/StatusBadge';
import { FSMActionButtons } from '@/components/aps/FSMActionButtons';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { DetailPageTemplate } from '@/components/templates';
import { type SectionConfig } from '@/components/templates/DetailPageTemplate';

export default function CapacityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('aps');
  const navigate = useNavigate();
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    capacityApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setCapacity(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    if (!id || !capacity) return;
    if (requiresApproval && targetStatus === 'allocated') {
      capacityApi.allocate(id, 'system').catch(() => {});
    } else if (targetStatus === 'released') {
      capacityApi.release(id, 'system').catch(() => {});
    }
  };

  if (!capacity && !loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity='info'
          action={
            <Button
              color='inherit'
              size='small'
              onClick={() => navigate('/aps/capacities')}
            >
              {i18n.t('pages.capacity_detail_page.k1')}
            </Button>
          }
        >
          {t('aps.capacity_detail_page.k0')}
        </Alert>
      </Box>
    );
  }

  const sections: SectionConfig[] = capacity
    ? [
        {
          id: 'basic',
          title: t('aps.capacity_detail_page.k2'),
          content: (
            <Grid
              container
              spacing={2}
            >
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.capacity_detail_page.k3')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{capacity.work_center_name ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.capacity_detail_page.k4')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{capacity.capacity_date ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.capacity_detail_page.k5')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {capacity.available_hours ?? '-'} h
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.capacity_detail_page.k6')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{capacity.used_hours ?? '-'} h</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.capacity_detail_page.k7')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {capacity.utilization_rate != null ? `${capacity.utilization_rate}%` : '-'}
                </Typography>
              </Grid>
            </Grid>
          ),
        },
      ]
    : [];

  return (
    <DetailPageTemplate
      title={capacity?.work_center_name ?? capacity?.work_center_id ?? '-'}
      subtitle={`${t('aps.capacity_detail_page.k4')}: ${capacity?.capacity_date ?? '-'}`}
      backHref='/aps/capacities'
      loading={loading}
      headerContent={
        capacity && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <StatusBadge
              fsm='capacity'
              status={capacity.status ?? 'available'}
            />
            <FSMActionButtons
              fsm='capacity'
              currentStatus={capacity.status ?? 'available'}
              onAction={handleAction}
            />
          </Box>
        )
      }
      sections={sections}
    />
  );
}
