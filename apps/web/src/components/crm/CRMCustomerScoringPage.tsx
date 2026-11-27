import { designTokens } from '@topems/tokens';
import React from 'react';
import { Box, Chip, LinearProgress, Paper, Typography, Button } from '@mui/material';
import { Star, TrendingUp, TrendingDown, Minus, Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef } from '@/components/templates/list/types';
import { customerScoringSchema } from '@/schemas/crm';
import { crmApi, crmAnalyticsApi } from '@/api/crm';
import type { CustomerScore, ScoreFactor } from '@/api/crm';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { CRM_PATHS } from '@/module-configs/crm/config';

// ============ 辅助函数 ============

const getGradeBadge = (scoreLevel: string) => {
  const gradeConfig: Record<string, { label: string; color: string }> = {
    A: { label: 'A', color: 'success.700' },
    B: { label: 'B', color: 'primary.main' },
    C: { label: 'C', color: 'warning.700' },
    D: { label: 'D', color: 'error.main' },
  };
  const config = gradeConfig[scoreLevel] || {
    label: scoreLevel,
    color: 'text.secondary',
  };
  return (
    <Chip
      size='small'
      sx={{
        bgcolor: config.color,
        color: 'common.white',
        fontWeight: 'bold',
        fontSize: designTokens.typography.fontSize.scale['1.125rem'],
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
      return <TrendingUp sx={{ width: 16, height: 16, color: 'success.700' }} />;
    case 'down':
      return <TrendingDown sx={{ width: 16, height: 16, color: 'error.main' }} />;
    default:
      return <Minus sx={{ width: 16, height: 16, color: 'text.secondary' }} />;
  }
};

// ============ 统计卡片 ============

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

const TEXT_OF: Record<string, string> = {
  'success.main': 'var(--success-text)',
  'primary.main': 'var(--accent-primary-text)',
  'secondary.main': 'var(--accent-secondary-text)',
  'warning.main': 'var(--warning-text)',
  'error.main': 'var(--error-text)',
  'info.main': 'var(--info-text)',
};
const textOf = (c: string) => TEXT_OF[c] ?? 'text.secondary';

const StatCard: React.FC<StatCardProps> = ({ label, value, color, bgColor: _bgColor }) => (
  <Box
    sx={{
      // 浅色实心底 + 同色系文字在暗色里只有 1.1:1，统一中性底 + 语义左边框
      bgcolor: 'var(--surface-2)',
      borderLeft: '3px solid',
      borderColor: color,
      borderRadius: 3,
      p: 3,
    }}
  >
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
            color: textOf(color),
            fontWeight: 500,
            fontSize: designTokens.typography.fontSize.scale['0.875rem'],
          }}
        >
          {label}
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 'bold', color: textOf(color), mt: 0.5 }}
        >
          {value}
        </Typography>
      </Box>
      <Box
        sx={{
          width: 48,
          height: 48,
          bgcolor: 'var(--surface-3)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Star sx={{ width: 24, height: 24, color: textOf(color) }} />
      </Box>
    </Box>
  </Box>
);

// ============ 组件 ============

const CRMCustomerScoringPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  // 真实聚合：GET /api/crm/analytics/scoring → { distribution:[{name,value}], rfm:[{name,value}] }
  // distribution.name 为评分等级（A/B/C/D/unknown）；rfm.name 为 RFM 分群名（后端不保证 9 固定键）。
  const scoringAnalyticsQuery = useQuery({
    queryKey: ['crm-analytics-scoring'],
    queryFn: () => crmAnalyticsApi.getScoring(),
    staleTime: 5 * 60 * 1000,
  });
  const rfmRows = scoringAnalyticsQuery.data?.data?.rfm ?? [];

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
      id: 'score_level',
      label: t('crm.customerScoring.col_level'),
      width: 100,
      align: 'center',
      render: (row) => getGradeBadge(row.score_level),
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
      A: scores.filter((s) => s.score_level === 'A').length,
      B: scores.filter((s) => s.score_level === 'B').length,
      C: scores.filter((s) => s.score_level === 'C').length,
      D: scores.filter((s) => s.score_level === 'D').length,
    };
    const gradeDistribution = fromList;

    // 后端 rfm 形状为 [{name: segment, value: count}]，不保证固定 9 键：按返回行动态渲染。
    const rfmPalette: Array<{ color: string; bgColor: string }> = [
      { color: 'success.700', bgColor: 'success.light' },
      { color: 'primary.main', bgColor: 'primary.light' },
      { color: 'warning.700', bgColor: 'warning.light' },
    ];

    return (
      <Box sx={{ mb: 2 }}>
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
            color='success'
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
            color='warning'
            bgColor='warning.light'
          />
          <StatCard
            label={t('crm.customerScoring.grade_d')}
            value={gradeDistribution.D}
            color='error.main'
            bgColor='error.light'
          />
        </Box>
        {rfmRows.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 1.5,
              mb: 3,
            }}
          >
            {rfmRows.map((row, i) => {
              const palette = rfmPalette[i % rfmPalette.length];
              return (
                <StatCard
                  key={row.name}
                  label={row.name}
                  value={row.value}
                  color={palette.color}
                  bgColor={palette.bgColor}
                />
              );
            })}
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
            {getGradeBadge(score.score_level)}
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
