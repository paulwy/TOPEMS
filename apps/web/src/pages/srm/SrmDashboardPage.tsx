import React, { useState, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import { Users, Award, ClipboardList, DollarSign, ScrollText, Building2 } from 'lucide-react';
import { StatsChart } from '@/components/StatsChart';
import { srmApi } from '@/api/srm';
import type { SrmDetailedStatistics } from '@/api/srm';
import { apiLogger } from '@/utils/logger';
import { DashboardTemplate, type StatCard, type ChartCard } from '@/components/templates';

const SrmDashboardPage: React.FC = () => {
  const [statistics, setStatistics] = useState<SrmDetailedStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await srmApi.getDetailedStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (err: unknown) {
      apiLogger.error('加载统计数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const mapStatusToChinese = (status: string) => {
    const statusMap: Record<string, string> = {
      active: '启用',
      inactive: '禁用',
      pending: '待处理',
      completed: '已完成',
      delivered: '已交付',
      cancelled: '已取消',
      processing: '处理中',
      draft: '草稿',
      expired: '已过期',
    };
    return statusMap[status] || status;
  };

  const stats: StatCard[] = useMemo(() => {
    if (!statistics) return [];
    return [
      {
        id: 'suppliers',
        title: '供应商总数',
        value: statistics.basic.total_suppliers ?? 0,
        icon: <Users size={24} />,
        subtitle: `${statistics.basic.active_suppliers ?? 0} 个启用中`,
        color: 'primary',
      },
      {
        id: 'avg-score',
        title: '平均评分',
        value: (statistics.basic.avg_score ?? 0).toFixed(1),
        icon: <Award size={24} />,
        subtitle: `${statistics.basic.total_evaluations ?? 0} 次评估`,
        color: 'warning',
      },
      {
        id: 'orders',
        title: '采购订单',
        value: statistics.basic.total_orders ?? 0,
        icon: <ClipboardList size={24} />,
        subtitle: `${statistics.basic.pending_orders ?? 0} 个待处理`,
        color: 'success',
      },
      {
        id: 'order-amount',
        title: '订单总额',
        value: `¥${(statistics.basic.total_order_amount ?? 0).toLocaleString()}`,
        icon: <DollarSign size={24} />,
        subtitle: `${statistics.basic.completed_orders ?? 0} 个已完成`,
        color: 'info',
      },
      {
        id: 'contracts',
        title: '合同总数',
        value: statistics.basic.total_contracts ?? 0,
        icon: <ScrollText size={24} />,
        subtitle: `${statistics.basic.active_contracts ?? 0} 个有效`,
        color: 'secondary',
      },
      {
        id: 'categories',
        title: '供应商分类',
        value: statistics.supplier_by_category?.length ?? 0,
        icon: <Building2 size={24} />,
        subtitle: '类别数量',
        color: 'primary',
      },
    ];
  }, [statistics]);

  const charts: ChartCard[] = useMemo(() => {
    if (!statistics) return [];
    const chartList: ChartCard[] = [
      {
        id: 'supplier-status',
        title: '供应商状态分布',
        chart: (
          <StatsChart
            title='供应商状态分布'
            type='pie'
            data={(statistics.supplier_by_status ?? []).map((s) => ({
              name: mapStatusToChinese(s.status),
              value: s.count,
              color: s.status === 'active' ? 'success.main' : 'grey.500',
            }))}
            yKey='value'
            xKey='name'
          />
        ),
        height: 300,
        type: 'pie',
      },
      {
        id: 'order-status',
        title: '订单状态分布',
        chart: (
          <StatsChart
            title='订单状态分布'
            type='pie'
            data={(statistics.order_by_status ?? []).map((s) => ({
              name: mapStatusToChinese(s.status),
              value: s.count,
            }))}
            yKey='value'
            xKey='name'
          />
        ),
        height: 300,
        type: 'pie',
      },
      {
        id: 'evaluation-score',
        title: '评估分数分布',
        chart: (
          <StatsChart
            title='评估分数分布'
            type='bar'
            data={(statistics.evaluation_score_distribution ?? []).map((s) => ({
              name: s.range,
              value: s.count,
            }))}
            yKey='value'
            xKey='name'
          />
        ),
        height: 300,
        type: 'bar',
      },
      {
        id: 'monthly-trend',
        title: '月度订单趋势',
        chart: (
          <StatsChart
            title='月度订单趋势'
            type='line'
            data={(statistics.monthly_order_trend ?? []).map((t) => ({
              name: t.month,
              value: t.order_count,
              amount: t.total_amount,
            }))}
            yKey='value'
            xKey='name'
          />
        ),
        height: 300,
        type: 'line',
      },
    ];

    if ((statistics.contract_by_status ?? []).length > 0) {
      chartList.push({
        id: 'contract-status',
        title: '合同状态分布',
        chart: (
          <StatsChart
            title='合同状态分布'
            type='pie'
            data={statistics.contract_by_status.map((s) => ({
              name: mapStatusToChinese(s.status),
              value: s.count,
            }))}
            yKey='value'
            xKey='name'
          />
        ),
        height: 300,
        type: 'pie',
      });
    }

    return chartList;
  }, [statistics]);

  return (
    <DashboardTemplate
      title='供应商关系管理'
      subtitle='Supplier Relationship Management'
      breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: 'SRM' }]}
      stats={stats}
      charts={charts}
      loading={loading}
      onRefresh={loadStatistics}
    />
  );
};

export default SrmDashboardPage;
