import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Table2,
  Filter,
  RefreshCw,
  Download,
  Layers,
  Search,
} from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  TextField,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Grid,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import { ChartComponent } from '@/components/bi/ChartLibrary';
import { FilterBar } from '@/components/bi/FilterBar';
import type { FilterConfig } from '@/api/bi';
import { logger } from '@/utils/logger';

const mockSalesData = [
  { month: '1月', 销售额: 125000, 订单数: 450, 客户数: 180 },
  { month: '2月', 销售额: 138000, 订单数: 480, 客户数: 195 },
  { month: '3月', 销售额: 152000, 订单数: 520, 客户数: 210 },
  { month: '4月', 销售额: 145000, 订单数: 500, 客户数: 205 },
  { month: '5月', 销售额: 168000, 订单数: 560, 客户数: 230 },
  { month: '6月', 销售额: 185000, 订单数: 620, 客户数: 250 },
];

const mockRegionData = [
  { region: '华东', 销售额: 420000, 占比: 35 },
  { region: '华南', 销售额: 320000, 占比: 27 },
  { region: '华北', 销售额: 240000, 占比: 20 },
  { region: '西南', 销售额: 120000, 占比: 10 },
  { region: '其他', 销售额: 96000, 占比: 8 },
];

const mockPivotData = [
  {
    category: '电子产品',
    '1月': 45000,
    '2月': 52000,
    '3月': 58000,
    '4月': 55000,
    '5月': 62000,
    '6月': 68000,
  },
  {
    category: '服装配饰',
    '1月': 32000,
    '2月': 35000,
    '3月': 38000,
    '4月': 36000,
    '5月': 42000,
    '6月': 48000,
  },
  {
    category: '家居用品',
    '1月': 28000,
    '2月': 30000,
    '3月': 32000,
    '4月': 31000,
    '5月': 35000,
    '6月': 38000,
  },
  {
    category: '食品饮料',
    '1月': 20000,
    '2月': 21000,
    '3月': 24000,
    '4月': 23000,
    '5月': 29000,
    '6月': 31000,
  },
];

const filters: FilterConfig[] = [
  {
    id: 'timeRange',
    type: 'select',
    label: '时间范围',
    field: 'time_range',
    options: [
      { label: '本月', value: 'this_month' },
      { label: '上月', value: 'last_month' },
      { label: '近3个月', value: 'last_3_months' },
      { label: '近6个月', value: 'last_6_months' },
      { label: '本年', value: 'this_year' },
    ],
    default_value: 'last_6_months',
  },
  {
    id: 'region',
    type: 'select',
    label: '地区',
    field: 'region',
    options: [
      { label: '全部地区', value: 'all' },
      { label: '华东', value: 'east' },
      { label: '华南', value: 'south' },
      { label: '华北', value: 'north' },
    ],
    default_value: 'all',
  },
  {
    id: 'category',
    type: 'select',
    label: '产品类别',
    field: 'category',
    options: [
      { label: '全部类别', value: 'all' },
      { label: '电子产品', value: 'electronics' },
      { label: '服装配饰', value: 'clothing' },
      { label: '家居用品', value: 'home' },
    ],
    default_value: 'all',
  },
];

const DataAnalysisPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie'>('bar');
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({
    timeRange: 'last_6_months',
    region: 'all',
    category: 'all',
  });
  const [drillLevel, setDrillLevel] = useState(0);

  const handleFilterChange = (values: Record<string, unknown>) => {
    setFilterValues(values);
  };

  const handleDrillDown = () => {
    if (drillLevel < 2) {
      setDrillLevel(drillLevel + 1);
    }
  };

  const handleDrillUp = () => {
    if (drillLevel > 0) {
      setDrillLevel(drillLevel - 1);
    }
  };

  const renderChartAnalysis = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {(['bar', 'line', 'area', 'pie'] as const).map((type) => (
            <Button
              key={type}
              size='small'
              variant={chartType === type ? 'contained' : 'outlined'}
              onClick={() => setChartType(type)}
              startIcon={
                type === 'bar' ? (
                  <BarChart3 size={16} />
                ) : type === 'line' ? (
                  <TrendingUp size={16} />
                ) : type === 'area' ? (
                  <Layers size={16} />
                ) : (
                  <PieChart size={16} />
                )
              }
            >
              {type === 'bar'
                ? '柱状图'
                : type === 'line'
                  ? '折线图'
                  : type === 'area'
                    ? '面积图'
                    : '饼图'}
            </Button>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size='small'
            variant='outlined'
            startIcon={<TrendingUp size={16} />}
            onClick={handleDrillDown}
            disabled={drillLevel >= 2}
          >
            下钻
          </Button>
          <Button
            size='small'
            variant='outlined'
            startIcon={
              <TrendingUp
                size={16}
                style={{ transform: 'rotate(180deg)' }}
              />
            }
            onClick={handleDrillUp}
            disabled={drillLevel <= 0}
          >
            上卷
          </Button>
          <Button
            size='small'
            variant='outlined'
            startIcon={<Download size={16} />}
          >
            导出
          </Button>
        </Box>
      </Box>

      <Card
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider' }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              销售趋势分析
            </Typography>
            <Chip
              label={drillLevel === 0 ? '按月份' : drillLevel === 1 ? '按地区' : '按产品'}
              size='small'
              color='primary'
              variant='outlined'
            />
          </Box>
          {chartType === 'pie' ? (
            <ChartComponent
              type='pie'
              data={mockRegionData}
              xKey='region'
              yKeys={['销售额']}
              chartHeight={400}
              chartWidth={800}
              showLegend
              showTooltip
            />
          ) : (
            <ChartComponent
              type={chartType}
              data={mockSalesData}
              xKey='month'
              yKeys={['销售额', '订单数', '客户数']}
              chartHeight={400}
              chartWidth={800}
              smooth
              showLegend
              showTooltip
            />
          )}
        </CardContent>
      </Card>

      <Grid
        container
        spacing={3}
        sx={{ mt: 3 }}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}
          >
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                地区销售分布
              </Typography>
              <ChartComponent
                type='bar'
                data={mockRegionData}
                xKey='region'
                yKeys={['销售额']}
                chartHeight={300}
                chartWidth={400}
                showTooltip
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}
          >
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                关键指标
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                {[
                  { label: '总销售额', value: '¥913,000', change: '+12.5%', color: '#10B981' },
                  { label: '总订单数', value: '3,130', change: '+8.3%', color: '#3B82F6' },
                  { label: '客户数', value: '1,270', change: '+15.2%', color: '#8B5CF6' },
                  { label: '客单价', value: '¥291.7', change: '+3.8%', color: '#F59E0B' },
                ].map((metric, idx) => (
                  <Box
                    key={idx}
                    sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: 1 }}
                  >
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {metric.label}
                    </Typography>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 700, my: 0.5 }}
                    >
                      {metric.value}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ color: metric.color, fontWeight: 600 }}
                    >
                      {metric.change}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderPivotTable = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600 }}
        >
          数据透视表
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size='small'
            variant='outlined'
            startIcon={<RefreshCw size={16} />}
          >
            刷新
          </Button>
          <Button
            size='small'
            variant='outlined'
            startIcon={<Download size={16} />}
          >
            导出
          </Button>
        </Box>
      </Box>

      <Card
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider' }}
      >
        <CardContent>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#F9FAFB' }}>
                    产品类别
                  </TableCell>
                  {['1月', '2月', '3月', '4月', '5月', '6月'].map((month) => (
                    <TableCell
                      key={month}
                      align='right'
                      sx={{ fontWeight: 600, backgroundColor: '#F9FAFB' }}
                    >
                      {month}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {mockPivotData.map((row) => (
                  <TableRow
                    key={row.category}
                    hover
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{row.category}</TableCell>
                    <TableCell align='right'>{row['1月'].toLocaleString()}</TableCell>
                    <TableCell align='right'>{row['2月'].toLocaleString()}</TableCell>
                    <TableCell align='right'>{row['3月'].toLocaleString()}</TableCell>
                    <TableCell align='right'>{row['4月'].toLocaleString()}</TableCell>
                    <TableCell align='right'>{row['5月'].toLocaleString()}</TableCell>
                    <TableCell align='right'>{row['6月'].toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  const renderDataTable = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600 }}
        >
          数据明细
        </Typography>
        <Button
          size='small'
          variant='outlined'
          startIcon={<Download size={16} />}
        >
          导出数据
        </Button>
      </Box>

      <Card
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider' }}
      >
        <CardContent>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>日期</TableCell>
                  <TableCell>订单号</TableCell>
                  <TableCell>客户</TableCell>
                  <TableCell>产品</TableCell>
                  <TableCell>数量</TableCell>
                  <TableCell align='right'>金额</TableCell>
                  <TableCell>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  {
                    date: '2026-06-28',
                    order: 'SO-20260628-001',
                    customer: '张三',
                    product: '笔记本电脑',
                    qty: 2,
                    amount: 12800,
                    status: '已完成',
                  },
                  {
                    date: '2026-06-28',
                    order: 'SO-20260628-002',
                    customer: '李四',
                    product: '无线耳机',
                    qty: 5,
                    amount: 1950,
                    status: '已完成',
                  },
                  {
                    date: '2026-06-27',
                    order: 'SO-20260627-001',
                    customer: '王五',
                    product: '智能手表',
                    qty: 1,
                    amount: 2299,
                    status: '待发货',
                  },
                  {
                    date: '2026-06-27',
                    order: 'SO-20260627-002',
                    customer: '赵六',
                    product: '平板电脑',
                    qty: 3,
                    amount: 8997,
                    status: '已完成',
                  },
                  {
                    date: '2026-06-26',
                    order: 'SO-20260626-001',
                    customer: '钱七',
                    product: '蓝牙音箱',
                    qty: 4,
                    amount: 1196,
                    status: '已完成',
                  },
                ].map((row, idx) => (
                  <TableRow
                    key={idx}
                    hover
                  >
                    <TableCell>{row.date}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{row.order}</TableCell>
                    <TableCell>{row.customer}</TableCell>
                    <TableCell>{row.product}</TableCell>
                    <TableCell>{row.qty}</TableCell>
                    <TableCell align='right'>¥{row.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.status}
                        size='small'
                        color={row.status === '已完成' ? 'success' : 'warning'}
                        variant='outlined'
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <PageContainer
      title='多维数据分析'
      subtitle='多维度数据探索与钻取分析'
      headerProps={{
        pageIcon: <BarChart3 style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'BI' },
          { label: '多维分析' },
        ]}
      >
        <Box sx={{ p: 3 }}>
          <Typography
            variant='h4'
            sx={{ fontWeight: 700, mb: 3 }}
          >
            多维数据分析
          </Typography>

          <FilterBar
            filters={filters}
            values={filterValues}
            onChange={handleFilterChange}
            onReset={() =>
              setFilterValues({
                timeRange: 'last_6_months',
                region: 'all',
                category: 'all',
              })
            }
          />

          <Card
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}
          >
            <CardContent sx={{ pb: 0 }}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
              >
                <Tab
                  label='图表分析'
                  icon={<BarChart3 size={16} />}
                  iconPosition='start'
                />
                <Tab
                  label='数据透视'
                  icon={<Table2 size={16} />}
                  iconPosition='start'
                />
                <Tab
                  label='数据明细'
                  icon={<Layers size={16} />}
                  iconPosition='start'
                />
              </Tabs>
            </CardContent>
          </Card>

          {activeTab === 0 && renderChartAnalysis()}
          {activeTab === 1 && renderPivotTable()}
          {activeTab === 2 && renderDataTable()}
        </Box>
      </DashboardTemplate>
    </PageContainer>
  );
};

export default DataAnalysisPage;
