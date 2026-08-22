/**
 * 排程详情页
 *
 * 展示排程详细信息，包含 StatusBadge 和 FSMActionButtons。
 * 使用 APS API client 获取数据。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Grid, Typography, Alert, Button } from '@mui/material';
import { scheduleApi } from '@/api/aps';
import type { Schedule } from '@/api/aps/types';
import { StatusBadge } from '@/components/aps/StatusBadge';
import { FSMActionButtons } from '@/components/aps/FSMActionButtons';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { DetailPageTemplate } from '@/components/templates';
import { type SectionConfig } from '@/components/templates/DetailPageTemplate';

export default function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('aps');
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    scheduleApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setSchedule(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    if (!id || !schedule) return;
    if (requiresApproval && targetStatus === 'released') {
      scheduleApi.release(id, 'system').catch(() => {});
    } else if (targetStatus === 'pending') {
      scheduleApi.hold(id, 'system').catch(() => {});
    }
  };

  if (!schedule && !loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity='info'
          action={
            <Button
              color='inherit'
              size='small'
              onClick={() => navigate('/aps/schedules')}
            >
              {i18n.t('pages.schedule_detail_page.k1')}
            </Button>
          }
        >
          {t('aps.schedule_detail_page.k0')}
        </Alert>
      </Box>
    );
  }

  const sections: SectionConfig[] = schedule
    ? [
        {
          id: 'basic',
          title: t('aps.schedule_detail_page.k2'),
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
                  {t('aps.schedule_detail_page.k3')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{schedule.schedule_no}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.schedule_detail_page.k4')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{schedule.product_name ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.schedule_detail_page.k5')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{schedule.work_center_name ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.schedule_detail_page.k6')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{schedule.quantity ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.schedule_detail_page.k7')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{schedule.priority ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.schedule_detail_page.k8')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{schedule.planned_start ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.schedule_detail_page.k9')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{schedule.planned_end ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.schedule_detail_page.k10')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{schedule.actual_start ?? '-'}</Typography>
              </Grid>
            </Grid>
          ),
        },
      ]
    : [];

  return (
    <DetailPageTemplate
      title={schedule?.schedule_no ?? '-'}
      subtitle={schedule?.product_name ?? '-'}
      backHref='/aps/schedules'
      loading={loading}
      headerContent={
        schedule && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <StatusBadge
              fsm='schedule'
              status={schedule.status ?? 'pending'}
            />
            <FSMActionButtons
              fsm='schedule'
              currentStatus={schedule.status ?? 'pending'}
              onAction={handleAction}
            />
          </Box>
        )
      }
      sections={sections}
    />
  );
}
