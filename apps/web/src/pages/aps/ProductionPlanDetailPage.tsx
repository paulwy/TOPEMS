/**
 * 生产计划详情页
 *
 * 展示生产计划详细信息，包含 StatusBadge 和 FSMActionButtons。
 * 使用 APS API client 获取数据。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Grid, Typography, Alert, Button } from '@mui/material';
import { productionPlanApi } from '@/api/aps';
import type { ProductionPlan } from '@/api/aps/types';
import { StatusBadge } from '@/components/aps/StatusBadge';
import { FSMActionButtons } from '@/components/aps/FSMActionButtons';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { DetailPageTemplate } from '@/components/templates';
import { type SectionConfig } from '@/components/templates/DetailPageTemplate';

export default function ProductionPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('aps');
  const navigate = useNavigate();
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productionPlanApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setPlan(res.data);
        }
      })
      .catch(() => {
        // API unavailable, keep null
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    if (!id || !plan) return;
    if (requiresApproval) {
      productionPlanApi.approve(id, 'system').catch(() => {});
    } else if (targetStatus === 'pending_approval') {
      productionPlanApi.submit(id, 'system').catch(() => {});
    } else if (targetStatus === 'draft') {
      productionPlanApi.reject(id, 'system').catch(() => {});
    }
  };

  if (!plan && !loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity='info'
          action={
            <Button
              color='inherit'
              size='small'
              onClick={() => navigate('/aps/production-plans')}
            >
              {i18n.t('pages.production_plan_detail_page.k1')}
            </Button>
          }
        >
          {t('aps.production_plan_detail_page.k0')}
        </Alert>
      </Box>
    );
  }

  const sections: SectionConfig[] = plan
    ? [
        {
          id: 'basic',
          title: t('aps.production_plan_detail_page.k2'),
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
                  {t('aps.production_plan_detail_page.k3')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{plan.plan_no}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.production_plan_detail_page.k4')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{plan.plan_name}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.production_plan_detail_page.k5')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{plan.plan_type ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.production_plan_detail_page.k6')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{plan.product_name ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.production_plan_detail_page.k7')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {plan.target_quantity?.toLocaleString() ?? '-'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.production_plan_detail_page.k8')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{plan.start_date ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.production_plan_detail_page.k9')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{plan.end_date ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.production_plan_detail_page.k10')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{plan.notes ?? '-'}</Typography>
              </Grid>
            </Grid>
          ),
        },
      ]
    : [];

  return (
    <DetailPageTemplate
      title={plan?.plan_no ?? '-'}
      subtitle={plan?.plan_name ?? '-'}
      backHref='/aps/production-plans'
      loading={loading}
      headerContent={
        plan && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <StatusBadge
              fsm='production_plan'
              status={plan.status ?? 'draft'}
            />
            <FSMActionButtons
              fsm='production_plan'
              currentStatus={plan.status ?? 'draft'}
              onAction={handleAction}
            />
          </Box>
        )
      }
      sections={sections}
    />
  );
}
