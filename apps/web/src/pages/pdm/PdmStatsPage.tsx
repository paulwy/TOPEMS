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

const ct= designTokens.colors;

const adaptProcess = (item: { [key: string]: unknown }) => ({
  ...item,
  status: item.status === 'active' ? '启用' : item.status === 'inactive' ? '禁用' : item.status,
});

const adaptStep = (item: { [key: string]: unknown }) => ({
  ...item,
  status: item.status === 'active' ? '启用' : item.status === 'inactive' ? '禁用' : item.status,
});

const adaptFormula = (item: { [key: string]: unknown }) => ({
  ...item,
  status: item.status === 'active' ? '启用' : item.status === 'inactive' ? '禁用' : item.status,
});

const adaptBatch = (item: { [key: string]: unknown }) => ({
  ...item,
  status:
    item.status === 'planning'
      ? '规划中'
      : item.status === 'in_progress'
        ? '进行中'
        : item.status === 'completed'
          ? '已完成'
          : item.status === 'cancelled'
            ? '已取消'
            : item.status,
});

const PdmStatsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: processRes, isPending: processesLoading} = useQuery<ProductionProcess[]>({
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

  const { data: stepRes, isPending: stepsLoading} = useQuery<ProductionStep[]>({
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

  const { data: formulaRes, isPending: formulasLoading} = useQuery<ProductionFormula[]>({
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

  const { data: batchRes, isPending: batchesLoading} = useQuery<ProductionBatch[]>({
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
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.PROCESSES ,
  exact: false,
  refetchType: 'active',
});
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.STEPS ,
  exact: false,
  refetchType: 'active',
});
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.FORMULAS ,
  exact: false,
  refetchType: 'active',
});
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.BATCHES ,
  exact: false,
  refetchType: 'active',
});
  };

  const stats = {
    totalProcesses: processes.length,
    activeProcesses: processes.filter((p: { status: string }) => p.status === '启用').length,
    totalSteps: steps.length,
    totalFormulas: formulas.length,
    activeFormulas: formulas.filter((f: { status: string }) => f.status === '启用').length,
    totalBatches: batches.length,
    planningBatches: batches.filter((b: { status: string }) => b.status === '规划中').length,
    inProgressBatches: batches.filter((b: { status: string }) => b.status === '进行中').length,
    completedBatches: batches.filter((b: { status: string }) => b.status === '已完成').length,
    cancelledBatches: batches.filter((b: { status: string }) => b.status === '已取消').length,
  };

  const statCards = [
    {
      id: 'total-processes',
      title: '生产工艺',
      value: stats.totalProcesses,
      icon: <Factory sx={{ width: 24, height: 24 }} />,
      gradient: [ct.teal.main, ct.teal.dark] as [string, string],
      description: `启用 ${stats.activeProcesses}`,
      trend: { value: 0, direction: 'neutral' as const },
    },
    {
      id: 'total-steps',
      title: '生产工序',
      value: stats.totalSteps,
      icon: <ClipboardList sx={{ width: 24, height: 24 }} />,
      gradient: [ct.secondary.main, ct.secondary.dark] as [string, string],
      trend: { value: 0, direction: 'neutral' as const },
    },
    {
      id: 'total-formulas',
      title: '生产配方',
      value: stats.totalFormulas,
      icon: <Package sx={{ width: 24, height: 24 }} />,
      gradient: ['warning.main', ct.warning.dark] as [string, string],
      description: `活跃 ${stats.activeFormulas}`,
      trend: { value: 0, direction: 'neutral' as const },
    },
    {
      id: 'total-batches',
      title: '生产批次',
      value: stats.totalBatches,
      icon: <Activity sx={{ width: 24, height: 24 }} />,
      gradient: [ct.secondary[400], ct.secondary[600]] as [string, string],
      description: `进行中 ${stats.inProgressBatches}`,
      trend: { value: 0, direction: 'neutral' as const },
    },
    {
      id: 'completed-batches',
      title: '已完成批次',
      value: stats.completedBatches,
      icon: <CheckCircle sx={{ width: 24, height: 24 }} />,
      gradient: [ct.success.main, ct.success.dark] as [string, string],
      trend: { value: 0, direction: 'up' as const },
    },
    {
      id: 'planning-batches',
      title: '规划中批次',
      value: stats.planningBatches,
      icon: <TrendingUp sx={{ width: 24, height: 24 }} />,
      gradient: [ct.pink[500], ct.pink[600]] as [string, string],
      trend: { value: 0, direction: 'neutral' as const },
    },
  ];

  const charts = [
    {
      id: 'batch-status-distribution',
      title: '批次状态分布',
      type: 'pie' as const,
      dataKey: 'value',
      nameKey: 'name',
      data: [
        { name: '规划中', value: stats.planningBatches, color: 'warning.main' },
        { name: '进行中', value: stats.inProgressBatches, color: ct.secondary[400] },
        { name: '已完成', value: stats.completedBatches, color: ct.success.main },
        { name: '已取消', value: stats.cancelledBatches, color: 'grey.500' },
      ].filter((d) => d.value > 0),
    },
    {
      id: 'process-formula-status',
      title: '工艺与配方状态',
      type: 'pie' as const,
      dataKey: 'value',
      nameKey: 'name',
      data: [
        { name: '活跃工艺', value: stats.activeProcesses, color: ct.teal.main },
        { name: '活跃配方', value: stats.activeFormulas, color: 'warning.main' },
        { name: '总工序', value: stats.totalSteps, color: 'secondary.main' },
      ].filter((d) => d.value > 0),
    },
  ];

  const tables = [
    {
      id: 'module-stats',
      title: '各模块详细统计',
      columns: [
        { id: 'module', label: '模块', field: 'module' },
        { id: 'total', label: '总数', field: 'total' },
        { id: 'enabled', label: '已启用/活跃', field: 'enabled' },
        { id: 'disabled', label: '已禁用/其他', field: 'disabled' },
      ],
      data: [
        {
          module: '工艺',
          total: stats.totalProcesses,
          enabled: stats.activeProcesses,
          disabled: stats.totalProcesses - stats.activeProcesses,
        },
        {
          module: '工序',
          total: stats.totalSteps,
          enabled: '-',
          disabled: '-',
        },
        {
          module: '配方',
          total: stats.totalFormulas,
          enabled: stats.activeFormulas,
          disabled: stats.totalFormulas - stats.activeFormulas,
        },
        {
          module: '批次',
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
        title='生产统计'
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
