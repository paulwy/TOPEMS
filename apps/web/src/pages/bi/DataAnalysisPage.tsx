import { useState } from 'react';
import { BarChart3, TrendingUp, PieChart, Table2, RefreshCw, Download, Layers } from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
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
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const ct = designTokens.colors;

const mockSalesData = [
  {
    month: i18n.t('bi.months.jan'),
    [i18n.t('bi.data_analysis_page.k32')]: 125000,
    [i18n.t('bi.data_analysis_page.k33')]: 450,
    [i18n.t('bi.data_analysis_page.k34')]: 180,
  },
  {
    month: i18n.t('bi.months.feb'),
    [i18n.t('bi.data_analysis_page.k32')]: 138000,
    [i18n.t('bi.data_analysis_page.k33')]: 480,
    [i18n.t('bi.data_analysis_page.k34')]: 195,
  },
  {
    month: i18n.t('bi.months.mar'),
    [i18n.t('bi.data_analysis_page.k32')]: 152000,
    [i18n.t('bi.data_analysis_page.k33')]: 520,
    [i18n.t('bi.data_analysis_page.k34')]: 210,
  },
  {
    month: i18n.t('bi.months.apr'),
    [i18n.t('bi.data_analysis_page.k32')]: 145000,
    [i18n.t('bi.data_analysis_page.k33')]: 500,
    [i18n.t('bi.data_analysis_page.k34')]: 205,
  },
  {
    month: i18n.t('bi.months.may'),
    [i18n.t('bi.data_analysis_page.k32')]: 168000,
    [i18n.t('bi.data_analysis_page.k33')]: 560,
    [i18n.t('bi.data_analysis_page.k34')]: 230,
  },
  {
    month: i18n.t('bi.months.jun'),
    [i18n.t('bi.data_analysis_page.k32')]: 185000,
    [i18n.t('bi.data_analysis_page.k33')]: 620,
    [i18n.t('bi.data_analysis_page.k34')]: 250,
  },
];

const mockRegionData = [
  {
    region: i18n.t('bi.data_analysis_page.k0'),
    [i18n.t('bi.data_analysis_page.k32')]: 420000,
    [i18n.t('bi.data_analysis_page.k35')]: 35,
  },
  {
    region: i18n.t('bi.data_analysis_page.k1'),
    [i18n.t('bi.data_analysis_page.k32')]: 320000,
    [i18n.t('bi.data_analysis_page.k35')]: 27,
  },
  {
    region: i18n.t('bi.data_analysis_page.k2'),
    [i18n.t('bi.data_analysis_page.k32')]: 240000,
    [i18n.t('bi.data_analysis_page.k35')]: 20,
  },
  {
    region: i18n.t('bi.data_analysis_page.k3'),
    [i18n.t('bi.data_analysis_page.k32')]: 120000,
    [i18n.t('bi.data_analysis_page.k35')]: 10,
  },
  {
    region: i18n.t('bi.data_analysis_page.k4'),
    [i18n.t('bi.data_analysis_page.k32')]: 96000,
    [i18n.t('bi.data_analysis_page.k35')]: 8,
  },
];

const mockPivotData = [
  {
    category: i18n.t('bi.data_analysis_page.k5'),
    [i18n.t('bi.months.jan')]: 45000,
    [i18n.t('bi.months.feb')]: 52000,
    [i18n.t('bi.months.mar')]: 58000,
    [i18n.t('bi.months.apr')]: 55000,
    [i18n.t('bi.months.may')]: 62000,
    [i18n.t('bi.months.jun')]: 68000,
  },
  {
    category: i18n.t('bi.data_analysis_page.k6'),
    [i18n.t('bi.months.jan')]: 32000,
    [i18n.t('bi.months.feb')]: 35000,
    [i18n.t('bi.months.mar')]: 38000,
    [i18n.t('bi.months.apr')]: 36000,
    [i18n.t('bi.months.may')]: 42000,
    [i18n.t('bi.months.jun')]: 48000,
  },
  {
    category: i18n.t('bi.data_analysis_page.k7'),
    [i18n.t('bi.months.jan')]: 28000,
    [i18n.t('bi.months.feb')]: 30000,
    [i18n.t('bi.months.mar')]: 32000,
    [i18n.t('bi.months.apr')]: 31000,
    [i18n.t('bi.months.may')]: 35000,
    [i18n.t('bi.months.jun')]: 38000,
  },
  {
    category: i18n.t('bi.data_analysis_page.k8'),
    [i18n.t('bi.months.jan')]: 20000,
    [i18n.t('bi.months.feb')]: 21000,
    [i18n.t('bi.months.mar')]: 24000,
    [i18n.t('bi.months.apr')]: 23000,
    [i18n.t('bi.months.may')]: 29000,
    [i18n.t('bi.months.jun')]: 31000,
  },
];

const filters: FilterConfig[] = [
  {
    id: 'timeRange',
    type: 'select',
    label: i18n.t('bi.data_analysis_page.k9'),
    field: 'time_range',
    options: [
      { label: i18n.t('bi.data_analysis_page.k10'), value: 'this_month' },
      { label: i18n.t('bi.data_analysis_page.k11'), value: 'last_month' },
      { label: i18n.t('bi.data_analysis_page.3_12'), value: 'last_3_months' },
      { label: i18n.t('bi.data_analysis_page.6_13'), value: 'last_6_months' },
      { label: i18n.t('bi.data_analysis_page.k14'), value: 'this_year' },
    ],
    default_value: 'last_6_months',
  },
  {
    id: 'region',
    type: 'select',
    label: i18n.t('bi.data_analysis_page.k15'),
    field: 'region',
    options: [
      { label: i18n.t('bi.data_analysis_page.k16'), value: 'all' },
      { label: i18n.t('bi.data_analysis_page.k0'), value: 'east' },
      { label: i18n.t('bi.data_analysis_page.k1'), value: 'south' },
      { label: i18n.t('bi.data_analysis_page.k2'), value: 'north' },
    ],
    default_value: 'all',
  },
  {
    id: 'category',
    type: 'select',
    label: i18n.t('bi.data_analysis_page.k20'),
    field: 'category',
    options: [
      { label: i18n.t('bi.data_analysis_page.k21'), value: 'all' },
      { label: i18n.t('bi.data_analysis_page.k5'), value: 'electronics' },
      { label: i18n.t('bi.data_analysis_page.k6'), value: 'clothing' },
      { label: i18n.t('bi.data_analysis_page.k7'), value: 'home' },
    ],
    default_value: 'all',
  },
];

const DataAnalysisPage = () => {
  const { t } = useTranslation();
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
                ? t('bi.data_analysis_page.text_7c8ee6')
                : type === 'line'
                  ? t('bi.data_analysis_page.text_c9c9bd')
                  : type === 'area'
                    ? t('bi.data_analysis_page.text_af99db')
                    : t('bi.data_analysis_page.text_d5e33d')}
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
            {t('bi.data_analysis_page.k36')}
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
            {t('bi.data_analysis_page.k37')}
          </Button>
          <Button
            size='small'
            variant='outlined'
            startIcon={<Download size={16} />}
          >
            {t('bi.data_analysis_page.k38')}
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
              {t('bi.data_analysis_page.k41')}
            </Typography>
            <Chip
              label={
                drillLevel === 0
                  ? t('bi.data_analysis_page.text_047d4a')
                  : drillLevel === 1
                    ? t('bi.data_analysis_page.text_4a7b52')
                    : t('bi.data_analysis_page.product_2')
              }
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
              yKeys={[t('bi.data_analysis_page.k32')]}
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
              yKeys={[
                t('bi.data_analysis_page.k32'),
                t('bi.data_analysis_page.k33'),
                t('bi.data_analysis_page.k34'),
              ]}
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
                {t('bi.data_analysis_page.k42')}
              </Typography>
              <ChartComponent
                type='bar'
                data={mockRegionData}
                xKey='region'
                yKeys={[t('bi.data_analysis_page.k32')]}
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
                {t('bi.data_analysis_page.k43')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                {[
                  {
                    label: t('bi.data_analysis_page.k32'),
                    value: '¥913,000',
                    change: '+12.5%',
                    color: 'success.main',
                  },
                  {
                    label: t('bi.data_analysis_page.k33'),
                    value: '3,130',
                    change: '+8.3%',
                    color: 'primary.main',
                  },
                  {
                    label: t('bi.data_analysis_page.k34'),
                    value: '1,270',
                    change: '+15.2%',
                    color: 'secondary.main',
                  },
                  {
                    label: t('bi.data_analysis_page.text_53c7e7'),
                    value: '¥291.7',
                    change: '+3.8%',
                    color: 'warning.main',
                  },
                ].map((metric, idx) => (
                  <Box
                    key={idx}
                    sx={{ p: 2, backgroundColor: ct.grey[50], borderRadius: 1 }}
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
          {t('bi.data_analysis_page.k44')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size='small'
            variant='outlined'
            startIcon={<RefreshCw size={16} />}
          >
            {t('bi.data_analysis_page.k39')}
          </Button>
          <Button
            size='small'
            variant='outlined'
            startIcon={<Download size={16} />}
          >
            {t('bi.data_analysis_page.k38')}
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
                  <TableCell sx={{ fontWeight: 600, backgroundColor: ct.grey[50] }}>
                    {t('bi.data_analysis_page.k20')}
                  </TableCell>
                  {[
                    t('bi.months.jan'),
                    t('bi.months.feb'),
                    t('bi.months.mar'),
                    t('bi.months.apr'),
                    t('bi.months.may'),
                    t('bi.months.jun'),
                  ].map((month) => (
                    <TableCell
                      key={month}
                      align='right'
                      sx={{ fontWeight: 600, backgroundColor: ct.grey[50] }}
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
                    <TableCell align='right'>
                      {(row as Record<string, number | string>)[
                        t('bi.months.jan')
                      ].toLocaleString()}
                    </TableCell>
                    <TableCell align='right'>
                      {(row as Record<string, number | string>)[
                        t('bi.months.feb')
                      ].toLocaleString()}
                    </TableCell>
                    <TableCell align='right'>
                      {(row as Record<string, number | string>)[
                        t('bi.months.mar')
                      ].toLocaleString()}
                    </TableCell>
                    <TableCell align='right'>
                      {(row as Record<string, number | string>)[
                        t('bi.months.apr')
                      ].toLocaleString()}
                    </TableCell>
                    <TableCell align='right'>
                      {(row as Record<string, number | string>)[
                        t('bi.months.may')
                      ].toLocaleString()}
                    </TableCell>
                    <TableCell align='right'>
                      {(row as Record<string, number | string>)[
                        t('bi.months.jun')
                      ].toLocaleString()}
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

  const renderDataTable = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600 }}
        >
          {t('bi.data_analysis_page.k45')}
        </Typography>
        <Button
          size='small'
          variant='outlined'
          startIcon={<Download size={16} />}
        >
          {t('bi.data_analysis_page.k40')}
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
                  <TableCell>{t('bi.data_analysis_page.k25')}</TableCell>
                  <TableCell>{t('bi.data_analysis_page.k26')}</TableCell>
                  <TableCell>{t('bi.data_analysis_page.k27')}</TableCell>
                  <TableCell>{t('bi.data_analysis_page.k28')}</TableCell>
                  <TableCell>{t('bi.data_analysis_page.k29')}</TableCell>
                  <TableCell align='right'>{t('bi.data_analysis_page.k30')}</TableCell>
                  <TableCell>{t('bi.data_analysis_page.k31')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  {
                    date: '2026-06-28',
                    order: 'SO-20260628-001',
                    customer: t('bi.data_analysis_page.text_615db5'),
                    product: t('bi.data_analysis_page.text_161783'),
                    qty: 2,
                    amount: 12800,
                    status: t('bi.data_analysis_page.completed'),
                  },
                  {
                    date: '2026-06-28',
                    order: 'SO-20260628-002',
                    customer: t('bi.data_analysis_page.text_36c942'),
                    product: t('bi.data_analysis_page.text_86f5cb'),
                    qty: 5,
                    amount: 1950,
                    status: t('bi.data_analysis_page.completed'),
                  },
                  {
                    date: '2026-06-27',
                    order: 'SO-20260627-001',
                    customer: t('bi.data_analysis_page.text_3228f3'),
                    product: t('bi.data_analysis_page.text_0c3bd4'),
                    qty: 1,
                    amount: 2299,
                    status: t('bi.data_analysis_page.text_d8476e'),
                  },
                  {
                    date: '2026-06-27',
                    order: 'SO-20260627-002',
                    customer: t('bi.data_analysis_page.text_b43536'),
                    product: t('bi.data_analysis_page.text_e7e7de'),
                    qty: 3,
                    amount: 8997,
                    status: t('bi.data_analysis_page.completed'),
                  },
                  {
                    date: '2026-06-26',
                    order: 'SO-20260626-001',
                    customer: t('bi.data_analysis_page.text_f9c684'),
                    product: t('bi.data_analysis_page.text_467546'),
                    qty: 4,
                    amount: 1196,
                    status: t('bi.data_analysis_page.completed'),
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
                        color={
                          row.status === t('bi.data_analysis_page.completed')
                            ? 'success'
                            : 'warning'
                        }
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
      title={t('bi.data_analysis_page.text_ffa095')}
      subtitle={t('bi.data_analysis_page.text_131448')}
      headerProps={{
        pageIcon: <BarChart3 style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary[400]} 100%)`,
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('bi.data_analysis_page.home'), href: '/dashboard' },
          { label: 'BI' },
          { label: t('bi.data_analysis_page.text_3faef8') },
        ]}
      >
        <Box sx={{ p: 3 }}>
          <Typography
            variant='h4'
            sx={{ fontWeight: 700, mb: 3 }}
          >
            {t('bi.data_analysis_page.k46')}
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
                  label={t('bi.data_analysis_page.text_c6b32e')}
                  icon={<BarChart3 size={16} />}
                  iconPosition='start'
                />
                <Tab
                  label={t('bi.data_analysis_page.text_7f3ddd')}
                  icon={<Table2 size={16} />}
                  iconPosition='start'
                />
                <Tab
                  label={t('bi.data_analysis_page.text_56a37c')}
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
