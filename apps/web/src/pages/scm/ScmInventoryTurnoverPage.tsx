import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, Button } from '@mui/material';
import { Download, TrendingUp } from 'lucide-react';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { scmApi } from '@/api/scm';
import type { InventoryTurnoverStat } from '@/api/scm';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { logger } from '@/utils/logger';

const ct = designTokens.colors;

const ScmInventoryTurnoverPage: React.FC = () => {
  const [data, setData] = useState<InventoryTurnoverStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    loadData();
  }, [page, pageSize, categoryFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: page + 1, pageSize };
      if (categoryFilter !== 'all') params.category = categoryFilter;
      const response = await scmApi.inventoryTurnover.list(params as any);
      if (response.success && response.data) {
        setData(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      logger.error('加载库存周转数据失败:', error);
      addNotification({ title: '加载失败', message: '加载库存周转数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getAbcColor = (abc?: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      A: { bg: 'error.main20', color: ct.error.main },
      B: { bg: 'warning.main20', color: ct.warning.main },
      C: { bg: 'success.main20', color: ct.success.main },
    };
    return map[abc || ''] || { bg: 'grey.100', color: 'grey.600' };
  };

  const columns: ColumnDef<InventoryTurnoverStat>[] = [
    {
      id: 'material_code',
      label: '物料编码',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.product_code}</Box>,
    },
    { id: 'material_name', label: '物料名称', render: (row) => row.product_name },
    {
      id: 'category',
      label: '分类',
      render: (row) =>
        row.category ? (
          <Chip
            label={row.category}
            size='small'
            variant='outlined'
          />
        ) : (
          '-'
        ),
    },
    {
      id: 'turnover_rate',
      label: '周转率',
      align: 'right',
      render: (row) => {
        const isLow = row.turnover_rate < 3;
        return (
          <Typography
            variant='body2'
            sx={{ fontWeight: 600, color: isLow ? 'error.dark' : 'success.dark' }}
          >
            {row.turnover_rate.toFixed(2)}
            {isLow && ' (低)'}
          </Typography>
        );
      },
    },
    {
      id: 'inventory_days',
      label: '库存天数',
      align: 'right',
      render: (row) => (
        <Typography
          variant='body2'
          sx={{ color: row.turnover_days > 90 ? 'error.dark' : 'text.primary' }}
        >
          {row.turnover_days}天
        </Typography>
      ),
    },
    {
      id: 'avg_stock',
      label: '平均库存',
      align: 'right',
      render: (row) =>
        row.average_inventory != null ? row.average_inventory.toLocaleString() : '-',
    },
    {
      id: 'cost',
      label: '成本',
      align: 'right',
      render: (row) =>
        row.cost_of_goods_sold != null ? (
          <Typography variant='body2'>
            {row.cost_of_goods_sold.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </Typography>
        ) : (
          '-'
        ),
    },
  ];

  return (
    <PageContainer
      title='库存周转分析'
      subtitle='Inventory Turnover Analysis'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'SCM' },
          { label: '库存周转分析' },
        ]}
        columns={columns}
        data={data}
        loading={loading}
        getRowId={(row) => row.id}
        filters={[
          {
            id: 'category',
            label: '分类',
            type: 'select',
            options: [
              { label: '全部', value: 'all' },
              { label: '原材料', value: '原材料' },
              { label: '零部件', value: '零部件' },
              { label: '成品', value: '成品' },
              { label: '包装材料', value: '包装材料' },
            ],
            value: categoryFilter,
            onChange: (value: unknown) => {
              setCategoryFilter(value as string);
              setPage(0);
            },
          },
        ]}
        filtersValue={undefined}
        onFilterChange={undefined}
        pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}
        onRefresh={loadData}
        actions={[
          {
            label: '导出报表',
            icon: <Download style={{ width: 18, height: 18 }} />,
            onClick: () =>
              addNotification({ title: '导出', message: '库存周转报表导出中...', type: 'info' }),
            variant: 'outlined',
          },
          {
            label: '趋势分析',
            icon: <TrendingUp style={{ width: 18, height: 18 }} />,
            onClick: () =>
              addNotification({ title: '趋势', message: '正在加载周转趋势分析...', type: 'info' }),
            variant: 'outlined',
          },
        ]}
        emptyMessage='暂无库存周转数据'
      />
    </PageContainer>
  );
};

export default ScmInventoryTurnoverPage;
