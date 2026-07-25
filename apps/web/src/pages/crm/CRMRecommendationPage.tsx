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

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef } from '@/components/templates/list/types';
import { recommendationSchema } from '@/schemas/crm';
import { crmApi } from '@/api/crm';
import type { RecommendationResult, RecommendationRequest } from '@/api/crm';

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
    throw new Error(res.message || '生成推荐失败');
  },
  update: async () => {
    throw new Error('推荐不支持编辑');
  },
  delete: async () => {
    throw new Error('推荐不支持删除');
  },
};

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

const getRecommendationTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    product: '产品推荐',
    opportunity: '商机推荐',
    service: '服务推荐',
    'cross-sell': '交叉销售',
    upsell: '增值销售',
    content: '内容推荐',
    general: '综合推荐',
  };
  return labels[type] || type;
};

const getConfidenceColor = (confidence: number): 'success' | 'primary' | 'warning' | 'error' => {
  if (confidence >= 0.9) return 'success';
  if (confidence >= 0.7) return 'primary';
  if (confidence >= 0.5) return 'warning';
  return 'error';
};

// ============ 列定义 ============

const columns: ColumnDef<RecommendationResult>[] = [
  {
    id: 'customer_name',
    label: '客户名称',
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
    label: '推荐类型',
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
    label: '推荐数量',
    render: (row) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {row.recommendations.length} 项
      </Typography>
    ),
  },
  {
    id: 'confidence',
    label: '置信度',
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
    label: '模型',
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
    label: '生成时间',
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

// ============ 组件 ============

const CRMRecommendationPage: React.FC = () => {
  const detailContent = React.useCallback((row: Record<string, unknown>) => {
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
                基本信息
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <Typography variant='body2'>客户: {recommendation.customer_name}</Typography>
                <Typography variant='body2'>
                  类型: {getRecommendationTypeLabel(recommendation.recommendation_type)}
                </Typography>
                <Typography variant='body2'>
                  置信度: {(recommendation.confidence * 100).toFixed(0)}%
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid size={12}>
            <Typography
              variant='subtitle2'
              gutterBottom
            >
              推荐项目 ({recommendation.recommendations.length})
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
                            label={`类型: ${item.item_type}`}
                            size='small'
                            variant='outlined'
                          />
                          <Chip
                            label={`评分: ${item.score}`}
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
                          置信度
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
  }, []);

  return (
    <CrudPage
      schema={recommendationSchema}
      apiAdapter={apiAdapter}
      customColumns={columns as ColumnDef[]}
      detailContent={detailContent}
      idField='customer_id'
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: '客户关系管理', href: '/crm' },
        { label: '客户推荐' },
      ]}
    />
  );
};

export default CRMRecommendationPage;
