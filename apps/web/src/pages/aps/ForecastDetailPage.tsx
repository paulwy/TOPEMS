/**
 * 需求预测详情页
 *
 * 展示需求预测详细信息，包含 StatusBadge 和 FSMActionButtons。
 * 使用 APS API client 获取数据。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Grid, Typography, Alert, Button } from '@mui/material';
import { forecastApi } from '@/api/aps';
import type { DemandForecast } from '@/api/aps/types';
import { StatusBadge } from '@/components/aps/StatusBadge';
import { FSMActionButtons } from '@/components/aps/FSMActionButtons';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { DetailPageTemplate } from '@/components/templates';
import { type SectionConfig } from '@/components/templates/DetailPageTemplate';

export default function ForecastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('aps');
  const navigate = useNavigate();
  const [forecast, setForecast] = useState<DemandForecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    forecastApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setForecast(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, _requiresApproval: boolean) => {
    if (!id || !forecast) return;
    if (targetStatus === 'calculated') {
      forecastApi.calculate(id).catch(() => {});
    } else if (targetStatus === 'validated') {
      forecastApi.validate(id).catch(() => {});
    }
    // adopted/superseded/cancelled would call additional approval APIs
    // which are not yet defined for forecast in the backend
  };

  if (!forecast && !loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity='info'
          action={
            <Button
              color='inherit'
              size='small'
              onClick={() => navigate('/aps/forecasts')}
            >
              {i18n.t('pages.forecast_detail_page.k1')}
            </Button>
          }
        >
          {t('aps.forecast_detail_page.k0')}
        </Alert>
      </Box>
    );
  }

  const sections: SectionConfig[] = forecast
    ? [
        {
          id: 'basic',
          title: t('aps.forecast_detail_page.k2'),
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
                  {t('aps.forecast_detail_page.k3')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{forecast.forecast_no}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.forecast_detail_page.k4')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{forecast.product_name ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.forecast_detail_page.k5')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{forecast.forecast_period ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.forecast_detail_page.k6')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{forecast.forecast_date ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.forecast_detail_page.k7')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {forecast.forecast_quantity?.toLocaleString() ?? '-'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.forecast_detail_page.k8')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {forecast.actual_quantity?.toLocaleString() ?? '-'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.forecast_detail_page.k9')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {forecast.accuracy_rate != null ? `${forecast.accuracy_rate}%` : '-'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.forecast_detail_page.k10')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{forecast.method ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.forecast_detail_page.k11')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {forecast.confidence_level != null ? `${forecast.confidence_level}%` : '-'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.forecast_detail_page.k12')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{forecast.notes ?? '-'}</Typography>
              </Grid>
            </Grid>
          ),
        },
      ]
    : [];

  return (
    <DetailPageTemplate
      title={forecast?.forecast_no ?? '-'}
      subtitle={forecast?.product_name ?? '-'}
      backHref='/aps/forecasts'
      loading={loading}
      headerContent={
        forecast && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <StatusBadge
              fsm='forecast'
              status={forecast.status ?? 'draft'}
            />
            <FSMActionButtons
              fsm='forecast'
              currentStatus={forecast.status ?? 'draft'}
              onAction={handleAction}
            />
          </Box>
        )
      }
      sections={sections}
    />
  );
}
