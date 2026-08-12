import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, TextField, MenuItem, Tooltip } from '@mui/material';
import { Activity, Layers, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { rfmApi } from '@/api/crm';
import type { RfmConfig, RfmRecord, RfmSegment, SegmentStats } from '@/api/crm';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type {
  StatCard,
  ChartConfig,
  DataTable,
  TableColumn,
} from '@/components/templates/StatsPageTemplate';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

// 分群颜色映射
const SEGMENT_COLORS: Record<RfmSegment, string> = {
  champion: ct.success.main,
  loyal: ct.primary.main,
  potential: ct.info?.main ?? '#0288d1',
  new: ct.secondary.main,
  at_risk: ct.warning.main,
  cannot_lost: ct.error.main,
  hibernating: '#9e9e9e',
  lost: '#616161',
};

const CrmRfmPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  // RFM 分析配置
  const [periodDays, setPeriodDays] = useState(365);
  const [referenceDate, setReferenceDate] = useState('');

  // 当前分析配置（用于 queryKey 和请求）
  const currentConfig: RfmConfig = useMemo(
    () => ({
      period_days: periodDays,
      reference_date: referenceDate || undefined,
    }),
    [periodDays, referenceDate]
  );

  // 获取分群统计
  const segmentsQuery = useQuery<SegmentStats[]>({
    queryKey: [...QUERY_KEYS.CRM.RFM, 'segments'],
    queryFn: async () => {
      const res = await rfmApi.getSegments();
      return res.data || [];
    },
  });

  // 执行 RFM 分析并获取客户明细（POST /rfm/analyze 返回记录列表）
  const recordsQuery = useQuery<RfmRecord[]>({
    queryKey: [...QUERY_KEYS.CRM.RFM, 'records', currentConfig],
    queryFn: async () => {
      const res = await rfmApi.analyze(currentConfig);
      return res.data || [];
    },
  });

  const handleAnalyze = () => {
    recordsQuery.refetch().then((result) => {
      if (result.isSuccess) {
        addNotification({
          type: 'success',
          title: t('crm.rfm.title_success'),
          message: t('crm.rfm.msg_analyze_success'),
        });
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.CRM.RFM, 'segments'] });
      } else if (result.isError) {
        apiLogger.error(t('crm.rfm.log_analyze_fail'), result.error);
        addNotification({
          type: 'error',
          title: t('crm.rfm.title_fail'),
          message: t('crm.rfm.msg_analyze_fail'),
        });
      }
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.CRM.RFM] });
  };

  const loading = segmentsQuery.isLoading || segmentsQuery.isFetching || recordsQuery.isFetching;

  const segments = useMemo(() => segmentsQuery.data || [], [segmentsQuery.data]);
  const records = useMemo(() => recordsQuery.data || [], [recordsQuery.data]);

  // 统计卡片
  const summary = useMemo(() => {
    const totalCustomers = records.length;
    const segmentCount = segments.length;
    const avgMonetary =
      records.length > 0
        ? Math.round(
            records.reduce((sum: number, r: RfmRecord) => sum + r.monetary, 0) / records.length
          )
        : 0;
    const avgFrequency =
      records.length > 0
        ? +(
            records.reduce((sum: number, r: RfmRecord) => sum + r.frequency, 0) / records.length
          ).toFixed(1)
        : 0;
    return { totalCustomers, segmentCount, avgMonetary, avgFrequency };
  }, [records, segments]);

  const statCards = useMemo<StatCard[]>(
    () => [
      {
        id: 'total-customers',
        title: t('crm.rfm.stat_total_customers'),
        value: `${summary.totalCustomers}`,
        icon: <Users sx={{ width: 24, height: 24 }} />,
        gradient: [ct.primary.dark, ct.primary[800]] as [string, string],
      },
      {
        id: 'segment-count',
        title: t('crm.rfm.stat_segment_count'),
        value: `${summary.segmentCount}`,
        icon: <Layers sx={{ width: 24, height: 24 }} />,
        gradient: [ct.secondary.main, ct.secondary.dark] as [string, string],
      },
      {
        id: 'avg-monetary',
        title: t('crm.rfm.stat_avg_monetary'),
        value: `¥${summary.avgMonetary.toLocaleString()}`,
        icon: <TrendingUp sx={{ width: 24, height: 24 }} />,
        gradient: [ct.success.main, ct.success.dark] as [string, string],
      },
      {
        id: 'avg-frequency',
        title: t('crm.rfm.stat_avg_frequency'),
        value: `${summary.avgFrequency}`,
        icon: <Activity sx={{ width: 24, height: 24 }} />,
        gradient: [ct.warning.main, ct.warning.dark] as [string, string],
      },
    ],
    [summary, t]
  );

  // 分群分布图
  const charts = useMemo<ChartConfig[]>(() => {
    const distributionData = segments.map((s) => ({
      name: s.label,
      value: s.customer_count,
      segment: s.segment,
    }));
    return [
      {
        id: 'segment-distribution',
        title: t('crm.rfm.chart_segment_distribution'),
        type: 'bar',
        dataKey: 'value',
        nameKey: 'name',
        data: distributionData,
        height: 320,
      },
    ];
  }, [segments, t]);

  // 分群统计表
  const segmentColumns: TableColumn[] = [
    { id: 'segment', label: t('crm.rfm.col_segment'), field: 'segment' },
    {
      id: 'customer_count',
      label: t('crm.rfm.col_customer_count'),
      field: 'customer_count',
      align: 'right',
    },
    {
      id: 'avg_monetary',
      label: t('crm.rfm.col_avg_monetary'),
      field: 'avg_monetary',
      align: 'right',
    },
    {
      id: 'avg_frequency',
      label: t('crm.rfm.col_avg_frequency'),
      field: 'avg_frequency',
      align: 'right',
    },
    {
      id: 'avg_recency',
      label: t('crm.rfm.col_avg_recency'),
      field: 'avg_recency',
      align: 'right',
    },
    {
      id: 'avg_rfm_score',
      label: t('crm.rfm.col_avg_rfm_score'),
      field: 'avg_rfm_score',
      align: 'right',
    },
  ];

  // 客户 RFM 明细表
  const recordColumns: TableColumn[] = [
    { id: 'customer_name', label: t('crm.rfm.col_customer_name'), field: 'customer_name' },
    { id: 'recency_days', label: t('crm.rfm.col_recency'), field: 'recency_days', align: 'right' },
    { id: 'frequency', label: t('crm.rfm.col_frequency'), field: 'frequency', align: 'right' },
    {
      id: 'monetary',
      label: t('crm.rfm.col_monetary'),
      field: 'monetary',
      align: 'right',
    },
    {
      id: 'rfm_score',
      label: t('crm.rfm.col_rfm_score'),
      field: 'rfm_score',
      align: 'right',
    },
    { id: 'segment', label: t('crm.rfm.col_segment_label'), field: 'segment', align: 'center' },
  ];

  const tables = useMemo<DataTable[]>(
    () => [
      {
        id: 'segment-stats',
        title: t('crm.rfm.table_segment_stats'),
        columns: segmentColumns,
        data: segments.map((s) => ({
          segment: (
            <Chip
              label={s.label}
              size='small'
              sx={{
                bgcolor: `${SEGMENT_COLORS[s.segment]}20`,
                color: SEGMENT_COLORS[s.segment],
                fontWeight: 600,
              }}
            />
          ),
          customer_count: s.customer_count,
          avg_monetary: `¥${Math.round(s.avg_monetary).toLocaleString()}`,
          avg_frequency: s.avg_frequency.toFixed(1),
          avg_recency: `${Math.round(s.avg_recency_days)} ${t('crm.rfm.unit_days')}`,
          avg_rfm_score: s.avg_rfm_score.toFixed(2),
        })),
        loading: segmentsQuery.isLoading,
      },
      {
        id: 'customer-rfm',
        title: t('crm.rfm.table_customer_rfm'),
        columns: recordColumns,
        data: records.map((r: RfmRecord) => ({
          customer_name: r.customer_name,
          recency_days: `${r.recency_days} ${t('crm.rfm.unit_days')}`,
          frequency: r.frequency,
          monetary: `¥${r.monetary.toLocaleString()}`,
          rfm_score: r.rfm_score.toFixed(2),
          segment: (
            <Chip
              label={r.segment}
              size='small'
              variant='outlined'
              sx={{
                color: SEGMENT_COLORS[r.segment],
                borderColor: SEGMENT_COLORS[r.segment],
              }}
            />
          ),
        })),
        loading: recordsQuery.isLoading,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [segments, records, segmentsQuery.isLoading, recordsQuery.isLoading, t]
  );

  const customToolbar = (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
      }}
    >
      <TextField
        select
        size='small'
        label={t('crm.rfm.field_period_days')}
        value={periodDays}
        onChange={(e) => setPeriodDays(Number(e.target.value))}
        sx={{ width: 140 }}
      >
        <MenuItem value={90}>90 {t('crm.rfm.unit_days')}</MenuItem>
        <MenuItem value={180}>180 {t('crm.rfm.unit_days')}</MenuItem>
        <MenuItem value={365}>365 {t('crm.rfm.unit_days')}</MenuItem>
        <MenuItem value={730}>730 {t('crm.rfm.unit_days')}</MenuItem>
      </TextField>
      <TextField
        size='small'
        type='date'
        label={t('crm.rfm.field_reference_date')}
        value={referenceDate}
        onChange={(e) => setReferenceDate(e.target.value)}
        sx={{ width: 170 }}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Tooltip title={t('crm.rfm.btn_analyze_tooltip')}>
        <Button
          variant='contained'
          startIcon={<Activity size={16} />}
          onClick={handleAnalyze}
          disabled={loading}
        >
          {t('crm.rfm.btn_analyze')}
        </Button>
      </Tooltip>
      <Tooltip title={t('crm.rfm.btn_refresh_tooltip')}>
        <Button
          variant='outlined'
          startIcon={<RefreshCw size={16} />}
          onClick={handleRefresh}
          disabled={loading}
        >
          {t('crm.rfm.btn_refresh')}
        </Button>
      </Tooltip>
    </Box>
  );

  return (
    <PageContainer
      maxWidth='xl'
      title={t('crm.rfm.title')}
      subtitle={t('crm.rfm.subtitle')}
      autoTitle
      autoBreadcrumbs
    >
      <StatsPageTemplate
        title=''
        subtitle=''
        statCards={statCards}
        statColumns={4}
        charts={charts}
        chartColumns={{ xs: 1, lg: 1 }}
        tables={tables}
        loading={loading}
        onRefresh={handleRefresh}
        showExport={false}
        showRefresh={false}
        showTimeRange={false}
        showSearch={false}
        customToolbar={customToolbar}
        statCardDirection='row'
      />
    </PageContainer>
  );
};

export default CrmRfmPage;
