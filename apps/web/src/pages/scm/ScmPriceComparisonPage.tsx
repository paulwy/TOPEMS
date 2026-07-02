import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, Button } from '@mui/material';
import { Eye, Edit, Download } from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { scmApi } from '@/api/scm';
import type { PriceComparison } from '@/api/scm';
import { useAppStore } from '@/store';

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: '询价中', bg: 'warning.light', color: 'warning.700' },
  quoted: { label: '已报价', bg: 'primary.100', color: 'primary.700' },
  comparing: { label: '比价中', bg: 'secondary.100', color: 'secondary.600' },
  completed: { label: '已完成', bg: 'success.lighter', color: 'success.700' },
  cancelled: { label: '已取消', bg: 'grey.200', color: 'grey.600' },
};

const ScmPriceComparisonPage: React.FC = () => {
  const [comparisons, setComparisons] = useState<PriceComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadComparisons();
  }, [page, pageSize, statusFilter]);

  const loadComparisons = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: page + 1, pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await scmApi.priceComparisons.list(params as any);
      if (response.success && response.data) {
        setComparisons(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: any) {
      console.error('加载询价比价数据失败:', error);
      addNotification({ title: '加载失败', message: '加载询价比价数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_MAP[status] || { label: status, bg: 'grey.100', color: '#475569' };
    return (
      <Chip
        label={config.label}
        size='small'
        sx={{ bgcolor: config.bg, color: config.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<PriceComparison>[] = [
    {
      id: 'request_no',
      label: '询价单号',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.comparison_no}</Box>,
    },
    { id: 'title', label: '标题' },
    { id: 'supplier', label: '供应商', render: (row) => row.result_supplier_name || '-' },
    { id: 'material', label: '物料', render: (row) => row.product_name },
    {
      id: 'quoted_price',
      label: '报价',
      align: 'right',
      render: (row) =>
        row.result_price != null ? (
          <Typography
            variant='body2'
            sx={{ fontWeight: 600 }}
          >
            {row.result_price.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </Typography>
        ) : (
          '-'
        ),
    },
    {
      id: 'lowest_price',
      label: '最低价',
      align: 'right',
      render: (row) =>
        row.result_amount != null ? (
          <Typography
            variant='body2'
            sx={{ color: 'success.dark' }}
          >
            {row.result_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </Typography>
        ) : (
          '-'
        ),
    },
    { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
    {
      id: 'deadline',
      label: '截止日期',
      render: (row) =>
        row.deadline ? (
          <Typography variant='body2'>
            {new Date(row.deadline).toLocaleDateString('zh-CN')}
          </Typography>
        ) : (
          '-'
        ),
    },
  ];

  const rowActions: RowAction<PriceComparison>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) =>
        addNotification({
          title: '查看',
          message: `查看询价单: ${row.comparison_no}`,
          type: 'info',
        }),
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      color: 'primary',
      show: (row) => row.status === 'pending' || row.status === 'quoted',
    },
  ];

  return (
    <PageContainer
      title='询价比价'
      subtitle='Price Comparison Management'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'SCM' },
          { label: '询价比价' },
        ]}
        columns={columns}
        data={comparisons}
        loading={loading}
        getRowId={(row) => row.id}
        filters={[
          {
            id: 'status',
            label: '状态',
            type: 'select',
            options: [
              { label: '全部', value: 'all' },
              { label: '询价中', value: 'pending' },
              { label: '已报价', value: 'quoted' },
              { label: '比价中', value: 'comparing' },
              { label: '已完成', value: 'completed' },
              { label: '已取消', value: 'cancelled' },
            ],
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(value);
              setPage(0);
            },
          },
        ]}
        filtersValue={undefined}
        onFilterChange={undefined}
        pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}
        onRefresh={loadComparisons}
        actions={[
          {
            label: '导出',
            icon: <Download style={{ width: 18, height: 18 }} />,
            onClick: () =>
              addNotification({ title: '导出', message: '询价比价数据导出中...', type: 'info' }),
            variant: 'outlined',
          },
        ]}
        rowActions={rowActions}
        emptyMessage='暂无询价比价数据'
      />
    </PageContainer>
  );
};

export default ScmPriceComparisonPage;
