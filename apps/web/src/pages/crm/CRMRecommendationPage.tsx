import React from 'react';
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
import { crmApi } from '@/api/crm';
import type { RecommendationResult, RecommendationRequest } from '@/api/crm';

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

  return (
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
  );
};

export default CRMRecommendationPage;
