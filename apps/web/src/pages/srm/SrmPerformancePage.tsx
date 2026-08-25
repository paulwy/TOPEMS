import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef } from '@/components/templates/list/types';
import { performanceSchema } from '@/schemas/srm';
import { srmApi } from '@/api/srm';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Typography, Chip, Rating } from '@mui/material';
import { TrendingUp, TrendingDown, Award, Target, BarChart3 } from 'lucide-react';
import { designTokens } from '@/theme/tokens';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct = designTokens.colors;

interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  total_orders: number;
  total_amount: number;
  avg_overall_score?: number;
  avg_quality_score?: number;
  avg_delivery_score?: number;
  on_time_delivery_rate?: number;
  defect_rate?: number;
  evaluation_count: number;
}

interface PerformanceSummary {
  total_suppliers: number;
  evaluated_suppliers: number;
  evaluation_rate: number;
  avg_overall_score?: number;
  top_supplier?: {
    name: string;
    avg_score: number;
  };
}

const performanceApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await srmApi.getPerformanceReports();
    if (!response.success || !response.data) {
      return { data: [], total: 0 };
    }

    const items = response.data.performances;
    const search = params?.search?.toLowerCase() || '';
    const page = params?.page || 0;
    const pageSize = params?.pageSize || 10;

    let filtered = items;
    if (search) {
      filtered = items.filter((p) => p.supplier_name.toLowerCase().includes(search));
    }

    const total = filtered.length;
    const data = filtered.slice(page * pageSize, (page + 1) * pageSize);
    return { data: data as unknown as Record<string, unknown>[], total };
  },
  create: async () => {
    throw new Error(i18n.t('pages.srm_performance_page.k0'));
  },
  update: async () => {
    throw new Error(i18n.t('pages.srm_performance_page.k1'));
  },
  delete: async () => {
    throw new Error(i18n.t('pages.srm_performance_page.k2'));
  },
};

const getScoreColor = (score?: number): 'success' | 'warning' | 'error' | 'default' => {
  if (!score) return 'default';
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'error';
};

const customColumns: ColumnDef[] = [
  {
    id: 'total_amount',
    label: i18n.t('pages.srm_performance_page.k3'),
    width: 120,
    render: (row) => {
      const r = row as unknown as SupplierPerformance;
      return `${(r.total_amount / 10000).toFixed(2)}${i18n.t('pages.srm_performance_page.k0')}`;
    },
  },
  {
    id: 'avg_overall_score',
    label: i18n.t('pages.srm_performance_page.k4'),
    width: 180,
    sortable: true,
    render: (row) => {
      const r = row as unknown as SupplierPerformance;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Rating
            value={r.avg_overall_score || 0}
            readOnly
            max={100}
            precision={1}
            size='small'
          />
          <Chip
            label={r.avg_overall_score?.toFixed(1) || '-'}
            size='small'
            color={getScoreColor(r.avg_overall_score)}
          />
        </Box>
      );
    },
  },
  {
    id: 'avg_quality_score',
    label: i18n.t('pages.srm_performance_page.k5'),
    width: 100,
    sortable: true,
    render: (row) => {
      const r = row as unknown as SupplierPerformance;
      return (
        <Chip
          label={r.avg_quality_score?.toFixed(1) || '-'}
          size='small'
          color={getScoreColor(r.avg_quality_score)}
        />
      );
    },
  },
  {
    id: 'avg_delivery_score',
    label: i18n.t('pages.srm_performance_page.k6'),
    width: 100,
    sortable: true,
    render: (row) => {
      const r = row as unknown as SupplierPerformance;
      return (
        <Chip
          label={r.avg_delivery_score?.toFixed(1) || '-'}
          size='small'
          color={getScoreColor(r.avg_delivery_score)}
        />
      );
    },
  },
  {
    id: 'on_time_delivery_rate',
    label: i18n.t('pages.srm_performance_page.k7'),
    width: 140,
    sortable: true,
    render: (row) => {
      const r = row as unknown as SupplierPerformance;
      const rate = r.on_time_delivery_rate;
      if (rate === undefined || rate === null) return '-';
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {rate >= 0.9 ? (
            <TrendingUp
              size={16}
              color='green'
            />
          ) : (
            <TrendingDown
              size={16}
              color='red'
            />
          )}
          <Typography variant='body2'>{(rate * 100).toFixed(0)}%</Typography>
        </Box>
      );
    },
  },
  {
    id: 'defect_rate',
    label: i18n.t('pages.srm_performance_page.k8'),
    width: 120,
    sortable: true,
    render: (row) => {
      const r = row as unknown as SupplierPerformance;
      const rate = r.defect_rate;
      if (rate === undefined || rate === null) return '-';
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {rate <= 0.02 ? (
            <TrendingDown
              size={16}
              color='green'
            />
          ) : (
            <TrendingUp
              size={16}
              color='red'
            />
          )}
          <Typography variant='body2'>{(rate * 100).toFixed(2)}%</Typography>
        </Box>
      );
    },
  },
];

const PerformanceStats: React.FC = () => {
  const summaryQuery = useQuery<PerformanceSummary | null>({
    queryKey: QUERY_KEYS.AD_HOC.SRM_PERFORMANCE_SUMMARY_BASE,
    queryFn: async () => {
      const response = await srmApi.getPerformanceSummary();
      if (response.success && response.data) return response.data;
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const summary = summaryQuery.data;

  if (!summary) return null;

  const statCards = [
    {
      label: i18n.t('pages.srm_performance_page.k9'),
      value: summary.total_suppliers,
      icon: <BarChart3 sx={{ width: 20, height: 20 }} />,
      color: 'primary.dark',
      bgColor: 'primary.lighter',
    },
    {
      label: i18n.t('pages.srm_performance_page.k10'),
      value: summary.evaluated_suppliers,
      icon: <Target sx={{ width: 20, height: 20 }} />,
      color: 'info.dark',
      bgColor: 'info.lighter',
    },
    {
      label: i18n.t('pages.srm_performance_page.k11'),
      value: `${(summary.evaluation_rate * 100).toFixed(1)}%`,
      icon: <TrendingUp sx={{ width: 20, height: 20 }} />,
      color: 'success.dark',
      bgColor: 'success.lighter',
    },
    {
      label: i18n.t('pages.srm_performance_page.k12'),
      value: summary.avg_overall_score?.toFixed(1) || '-',
      icon: <Award sx={{ width: 20, height: 20 }} />,
      color:
        (summary.avg_overall_score ?? 0) >= 80
          ? 'success.dark'
          : (summary.avg_overall_score ?? 0) >= 60
            ? 'warning.dark'
            : 'error.dark',
      bgColor:
        (summary.avg_overall_score ?? 0) >= 80
          ? 'success.lighter'
          : (summary.avg_overall_score ?? 0) >= 60
            ? 'warning.lighter'
            : 'error.lighter',
    },
  ];

  return (
    <Box>
      <Typography
        variant='h6'
        sx={{ mb: 2, fontWeight: 'bold' }}
      >
        {i18n.t('pages.srm_performance_page.k0')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 3,
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
                  {React.cloneElement(card.icon, { style: { color: card.color } })}
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{
                      color: 'text.secondary',
                      fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    }}
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

      {summary.top_supplier && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.srm_performance_page.k1')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold' }}
                >
                  {summary.top_supplier.name}
                  <Chip
                    sx={{ ml: 2 }}
                    label={`${summary.top_supplier.avg_score.toFixed(1)}${i18n.t('pages.srm_performance_page.k1')}`}
                    color='success'
                    size='small'
                  />
                </Typography>
              </Box>
              <Award sx={{ color: ct.warning[500], width: 28, height: 28 }} />
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

const SrmPerformancePage: React.FC = () => {
  return (
    <CrudPage
      schema={performanceSchema}
      apiAdapter={performanceApiAdapter}
      customColumns={customColumns}
      breadcrumbs={[{ label: 'SRM' }, { label: i18n.t('pages.srm_performance_page.k13') }]}
      headerContent={<PerformanceStats />}
    />
  );
};

export default SrmPerformancePage;
