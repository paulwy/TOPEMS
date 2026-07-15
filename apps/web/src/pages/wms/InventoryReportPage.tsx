import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  BarChart3,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Warehouse as WarehouseIcon,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { PageContainer, Grid } from '@/components/common';
import { wmsApi } from '@/api/wms';
import type {
  InventoryStatistics,
  ABCAnalysisItem,
  InventoryTurnoverData,
  InventoryValueByWarehouse,
  Warehouse,
} from '@/api/wms';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const InventoryReportPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');

  const { data: warehousesData } = useQuery({
    queryKey: [QUERY_KEYS.WMS.WAREHOUSES],
    queryFn: async () => {
      const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
      if (!response.success) {
        throw new Error('Failed to fetch warehouses');
      }
      return response.data;
    },
  });

  const warehouses = warehousesData?.items || [];

  const { data: statistics, isLoading: statisticsLoading } = useQuery({
    queryKey: [QUERY_KEYS.WMS.INVENTORY_STATS, warehouseFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (warehouseFilter) params.warehouse_id = warehouseFilter;

      const response = await wmsApi.inventoryStats.getStatistics(params as any);
      if (!response.success) {
        throw new Error('Failed to fetch inventory statistics');
      }
      return response.data as InventoryStatistics;
    },
  });

  const { data: abcData, isLoading: abcLoading } = useQuery({
    queryKey: [QUERY_KEYS.WMS.INVENTORY_ABC, warehouseFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (warehouseFilter) params.warehouse_id = warehouseFilter;

      const response = await wmsApi.inventoryStats.getABCAnalysis(params as any);
      if (!response.success) {
        throw new Error('Failed to fetch ABC analysis');
      }
      return response.data;
    },
    enabled: currentTab === 1,
  });

  const abcAnalysis = abcData?.items || [];
  const abcTotalSku = abcData?.total_sku || 0;
  const abcTotalValue = abcData?.total_value || 0;

  const { data: turnoverDataRaw, isLoading: turnoverLoading } = useQuery({
    queryKey: [QUERY_KEYS.WMS.INVENTORY_TURNOVER, warehouseFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        period_type: 'month',
        periods: 12,
      };
      if (warehouseFilter) params.warehouse_id = warehouseFilter;

      const response = await wmsApi.inventoryStats.getTurnover(params as any);
      if (!response.success) {
        throw new Error('Failed to fetch inventory turnover');
      }
      return response.data;
    },
    enabled: currentTab === 2,
  });

  const turnoverData = turnoverDataRaw?.items || [];

  const { data: valueByWarehouseData, isLoading: valueByWarehouseLoading } = useQuery({
    queryKey: [QUERY_KEYS.WMS.INVENTORY_VALUE_BY_WAREHOUSE, warehouseFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (warehouseFilter) params.category_id = warehouseFilter;

      const response = await wmsApi.inventoryStats.getValueByWarehouse(params as any);
      if (!response.success) {
        throw new Error('Failed to fetch inventory value by warehouse');
      }
      return response.data;
    },
    enabled: currentTab === 3,
  });

  const valueByWarehouse = valueByWarehouseData?.items || [];
  const totalWarehouseValue = valueByWarehouseData?.total_value || 0;

  const getABCCategoryColor = (category: string) => {
    switch (category) {
      case 'A':
        return 'error';
      case 'B':
        return 'warning';
      case 'C':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(2)}万`;
    }
    return num.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  };

  const renderStatisticsTab = () => (
    <Box>
      {/* Summary Cards */}
      <Grid
        container
        spacing={3}
        sx={{ mb: 3 }}
      >
        <Grid
          xs={12}
          sm={6}
          md={3}
        >
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarehouseIcon
                  style={{ width: 20, height: 20, marginRight: 8, color: ct.secondary[400] }}
                />
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  仓库数量
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                {statistics?.warehouse_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          xs={12}
          sm={6}
          md={3}
        >
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Package
                  style={{ width: 20, height: 20, marginRight: 8, color: ct.success.main }}
                />
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  物料种类
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                {statistics?.total_sku_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          xs={12}
          sm={6}
          md={3}
        >
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp
                  style={{ width: 20, height: 20, marginRight: 8, color: ct.warning.main }}
                />
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  库存总量
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                {formatNumber(statistics?.total_quantity || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          xs={12}
          sm={6}
          md={3}
        >
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BarChart3
                  style={{ width: 20, height: 20, marginRight: 8, color: ct.secondary[500] }}
                />
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  库存价值
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                ¥{formatNumber(statistics?.total_value || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alert Cards */}
      <Grid
        container
        spacing={3}
        sx={{ mb: 3 }}
      >
        <Grid
          xs={12}
          sm={6}
          md={3}
        >
          <Card sx={{ height: '100%', bgcolor: 'error.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AlertTriangle
                  style={{ width: 20, height: 20, marginRight: 8, color: ct.error[600] }}
                />
                <Typography
                  variant='subtitle2'
                  color='error.dark'
                >
                  缺货物料
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'error.dark' }}
              >
                {statistics?.out_of_stockitems || 0}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                需要立即补货
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          xs={12}
          sm={6}
          md={3}
        >
          <Card sx={{ height: '100%', bgcolor: 'warning.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingDown
                  style={{ width: 20, height: 20, marginRight: 8, color: ct.warning.dark }}
                />
                <Typography
                  variant='subtitle2'
                  color='warning.dark'
                >
                  低库存物料
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'warning.dark' }}
              >
                {statistics?.low_stockitems || 0}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              ></Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          xs={12}
          sm={6}
          md={3}
        >
          <Card sx={{ height: '100%', bgcolor: 'info.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Clock style={{ width: 20, height: 20, marginRight: 8, color: ct.info.dark }} />
                <Typography
                  variant='subtitle2'
                  color='info.dark'
                >
                  平均周转天数
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'info.dark' }}
              >
                {statistics?.average_turnover_days || 0}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                天
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          xs={12}
          sm={6}
          md={3}
        >
          <Card sx={{ height: '100%', bgcolor: 'success.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp
                  style={{ width: 20, height: 20, marginRight: 8, color: ct.success.dark }}
                />
                <Typography
                  variant='subtitle2'
                  color='success.dark'
                >
                  周转率
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'success.dark' }}
              >
                {statistics?.turnover_rate || 0}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                次/年
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Inventory Alert Details */}
      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ mb: 2 }}
          >
            库存预警概览
          </Typography>
          <Grid
            container
            spacing={2}
          >
            <Grid
              item
              xs={6}
              md={3}
            >
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {statistics?.low_stockitems || 0}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  低库存
                </Typography>
              </Box>
            </Grid>
            <Grid
              item
              xs={6}
              md={3}
            >
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {statistics?.out_of_stockitems || 0}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  缺货
                </Typography>
              </Box>
            </Grid>
            <Grid
              item
              xs={6}
              md={3}
            >
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {statistics?.over_stockitems || 0}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  超库存
                </Typography>
              </Box>
            </Grid>
            <Grid
              item
              xs={6}
              md={3}
            >
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {(statistics?.low_stockitems || 0) + (statistics?.out_of_stockitems || 0)}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  需关注
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

  const renderABCTab = () => (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant='h6'>ABC分析概览</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Chip
                label={`A类: 70%价值`}
                color='error'
                variant='outlined'
              />
              <Chip
                label={`B类: 20%价值`}
                color='warning'
                variant='outlined'
              />
              <Chip
                label={`C类: 10%价值`}
                color='success'
                variant='outlined'
              />
            </Box>
          </Box>
          <Grid
            container
            spacing={2}
          >
            <Grid
              item
              xs={6}
              md={3}
            >
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: 'error.dark' }}
                >
                  {abcAnalysis.filter((item) => item.category === 'A').length}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  A类SKU数
                </Typography>
              </Box>
            </Grid>
            <Grid
              item
              xs={6}
              md={3}
            >
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: 'warning.dark' }}
                >
                  {abcAnalysis.filter((item) => item.category === 'B').length}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  B类SKU数
                </Typography>
              </Box>
            </Grid>
            <Grid
              item
              xs={6}
              md={3}
            >
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: 'success.dark' }}
                >
                  {abcAnalysis.filter((item) => item.category === 'C').length}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  C类SKU数
                </Typography>
              </Box>
            </Grid>
            <Grid
              item
              xs={6}
              md={3}
            >
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {abcTotalSku}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  总SKU数
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ mb: 2 }}
          >
            ABC分类明细
          </Typography>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>分类</TableCell>
                  <TableCell align='right'>SKU数量</TableCell>
                  <TableCell align='right'>SKU占比</TableCell>
                  <TableCell align='right'>总价值</TableCell>
                  <TableCell align='right'>价值占比</TableCell>
                  <TableCell align='right'>累计价值占比</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {abcAnalysis.map((item, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      bgcolor:
                        item.category === 'A'
                          ? 'error.50'
                          : item.category === 'B'
                            ? 'warning.50'
                            : 'success.50',
                    }}
                  >
                    <TableCell>
                      <Chip
                        label={item.category}
                        color={
                          getABCCategoryColor(item.category) as 'error' | 'warning' | 'success'
                        }
                        size='small'
                      />
                    </TableCell>
                    <TableCell align='right'>{item.sku_count}</TableCell>
                    <TableCell align='right'>{(item.sku_percentage * 100).toFixed(2)}%</TableCell>
                    <TableCell align='right'>¥{formatNumber(item.total_value)}</TableCell>
                    <TableCell align='right'>{(item.value_percentage * 100).toFixed(2)}%</TableCell>
                    <TableCell align='right'>
                      {(item.cumulative_value_percentage * 100).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
                {abcAnalysis.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      sx={{ textAlign: 'center' }}
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  const renderTurnoverTab = () => (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ mb: 2 }}
          >
            库存周转分析
          </Typography>
          <Grid
            container
            spacing={2}
          >
            <Grid
              xs={12}
              md={4}
            >
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {turnoverData.length > 0
                    ? turnoverData[turnoverData.length - 1]?.turnover_rate.toFixed(2)
                    : '0.00'}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  当前周转率 (次/年)
                </Typography>
              </Box>
            </Grid>
            <Grid
              xs={12}
              md={4}
            >
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {turnoverData.length > 0
                    ? turnoverData[turnoverData.length - 1]?.turnover_days.toFixed(0)
                    : '0'}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  当前周转天数
                </Typography>
              </Box>
            </Grid>
            <Grid
              xs={12}
              md={4}
            >
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  ¥
                  {formatNumber(
                    turnoverData.length > 0
                      ? turnoverData[turnoverData.length - 1]?.average_inventory_value || 0
                      : 0
                  )}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  平均库存金额
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ mb: 2 }}
          >
            周转数据明细
          </Typography>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>期间</TableCell>
                  <TableCell align='right'>周转率</TableCell>
                  <TableCell align='right'>周转天数</TableCell>
                  <TableCell align='right'>销售成本</TableCell>
                  <TableCell align='right'>平均库存</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {turnoverData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.period}</TableCell>
                    <TableCell align='right'>{item.turnover_rate.toFixed(2)}</TableCell>
                    <TableCell align='right'>{item.turnover_days.toFixed(0)}</TableCell>
                    <TableCell align='right'>¥{formatNumber(item.cost_of_goods_sold)}</TableCell>
                    <TableCell align='right'>
                      ¥{formatNumber(item.average_inventory_value)}
                    </TableCell>
                  </TableRow>
                ))}
                {turnoverData.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      sx={{ textAlign: 'center' }}
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  const renderValueByWarehouseTab = () => (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant='h6'>各仓库库存价值分布</Typography>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700 }}
            >
              总价值: ¥{formatNumber(totalWarehouseValue)}
            </Typography>
          </Box>
          <Grid
            container
            spacing={2}
          >
            {valueByWarehouse.map((item, index) => {
              const percentage =
                totalWarehouseValue > 0 ? (item.total_value / totalWarehouseValue) * 100 : 0;
              return (
                <Grid
                  item
                  xs={12}
                  key={index}
                >
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant='body1'>{item.warehouse_name}</Typography>
                      <Typography variant='body1'>
                        ¥{formatNumber(item.total_value)} ({percentage.toFixed(1)}%)
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        height: 8,
                        bgcolor: 'grey.200',
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${percentage}%`,
                          bgcolor:
                            index === 0
                              ? 'primary.main'
                              : index === 1
                                ? 'secondary.main'
                                : 'grey.500',
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        SKU: {item.sku_count}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        数量: {formatNumber(item.total_quantity)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              );
            })}
            {valueByWarehouse.length === 0 && (
              <Grid
                item
                xs={12}
              >
                <Box sx={{ textAlign: 'center', p: 4 }}>
                  <Typography color='text.secondary'>暂无数据</Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ mb: 2 }}
          >
            仓库库存明细
          </Typography>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>仓库</TableCell>
                  <TableCell align='right'>SKU数量</TableCell>
                  <TableCell align='right'>库存数量</TableCell>
                  <TableCell align='right'>库存价值</TableCell>
                  <TableCell align='right'>价值占比</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {valueByWarehouse.map((item, index) => {
                  const percentage =
                    totalWarehouseValue > 0 ? (item.total_value / totalWarehouseValue) * 100 : 0;
                  return (
                    <TableRow key={index}>
                      <TableCell>{item.warehouse_name}</TableCell>
                      <TableCell align='right'>{item.sku_count}</TableCell>
                      <TableCell align='right'>{formatNumber(item.total_quantity)}</TableCell>
                      <TableCell align='right'>¥{formatNumber(item.total_value)}</TableCell>
                      <TableCell align='right'>{percentage.toFixed(2)}%</TableCell>
                    </TableRow>
                  );
                })}
                {valueByWarehouse.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      sx={{ textAlign: 'center' }}
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <PageContainer
      title='库存报表'
      subtitle='查看库存统计数据、库龄分析、周转分析等报表'
      headerProps={{
        pageIcon: <BarChart3 style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]}, ${ct.secondary[600]})`,
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={currentTab}
              onChange={(_, newValue) => setCurrentTab(newValue)}
            >
              <Tab label='库存统计' />
              <Tab label='ABC分析' />
              <Tab label='周转分析' />
              <Tab label='仓库分布' />
            </Tabs>
          </Box>
          <FormControl
            size='small'
            sx={{ minWidth: 200 }}
          >
            <InputLabel>仓库筛选</InputLabel>
            <Select
              value={warehouseFilter}
              label='仓库筛选'
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <MenuItem value=''>全部仓库</MenuItem>
              {warehouses.map((w) => (
                <MenuItem
                  key={w.id}
                  value={w.id}
                >
                  {w.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <TabPanel
        value={currentTab}
        index={0}
      >
        {renderStatisticsTab()}
      </TabPanel>
      <TabPanel
        value={currentTab}
        index={1}
      >
        {renderABCTab()}
      </TabPanel>
      <TabPanel
        value={currentTab}
        index={2}
      >
        {renderTurnoverTab()}
      </TabPanel>
      <TabPanel
        value={currentTab}
        index={3}
      >
        {renderValueByWarehouseTab()}
      </TabPanel>
    </PageContainer>
  );
};

export default InventoryReportPage;
