import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Chip, Typography } from '@mui/material';
import { inboundOrderApi } from '@/api/wms/inbound';
import type { InboundOrder, InboundOrderItem } from '@/api/wms/types';
import type { ColumnDef } from '@tanstack/react-table';
import type { TimelineItem } from '@/components/common/StatusTimeline';
import { WmsStatusBadge, WmsFSMActionButtons } from '@/components/wms';
import { DataTable, PageContainer } from '@/components/common';
import StatusTimeline from '@/components/common/StatusTimeline';
import { DetailPageTemplate } from '@/components/templates';
import i18n from '@/i18n';

interface InboundItemRow {
  id: string;
  line_number: number;
  material_code: string;
  material_name: string;
  unit: string;
  expected_quantity: number;
  received_quantity: number;
  unit_price?: number;
  total_amount?: number;
  status: 'received' | 'pending';
}

function mapInboundItems(items: InboundOrderItem[]): InboundItemRow[] {
  return items.map((item) => ({
    id: item.id,
    line_number: item.line_number,
    material_code: item.material_code,
    material_name: item.material_name,
    unit: item.unit,
    expected_quantity: item.expected_quantity,
    received_quantity: item.received_quantity,
    status: item.status === 'received' ? 'received' : 'pending',
  }));
}

export default function WmsInboundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<InboundOrder | null>(null);
  const [items, setItems] = useState<InboundItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = (orderId: string) => {
    setLoading(true);
    setError(null);
    Promise.all([
      inboundOrderApi.get(orderId),
      inboundOrderApi.listItems(orderId).catch(() => ({ data: { items: [], total: 0 } })),
    ])
      .then(([orderRes, itemsRes]) => {
        setOrder(orderRes.data);
        setItems(mapInboundItems(itemsRes.data?.items ?? []));
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message ?? 'Failed to load inbound order');
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
        case 'confirm':
          await inboundOrderApi.confirm(id);
          break;
        case 'revert_created':
          await inboundOrderApi.update(id, { status: 'created' });
          break;
        case 'receive':
          await inboundOrderApi.receive(id, []);
          break;
        case 'reject_receive':
          await inboundOrderApi.update(id, { status: 'confirmed' });
          break;
        case 'complete':
          await inboundOrderApi.complete(id);
          break;
        case 'cancel':
          await inboundOrderApi.update(id, { status: 'cancelled' });
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

  const itemsData = useMemo<InboundItemRow[]>(() => items, [items]);

  const columns = useMemo<ColumnDef<InboundItemRow>[]>(
    () => [
      {
        accessorKey: 'line_number',
        header: i18n.t('pages.wms_inbound_detail_page.k10'),
        cell: ({ row }) => <Typography variant='body2'>{row.original.line_number}</Typography>,
      },
      {
        accessorKey: 'material_code',
        header: i18n.t('pages.wms_inbound_detail_page.k11'),
        cell: ({ row }) => (
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace' }}
          >
            {row.original.material_code}
          </Typography>
        ),
      },
      {
        accessorKey: 'material_name',
        header: i18n.t('pages.wms_inbound_detail_page.k12'),
        cell: ({ row }) => <Typography variant='body2'>{row.original.material_name}</Typography>,
      },
      {
        accessorKey: 'expected_quantity',
        header: () => (
          <Box sx={{ textAlign: 'right' }}>{i18n.t('pages.wms_inbound_detail_page.k13')}</Box>
        ),
        cell: ({ row }) => (
          <Typography
            variant='body2'
            sx={{ textAlign: 'right' }}
          >
            {row.original.expected_quantity}
          </Typography>
        ),
      },
      {
        accessorKey: 'received_quantity',
        header: () => (
          <Box sx={{ textAlign: 'right' }}>{i18n.t('pages.wms_inbound_detail_page.k14')}</Box>
        ),
        cell: ({ row }) => (
          <Typography
            variant='body2'
            sx={{ textAlign: 'right' }}
          >
            {row.original.received_quantity}
          </Typography>
        ),
      },
      {
        accessorKey: 'unit_price',
        header: () => (
          <Box sx={{ textAlign: 'right' }}>{i18n.t('pages.wms_inbound_detail_page.k15')}</Box>
        ),
        cell: ({ row }) => (
          <Typography
            variant='body2'
            sx={{ textAlign: 'right' }}
          >
            ¥{(row.original.unit_price ?? 0).toLocaleString()}
          </Typography>
        ),
      },
      {
        accessorKey: 'status',
        header: i18n.t('pages.wms_inbound_detail_page.k16'),
        cell: ({ row }) => (
          <Chip
            size='small'
            label={
              row.original.status === 'received'
                ? i18n.t('pages.wms_inbound_detail_page.k18')
                : i18n.t('pages.wms_inbound_detail_page.k17')
            }
            color={row.original.status === 'received' ? 'success' : 'default'}
          />
        ),
      },
    ],
    []
  );

  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (!order) return [];
    return [
      {
        id: 'created',
        title: i18n.t('pages.wms_inbound_detail_page.k20'),
        description: i18n.t('wms:wms_inbound_detail_page.v0_0', {
          v0: order.created_by ?? 'system',
        }),
        status: 'completed',
        time: order.created_at?.slice(0, 19).replace('T', ' '),
      },
      {
        id: 'approved',
        title: i18n.t('pages.wms_inbound_detail_page.k21'),
        description: order.approved_by
          ? i18n.t('wms:wms_inbound_detail_page.v0_0', { v0: order.approved_by })
          : undefined,
        status: order.approved_at ? 'completed' : 'pending',
        time: order.approved_at?.slice(0, 19).replace('T', ' '),
      },
    ];
  }, [order]);

  if (loading) {
    return (
      <PageContainer
        autoTitle
        autoBreadcrumbs
      >
        <Typography>{i18n.t('common.loading')}</Typography>
      </PageContainer>
    );
  }

  if (error || !order) {
    return (
      <PageContainer
        autoTitle
        autoBreadcrumbs
      >
        <Typography color='error'>{error ?? i18n.t('pages.wms_inbound_detail_page.k0')}</Typography>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
    >
      <DetailPageTemplate
        title={i18n.t('wms:wms_inbound_detail_page.v0_3', { v0: order.order_number })}
        subtitle={i18n.t('wms:wms_inbound_detail_page.v0_2', {
          v0: order.created_at.slice(0, 10),
        })}
        detailItemName={order.order_number}
        headerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WmsStatusBadge
              fsm='inbound'
              status={order.status}
            />
            <WmsFSMActionButtons
              fsm='inbound'
              currentStatus={order.status}
              onAction={handleAction}
              disabled={actionLoading}
            />
          </Box>
        }
        infoCard={{
          title: order.order_number,
          subtitle: i18n.t('wms:wms_inbound_detail_page.v0_2', {
            v0: order.created_at.slice(0, 10),
          }),
          tags: [order.warehouse_name ?? '-', order.supplier_name ?? '-'],
          stats: [
            {
              label: i18n.t('pages.wms_inbound_detail_page.k8'),
              value: `¥${(order.total_amount ?? 0).toLocaleString()}`,
            },
            {
              label: i18n.t('wms:wms_inbound_detail_page.k1'),
              value: `${order.total_quantity ?? 0} / ${order.received_quantity ?? 0}`,
            },
          ],
        }}
        sections={[
          {
            id: 'summary',
            title: i18n.t('pages.wms_inbound_detail_page.k9'),
            content: (
              <DataTable
                columns={columns}
                data={itemsData}
                searchKey='material_name'
                showSearch={false}
                showExport={false}
                enablePagination={false}
                striped
              />
            ),
          },
          {
            id: 'timeline',
            title: i18n.t('pages.wms_inbound_detail_page.k19'),
            content: <StatusTimeline items={timelineItems} />,
          },
        ]}
      />
    </PageContainer>
  );
}
