import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Chip, Rating, Divider } from '@mui/material';
import { TrendingUp, TrendingDown, Award, Target, BarChart3, RefreshCw } from 'lucide-react';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { srmApi, type SupplierPerformance, type PerformanceSummary } from '@/api/srm';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';

const SrmPerformancePage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [performances, setPerformances] = useState<SupplierPerformance[]>([]);
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [page, rowsPerPage, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [perfResponse, summaryResponse] = await Promise.all([
        srmApi.getPerformanceReports(),
        srmApi.getPerformanceSummary(),
      ]);

      if (summaryResponse.success && summaryResponse.data) {
        setSummary(summaryResponse.data);
      }

      if (perfResponse.success && perfResponse.data) {
        let filtered = perfResponse.data.performances;
        if (searchTerm) {
          filtered = filtered.filter((p) =>
            p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        setTotal(filtered.length);
        setPerformances(filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage));
      } else {
        addNotification({
          type: 'error',
          title: '加载失败',
          message: perfResponse.message || '加载绩效数据失败',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('加载绩效数据失败:', err);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '加载绩效数据失败',
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score?: number): 'success' | 'warning' | 'error' | 'default' => {
    if (!score) return 'default';
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Award size={20} color='gold' />;
    if (index === 1) return <Award size={20} color='silver' />;
    if (index === 2) return <Award size={20} color='#cd7f32' />;
    return null;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return '#fffbeb';
    if (index === 1) return '#f3f4f6';
    if (index === 2) return '#fff8e7';
    return 'transparent';
  };

  const columns: ColumnDef<SupplierPerformance>[] = [
    {
      id: 'rank',
      label: '排名',
      render: (_, index) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {getRankIcon(index)}
          <Typography sx={{ ml: 1, fontWeight: 'bold' }}>{index + 1}</Typography>
        </Box>
      ),
    },
    {
      id: 'supplier_name',
      label: '供应商名称',
      render: (row, index) => (
        <Box
          sx={{
            backgroundColor: getRankBg(index),
            padding: 1,
            borderRadius: 1,
            fontWeight: 'medium',
          }}
        >
          {row.supplier_name}
        </Box>
      ),
    },
    {
      id: 'total_orders',
      label: '订单数量',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Target size={16} />
          {row.total_orders}
        </Box>
      ),
    },
    {
      id: 'total_amount',
      label: '订单金额',
      render: (row) => `${(row.total_amount / 10000).toFixed(2)}万`,
    },
    {
      id: 'avg_overall_score',
      label: '综合评分',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Rating
            value={row.avg_overall_score || 0}
            readOnly
            max={100}
            precision={1}
            size='small'
          />
          <Chip
            label={row.avg_overall_score?.toFixed(1) || '-'}
            size='small'
            color={getScoreColor(row.avg_overall_score)}
          />
        </Box>
      ),
    },
    {
      id: 'avg_quality_score',
      label: '质量评分',
      render: (row) => (
        <Chip
          label={row.avg_quality_score?.toFixed(1) || '-'}
          size='small'
          color={getScoreColor(row.avg_quality_score)}
        />
      ),
    },
    {
      id: 'avg_delivery_score',
      label: '交付评分',
      render: (row) => (
        <Chip
          label={row.avg_delivery_score?.toFixed(1) || '-'}
          size='small'
          color={getScoreColor(row.avg_delivery_score)}
        />
      ),
    },
    {
      id: 'on_time_delivery_rate',
      label: '准时交付率',
      render: (row) => {
        const rate = row.on_time_delivery_rate;
        if (rate === undefined || rate === null) return '-';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {rate >= 0.9 ? (
              <TrendingUp size={16} color='green' />
            ) : (
              <TrendingDown size={16} color='red' />
            )}
            <Typography variant='body2'>{(rate * 100).toFixed(0)}%</Typography>
          </Box>
        );
      },
    },
    {
      id: 'defect_rate',
      label: '缺陷率',
      render: (row) => {
        const rate = row.defect_rate;
        if (rate === undefined || rate === null) return '-';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {rate <= 0.02 ? (
              <TrendingDown size={16} color='green' />
            ) : (
              <TrendingUp size={16} color='red' />
            )}
            <Typography variant='body2'>{(rate * 100).toFixed(2)}%</Typography>
          </Box>
        );
      },
    },
    {
      id: 'evaluation_count',
      label: '评估次数',
      render: (row) => row.evaluation_count,
    },
  ];

  const headerContent = (
    <Box>
      {summary && (
        <Box sx={{ mb: 4 }}>
          <Typography variant='h6' sx={{ mb: 3, fontWeight: 'bold' }}>绩效概览</Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(4, 1fr)',
              },
              gap: 2,
            }}
          >
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Typography color='text.secondary' variant='body2'>供应商总数</Typography>
                    <Typography variant='h4' sx={{ fontWeight: 'bold' }}>{summary.total_suppliers}</Typography>
                  </div>
                  <BarChart3 color='primary' fontSize='large' />
                </Box>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Typography color='text.secondary' variant='body2'>已评估供应商</Typography>
                    <Typography variant='h4' sx={{ fontWeight: 'bold' }}>{summary.evaluated_suppliers}</Typography>
                  </div>
                  <Target color='primary' fontSize='large' />
                </Box>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Typography color='text.secondary' variant='body2'>评估覆盖率</Typography>
                    <Typography variant='h4' sx={{ fontWeight: 'bold' }}>{(summary.evaluation_rate * 100).toFixed(1)}%</Typography>
                  </div>
                  <TrendingUp color='success' fontSize='large' />
                </Box>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Typography color='text.secondary' variant='body2'>平均综合评分</Typography>
                    <Typography
                      variant='h4'
                      sx={{
                        fontWeight: 'bold',
                        color: summary.avg_overall_score >= 80 ? 'green' : summary.avg_overall_score >= 60 ? 'orange' : 'red',
                      }}
                    >
                      {summary.avg_overall_score?.toFixed(1)}
                    </Typography>
                  </div>
                  <Award color='primary' fontSize='large' />
                </Box>
              </CardContent>
            </Card>
          </Box>

          {summary.top_supplier && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Typography color='text.secondary' variant='body2'>最佳供应商</Typography>
                    <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                      {summary.top_supplier.name}
                      <Chip
                        sx={{ ml: 2 }}
                        label={`${summary.top_supplier.avg_score.toFixed(1)}分`}
                        color='success'
                        size='small'
                      />
                    </Typography>
                  </div>
                  <Award color='gold' fontSize='large' />
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />
    </Box>
  );

  return (
    <ListPageTemplate
      title='供应商绩效'
      subtitle='分析供应商绩效数据、评估供应商表现、优化供应链'
      columns={columns}
      data={performances}
      loading={loading}
      pagination={{
        page,
        pageSize: rowsPerPage,
        total,
        onPageChange: setPage,
        onPageSizeChange: (size) => {
          setRowsPerPage(size);
          setPage(0);
        },
      }}
      searchable
      searchPlaceholder='搜索供应商名称...'
      searchValue={searchTerm}
      onSearch={(value) => {
        setSearchTerm(value);
        setPage(0);
      }}
      actions={[
        {
          label: '刷新数据',
          icon: <RefreshCw size={18} />,
          onClick: loadData,
          variant: 'outlined',
        },
      ]}
      headerContent={headerContent}
      getRowId={(row) => row.supplier_id}
      onRefresh={loadData}
      emptyMessage='暂无绩效数据'
    />
  );
};

export default SrmPerformancePage;