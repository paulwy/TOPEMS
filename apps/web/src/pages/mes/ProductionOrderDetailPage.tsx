import { Typography, Box, InputLabel, Chip, Card, CardContent } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Package, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainerV2';
import { DetailPageTemplate, type TabConfig } from '@/components/templates';
import { mesApi } from '@/api/mes';
import type { ProductionOrder, ProductionRecord, QualityRecord } from '@/api/mes';
import { apiLogger } from '@/utils/logger';
import { useAppStore } from '@/store';

const ProductionOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addNotification } = useAppStore();

  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [qualityRecords, setQualityRecords] = useState<QualityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (id) {
      loadOrderDetail(id);
    }
  }, [id]);

  const loadOrderDetail = async (orderId: string) => {
    setLoading(true);
    setErrorMessage(undefined);
    try {
      const [orderRes, recordsRes, qualityRes] = await Promise.all([
        mesApi.orders.get(orderId),
        mesApi.records.list({}),
        mesApi.traceability.listQualityRecords({}),
      ]);

      if (orderRes.success && orderRes.data) {
        setOrder(orderRes.data);
      } else {
        throw new Error(orderRes.message || '加载工单信息失败');
      }

      if (recordsRes.success && recordsRes.data) {
        // 过滤出属于当前工单的记录
        const orderRecords = (recordsRes.data.records || []).filter((r) => r.order_id === orderId);
        setRecords(orderRecords);
      }

      if (qualityRes.success && qualityRes.data) {
        setQualityRecords(qualityRes.data.records || []);
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to load order detail:', err);
      setErrorMessage('加载工单详情失败');
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载工单详情',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'released':
        return 'info';
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'paused':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待下达',
      released: '已下达',
      in_progress: '生产中',
      completed: '已完成',
      cancelled: '已取消',
      paused: '已暂停',
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
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>工单号</InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
            {order.order_number || '-'}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>产品名称</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{order.product_name || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>产品编码</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{order.product_code || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>数量</InputLabel>
          <Typography sx={{ mt: 0.5 }}>
            {order.quantity} {order.unit || '件'}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>优先级</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{order.priority || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>状态</InputLabel>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={getStatusLabel(order.status)}
              color={getStatusColor(order.status) as any}
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
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>计划开始时间</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(order.scheduled_start_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>计划结束时间</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(order.scheduled_end_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>实际开始时间</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(order.actual_start_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>实际结束时间</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(order.actual_end_date)}</Typography>
        </Box>
      </Box>
    );
  }, [order]);

  // 报工记录内容
  const recordsContent = useMemo(() => {
    if (records.length === 0) {
      return <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>暂无报工记录</Box>;
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
                  label={record.status === 'completed' ? '已完成' : '进行中'}
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
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>完成数量</InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {record.quantity_completed}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>不合格数量</InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, color: 'error.main' }}
                  >
                    {record.quantity_rejected || 0}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>工序</InputLabel>
                  <Typography variant='body2'>{record.process_id || '-'}</Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>工位</InputLabel>
                  <Typography variant='body2'>{record.work_station_id || '-'}</Typography>
                </Box>
              </Box>
              {record.notes && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>备注</InputLabel>
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
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>暂无质量检验记录</Box>
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
                  label={record.status === 'qualified' ? '合格' : '不合格'}
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
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>检验数量</InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {record.quantity}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>合格数量</InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, color: 'success.main' }}
                  >
                    {record.qualified_quantity}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>不合格数量</InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, color: 'error.main' }}
                  >
                    {record.unqualified_quantity}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>合格率</InputLabel>
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
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>检验结果</InputLabel>
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
                color='#1976d2'
              />
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>计划数量</InputLabel>
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
                color='#15803d'
              />
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>已完成</InputLabel>
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
                color='#b91c1c'
              />
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>不合格</InputLabel>
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
                color='#b45309'
              />
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>完成率</InputLabel>
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
      { id: 'basic', label: '基本信息', content: basicInfoContent || <></> },
      { id: 'schedule', label: '计划信息', content: scheduleInfoContent || <></> },
      { id: 'statistics', label: '投入产出统计', content: statisticsContent || <></> },
      { id: 'records', label: '报工记录', content: recordsContent || <></> },
      { id: 'quality', label: '质量检验', content: qualityContent || <></> },
    ],
    [basicInfoContent, scheduleInfoContent, statisticsContent, recordsContent, qualityContent]
  );

  const infoCard = useMemo(
    () => ({
      avatar: (
        <Package
          size={32}
          color='#1976d2'
        />
      ),
      title: order?.product_name,
      subtitle: order?.order_number || undefined,
      tags: [getStatusLabel(order?.status || '')],
      stats: [
        { label: '计划数量', value: `${order?.quantity || 0} ${order?.unit || '件'}` },
        { label: '状态', value: getStatusLabel(order?.status || '') },
      ],
    }),
    [order]
  );

  return (
    <PageContainer
      backButton={{ href: '/mes/production-orders' }}
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      }}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        backHref='/mes/orders'
        loading={loading}
        error={errorMessage}
        infoCard={infoCard}
        tabs={tabs}
      />
    </PageContainer>
  );
};

export default ProductionOrderDetailPage;
