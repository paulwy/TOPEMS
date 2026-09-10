import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Chip, LinearProgress, Typography } from '@mui/material';
import { outboundOrderApi } from '@/api/wms/outbound';
import type { OutboundOrder } from '@/api/wms/types';
import { WmsStatusBadge, WmsFSMActionButtons } from '@/components/wms';
import { PageContainer } from '@/components/common';
import { DetailPageTemplate } from '@/components/templates';
import i18n from '@/i18n';

const OUTBOUND_STAGES = ['created', 'confirmed', 'picking', 'packing', 'shipping', 'completed'];

function getStageLabels(): Record<string, string> {
  return {
    created: i18n.t('pages.wms_outbound_detail_page.k0'),
    confirmed: i18n.t('pages.wms_outbound_detail_page.k1'),
    picking: i18n.t('pages.wms_outbound_detail_page.k2'),
    packing: i18n.t('pages.wms_outbound_detail_page.k3'),
    shipping: i18n.t('pages.wms_outbound_detail_page.k4'),
    completed: i18n.t('pages.wms_outbound_detail_page.k5'),
  };
}

function StageProgress({ stageIndex }: { stageIndex: number }) {
  const labels = getStageLabels();
  const total = OUTBOUND_STAGES.length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {OUTBOUND_STAGES.map((s, i) => {
          const completed = i <= stageIndex;
          const isLast = i === total - 1;
          return (
            <Box
              key={s}
              sx={{
                display: 'flex',
                alignItems: 'center',
                flex: isLast ? '0 0 auto' : 1,
              }}
            >
              <Chip
                size='small'
                label={i + 1}
                color={completed ? 'primary' : 'default'}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  '& .MuiChip-label': { p: 0, fontWeight: 600 },
                }}
              />
              <Typography
                variant='caption'
                sx={{
                  ml: 1,
                  mr: isLast ? 0 : 1,
                  color: completed ? 'text.primary' : 'text.secondary',
                  whiteSpace: 'nowrap',
                }}
              >
                {labels[s]}
              </Typography>
              {!isLast && (
                <Box
                  sx={{
                    flex: 1,
                    height: 2,
                    bgcolor: i < stageIndex ? 'primary.main' : 'divider',
                    mx: 1,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
      <LinearProgress
        variant='determinate'
        value={(stageIndex / (total - 1)) * 100}
        sx={{ height: 8, borderRadius: 1 }}
      />
    </Box>
  );
}

export default function WmsOutboundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OutboundOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadOrder = (orderId: string) => {
    setLoading(true);
    setError(null);
    outboundOrderApi
      .get(orderId)
      .then((res) => {
        setOrder(res.data ?? null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message ?? 'Failed to load outbound order');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    loadOrder(id);
  }, [id]);

  const handleAction = async (action: string, _from: string, _to: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      switch (action) {
        case 'confirm':
          await outboundOrderApi.confirm(id);
          break;
        case 'start_pick':
          await outboundOrderApi.pick(id);
          break;
        case 'start_pack':
          // pack 状态通过 update 或专用接口，暂用 update
          await outboundOrderApi.update(id, { status: 'packing' });
          break;
        case 'reject_pack':
          await outboundOrderApi.update(id, { status: 'picking' });
          break;
        case 'start_ship':
          await outboundOrderApi.ship(id, []);
          break;
        case 'complete':
          await outboundOrderApi.complete(id);
          break;
        case 'cancel':
          await outboundOrderApi.update(id, { status: 'cancelled' });
          break;
        default:
          console.warn(`Unknown action: ${action}`);
      }
      loadOrder(id);
    } catch (err) {
      console.error('Action failed:', err);
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const stageIndex = useMemo(() => {
    const i = OUTBOUND_STAGES.indexOf(order?.status ?? '');
    return i < 0 ? 0 : i;
  }, [order]);

  if (loading) {
    return (
      <PageContainer autoTitle autoBreadcrumbs>
        <Typography>{i18n.t('common.loading')}</Typography>
      </PageContainer>
    );
  }

  if (error || !order) {
    return (
      <PageContainer autoTitle autoBreadcrumbs>
        <Typography color="error">{error ?? i18n.t('pages.wms_outbound_detail_page.k0')}</Typography>
      </PageContainer>
    );
  }

  // 扩展字段：后端模型可能不包含这些字段，使用类型断言访问
  const extendedOrder = order as OutboundOrder & {
    warehouse_name?: string;
    customer_name?: string;
    carrier?: string;
    tracking_number?: string;
    picked_quantity?: number;
    shipped_quantity?: number;
  };

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
    >
      <DetailPageTemplate
        title={i18n.t('wms:wms_outbound_detail_page.v0_3', { v0: order.order_number })}
        subtitle={i18n.t('wms:wms_outbound_detail_page.v0_2', { v0: extendedOrder.customer_name ?? '-' })}
        detailItemName={order.order_number}
        headerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WmsStatusBadge
              fsm='outbound'
              status={order.status}
            />
            <WmsFSMActionButtons
              fsm='outbound'
              currentStatus={order.status}
              onAction={handleAction}
              disabled={actionLoading}
            />
          </Box>
        }
        infoCard={{
          title: order.order_number,
          subtitle: i18n.t('wms:wms_outbound_detail_page.v0_2', { v0: extendedOrder.customer_name ?? '-' }),
          tags: [extendedOrder.warehouse_name ?? '-', extendedOrder.carrier ?? '-'],
          stats: [
            {
              label: i18n.t('pages.wms_outbound_detail_page.k7'),
              value: extendedOrder.warehouse_name ?? '-',
            },
            {
              label: i18n.t('wms:wms_outbound_detail_page.k1'),
              value: `${extendedOrder.carrier ?? '-'} / ${extendedOrder.tracking_number ?? '-'}`,
            },
            {
              label: i18n.t('wms:wms_outbound_detail_page.k0'),
              value: `${extendedOrder.picked_quantity ?? 0} / ${extendedOrder.shipped_quantity ?? 0}`,
            },
            {
              label: i18n.t('pages.wms_outbound_detail_page.k8'),
              value: `¥${(order.total_amount ?? 0).toLocaleString()}`,
            },
          ],
        }}
        sections={[
          {
            id: 'progress',
            title: i18n.t('pages.wms_outbound_detail_page.k6'),
            content: <StageProgress stageIndex={stageIndex} />,
          },
        ]}
      />
    </PageContainer>
  );
}
