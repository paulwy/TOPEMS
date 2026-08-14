import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TablePagination,
  Alert,
  Button,
} from '@mui/material';
import { LoadingSpinner } from '@topems/shared-components';
import { ExportButton } from '@/components/export';
import { DashboardTemplate, type StatCard } from '@/components/templates';
import { PageContainer } from '@/components/common';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BIChartColors } from '@/components/charts/chartTheme';
import {
  getComparisonResult,
  runComparison,
  listComparisons,
  type ComparisonResult,
  type ComparisonAnalysis,
} from '@/api/bi';
import { designTokens } from '@/theme/tokens';
import { logger } from '@/utils/logger';
import { BI_PATHS } from '@/modules/bi/config';

import { useTranslation } from 'react-i18next';


import { QUERY_KEYS } from '@/lib/reactQuery';

const ct= designTokens.colors;

interface ComparisonRow {
  id: string;
  comparisonItem: string;
  indicatorA: number;
  indicatorB: number;
  difference: number;
  changeRate: number;
}

const BIComparisonPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<ComparisonRow[]>([]);
  const [timeRange, setTimeRange] = useState<string>('2024H1');
  const [comparisonDimension, setComparisonDimension] = useState<string>('halfYear');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentComparisonId, setCurrentComparisonId] = useState<string | null>(null);

  const comparisonsQuery = useQuery<ComparisonAnalysis[]>({
    queryKey: QUERY_KEYS.AD_HOC.BI_COMPARISONS_BASE,
    queryFn: async () => {
      const res = await listComparisons();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const comparisons = comparisonsQuery.data ?? [];

  useEffect(() => {
    if (comparisons.length > 0 && !currentComparisonId) {
      setCurrentComparisonId(comparisons[0].id);
    }
  }, [comparisons, currentComparisonId]);

  const comparisonResultQuery = useQuery<ComparisonRow[]>({
    queryKey: [...QUERY_KEYS.AD_HOC.BI_COMPARISON_RESULT_BASE, currentComparisonId],
    queryFn: async () => {
      if (!currentComparisonId) return [];
      const res = await getComparisonResult(currentComparisonId);
      if (res.success && res.data) {
        const result: ComparisonResult = res.data;
        return result.data.map((item, index) => ({
          id: `${index + 1}`,
          comparisonItem: item.indicator,
          indicatorA: item.value_a,
          indicatorB: item.value_b,
          difference: item.difference,
          changeRate: item.change_rate,
        }));
      }
      return [];
    },
    enabled: !!currentComparisonId,
    staleTime: 5 * 60 * 1000,
  });

  const data = comparisonResultQuery.data ?? [];
  const loading = comparisonResultQuery.isLoading;

  useEffect(() => {
    if (comparisonResultQuery.isError) {
      logger.error('Failed to load comparison data:', comparisonResultQuery.error);
      setError(t('bi.bi_comparison_page.fail'));
    } else {
      setError(null);
    }
  }, [comparisonResultQuery.isError, comparisonResultQuery.error]);

  useEffect(() => {
    setFilteredData(data);
    setPage(0);
  }, [timeRange, comparisonDimension, data]);

  const runMutation = useMutation({
    mutationFn: (id: string) => runComparison(id),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.AD_HOC.BI_COMPARISON_RESULT_BASE, currentComparisonId] ,
  exact: false,
  refetchType: 'active',
});
      }
    },
    onError: (e: unknown) => {
      logger.error('Failed to run comparison:', e);
      setError(t('bi.bi_comparison_page.fail_1'));
    },
  });

  const handleRefresh = () => {
    if (!currentComparisonId) {
      setError(t('bi.bi_comparison_page.create'));
      return;
    }
    setError(null);
    runMutation.mutate(currentComparisonId);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const exportData = filteredData.map((item) => ({
    对比项: item.comparisonItem,
    指标A: item.indicatorA,
    指标B: item.indicatorB,
    差异: item.difference,
    变化率: `${item.changeRate.toFixed(2)}%`,
  }));

  // 构建统计数据卡片
  const statsCards: StatCard[] = [
    {
      id: 'total-items',
      title: t('bi.bi_comparison_page.text_82bbf6'),
      value: filteredData.length,
      icon: <TrendingUp size={24} />,
      color: 'primary',
    },
    {
      id: 'positive-change',
      title: t('bi.bi_comparison_page.text_192089'),
      value: filteredData.filter((d) => d.changeRate > 0).length,
      icon: <TrendingUp size={24} />,
      color: 'success',
    },
    {
      id: 'negative-change',
      title: t('bi.bi_comparison_page.text_dd5404'),
      value: filteredData.filter((d) => d.changeRate < 0).length,
      icon: <TrendingDown size={24} />,
      color: 'error',
    },
  ];

  // 构建对比图表数据
  const chartData = filteredData.map((item) => ({
    name: item.comparisonItem,
    指标A: item.indicatorA,
    指标B: item.indicatorB,
  }));

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LoadingSpinner size='lg' />
      </Box>
    );
  }

  return (
    <PageContainer
      title={t('bi.bi_comparison_page.text_440e3b')}
      subtitle={t('bi.bi_comparison_page.time')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('bi.bi_comparison_page.home'), href: '/dashboard' },
          { label: 'BI' },
          { label: t('bi.bi_comparison_page.text_faa198') },
        ]}
        stats={statsCards}
        loading={loading}
        onRefresh={handleRefresh}
      >
        {error && (
          <Alert
            severity='error'
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        {comparisons.length === 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography
                  variant='h6'
                  sx={{ mb: 2 }}
                >
                  暂无对比分析
                </Typography>
                <Typography
                  variant='body2'
                  color='textSecondary'
                >
                  请先创建对比分析配置
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* 筛选条件 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Filter sx={{ color: 'grey.500' }} />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, color: 'grey.700' }}
              >
                筛选条件
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              {comparisons.length > 0 && (
                <FormControl
                  size='small'
                  sx={{ minWidth: 200 }}
                >
                  <InputLabel>对比分析</InputLabel>
                  <Select
                    value={currentComparisonId || ''}
                    label={t('bi.bi_comparison_page.text_1a2beb')}
                    onChange={(e) => setCurrentComparisonId(e.target.value)}
                  >
                    {comparisons.map((comp) => (
                      <MenuItem
                        key={comp.id}
                        value={comp.id}
                      >
                        {comp.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <FormControl
                size='small'
                sx={{ minWidth: 150 }}
              >
                <InputLabel>时间范围</InputLabel>
                <Select
                  value={timeRange}
                  label={t('bi.bi_comparison_page.time_1')}
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <MenuItem value='all'>全部时间</MenuItem>
                  <MenuItem value='2024H1'>2024上半年</MenuItem>
                  <MenuItem value='2024H2'>2024下半年</MenuItem>
                  <MenuItem value='2023'>2023年</MenuItem>
                </Select>
              </FormControl>
              <FormControl
                size='small'
                sx={{ minWidth: 150 }}
              >
                <InputLabel>对比维度</InputLabel>
                <Select
                  value={comparisonDimension}
                  label={t('bi.bi_comparison_page.text_457941')}
                  onChange={(e) => setComparisonDimension(e.target.value)}
                >
                  <MenuItem value='halfYear'>半年度对比</MenuItem>
                  <MenuItem value='quarterly'>季度对比</MenuItem>
                  <MenuItem value='monthly'>月度对比</MenuItem>
                  <MenuItem value='yearly'>年度对比</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ flex: 1 }} />
              <Button
                variant='outlined'
                onClick={() => navigate(BI_PATHS.dashboard)}
              >
                返回数据大屏
              </Button>
              <ExportButton
                data={exportData}
                columns={[
                  t('bi.bi_comparison_page.text_97d1f3'),
                  t('bi.bi_comparison_page.text_f776bc'),
                  t('bi.bi_comparison_page.text_841866'),
                  t('bi.bi_comparison_page.difference'),
                  t('bi.bi_comparison_page.text_afb4b6'),
                ]}
                filename='bi-comparison-data'
              />
            </Box>
          </CardContent>
        </Card>

        {/* 对比图表 */}
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={t('bi.bi_comparison_page.text_70ef92')}
            subheader={t('bi.bi_comparison_page.text_d7d403')}
          />
          <CardContent>
            <ResponsiveContainer
              width='100%'
              height={300}
            >
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray='3 3'
                  stroke={ct.border.default}
                />
                <XAxis
                  dataKey='name'
                  tick={{ fill: ct.text.secondary, fontSize: 12 }}
                  angle={-45}
                  textAnchor='end'
                  height={80}
                />
                <YAxis tick={{ fill: ct.text.secondary, fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey={t('bi.bi_comparison_page.text_f776bc')}
                  fill={BIChartColors.series[0]}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey={t('bi.bi_comparison_page.text_841866')}
                  fill={BIChartColors.series[1]}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 对比数据表 */}
        <Card>
          <CardHeader
            title={t('bi.bi_comparison_page.text_f9aa62')}
            subheader={t('bi.bi_comparison_page.text_008210')}
          />
          <CardContent>
            <Paper sx={{ overflow: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>对比项</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>指标A</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>指标B</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>差异</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>变化率</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row) => (
                      <TableRow
                        key={row.id}
                        hover
                      >
                        <TableCell sx={{ fontWeight: 500 }}>{row.comparisonItem}</TableCell>
                        <TableCell>{row.indicatorA.toLocaleString()}</TableCell>
                        <TableCell>{row.indicatorB.toLocaleString()}</TableCell>
                        <TableCell
                          sx={{
                            color:
                              row.difference > 0
                                ? 'error.main'
                                : row.difference < 0
                                  ? 'success.main'
                                  : 'grey.600',
                            fontWeight: 500,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            {row.difference > 0 ? (
                              <TrendingUp size={14} />
                            ) : row.difference < 0 ? (
                              <TrendingDown size={14} />
                            ) : (
                              <Minus size={14} />
                            )}
                            {row.difference > 0 ? '+' : ''}
                            {row.difference.toLocaleString()}
                          </Box>
                        </TableCell>
                        <TableCell
                          sx={{
                            color:
                              row.changeRate > 0
                                ? 'error.main'
                                : row.changeRate < 0
                                  ? 'success.main'
                                  : 'grey.600',
                            fontWeight: 500,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            {row.changeRate > 0 ? (
                              <TrendingUp size={14} />
                            ) : row.changeRate < 0 ? (
                              <TrendingDown size={14} />
                            ) : (
                              <Minus size={14} />
                            )}
                            {row.changeRate > 0 ? '+' : ''}
                            {row.changeRate.toFixed(2)}%
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 20, 50]}
                component='div'
                count={filteredData.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage={t('bi.bi_comparison_page.text_b6960b')}
              />
            </Paper>
          </CardContent>
        </Card>
      </DashboardTemplate>
    </PageContainer>
  );
};

export default BIComparisonPage;
