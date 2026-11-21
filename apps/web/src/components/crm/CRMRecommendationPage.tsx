import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  Grid,
  Paper,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  Lightbulb,
  TrendingUp,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Target,
  Star,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef } from '@/components/templates/list/types';
import { recommendationSchema } from '@/schemas/crm';
import { crmApi, crmAnalyticsApi } from '@/api/crm';
import type { RecommendationResult, RecommendationRequest } from '@/api/crm';
import { useQuery } from '@tanstack/react-query';

// ============ 辅助函数 ============

const getRecommendationTypeIcon = (type: string): React.ReactElement => {
  const icons: Record<string, React.ReactElement> = {
    product: <Package size={16} />,
    opportunity: <Target size={16} />,
    service: <Users size={16} />,
    'cross-sell': <ShoppingCart size={16} />,
    upsell: <TrendingUp size={16} />,
    content: <FileText size={16} />,
    general: <Lightbulb size={16} />,
  };
  return icons[type] || <Lightbulb size={16} />;
};

const getConfidenceColor = (confidence: number): 'success' | 'primary' | 'warning' | 'error' => {
  if (confidence >= 0.9) return 'success';
  if (confidence >= 0.7) return 'primary';
  if (confidence >= 0.5) return 'warning';
  return 'error';
};

// ============ 组件 ============

const CRMRecommendationPage: React.FC = () => {
  const { t } = useTranslation();

  // 真实聚合：GET /api/crm/analytics/recommendation → { by_type:[{type,count,avg_confidence}], recent:[{customer_name,type,confidence}] }
  // 后端无逐卡片 title/reason/expectedValue：上方聚合区按 by_type 概览 + recent 列表诚实展示。
  const recAnalyticsQuery = useQuery({
    queryKey: ['crm-analytics-recommendation'],
    queryFn: () => crmAnalyticsApi.getRecommendation(),
    staleTime: 5 * 60 * 1000,
  });
  const byType = recAnalyticsQuery.data?.data?.by_type ?? [];
  const recent = recAnalyticsQuery.data?.data?.recent ?? [];

  const getRecommendationTypeLabel = useCallback(
    (type: string) => {
      const labels: Record<string, string> = {
        product: t('crm.recommendation.type_product'),
        opportunity: t('crm.recommendation.type_opportunity'),
        service: t('crm.recommendation.type_service'),
        'cross-sell': t('crm.recommendation.type_cross_sell'),
        upsell: t('crm.recommendation.type_upsell'),
        content: t('crm.recommendation.type_content'),
        general: t('crm.recommendation.type_general'),
      };
      return labels[type] || type;
    },
    [t]
  );

  // ============ API 适配器 ============

  const apiAdapter: CrudApiAdapter<RecommendationResult> = {
    list: async (params) => {
      const res = await crmApi.customerRecommendation.list({
        page: params?.page,
        pageSize: params?.pageSize,
      });
      if (res.success && res.data) {
        return { data: res.data.items || [], total: res.data.total || 0 };
      }
      return { data: [], total: 0 };
    },
    create: async (data) => {
      const res = await crmApi.customerRecommendation.create(
        data as unknown as RecommendationRequest
      );
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.message || t('crm.recommendation.error_create'));
    },
    update: async () => {
      throw new Error(t('crm.recommendation.error_edit_not_supported'));
    },
    delete: async () => {
      throw new Error(t('crm.recommendation.error_delete_not_supported'));
    },
  };

  // ============ 列定义 ============

  const columns: ColumnDef<RecommendationResult>[] = [
    {
      id: 'customer_name',
      label: t('crm.recommendation.col_customer_name'),
      render: (row) => (
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {row.customer_name}
        </Typography>
      ),
    },
    {
      id: 'recommendation_type',
      label: t('crm.recommendation.col_type'),
      render: (row) => (
        <Chip
          icon={getRecommendationTypeIcon(row.recommendation_type)}
          label={getRecommendationTypeLabel(row.recommendation_type)}
          size='small'
          variant='outlined'
        />
      ),
    },
    {
      id: 'recommendations_count',
      label: t('crm.recommendation.col_count'),
      render: (row) => (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {row.recommendations.length} {t('crm.recommendation.count_unit')}
        </Typography>
      ),
    },
    {
      id: 'confidence',
      label: t('crm.recommendation.col_confidence'),
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant='determinate'
            value={row.confidence * 100}
            sx={{ width: 100, height: 6, borderRadius: 3 }}
            color={getConfidenceColor(row.confidence)}
          />
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {(row.confidence * 100).toFixed(0)}%
          </Typography>
        </Box>
      ),
    },
    {
      id: 'model',
      label: t('crm.recommendation.col_model'),
      render: (row) => (
        <Chip
          icon={<Sparkles size={14} />}
          label={row.model}
          size='small'
          color='primary'
          variant='outlined'
        />
      ),
    },
    {
      id: 'created_at',
      label: t('crm.recommendation.col_created_at'),
      render: (row) => (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {new Date(row.created_at).toLocaleString('zh-CN')}
        </Typography>
      ),
    },
  ];

  const detailContent = React.useCallback(
    (row: Record<string, unknown>) => {
      const recommendation = row as unknown as RecommendationResult;
      return (
        <Box sx={{ pt: 2 }}>
          <Grid
            container
            spacing={2}
          >
            <Grid size={12}>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography
                  variant='subtitle2'
                  gutterBottom
                >
                  {t('crm.recommendation.section_basic')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  <Typography variant='body2'>
                    {t('crm.recommendation.text_customer_label', {
                      name: recommendation.customer_name,
                    })}
                  </Typography>
                  <Typography variant='body2'>
                    {t('crm.recommendation.text_type_label', {
                      type: getRecommendationTypeLabel(recommendation.recommendation_type),
                    })}
                  </Typography>
                  <Typography variant='body2'>
                    {t('crm.recommendation.text_confidence_label', {
                      pct: (recommendation.confidence * 100).toFixed(0),
                    })}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid size={12}>
              <Typography
                variant='subtitle2'
                gutterBottom
              >
                {t('crm.recommendation.text_recommendations_title', {
                  count: recommendation.recommendations.length,
                })}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recommendation.recommendations.map((item, index) => (
                  <Card
                    key={item.id || index}
                    variant='outlined'
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <Box>
                          <Typography
                            variant='subtitle1'
                            sx={{ fontWeight: 'medium' }}
                          >
                            {item.name}
                          </Typography>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                            sx={{ mt: 1 }}
                          >
                            {item.reason}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Chip
                              label={t('crm.recommendation.text_item_type', {
                                type: item.item_type,
                              })}
                              size='small'
                              variant='outlined'
                            />
                            <Chip
                              label={t('crm.recommendation.text_item_score', { score: item.score })}
                              size='small'
                              color='primary'
                              icon={<Star size={14} />}
                            />
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography
                            variant='h6'
                            color={getConfidenceColor(item.confidence)}
                          >
                            {(item.confidence * 100).toFixed(0)}%
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {t('crm.recommendation.confidence_label')}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Box>
      );
    },
    [t, getRecommendationTypeLabel]
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {byType.length > 0 && (
        <Grid
          container
          spacing={3}
        >
          {byType.map((row) => (
            <Grid
              size={{ xs: 12, sm: 6, lg: 3 }}
              key={row.type}
            >
              <Paper
                variant='outlined'
                sx={{ p: 2.5, height: '100%' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  {getRecommendationTypeIcon(row.type)}
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 700 }}
                  >
                    {getRecommendationTypeLabel(row.type)}
                  </Typography>
                </Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {row.count}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {t('crm.recommendation.col_confidence')}
                </Typography>
                <LinearProgress
                  variant='determinate'
                  value={Math.round(row.avg_confidence * 100)}
                  sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {recent.length > 0 && (
        <Paper
          variant='outlined'
          sx={{ p: 2.5 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1.5 }}
          >
            {t('crm.recommendation.title_recent') || t('crm.recommendation.title')}
          </Typography>
          <Stack spacing={1}>
            {recent.map((row, idx) => (
              <Box
                key={`${row.customer_name}-${row.type}-${idx}`}
                sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
              >
                <Typography
                  variant='body2'
                  sx={{ flex: 1, fontWeight: 500 }}
                >
                  {row.customer_name}
                </Typography>
                <Chip
                  icon={getRecommendationTypeIcon(row.type)}
                  label={getRecommendationTypeLabel(row.type)}
                  size='small'
                  variant='outlined'
                />
                <Box sx={{ width: 120 }}>
                  <LinearProgress
                    variant='determinate'
                    value={Math.round(row.confidence * 100)}
                    color={getConfidenceColor(row.confidence)}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 700, width: 44, textAlign: 'right' }}
                >
                  {Math.round(row.confidence * 100)}%
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      <CrudPage
        schema={recommendationSchema}
        apiAdapter={apiAdapter}
        customColumns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
        detailContent={detailContent}
        idField='customer_id'
        breadcrumbs={[
          { label: t('crm.common.home'), href: '/dashboard' },
          { label: t('crm.recommendation.breadcrumb_manage'), href: '/crm' },
          { label: t('crm.recommendation.title') },
        ]}
      />
    </Box>
  );
};

export default CRMRecommendationPage;
