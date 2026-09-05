import {
  Typography,
  Box,
  InputLabel,
  Chip,
  Card,
  CardContent,
  type ChipProps,
} from '@mui/material';
import i18n from '@/i18n';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { Package, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { DetailPageTemplate, type TabConfig } from '@/components/templates';
import { mesApi } from '@/api/mes';
import type { ProductionOrder, QualityRecord } from '@/api/mes';
import { designTokens } from '@/theme/tokens';
import { MES_PATHS } from '@/modules/mes/config';
import { getChipStatusColor } from '@/utils/status';

const ct = designTokens.colors;
const ProductionOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    data: order,
    isPending: orderLoading,
    error: orderError,
  } = useQuery<ProductionOrder | null>({
    queryKey: id ? QUERY_KEYS.MES.PRODUCTION_ORDER(id) : ['mes', 'production-order', 'null'],
    queryFn: async () => {
      if (!id) return null;
      const res = await mesApi.orders.get(id);
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.message || i18n.t('mes.production_order_detail_page.fail'));
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const { data: recordsData } = useQuery({
    queryKey: [...QUERY_KEYS.MES.PRODUCTION_RECORDS, { order_id: id }],
    queryFn: async () => {
      const res = await mesApi.records.list({});
      if (res.success && res.data) {
        return (res.data.records || []).filter((r) => r.order_id === id);
      }
      return [];
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const { data: qualityRecordsData } = useQuery<QualityRecord[]>({
    queryKey: id
      ? QUERY_KEYS.MES.TRACEABILITY_QUALITY_RECORDS(id)
      : ['mes', 'traceability', 'quality-records', 'null'],
    queryFn: async () => {
      const res = await mesApi.traceability.listQualityRecords({});
      if (res.success && res.data) {
        return res.data.records || [];
      }
      return [];
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const records = useMemo(() => recordsData || [], [recordsData]);
  const qualityRecords = useMemo(() => qualityRecordsData || [], [qualityRecordsData]);
  const loading = orderLoading;
  const errorMessage = orderError
    ? (orderError as Error).message || i18n.t('mes.production_order_detail_page.detail')
    : undefined;
  const getOrderStatusColor = (status: string): ChipProps['color'] =>
    getChipStatusColor(status, 'mes');
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: i18n.t('mes.production_order_detail_page.text_e0468e'),
      released: i18n.t('mes.production_order_detail_page.status_released'),
      in_progress: i18n.t('mes.production_order_detail_page.status_in_progress'),
      completed: i18n.t('mes.production_order_detail_page.completed'),
      cancelled: i18n.t('mes.production_order_detail_page.status_cancelled'),
      paused: i18n.t('mes.production_order_detail_page.status_paused'),
    };
    return statusMap[status] || status;
  };
  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };
  // 基本信息内容
  const basicInfoContent = useMemo(() => {
    if (!order) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.production_order_detail_page.k0')}
          </InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
            {order.order_number || '-'}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.production_order_detail_page.k1')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{order.product_name || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.production_order_detail_page.k2')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{order.product_code || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.production_order_detail_page.k3')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>
            {order.quantity} {order.unit || i18n.t('mes.production_order_detail_page.text_f7edf5')}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.production_order_detail_page.k4')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{order.priority || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.production_order_detail_page.k5')}
          </InputLabel>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={getStatusLabel(order.status)}
              color={getOrderStatusColor(order.status)}
              size='small'
            />
          </Box>
        </Box>
      </Box>
    );
  }, [order]);
  // 计划信息内容
  const scheduleInfoContent = useMemo(() => {
    if (!order) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.production_order_detail_page.k6')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(order.scheduled_start_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.production_order_detail_page.k7')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(order.scheduled_end_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.production_order_detail_page.k8')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(order.actualStartDate)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.production_order_detail_page.k9')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(order.actualEndDate)}</Typography>
        </Box>
      </Box>
    );
  }, [order]);
  // 报工记录内容
  const recordsContent = useMemo(() => {
    if (records.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          {i18n.t('mes.production_order_detail_page.k10')}
        </Box>
      );
    }
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {records.map((record) => (
          <Card
            key={record.id}
            variant='outlined'
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {record.operator}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {formatDate(record.start_time)}
                    {record.end_time && ` ~ ${formatDate(record.end_time)}`}
                  </Typography>
                </Box>
                <Chip
                  label={
                    record.status === 'completed'
                      ? i18n.t('mes.production_order_detail_page.completed')
                      : i18n.t('mes.production_order_detail_page.in_progress')
                  }
                  color={record.status === 'completed' ? 'success' : 'primary'}
                  size='small'
                />
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {i18n.t('mes.production_order_detail_page.k11')}
                  </InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {record.quantity_completed}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {i18n.t('mes.production_order_detail_page.k12')}
                  </InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, color: 'error.main' }}
                  >
                    {record.quantity_rejected || 0}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {i18n.t('mes.production_order_detail_page.k13')}
                  </InputLabel>
                  <Typography variant='body2'>{record.process_id || '-'}</Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {i18n.t('mes.production_order_detail_page.k14')}
                  </InputLabel>
                  <Typography variant='body2'>{record.work_station_id || '-'}</Typography>
                </Box>
              </Box>
              {record.notes && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {i18n.t('mes.production_order_detail_page.k15')}
                  </InputLabel>
                  <Typography variant='body2'>{record.notes}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }, [records]);
  // 质量检验内容
  const qualityContent = useMemo(() => {
    if (qualityRecords.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          {i18n.t('mes.production_order_detail_page.k16')}
        </Box>
      );
    }
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {qualityRecords.map((record) => (
          <Card
            key={record.id}
            variant='outlined'
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {record.batch_no}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {record.inspection_type}
                    {record.inspection_time && ` - ${formatDate(record.inspection_time)}`}
                  </Typography>
                </Box>
                <Chip
                  label={
                    record.status === 'qualified'
                      ? i18n.t('mes.production_order_detail_page.qualified')
                      : i18n.t('mes.production_order_detail_page.unqualified')
                  }
                  color={record.status === 'qualified' ? 'success' : 'error'}
                  size='small'
                />
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {i18n.t('mes.production_order_detail_page.k17')}
                  </InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {record.quantity}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {i18n.t('mes.production_order_detail_page.k18')}
                  </InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, color: 'success.main' }}
                  >
                    {record.qualified_quantity}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {i18n.t('mes.production_order_detail_page.k19')}
                  </InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, color: 'error.main' }}
                  >
                    {record.unqualified_quantity}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {i18n.t('mes.production_order_detail_page.k20')}
                  </InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {(record.qualification_rate * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
              {record.result && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {i18n.t('mes.production_order_detail_page.k21')}
                  </InputLabel>
                  <Typography variant='body2'>{record.result}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }, [qualityRecords]);
  // 投入产出统计
  const statisticsContent = useMemo(() => {
    const totalCompleted = records.reduce((sum, r) => sum + r.quantity_completed, 0);
    const totalRejected = records.reduce((sum, r) => sum + (r.quantity_rejected || 0), 0);
    const completionRate =
      order && order.quantity > 0 ? (totalCompleted / order.quantity) * 100 : 0;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3,
        }}
      >
        <Card
          variant='outlined'
          sx={{ bgcolor: 'primary.lighter' }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Package
                size={18}
                color={ct.primary.dark}
              />
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                {i18n.t('mes.production_order_detail_page.k22')}
              </InputLabel>
            </Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700 }}
            >
              {order?.quantity || 0}
            </Typography>
          </CardContent>
        </Card>
        <Card
          variant='outlined'
          sx={{ bgcolor: 'success.lighter' }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CheckCircle
                size={18}
                color='success.700'
              />
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                {i18n.t('mes.production_order_detail_page.k23')}
              </InputLabel>
            </Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'success.dark' }}
            >
              {totalCompleted}
            </Typography>
          </CardContent>
        </Card>
        <Card
          variant='outlined'
          sx={{ bgcolor: 'error.lighter' }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AlertCircle
                size={18}
                color={ct.error[700]}
              />
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                {i18n.t('mes.production_order_detail_page.k24')}
              </InputLabel>
            </Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'error.dark' }}
            >
              {totalRejected}
            </Typography>
          </CardContent>
        </Card>
        <Card
          variant='outlined'
          sx={{ bgcolor: 'warning.lighter' }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingUp
                size={18}
                color='warning.700'
              />
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                {i18n.t('mes.production_order_detail_page.k25')}
              </InputLabel>
            </Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'warning.dark' }}
            >
              {completionRate.toFixed(1)}%
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }, [order, records]);
  const tabs = useMemo<TabConfig[]>(
    () => [
      {
        id: 'basic',
        label: i18n.t('mes.production_order_detail_page.tab_basic'),
        content: basicInfoContent || <></>,
      },
      {
        id: 'schedule',
        label: i18n.t('mes.production_order_detail_page.info'),
        content: scheduleInfoContent || <></>,
      },
      {
        id: 'statistics',
        label: i18n.t('mes.production_order_detail_page.text_93466b'),
        content: statisticsContent || <></>,
      },
      {
        id: 'records',
        label: i18n.t('mes.production_order_detail_page.work_report'),
        content: recordsContent || <></>,
      },
      {
        id: 'quality',
        label: i18n.t('mes.production_order_detail_page.inspection'),
        content: qualityContent || <></>,
      },
    ],
    [basicInfoContent, scheduleInfoContent, statisticsContent, recordsContent, qualityContent]
  );
  const infoCard = useMemo(
    () => ({
      avatar: (
        <Package
          size={32}
          color={ct.primary.dark}
        />
      ),
      title: order?.product_name,
      subtitle: order?.order_number || undefined,
      tags: [getStatusLabel(order?.status || '')],
      stats: [
        {
          label: i18n.t('mes.production_order_detail_page.field_planned_quantity'),
          value: `${order?.quantity || 0} ${order?.unit || i18n.t('mes.production_order_detail_page.k26')}`,
        },
        {
          label: i18n.t('mes.production_order_detail_page.field_status'),
          value: getStatusLabel(order?.status || ''),
        },
      ],
    }),
    [order]
  );
  return (
    <PageContainer
      backButton={{ href: MES_PATHS.productionOrders }}
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={
          order?.product_name ||
          order?.order_number ||
          order?.id ||
          i18n.t('mes.production_order_detail_page.k27')
        }
        backHref={MES_PATHS.productionOrders}
        loading={loading}
        error={errorMessage}
        infoCard={infoCard}
        tabs={tabs}
      />
    </PageContainer>
  );
};
export default ProductionOrderDetailPage;
