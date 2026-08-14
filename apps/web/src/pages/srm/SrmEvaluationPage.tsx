import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { evaluationSchema } from '@/schemas/srm';
import { srmApi } from '@/api/srm';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Typography, Rating, Chip } from '@mui/material';
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { designTokens } from '@/theme/tokens';


import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct= designTokens.colors;

interface SupplierEvaluation {
  id: string;
  evaluation_no: string;
  supplier_id: string;
  supplier_name?: string;
  evaluation_date?: string;
  overall_score?: number;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  evaluator?: string;
  status: string;
  created_at: string;
}

const evaluationApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await srmApi.listEvaluations();
    if (!response.success || !response.data) {
      return { data: [], total: 0 };
    }

    const items = response.data as unknown as SupplierEvaluation[];
    const search = params?.search?.toLowerCase() || '';
    const status = params?.status as string | undefined;
    const page = params?.page || 0;
    const pageSize = params?.pageSize || 10;

    let filtered = items;
    if (search) {
      filtered = items.filter(
        (e) =>
          e.evaluation_no.toLowerCase().includes(search) ||
          e.supplier_name?.toLowerCase().includes(search) ||
          (e.evaluator?.toLowerCase().includes(search) ?? false)
      );
    }
    if (status && status !== 'all') {
      filtered = filtered.filter((e) => e.status === status);
    }

    const total = filtered.length;
    const data = filtered.slice(page * pageSize, (page + 1) * pageSize);
    return { data: data as unknown as Record<string, unknown>[], total };
  },
  create: async (data) => {
    const response = await srmApi.createEvaluation(
      data as unknown as Parameters<typeof srmApi.createEvaluation>[0]
    );
    if (!response.success || !response.data) throw new Error(i18n.t('pages.srm_evaluation_page.k0'));
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await srmApi.updateEvaluation(
      id,
      data as unknown as Parameters<typeof srmApi.updateEvaluation>[1]
    );
    if (!response.success || !response.data) throw new Error(i18n.t('pages.srm_evaluation_page.k1'));
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await srmApi.deleteEvaluation(id);
    if (!response.success) throw new Error(i18n.t('pages.srm_evaluation_page.k2'));
  },
};

const getStatusColor = (
  status: string
): 'primary' | 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'in_progress':
      return 'primary';
    case 'completed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'in_progress':
      return i18n.t('pages.srm_evaluation_page.k3');
    case 'completed':
      return i18n.t('pages.srm_evaluation_page.k4');
    case 'pending':
      return i18n.t('pages.srm_evaluation_page.k5');
    case 'rejected':
      return i18n.t('pages.srm_evaluation_page.k6');
    default:
      return status;
  }
};

const customColumns: ColumnDef[] = [
  {
    id: 'overall_score',
    label: i18n.t('pages.srm_evaluation_page.k7'),
    width: 180,
    sortable: true,
    render: (row) => {
      const r = row as unknown as SupplierEvaluation;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Rating
            value={r.overall_score || 0}
            readOnly
            max={10}
            precision={0.5}
            size='small'
          />
          <span>{r.overall_score || '-'}</span>
        </Box>
      );
    },
  },
  {
    id: 'status',
    label: i18n.t('pages.srm_evaluation_page.k8'),
    width: 100,
    sortable: true,
    render: (row) => {
      const r = row as unknown as SupplierEvaluation;
      return (
        <Chip
          label={getStatusLabel(r.status)}
          size='small'
          color={getStatusColor(r.status)}
        />
      );
    },
  },
];

const EvaluationStats: React.FC = () => {
  const { data: evaluations = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.SRM_EVALUATIONS_STATS_BASE,
    queryFn: async () => {
      const response = await srmApi.listEvaluations();
      if (response.success && response.data) return response.data;
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = React.useMemo(
    () => ({
      total: evaluations.length,
      inProgress: evaluations.filter((e: SupplierEvaluation) => e.status === 'in_progress').length,
      completed: evaluations.filter((e: SupplierEvaluation) => e.status === 'completed').length,
      pending: evaluations.filter((e: SupplierEvaluation) => e.status === 'pending').length,
    }),
    [evaluations]
  );

  const statCards = [
    {
      label: i18n.t('pages.srm_evaluation_page.k9'),
      value: stats.total,
      color: ct.purple[500],
      bgColor: 'secondary.light',
      icon: <FileText sx={{ width: 20, height: 20 }} />,
    },
    {
      label: i18n.t('pages.srm_evaluation_page.k10'),
      value: stats.inProgress,
      color: 'primary.dark',
      bgColor: 'primary.lighter',
      icon: <Clock sx={{ width: 20, height: 20 }} />,
    },
    {
      label: i18n.t('pages.srm_evaluation_page.k11'),
      value: stats.completed,
      color: 'success.dark',
      bgColor: 'success.lighter',
      icon: <CheckCircle sx={{ width: 20, height: 20 }} />,
    },
    {
      label: i18n.t('pages.srm_evaluation_page.k12'),
      value: stats.pending,
      color: 'warning.dark',
      bgColor: 'warning.lighter',
      icon: <XCircle sx={{ width: 20, height: 20 }} />,
    },
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
                {React.cloneElement(card.icon, { style: { color: card.color } })}
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

const SrmEvaluationPage: React.FC = () => {
  const customRowActions: RowAction[] = [
    {
      label: i18n.t('pages.srm_evaluation_page.k13'),
      onClick: () => {},
    },
  ];

  return (
    <CrudPage
      schema={evaluationSchema}
      apiAdapter={evaluationApiAdapter}
      customColumns={customColumns}
      breadcrumbs={[{ label: 'SRM' }, { label: i18n.t('pages.srm_evaluation_page.k14') }]}
      headerContent={<EvaluationStats />}
      customRowActions={customRowActions}
    />
  );
};

export default SrmEvaluationPage;
