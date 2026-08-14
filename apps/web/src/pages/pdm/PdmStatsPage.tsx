import React from 'react';
import { Box, Typography } from '@mui/material';
import { TrendingUp, Factory, ClipboardList, Package, Activity, CheckCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { PageContainer } from '@/components/common';
import { pdmApi } from '@/api/pdm';
import type {
  ProductionProcess,
  ProductionStep,
  ProductionFormula,
  ProductionBatch,
} from '@/api/pdm';
import { designTokens } from '@/theme/tokens';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const ct = designTokens.colors;

const adaptProcess = (item: { [key: string]: unknown }) => ({
  ...item,
  status:
    item.status === 'active'
      ? i18n.t('pdm.pdm_stats_page.k1')
      : item.status === 'inactive'
        ? i18n.t('pdm.pdm_stats_page.k0')
        : item.status,
});

const adaptStep = (item: { [key: string]: unknown }) => ({
  ...item,
  status:
    item.status === 'active'
      ? i18n.t('pdm.pdm_stats_page.k3')
      : item.status === 'inactive'
        ? i18n.t('pdm.pdm_stats_page.k2')
        : item.status,
});

const adaptFormula = (item: { [key: string]: unknown }) => ({
  ...item,
  status:
    item.status === 'active'
      ? i18n.t('pdm.pdm_stats_page.k5')
      : item.status === 'inactive'
        ? i18n.t('pdm.pdm_stats_page.k4')
        : item.status,
});

const adaptBatch = (item: { [key: string]: unknown }) => ({
  ...item,
  status:
    item.status === 'planning'
      ? i18n.t('pdm.pdm_stats_page.k6')
      : item.status === 'in_progress'
        ? i18n.t('pdm.pdm_stats_page.k7')
        : item.status === 'completed'
          ? i18n.t('pdm.pdm_stats_page.k8')
          : item.status === 'cancelled'
            ? i18n.t('pdm.pdm_stats_page.k9')
            : item.status,
});

const PdmStatsPage: React.FC = () => {
  const { t } = useTranslation('pdm');
  const queryClient = useQueryClient();

  const { data: processRes, isPending: processesLoading } = useQuery<ProductionProcess[]>({
    queryKey: QUERY_KEYS.PDM.PROCESSES,
    queryFn: async (): Promise<ProductionProcess[]> => {
      const response = await pdmApi.listProcesses();
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        const items = (Array.isArray(data) ? data : data.processes || []) as unknown as {
          [key: string]: unknown;
        }[];
        return items.map(adaptProcess) as unknown as ProductionProcess[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: stepRes, isPending: stepsLoading } = useQuery<ProductionStep[]>({
    queryKey: QUERY_KEYS.PDM.STEPS,
    queryFn: async (): Promise<ProductionStep[]> => {
      const response = await pdmApi.listSteps();
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        const items = (Array.isArray(data) ? data : data.steps || []) as unknown as {
          [key: string]: unknown;
        }[];
        return items.map(adaptStep) as unknown as ProductionStep[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: formulaRes, isPending: formulasLoading } = useQuery<ProductionFormula[]>({
    queryKey: QUERY_KEYS.PDM.FORMULAS,
    queryFn: async (): Promise<ProductionFormula[]> => {
      const response = await pdmApi.listFormulas();
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        const items = (Array.isArray(data) ? data : data.formulas || []) as unknown as {
          [key: string]: unknown;
        }[];
        return items.map(adaptFormula) as unknown as ProductionFormula[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: batchRes, isPending: batchesLoading } = useQuery<ProductionBatch[]>({
    queryKey: QUERY_KEYS.PDM.BATCHES,
    queryFn: async (): Promise<ProductionBatch[]> => {
      const response = await pdmApi.listBatches();
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        const items = (Array.isArray(data) ? data : data.batches || []) as unknown as {
          [key: string]: unknown;
        }[];
        return items.map(adaptBatch) as unknown as ProductionBatch[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const processes = processRes || [];
  const steps = stepRes || [];
  const formulas = formulaRes || [];
  const batches = batchRes || [];
  const loading = processesLoading || stepsLoading || formulasLoading || batchesLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.PDM.PROCESSES,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.PDM.STEPS,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.PDM.FORMULAS,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.PDM.BATCHES,
      exact: false,
      refetchType: 'active',
    });
  };

  const stats = {
    totalProcesses: processes.length,
    activeProcesses: processes.filter(
      (p: { status: string }) => p.status === t('pdm.pdm_stats_page.k10')
    ).length,
    totalSteps: steps.length,
    totalFormulas: formulas.length,
    activeFormulas: formulas.filter(
      (f: { status: string }) => f.status === t('pdm.pdm_stats_page.k11')
    ).length,
    totalBatches: batches.length,
    planningBatches: batches.filter(
      (b: { status: string }) => b.status === t('pdm.pdm_stats_page.k12')
    ).length,
    inProgressBatches: batches.filter(
      (b: { status: string }) => b.status === t('pdm.pdm_stats_page.k13')
    ).length,
    completedBatches: batches.filter(
      (b: { status: string }) => b.status === t('pdm.pdm_stats_page.k14')
    ).length,
    cancelledBatches: batches.filter(
      (b: { status: string }) => b.status === t('pdm.pdm_stats_page.k15')
    ).length,
  };

  const statCards = [
    {
      id: 'total-processes',
      title: t('pdm.pdm_stats_page.k16'),
      value: stats.totalProcesses,
      icon: <Factory sx={{ width: 24, height: 24 }} />,
      gradient: [ct.teal.main, ct.teal.dark] as [string, string],
      description: `启用 ${stats.activeProcesses}`,
      trend: { value: 0, direction: 'neutral' as const },
    },
    {
      id: 'total-steps',
      title: t('pdm.pdm_stats_page.k17'),
      value: stats.totalSteps,
      icon: <ClipboardList sx={{ width: 24, height: 24 }} />,
      gradient: [ct.secondary.main, ct.secondary.dark] as [string, string],
      trend: { value: 0, direction: 'neutral' as const },
    },
    {
      id: 'total-formulas',
      title: t('pdm.pdm_stats_page.k18'),
      value: stats.totalFormulas,
      icon: <Package sx={{ width: 24, height: 24 }} />,
      gradient: ['warning.main', ct.warning.dark] as [string, string],
      description: `活跃 ${stats.activeFormulas}`,
      trend: { value: 0, direction: 'neutral' as const },
    },
    {
      id: 'total-batches',
      title: t('pdm.pdm_stats_page.k19'),
      value: stats.totalBatches,
      icon: <Activity sx={{ width: 24, height: 24 }} />,
      gradient: [ct.secondary[400], ct.secondary[600]] as [string, string],
      description: `进行中 ${stats.inProgressBatches}`,
      trend: { value: 0, direction: 'neutral' as const },
    },
    {
      id: 'completed-batches',
      title: t('pdm.pdm_stats_page.k20'),
      value: stats.completedBatches,
      icon: <CheckCircle sx={{ width: 24, height: 24 }} />,
      gradient: [ct.success.main, ct.success.dark] as [string, string],
      trend: { value: 0, direction: 'up' as const },
    },
    {
      id: 'planning-batches',
      title: t('pdm.pdm_stats_page.k21'),
      value: stats.planningBatches,
      icon: <TrendingUp sx={{ width: 24, height: 24 }} />,
      gradient: [ct.pink[500], ct.pink[600]] as [string, string],
      trend: { value: 0, direction: 'neutral' as const },
    },
  ];

  const charts = [
    {
      id: 'batch-status-distribution',
      title: t('pdm.pdm_stats_page.k22'),
      type: 'pie' as const,
      dataKey: 'value',
      nameKey: 'name',
      data: [
        { name: t('pdm.pdm_stats_page.k23'), value: stats.planningBatches, color: 'warning.main' },
        {
          name: t('pdm.pdm_stats_page.k24'),
          value: stats.inProgressBatches,
          color: ct.secondary[400],
        },
        {
          name: t('pdm.pdm_stats_page.k25'),
          value: stats.completedBatches,
          color: ct.success.main,
        },
        { name: t('pdm.pdm_stats_page.k26'), value: stats.cancelledBatches, color: 'grey.500' },
      ].filter((d) => d.value > 0),
    },
    {
      id: 'process-formula-status',
      title: t('pdm.pdm_stats_page.k27'),
      type: 'pie' as const,
      dataKey: 'value',
      nameKey: 'name',
      data: [
        { name: t('pdm.pdm_stats_page.k28'), value: stats.activeProcesses, color: ct.teal.main },
        { name: t('pdm.pdm_stats_page.k29'), value: stats.activeFormulas, color: 'warning.main' },
        { name: t('pdm.pdm_stats_page.k30'), value: stats.totalSteps, color: 'secondary.main' },
      ].filter((d) => d.value > 0),
    },
  ];

  const tables = [
    {
      id: 'module-stats',
      title: t('pdm.pdm_stats_page.k31'),
      columns: [
        { id: 'module', label: t('pdm.pdm_stats_page.k32'), field: 'module' },
        { id: 'total', label: t('pdm.pdm_stats_page.k33'), field: 'total' },
        { id: 'enabled', label: t('pdm.pdm_stats_page.k34'), field: 'enabled' },
        { id: 'disabled', label: t('pdm.pdm_stats_page.k35'), field: 'disabled' },
      ],
      data: [
        {
          module: t('pdm.pdm_stats_page.k36'),
          total: stats.totalProcesses,
          enabled: stats.activeProcesses,
          disabled: stats.totalProcesses - stats.activeProcesses,
        },
        {
          module: t('pdm.pdm_stats_page.k37'),
          total: stats.totalSteps,
          enabled: '-',
          disabled: '-',
        },
        {
          module: t('pdm.pdm_stats_page.k38'),
          total: stats.totalFormulas,
          enabled: stats.activeFormulas,
          disabled: stats.totalFormulas - stats.activeFormulas,
        },
        {
          module: t('pdm.pdm_stats_page.k39'),
          total: stats.totalBatches,
          enabled: stats.inProgressBatches,
          disabled: stats.cancelledBatches,
        },
      ],
    },
  ];

  return (
    <PageContainer
      padding={false}
      headerProps={{
        pageIcon: <TrendingUp style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
    >
      <StatsPageTemplate
        title={t('pdm.pdm_stats_page.k40')}
        subtitle='Production Statistics'
        statCards={statCards}
        statColumns={6}
        charts={charts}
        chartColumns={{ xs: 1, lg: 2 }}
        tables={tables}
        loading={loading}
        showTimeRange={false}
        showSearch={false}
        showExport={false}
        showRefresh={true}
        onRefresh={handleRefresh}
        chartSectionTitle=''
        showStatCards={true}
      />
    </PageContainer>
  );
};

export default PdmStatsPage;
