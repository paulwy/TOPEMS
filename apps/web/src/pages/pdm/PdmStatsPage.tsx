import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import {
  TrendingUp,
  Factory,
  ClipboardList,
  Package,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { PageContainer } from '@/components/common';
import { useAppStore } from '@/store';
import { pdmApi } from '@/api/pdm';
import type {
  ProductionProcess,
  ProductionStep,
  ProductionFormula,
  ProductionBatch,
} from '@/api/pdm';

const PdmStatsPage: React.FC = () => {
  const [processes, setProcesses] = useState<ProductionProcess[]>([]);
  const [steps, setSteps] = useState<ProductionStep[]>([]);
  const [formulas, setFormulas] = useState<ProductionFormula[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [processRes, stepRes, formulaRes, batchRes] = await Promise.all([
        pdmApi.listProcesses(),
        pdmApi.listSteps(),
        pdmApi.listFormulas(),
        pdmApi.listBatches(),
      ]);

      if (processRes.success && processRes.data) {
        const data = processRes.data as any;
        const items = Array.isArray(data) ? data : data.processes || [];
        setProcesses(
          items.map((item: { [key: string]: unknown }) => ({
            ...item,
            status:
              item.status === 'active' ? '启用' : item.status === 'inactive' ? '禁用' : item.status,
          }))
        );
      }
      if (stepRes.success && stepRes.data) {
        const data = stepRes.data as any;
        const items = Array.isArray(data) ? data : data.steps || [];
        setSteps(
          items.map((item: { [key: string]: unknown }) => ({
            ...item,
            status:
              item.status === 'active' ? '启用' : item.status === 'inactive' ? '禁用' : item.status,
          }))
        );
      }
      if (formulaRes.success && formulaRes.data) {
        const data = formulaRes.data as any;
        const items = Array.isArray(data) ? data : data.formulas || [];
        setFormulas(
          items.map((item: { [key: string]: unknown }) => ({
            ...item,
            status:
              item.status === 'active' ? '启用' : item.status === 'inactive' ? '禁用' : item.status,
          }))
        );
      }
      if (batchRes.success && batchRes.data) {
        const data = batchRes.data as any;
        const items = Array.isArray(data) ? data : data.batches || [];
        setBatches(
          items.map((item: { [key: string]: unknown }) => ({
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
          }))
        );
      }
    } catch (err: unknown) {
      console.error('加载统计数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalProcesses: processes.length,
    activeProcesses: processes.filter((p) => p.status === '启用').length,
    totalSteps: steps.length,
    totalFormulas: formulas.length,
    activeFormulas: formulas.filter((f) => f.status === '启用').length,
    totalBatches: batches.length,
    planningBatches: batches.filter((b) => b.status === '规划中').length,
    inProgressBatches: batches.filter((b) => b.status === '进行中').length,
    completedBatches: batches.filter((b) => b.status === '已完成').length,
    cancelledBatches: batches.filter((b) => b.status === '已取消').length,
  };

  const statCards = [
    {
      id: 'total-processes',
      title: '生产工艺',
      value: stats.totalProcesses,
      icon: <Factory sx={{ width: 24, height: 24 }} />,
      gradient: ['#14B8A6', '#0D9488'] as [string, string],
      description: `启用 ${stats.activeProcesses}`,
      trend: { value: 0, direction: 'neutral' as const },
    },
    {
      id: 'total-steps',
      title: '生产工序',
      value: stats.totalSteps,
      icon: <ClipboardList sx={{ width: 24, height: 24 }} />,
      gradient: ['#8B5CF6', '#7C3AED'] as [string, string],
      trend: { value: 0, direction: 'neutral' as const },
    },
    {
      id: 'total-formulas',
      title: '生产配方',
      value: stats.totalFormulas,
      icon: <Package sx={{ width: 24, height: 24 }} />,
      gradient: ['warning.main', '#D97706'] as [string, string],
      description: `活跃 ${stats.activeFormulas}`,
      trend: { value: 0, direction: 'neutral' as const },
    },
    {
      id: 'total-batches',
      title: '生产批次',
      value: stats.totalBatches,
      icon: <Activity sx={{ width: 24, height: 24 }} />,
      gradient: ['#6366F1', '#4F46E5'] as [string, string],
      description: `进行中 ${stats.inProgressBatches}`,
      trend: { value: 0, direction: 'neutral' as const },
    },
    {
      id: 'completed-batches',
      title: '已完成批次',
      value: stats.completedBatches,
      icon: <CheckCircle sx={{ width: 24, height: 24 }} />,
      gradient: ['#00C897', '#00A878'] as [string, string],
      trend: { value: 0, direction: 'up' as const },
    },
    {
      id: 'planning-batches',
      title: '规划中批次',
      value: stats.planningBatches,
      icon: <TrendingUp sx={{ width: 24, height: 24 }} />,
      gradient: ['#EC4899', '#DB2777'] as [string, string],
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
        { name: '进行中', value: stats.inProgressBatches, color: '#6366F1' },
        { name: '已完成', value: stats.completedBatches, color: '#00C897' },
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
        { name: '活跃工艺', value: stats.activeProcesses, color: '#14B8A6' },
        { name: '活跃配方', value: stats.activeFormulas, color: 'warning.main' },
        { name: '总工序', value: stats.totalSteps, color: '#8B5CF6' },
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
    <PageContainer padding={false}>
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
        onRefresh={loadData}
        chartSectionTitle=''
        showStatCards={true}
      />
    </PageContainer>
  );
};

export default PdmStatsPage;
