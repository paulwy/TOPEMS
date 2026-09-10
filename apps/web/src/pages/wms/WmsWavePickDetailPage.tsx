import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, LinearProgress, Typography } from '@mui/material';
import { wavePickApi } from '@/api/wms/wavePick';
import type { WavePick, WavePickItem } from '@/api/wms/types';
import type { ColumnDef } from '@tanstack/react-table';
import { WmsStatusBadge } from '@/components/wms';
import { DataTable, PageContainer } from '@/components/common';
import { DetailPageTemplate } from '@/components/templates';
import i18n from '@/i18n';

interface WaveOrderRow {
  id: string;
  orderNumber: string;
  customer: string;
  lines: number;
  totalQty: number;
  pickedQty: number;
  progressPct: number;
}

function groupWaveItemsByOrder(items: WavePickItem[]): WaveOrderRow[] {
  const groups = new Map<string, WavePickItem[]>();
  items.forEach((item) => {
    const orderId = item.outbound_order_id ?? item.id;
    if (!groups.has(orderId)) {
      groups.set(orderId, []);
    }
    groups.get(orderId)!.push(item);
  });

  return Array.from(groups.entries()).map(([orderId, orderItems]) => {
    const totalQty = orderItems.reduce((s, i) => s + (i.planned_quantity ?? 0), 0);
    const pickedQty = orderItems.reduce((s, i) => s + (i.picked_quantity ?? 0), 0);
    return {
      id: orderId,
      orderNumber: orderItems[0]?.outbound_order_number ?? orderId,
      customer: '-',
      lines: orderItems.length,
      totalQty,
      pickedQty,
      progressPct: totalQty ? Math.round((pickedQty / totalQty) * 100) : 0,
    };
  });
}

const PICKERS = [
  i18n.t('pages.wms_wave_pick_detail_page.k4'),
  i18n.t('pages.wms_wave_pick_detail_page.k3'),
  i18n.t('pages.wms_wave_pick_detail_page.k2'),
  i18n.t('pages.wms_wave_pick_detail_page.k1'),
  i18n.t('pages.wms_wave_pick_detail_page.k0'),
];

export default function WmsWavePickDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [wave, setWave] = useState<WavePick | null>(null);
  const [orders, setOrders] = useState<WaveOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = (waveId: string) => {
    setLoading(true);
    setError(null);
    Promise.all([
      wavePickApi.get(waveId),
      wavePickApi.listItems(waveId).catch(() => ({ data: { items: [], total: 0 } })),
    ])
      .then(([waveRes, itemsRes]) => {
        setWave(waveRes.data);
        setOrders(groupWaveItemsByOrder(itemsRes.data?.items ?? []));
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message ?? 'Failed to load wave pick');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    loadData(id);
  }, [id]);

  const handleAction = async (action: string, _from: string, _to: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      switch (action) {
        case 'assign':
          await wavePickApi.assign(id, { assigned_to: 'current' });
          break;
        case 'start_pick':
          await wavePickApi.start(id);
          break;
        case 'complete':
          await wavePickApi.complete(id);
          break;
        case 'cancel':
          await wavePickApi.cancel(id);
          break;
        default:
          console.warn(`Unknown action: ${action}`);
      }
      loadData(id);
    } catch (err) {
      console.error('Action failed:', err);
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const ordersData = useMemo<WaveOrderRow[]>(() => orders, [orders]);

  const progress = useMemo(() => {
    // 优先使用 API 返回的真实进度数据
    if (wave && wave.total_quantity > 0) {
      return {
        total: wave.total_quantity,
        picked: wave.picked_quantity,
        pct: Math.round((wave.picked_quantity / wave.total_quantity) * 100),
      };
    }
    // 回退到订单列表计算
    const total = ordersData.reduce((s, o) => s + o.totalQty, 0);
    const picked = ordersData.reduce((s, o) => s + o.pickedQty, 0);
    return { total, picked, pct: total ? Math.round((picked / total) * 100) : 0 };
  }, [ordersData, wave]);

  const columns = useMemo<ColumnDef<WaveOrderRow>[]>(
    () => [
      {
        accessorKey: 'orderNumber',
        header: i18n.t('pages.wms_wave_pick_detail_page.k12'),
        cell: ({ row }) => (
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace' }}
          >
            {row.original.orderNumber}
          </Typography>
        ),
      },
      {
        accessorKey: 'customer',
        header: i18n.t('pages.wms_wave_pick_detail_page.k13'),
        cell: ({ row }) => <Typography variant='body2'>{row.original.customer}</Typography>,
      },
      {
        accessorKey: 'lines',
        header: () => (
          <Box sx={{ textAlign: 'right' }}>{i18n.t('pages.wms_wave_pick_detail_page.k14')}</Box>
        ),
        cell: ({ row }) => (
          <Typography
            variant='body2'
            sx={{ textAlign: 'right' }}
          >
            {row.original.lines}
          </Typography>
        ),
      },
      {
        accessorKey: 'totalQty',
        header: () => (
          <Box sx={{ textAlign: 'right' }}>{i18n.t('pages.wms_wave_pick_detail_page.k15')}</Box>
        ),
        cell: ({ row }) => (
          <Typography
            variant='body2'
            sx={{ textAlign: 'right' }}
          >
            {row.original.totalQty}
          </Typography>
        ),
      },
      {
        accessorKey: 'pickedQty',
        header: () => (
          <Box sx={{ textAlign: 'right' }}>{i18n.t('pages.wms_wave_pick_detail_page.k16')}</Box>
        ),
        cell: ({ row }) => (
          <Typography
            variant='body2'
            sx={{ textAlign: 'right' }}
          >
            {row.original.pickedQty}
          </Typography>
        ),
      },
      {
        accessorKey: 'progressPct',
        header: i18n.t('pages.wms_wave_pick_detail_page.k17'),
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant='determinate'
              value={row.original.progressPct}
              sx={{ flex: 1, height: 8, borderRadius: 1 }}
            />
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ minWidth: 36 }}
            >
              {row.original.progressPct}%
            </Typography>
          </Box>
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <PageContainer autoTitle autoBreadcrumbs>
        <Typography>{i18n.t('common.loading')}</Typography>
      </PageContainer>
    );
  }

  if (error || !wave) {
    return (
      <PageContainer autoTitle autoBreadcrumbs>
        <Typography color="error">{error ?? i18n.t('pages.wms_wave_pick_detail_page.k1')}</Typography>
      </PageContainer>
    );
  }

  const picker =
    wave.assigned_user_name ??
    PICKERS[Number(wave.assigned_to ?? 0) % PICKERS.length] ??
    i18n.t('pages.wms_wave_pick_detail_page.k5');

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
    >
      <DetailPageTemplate
        title={i18n.t('wms:wms_wave_pick_detail_page.v0_0', { v0: wave.wave_pick_number })}
        subtitle={i18n.t('wms:wms_wave_pick_detail_page.v0_1', {
          v0: wave.created_at.slice(0, 10),
        })}
        detailItemName={wave.wave_pick_number}
        headerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WmsStatusBadge
              fsm='wavepick'
              status={wave.status}
            />
          </Box>
        }
        infoCard={{
          title: wave.wave_pick_number,
          subtitle: i18n.t('wms:wms_wave_pick_detail_page.v0_1', {
            v0: wave.created_at.slice(0, 10),
          }),
          tags: [picker],
          stats: [
            {
              label: i18n.t('pages.wms_wave_pick_detail_page.k7'),
              value: picker,
            },
            {
              label: i18n.t('pages.wms_wave_pick_detail_page.k8'),
              value: String(orders.length),
            },
            {
              label: i18n.t('wms.wavePickDetail.k2'),
              value: `${progress.picked} / ${progress.total}`,
            },
            {
              label: i18n.t('pages.wms_wave_pick_detail_page.k9'),
              value: `${progress.pct}%`,
            },
          ],
        }}
        sections={[
          {
            id: 'progress',
            title: i18n.t('pages.wms_wave_pick_detail_page.k10'),
            content: (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {i18n.t('pages.wms_wave_pick_detail_page.k10')}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {progress.picked} / {progress.total}（{progress.pct}%）
                  </Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  value={progress.pct}
                  sx={{ height: 12, borderRadius: 2 }}
                />
              </Box>
            ),
          },
          {
            id: 'orders',
            title: i18n.t('pages.wms_wave_pick_detail_page.k11'),
            content: (
              <DataTable
                columns={columns}
                data={ordersData}
                enablePagination={false}
                showSearch={false}
                showExport={false}
                showCreate={false}
                showSelection={false}
              />
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
