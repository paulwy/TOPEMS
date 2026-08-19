import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  Grid,
  Paper,
  LinearProgress,
} from '@mui/material';
import i18n from '@/i18n';
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
  MessageSquare,
  ArrowRightLeft,
  BarChart2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef } from '@/components/templates/list/types';
import { recommendationSchema } from '@/schemas/crm';
import {
  type RecommendationResult,
  type RecommendationRequest,
  crmApi,
  useCrmMock,
  type RecommendationData,
  type Period,
} from '@/api/crm';
import { designTokens, semanticTokens } from '@topems/tokens';

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
  const [period] = useState<Period>('MTD');
  const { data: mockRec, mockEnabled } = useCrmMock<RecommendationData>({ period });

  const getRecommendationTypeLabel = (type: string) => {
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
  };

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
                            {t('crm.recommendation.text_confidence')}
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
    [t]
  );

  const typeColumnConfig: Array<{
    key: 'crossSell' | 'upsell' | 'followup';
    label: string;
    sublabel: string;
    icon: React.ReactElement;
    gradient: [string, string];
    data: RecommendationData['crossSell'];
  }> = [
    {
      key: 'crossSell',
      label: t('crm.recommendation.col_cross_sell') || i18n.t('pages.crm_recommendation_page.k0'),
      sublabel:
        t('crm.recommendation.col_cross_sell_sub') || i18n.t('pages.crm_recommendation_page.k1'),
      icon: (
        <ShoppingCart
          size={20}
          color='var(--color-primary-foreground, #ffffff)'
        />
      ),
      gradient: ['colors.primary.dark', 'colors.primary.700'],
      data: mockRec.crossSell,
    },
    {
      key: 'upsell',
      label: t('crm.recommendation.col_upsell') || i18n.t('pages.crm_recommendation_page.k2'),
      sublabel:
        t('crm.recommendation.col_upsell_sub') || i18n.t('pages.crm_recommendation_page.k3'),
      icon: (
        <TrendingUp
          size={20}
          color='var(--color-primary-foreground, #ffffff)'
        />
      ),
      gradient: ['colors.success.dark', designTokens.colors.success[700]],
      data: mockRec.upsell,
    },
    {
      key: 'followup',
      label: t('crm.recommendation.col_followup') || i18n.t('pages.crm_recommendation_page.k4'),
      sublabel:
        t('crm.recommendation.col_followup_sub') || i18n.t('pages.crm_recommendation_page.k5'),
      icon: (
        <MessageSquare
          size={20}
          color='var(--color-primary-foreground, #ffffff)'
        />
      ),
      gradient: [designTokens.colors.warning.dark, designTokens.colors.warning[700]],
      data: mockRec.followup,
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {mockEnabled && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Chip
            label={
              t('crm.common.mock_demo_badge') || i18n.t('pages.crm_recommendation_page.mock_6')
            }
            color='warning'
            size='small'
            variant='outlined'
            sx={{ fontWeight: 600 }}
          />
        </Box>
      )}

      {mockEnabled && (
        <Grid
          container
          spacing={3}
        >
          {typeColumnConfig.map((col) => (
            <Grid
              size={{ xs: 12, lg: 4 }}
              key={col.key}
            >
              <Paper
                variant='outlined'
                sx={{
                  p: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                <Box
                  sx={{
                    p: 2.5,
                    background: `linear-gradient(135deg, ${col.gradient[0]}, ${col.gradient[1]})`,
                    color: 'var(--color-primary-foreground, #ffffff)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: 'glass.topLight',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {col.icon}
                    </Box>
                    <Box>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 700 }}
                      >
                        {col.label}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ opacity: 0.9 }}
                      >
                        {col.sublabel} · {col.data.length}{' '}
                        {i18n.t('pages.crm_recommendation_page.k0')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                  {col.data.map((item, idx) => {
                    const confColor =
                      item.confidence >= 0.9
                        ? 'success.main'
                        : item.confidence >= 0.7
                          ? 'primary.main'
                          : item.confidence >= 0.5
                            ? 'warning.main'
                            : 'error.main';
                    return (
                      <Card
                        key={item.id}
                        variant='outlined'
                        sx={{ flex: 1 }}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 600 }}
                            >
                              {item.customerName}
                            </Typography>
                            <Typography
                              variant='caption'
                              sx={{ color: confColor, fontWeight: 700 }}
                            >
                              {(item.confidence * 100).toFixed(0)}%
                            </Typography>
                          </Box>
                          <Typography
                            variant='subtitle2'
                            sx={{ fontWeight: 600, mb: 0.5 }}
                          >
                            {item.title}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ mb: 1.5, display: 'block' }}
                          >
                            {item.reason}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <LinearProgress
                              variant='determinate'
                              value={item.confidence * 100}
                              color={
                                item.confidence >= 0.9
                                  ? 'success'
                                  : item.confidence >= 0.7
                                    ? 'primary'
                                    : item.confidence >= 0.5
                                      ? 'warning'
                                      : 'error'
                              }
                              sx={{ flex: 1, height: 4, borderRadius: 2, mr: 2 }}
                            />
                            <Typography
                              variant='caption'
                              sx={{ fontWeight: 700, color: 'primary.main' }}
                            >
                              ¥{item.expectedValue.toLocaleString()}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
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
