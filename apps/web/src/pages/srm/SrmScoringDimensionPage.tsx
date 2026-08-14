import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { scoringDimensionSchema } from '@/schemas/srm';
import { srmApi } from '@/api/srm';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { Sliders } from 'lucide-react';
import { designTokens } from '@/theme/tokens';


import { QUERY_KEYS } from '@/lib/reactQuery';

const ct= designTokens.colors;

interface ScoringDimension {
  id: string;
  dimension_code: string;
  name: string;
  weight: number;
  min_score: number;
  max_score: number;
  description?: string;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const scoringDimensionApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await srmApi.listScoringDimensions();
    if (!response.success || !response.data) {
      return { data: [], total: 0 };
    }
    const items = (response.data || []) as unknown as ScoringDimension[];
    const search = params?.search?.toLowerCase() || '';
    const page = params?.page || 0;
    const pageSize = params?.pageSize || 10;

    let filtered = items;
    if (search) {
      filtered = items.filter(
        (d) =>
          d.name.toLowerCase().includes(search) || d.dimension_code.toLowerCase().includes(search)
      );
    }

    const total = filtered.length;
    const data = filtered.slice(page * pageSize, (page + 1) * pageSize);
    return { data: data as unknown as Record<string, unknown>[], total };
  },
  create: async (data) => {
    const response = await srmApi.createScoringDimension(
      data as unknown as Parameters<typeof srmApi.createScoringDimension>[0]
    );
    if (!response.success || !response.data) throw new Error('创建评分维度失败');
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await srmApi.updateScoringDimension(
      id,
      data as unknown as Parameters<typeof srmApi.updateScoringDimension>[1]
    );
    if (!response.success || !response.data) throw new Error('更新评分维度失败');
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await srmApi.deleteScoringDimension(id);
    if (!response.success) throw new Error('删除评分维度失败');
  },
};

const ScoringDimensionStats: React.FC = () => {
  const { data: dimensions = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.SRM_SCORING_DIMENSIONS_STATS_BASE,
    queryFn: async () => {
      const response = await srmApi.listScoringDimensions();
      if (response.success && response.data) {
        return response.data as unknown as ScoringDimension[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = React.useMemo(() => {
    const activeDims = dimensions.filter((d) => d.status === 'active');
    const totalWeight = activeDims.reduce((sum, d) => sum + (d.weight || 0), 0);
    return {
      total: dimensions.length,
      active: activeDims.length,
      totalWeight,
      inactive: dimensions.filter((d) => d.status === 'inactive').length,
    };
  }, [dimensions]);

  const statCards = [
    { label: '维度总数', value: stats.total, color: ct.purple[500], bgColor: 'secondary.light' },
    { label: '已启用', value: stats.active, color: 'success.dark', bgColor: 'success.lighter' },
    {
      label: '权重合计',
      value: `${stats.totalWeight}%`,
      color: stats.totalWeight === 100 ? 'success.dark' : 'warning.dark',
      bgColor: stats.totalWeight === 100 ? 'success.lighter' : 'warning.lighter',
    },
    { label: '已禁用', value: stats.inactive, color: 'error.dark', bgColor: 'error.lighter' },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 4,
      }}
    >
      {statCards.map((card) => (
        <Card key={card.label}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: card.bgColor,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sliders sx={{ width: 20, height: 20, color: card.color }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  {card.label}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {card.value}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

const SrmScoringDimensionPage: React.FC = () => {
  return (
    <CrudPage
      schema={scoringDimensionSchema}
      apiAdapter={scoringDimensionApiAdapter}
      breadcrumbs={[{ label: 'SRM' }, { label: '评分维度配置' }]}
      headerContent={<ScoringDimensionStats />}
    />
  );
};

export default SrmScoringDimensionPage;
