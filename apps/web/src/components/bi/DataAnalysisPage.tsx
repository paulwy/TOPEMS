import { useState, useMemo } from 'react';
import styles from './DataAnalysisPage.module.css';
import { useQuery } from '@tanstack/react-query';
import { salesOrderApi } from '@/api/erp/core/salesOrder';
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
  Grid,
  useTheme,
} from '@mui/material';
import { DashboardTemplate, ListPageTemplate, type ColumnDef } from '@/components/templates';
import { ChartComponent } from '@/components/bi/ChartLibrary';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const DataAnalysisPage = () => {
  const theme = useTheme();
  const { t } = useTranslation();

  const salesLabel = t('bi.data_analysis_page.k32');
  const countLabel = t('bi.data_analysis_page.k33');
  const avgLabel = t('bi.data_analysis_page.k34');
  const shareLabel = t('bi.data_analysis_page.k35');

  const { data: ordersData } = useQuery({
    queryKey: ['erp', 'sales-orders', 'analysis'],
    queryFn: async () => {
      const res = await salesOrderApi.list({ page: 1, pageSize: 100 });
      return (res.data?.orders || []) as Array<{
        order_date?: string;
        customer_name?: string;
        total_amount?: number;
        status?: string;
      }>;
    },
  });

  const totals = useMemo(() => {
    const rows = ordersData || [];
    const totalAmount = rows.reduce((s2, o) => s2 + (Number(o.total_amount) || 0), 0);
    const orderCount = rows.length;
    const customerCount = new Set(rows.map((o) => o.customer_name).filter(Boolean)).size;
    return {
      totalAmount,
      orderCount,
      customerCount,
      avgOrderAmount: orderCount ? totalAmount / orderCount : 0,
    };
  }, [ordersData]);
  const { totalAmount, orderCount, customerCount, avgOrderAmount } = totals;

  const salesTrend = useMemo(() => {
    const byMonth: Record<string, { amount: number; count: number }> = {};
    (ordersData || []).forEach((o) => {
      const m = (o.order_date || '').slice(0, 7);
      if (!m) return;
      byMonth[m] = byMonth[m] || { amount: 0, count: 0 };
      byMonth[m].amount += Number(o.total_amount) || 0;
      byMonth[m].count += 1;
    });
    return Object.keys(byMonth)
      .sort()
      .map((m) => {
        const row: Record<string, number | string> = { month: m };
        row[salesLabel] = Math.round(byMonth[m].amount);
        row[countLabel] = byMonth[m].count;
        row[avgLabel] = byMonth[m].count ? Math.round(byMonth[m].amount / byMonth[m].count) : 0;
        return row;
      });
  }, [ordersData, salesLabel, countLabel, avgLabel]);

  const customerDist = useMemo(() => {
    const byCust: Record<string, { amount: number; count: number }> = {};
    (ordersData || []).forEach((o) => {
      const c = o.customer_name || t('common.unknown');
      byCust[c] = byCust[c] || { amount: 0, count: 0 };
      byCust[c].amount += Number(o.total_amount) || 0;
      byCust[c].count += 1;
    });
    const rows = Object.keys(byCust).map((c) => {
      const row: Record<string, number | string> = { region: c };
      row[salesLabel] = Math.round(byCust[c].amount);
      row[shareLabel] = 0;
      return row;
    });
    const total = rows.reduce((s, r) => s + (Number(r[salesLabel]) || 0), 0);
    return rows.map((r) => ({
      ...r,
      [shareLabel]: total ? Math.round(((Number(r[salesLabel]) || 0) / total) * 100) : 0,
    }));
  }, [ordersData, salesLabel, shareLabel, t]);

  const statusPivot = useMemo(() => {
    const statuses: string[] = [];
    const byStatusMonth: Record<string, Record<string, number>> = {};
    (ordersData || []).forEach((o) => {
      const st = o.status || 'unknown';
      const m = (o.order_date || '').slice(0, 7);
      if (!statuses.includes(st)) statuses.push(st);
      byStatusMonth[st] = byStatusMonth[st] || {};
      byStatusMonth[st][m] = (byStatusMonth[st][m] || 0) + (Number(o.total_amount) || 0);
    });
    const months = Array.from(
      new Set((ordersData || []).map((o) => (o.order_date || '').slice(0, 7)))
    ).sort();
    return {
      months,
      rows: statuses.map((st) => ({ category: st, ...byStatusMonth[st] })),
    };
  }, [ordersData]);

  const [activeTab, setActiveTab] = useState(0);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie'>('bar');

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
                ? t('bi.data_analysis_page.chart_bar')
                : type === 'line'
                  ? t('bi.data_analysis_page.chart_line')
                  : type === 'area'
                    ? t('bi.data_analysis_page.chart_area')
                    : t('bi.data_analysis_page.chart_pie')}
            </Button>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}></Box>
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
          </Box>
          {chartType === 'pie' ? (
            <ChartComponent
              type='pie'
              data={customerDist}
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
              data={salesTrend}
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
                data={customerDist}
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
                    value: `¥${Math.round(totalAmount).toLocaleString('zh-CN')}`,
                  },
                  { label: t('bi.data_analysis_page.k33'), value: String(orderCount) },
                  { label: t('bi.data_analysis_page.k34'), value: String(customerCount) },
                  {
                    label: t('bi.data_analysis_page.avg_order_value'),
                    value: `¥${Math.round(avgOrderAmount).toLocaleString('zh-CN')}`,
                  },
                ].map((metric, idx) => (
                  <Box
                    key={idx}
                    sx={{ p: 2, backgroundColor: 'var(--surface-2)', borderRadius: 1 }}
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
                  <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.grey[50] }}>
                    {t('bi.data_analysis_page.k20')}
                  </TableCell>
                  {statusPivot.months.map((month) => (
                    <TableCell
                      key={month}
                      align='right'
                      sx={{ fontWeight: 600, backgroundColor: theme.palette.grey[50] }}
                    >
                      {month}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {statusPivot.rows.map((row) => (
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

  const renderDataTable = () => {
    const rows = [
      {
        id: 'SO-20260628-001',
        date: '2026-06-28',
        order: 'SO-20260628-001',
        customer: t('bi.data_analysis_page.customer_zhangsan'),
        product: t('bi.data_analysis_page.product_electronics'),
        qty: 2,
        amount: 12800,
        status: t('bi.data_analysis_page.completed'),
      },
      {
        id: 'SO-20260628-002',
        date: '2026-06-28',
        order: 'SO-20260628-002',
        customer: t('bi.data_analysis_page.customer_lisi'),
        product: t('bi.data_analysis_page.product_clothing'),
        qty: 5,
        amount: 1950,
        status: t('bi.data_analysis_page.completed'),
      },
      {
        id: 'SO-20260627-001',
        date: '2026-06-27',
        order: 'SO-20260627-001',
        customer: t('bi.data_analysis_page.customer_wangwu'),
        product: t('bi.data_analysis_page.product_home_goods'),
        qty: 1,
        amount: 2299,
        status: t('bi.data_analysis_page.status_completed'),
      },
      {
        id: 'SO-20260627-002',
        date: '2026-06-27',
        order: 'SO-20260627-002',
        customer: t('bi.data_analysis_page.customer_zhaoliu'),
        product: t('bi.data_analysis_page.product_food'),
        qty: 3,
        amount: 8997,
        status: t('bi.data_analysis_page.completed'),
      },
      {
        id: 'SO-20260626-001',
        date: '2026-06-26',
        order: 'SO-20260626-001',
        customer: t('bi.data_analysis_page.customer_qianqi'),
        product: t('bi.data_analysis_page.product_other'),
        qty: 4,
        amount: 1196,
        status: t('bi.data_analysis_page.completed'),
      },
    ];
    const columns: ColumnDef<(typeof rows)[number]>[] = [
      { id: 'date', label: t('bi.data_analysis_page.k25'), render: (r) => r.date },
      {
        id: 'order',
        label: t('bi.data_analysis_page.k26'),
        render: (r) => <Box sx={{ fontFamily: 'monospace' }}>{r.order}</Box>,
      },
      { id: 'customer', label: t('bi.data_analysis_page.k27'), render: (r) => r.customer },
      { id: 'product', label: t('bi.data_analysis_page.k28'), render: (r) => r.product },
      { id: 'qty', label: t('bi.data_analysis_page.k29'), render: (r) => r.qty },
      {
        id: 'amount',
        label: t('bi.data_analysis_page.k30'),
        align: 'right',
        render: (r) => `¥${r.amount.toLocaleString()}`,
      },
      {
        id: 'status',
        label: t('bi.data_analysis_page.k31'),
        render: (r) => (
          <Chip
            label={r.status}
            size='small'
            color={r.status === t('bi.data_analysis_page.completed') ? 'success' : 'warning'}
            variant='outlined'
          />
        ),
      },
    ];
    return (
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
            <ListPageTemplate
              columns={columns}
              data={rows}
              getRowId={(row) => row.id}
            />
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <DashboardTemplate
      title={t('bi.data_analysis_page.page_title')}
      subtitle={t('bi.data_analysis_page.page_subtitle')}
      breadcrumbs={[
        { label: t('bi.data_analysis_page.home'), href: '/dashboard' },
        { label: 'BI' },
        { label: t('bi.data_analysis_page.data_analysis_tab') },
      ]}
    >
      <Box sx={{ p: 3 }}>
        <Typography
          variant='h4'
          sx={{ fontWeight: 700, mb: 3 }}
        >
          {t('bi.data_analysis_page.k46')}
        </Typography>

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
                label={t('bi.data_analysis_page.analysis_tab')}
                icon={<BarChart3 size={16} />}
                iconPosition='start'
              />
              <Tab
                label={t('bi.data_analysis_page.detail_tab')}
                icon={<Table2 size={16} />}
                iconPosition='start'
              />
              <Tab
                label={t('bi.data_analysis_page.data_detail_tab')}
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
  );
};

export default DataAnalysisPage;
