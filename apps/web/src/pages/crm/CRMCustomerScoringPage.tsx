import React from 'react';
import { Box, Chip, LinearProgress, Paper, Typography, Button } from '@mui/material';
import { Star, TrendingUp, TrendingDown, Minus, Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef } from '@/components/templates/list/types';
import { customerScoringSchema } from '@/schemas/crm';
import { crmApi, useCrmMock } from '@/api/crm';
import type { CustomerScore, ScoreFactor, ScoringData, Period } from '@/api/crm';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { CRM_PATHS } from '@/modules/crm/config';
import i18n from '@/i18n';

// ============ 辅助函数 ============

const getGradeBadge = (scoreLevel: string) => {
  const gradeConfig: Record<string, { label: string; color: string }> = {
    A: { label: 'A', color: 'success.main' },
    B: { label: 'B', color: 'primary.main' },
    C: { label: 'C', color: 'warning.main' },
    D: { label: 'D', color: 'error.main' },
  };
  const config = gradeConfig[scoreLevel] || {
    label: scoreLevel,
    color: 'grey.500',
  };
  return (
    <Chip
      size='small'
      sx={{
        bgcolor: config.color,
        color: 'common.white',
        fontWeight: 'bold',
        fontSize: '1.125rem',
        px: 1.5,
      }}
      label={config.label}
    />
  );
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'success.main';
  if (score >= 60) return 'primary.main';
  if (score >= 40) return 'warning.main';
  return 'error.main';
};

const getScoreTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up':
      return <TrendingUp sx={{ width: 16, height: 16, color: 'success.main' }} />;
    case 'down':
      return <TrendingDown sx={{ width: 16, height: 16, color: 'error.main' }} />;
    default:
      return <Minus sx={{ width: 16, height: 16, color: 'grey.500' }} />;
  }
};

// ============ 统计卡片 ============

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color, bgColor }) => (
  <Box sx={{ bgcolor: bgColor, borderRadius: 3, p: 3 }}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box>
        <Typography
          variant='body2'
          sx={{
            color,
            fontWeight: 500,
            fontSize: '0.875rem',
          }}
        >
          {label}
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 'bold', color, mt: 0.5 }}
        >
          {value}
        </Typography>
      </Box>
      <Box
        sx={{
          width: 48,
          height: 48,
          bgcolor: color,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Star sx={{ width: 24, height: 24, color: 'common.white' }} />
      </Box>
    </Box>
  </Box>
);

// ============ 组件 ============

const CRMCustomerScoringPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const [period] = React.useState<Period>('MTD');
  const { data: mockScoring, mockEnabled } = useCrmMock<ScoringData>({ period });

  // ============ API 适配器 ============

  const apiAdapter: CrudApiAdapter<CustomerScore> = {
    list: async (params) => {
      const res = await crmApi.customerScoring.list({
        page: params?.page,
        pageSize: params?.pageSize,
      });
      if (res.success && res.data) {
        return { data: res.data.items || [], total: res.data.total || 0 };
      }
      return { data: [], total: 0 };
    },
    create: async () => {
      throw new Error(t('crm.customerScoring.error_create_not_supported'));
    },
    update: async () => {
      throw new Error(t('crm.customerScoring.error_edit_not_supported'));
    },
    delete: async () => {
      throw new Error(t('crm.customerScoring.error_delete_not_supported'));
    },
  };

  // ============ 列定义 ============

  const columns: ColumnDef<CustomerScore>[] = [
    {
      id: 'customer_name',
      label: t('crm.customerScoring.col_customer_name'),
      width: 200,
      sortable: true,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'grey.100',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant='body1'
              sx={{ fontWeight: 'bold' }}
            >
              {row.customer_name.charAt(0)}
            </Typography>
          </Box>
          <Typography sx={{ fontWeight: 500 }}>{row.customer_name}</Typography>
        </Box>
      ),
    },
    {
      id: 'score',
      label: t('crm.customerScoring.col_score'),
      width: 120,
      align: 'center',
      sortable: true,
      render: (row) => (
        <Typography
          variant='h6'
          sx={{
            fontWeight: 'bold',
            color: getScoreColor(row.score),
          }}
        >
          {row.score}
        </Typography>
      ),
    },
    {
      id: 'scorelevel',
      label: t('crm.customerScoring.col_level'),
      width: 100,
      align: 'center',
      render: (row) => getGradeBadge(row.scorelevel),
    },
    {
      id: 'trend',
      label: t('crm.customerScoring.col_trend'),
      width: 80,
      align: 'center',
      render: (row) => getScoreTrendIcon(row.trend),
    },
    {
      id: 'scoring_date',
      label: t('crm.customerScoring.col_scoring_date'),
      width: 150,
      sortable: true,
      render: (row) => new Date(row.scoring_date).toLocaleDateString('zh-CN'),
    },
    {
      id: 'last_score',
      label: t('crm.customerScoring.col_last_score'),
      width: 120,
      align: 'center',
      render: (row) => (
        <Typography
          variant='body2'
          sx={{
            color:
              row.last_score !== undefined
                ? row.score > row.last_score
                  ? 'success.main'
                  : row.score < row.last_score
                    ? 'error.main'
                    : 'text.secondary'
                : 'text.secondary',
          }}
        >
          {row.last_score !== undefined ? row.last_score : '-'}
        </Typography>
      ),
    },
  ];

  const calculateBatchMutation = useMutation({
    mutationFn: async () => {
      const customerResponse = await crmApi.customers.list({
        page: 1,
        pageSize: 100,
      });
      const customerIds = customerResponse.data?.items?.map((c) => c.id) || [];
      if (customerIds.length === 0) {
        throw new Error(t('crm.customerScoring.error_no_customer'));
      }
      return crmApi.customerScoring.calculateBatch(customerIds);
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('crm.common.success'),
        message: t('crm.customerScoring.msg_batch_success'),
      });
      queryClient.invalidateQueries({
        queryKey: [customerScoringSchema.entity],
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('crm.customerScoring.log_batch_fail'), error);
      addNotification({
        type: 'error',
        title: t('crm.customerScoring.msg_calc_fail'),
        message: error instanceof Error ? error.message : t('crm.customerScoring.msg_batch_fail'),
      });
    },
  });

  const headerContent = (rows: unknown[], _total: number) => {
    const scores = rows as CustomerScore[];
    const fromList = {
      A: scores.filter((s) => s.scorelevel === 'A').length,
      B: scores.filter((s) => s.scorelevel === 'B').length,
      C: scores.filter((s) => s.scorelevel === 'C').length,
      D: scores.filter((s) => s.scorelevel === 'D').length,
    };
    const gradeDistribution = mockEnabled ? mockScoring.distribution : fromList;

    const rfm = mockScoring.rfm;
    const rfmLabels: Array<{
      key: keyof typeof rfm;
      label: string;
      color: string;
      bgColor: string;
    }> = [
      {
        key: 'recencyHigh',
        label:
          t('crm.customerScoring.rfm_recency_high') || i18n.t('pages.crm_customer_scoring_page.k0'),
        color: 'success.main',
        bgColor: 'success.light',
      },
      {
        key: 'recencyMedium',
        label:
          t('crm.customerScoring.rfm_recency_med') || i18n.t('pages.crm_customer_scoring_page.k1'),
        color: 'primary.main',
        bgColor: 'primary.light',
      },
      {
        key: 'recencyLow',
        label:
          t('crm.customerScoring.rfm_recency_low') || i18n.t('pages.crm_customer_scoring_page.k2'),
        color: 'warning.main',
        bgColor: 'warning.light',
      },
      {
        key: 'frequencyHigh',
        label:
          t('crm.customerScoring.rfm_freq_high') || i18n.t('pages.crm_customer_scoring_page.k3'),
        color: 'success.main',
        bgColor: 'success.light',
      },
      {
        key: 'frequencyMedium',
        label:
          t('crm.customerScoring.rfm_freq_med') || i18n.t('pages.crm_customer_scoring_page.k4'),
        color: 'primary.main',
        bgColor: 'primary.light',
      },
      {
        key: 'frequencyLow',
        label:
          t('crm.customerScoring.rfm_freq_low') || i18n.t('pages.crm_customer_scoring_page.k5'),
        color: 'warning.main',
        bgColor: 'warning.light',
      },
      {
        key: 'monetaryHigh',
        label:
          t('crm.customerScoring.rfm_mon_high') || i18n.t('pages.crm_customer_scoring_page.k6'),
        color: 'success.main',
        bgColor: 'success.light',
      },
      {
        key: 'monetaryMedium',
        label: t('crm.customerScoring.rfm_mon_med') || i18n.t('pages.crm_customer_scoring_page.k7'),
        color: 'primary.main',
        bgColor: 'primary.light',
      },
      {
        key: 'monetaryLow',
        label: t('crm.customerScoring.rfm_mon_low') || i18n.t('pages.crm_customer_scoring_page.k8'),
        color: 'warning.main',
        bgColor: 'warning.light',
      },
    ];

    return (
      <Box sx={{ mb: 2 }}>
        {mockEnabled && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Chip
              label={
                t('crm.common.mock_demo_badge') || i18n.t('pages.crm_customer_scoring_page.mock_9')
              }
              color='warning'
              size='small'
              variant='outlined'
              sx={{ fontWeight: 600 }}
            />
          </Box>
        )}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 2,
            mb: 2,
          }}
        >
          <StatCard
            label={t('crm.customerScoring.grade_a')}
            value={gradeDistribution.A}
            color='success.main'
            bgColor='success.light'
          />
          <StatCard
            label={t('crm.customerScoring.grade_b')}
            value={gradeDistribution.B}
            color='primary.main'
            bgColor='primary.light'
          />
          <StatCard
            label={t('crm.customerScoring.grade_c')}
            value={gradeDistribution.C}
            color='warning.main'
            bgColor='warning.light'
          />
          <StatCard
            label={t('crm.customerScoring.grade_d')}
            value={gradeDistribution.D}
            color='error.main'
            bgColor='error.light'
          />
        </Box>
        {mockEnabled && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(3, 1fr)', md: 'repeat(9, 1fr)' },
              gap: 1.5,
              mb: 3,
            }}
          >
            {rfmLabels.map(({ key, label, color, bgColor }) => (
              <StatCard
                key={key}
                label={label}
                value={rfm[key]}
                color={color}
                bgColor={bgColor}
              />
            ))}
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant='contained'
            startIcon={<Calculator sx={{ width: 16, height: 16 }} />}
            onClick={() => calculateBatchMutation.mutate()}
            disabled={calculateBatchMutation.isPending}
          >
            {calculateBatchMutation.isPending
              ? t('crm.customerScoring.btn_calculating')
              : t('crm.customerScoring.btn_batch_calculate')}
          </Button>
        </Box>
      </Box>
    );
  };

  const detailContent = (row: Record<string, unknown>) => {
    const score = row as unknown as CustomerScore;
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 4,
            py: 2,
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant='h3'
              sx={{
                fontWeight: 'bold',
                color: getScoreColor(score.score),
              }}
            >
              {score.score}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              {t('crm.customerScoring.text_comprehensive_score')}
            </Typography>
            {score.last_score !== undefined && (
              <Typography
                variant='caption'
                sx={{
                  color:
                    score.score > score.last_score
                      ? 'success.main'
                      : score.score < score.last_score
                        ? 'error.main'
                        : 'text.secondary',
                  mt: 0.5,
                  display: 'block',
                }}
              >
                {t('crm.customerScoring.text_last_score', { score: score.last_score })}
              </Typography>
            )}
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            {getGradeBadge(score.scorelevel)}
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              {t('crm.customerScoring.text_customer_level')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(score.factors as ScoreFactor[]).map((factor, index) => (
            <Paper
              key={index}
              sx={{ p: 2, bgcolor: 'grey.100' }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500 }}
                >
                  {factor.name}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {t('crm.customerScoring.text_weight', { weight: factor.weight })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant='determinate'
                    value={(factor.score / factor.max_score) * 100}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      bgcolor: 'grey.300',
                    }}
                  />
                </Box>
                <Typography
                  variant='body2'
                  sx={{
                    fontWeight: 500,
                    width: 60,
                    textAlign: 'right',
                  }}
                >
                  {factor.score}/{factor.max_score}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <CrudPage
      schema={customerScoringSchema}
      apiAdapter={apiAdapter}
      customColumns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
      detailContent={detailContent}
      headerContent={headerContent}
      breadcrumbs={[
        { label: t('crm.common.home'), href: '/dashboard' },
        { label: t('crm.customerScoring.breadcrumb_manage'), href: CRM_PATHS.root },
        { label: t('crm.customerScoring.title') },
      ]}
    />
  );
};

export default CRMCustomerScoringPage;
