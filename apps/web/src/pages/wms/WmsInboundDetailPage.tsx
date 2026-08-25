import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Chip, Typography } from '@mui/material';
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import type { InboundOrderDto } from '@/types/wms';
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
  unit_price: number;
  total_amount: number;
  status: 'received' | 'pending';
}

function buildInboundItems(orderId: string, count: number) {
  const mats = [
    {
      code: 'MAT-001',
      name: i18n.t('pages.wms_inbound_detail_page.a_1'),
      unit: i18n.t('pages.wms_inbound_detail_page.k0'),
    },
    {
      code: 'MAT-002',
      name: i18n.t('pages.wms_inbound_detail_page.b_3'),
      unit: i18n.t('pages.wms_inbound_detail_page.k2'),
    },
    {
      code: 'MAT-003',
      name: i18n.t('pages.wms_inbound_detail_page.c_5'),
      unit: i18n.t('pages.wms_inbound_detail_page.k4'),
    },
  ];
  return Array.from({ length: count }, (_, i) => {
    const m = mats[i % mats.length];
    const expected = 10 + i * 15;
    const status: InboundItemRow['status'] = i % 2 ? 'received' : 'pending';
    return {
      id: `${orderId}-line-${i + 1}`,
      line_number: i + 1,
      material_code: m.code,
      material_name: m.name,
      unit: m.unit,
      expected_quantity: expected,
      received_quantity: Math.floor(expected * (0.8 + i * 0.1)),
      unit_price: 50 + i * 100,
      total_amount: expected * (50 + i * 100),
      status,
    };
  });
}

export default function WmsInboundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useWmsMock<WmsMockShape>();

  const order = useMemo<InboundOrderDto | undefined>(() => {
    if (!id) return data.inboundList?.[0];
    return (
      data.inboundList?.find((o) => o.id === id || o.order_number === id) ?? data.inboundList?.[0]
    );
  }, [id, data.inboundList]);

  const items = useMemo<InboundItemRow[]>(
    () => (order ? buildInboundItems(order.id, 4) : []),
    [order]
  );

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
            ¥{row.original.unit_price.toLocaleString()}
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

  if (!order) {
    return (
      <PageContainer
        autoTitle
        autoBreadcrumbs
      >
        <Typography>{i18n.t('pages.wms_inbound_detail_page.k0')}</Typography>
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
              onAction={() => {}}
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
                data={items}
                searchKey='material_name'
                showSearch={false}
                showFilters={false}
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
