import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { WmsFSMActionButtons, WmsStatusBadge } from '@/components/wms';
import { DataTable, PageContainer } from '@/components/common';
import { DetailPageTemplate } from '@/components/templates';
import type { StockTakeDto } from '@/types/wms';
import i18n from '@/i18n';

interface StockTakeItemRow {
  id: string;
  sku: string;
  name: string;
  location: string;
  systemQty: number;
  actualQty: number;
  diff: number;
  reason: string;
}

function buildStockTakeItems(id: string, count: number): StockTakeItemRow[] {
  return Array.from({ length: count }, (_, i) => {
    const system = 20 + i * 15;
    const actual = system + (i % 3 === 0 ? -2 : i % 3 === 1 ? 1 : 0);
    const diff = actual - system;
    return {
      id: `${id}-item-${i}`,
      sku: `SKU-${String(1000 + i).padStart(4, '0')}`,
      name: `${i18n.t('pages.wms_stock_take_detail_page.k0')}${i + 1}`,
      location: `A-${Math.floor(i / 4) + 1}-${(i % 10) + 1}`,
      systemQty: system,
      actualQty: actual,
      diff,
      reason:
        diff === 0
          ? i18n.t('pages.wms_stock_take_detail_page.k2')
          : diff > 0
            ? i18n.t('pages.wms_stock_take_detail_page.k1')
            : i18n.t('pages.wms_stock_take_detail_page.k0'),
    };
  });
}

function DiffCell({ diff }: { diff: number }) {
  const color = diff === 0 ? 'success.main' : diff > 0 ? 'warning.main' : 'error.main';
  return (
    <Typography
      variant='body2'
      sx={{ textAlign: 'right', color, fontWeight: 600 }}
    >
      {diff > 0 ? '+' : ''}
      {diff}
    </Typography>
  );
}

export default function WmsStockTakeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useWmsMock<WmsMockShape>();

  const task = useMemo<StockTakeDto | undefined>(() => {
    if (!id) return data.stockTakeList?.[0];
    return (
      data.stockTakeList?.find((t) => t.id === id || t.stock_take_number === id) ??
      data.stockTakeList?.[0]
    );
  }, [id, data.stockTakeList]);

  const items = useMemo<StockTakeItemRow[]>(
    () => (task ? buildStockTakeItems(task.id, 8) : []),
    [task]
  );

  const diffSummary = useMemo(() => {
    const over = items.filter((i) => i.diff > 0).length;
    const under = items.filter((i) => i.diff < 0).length;
    const ok = items.filter((i) => i.diff === 0).length;
    const total = items.length;
    const accuracy = total ? Math.round((ok / total) * 100) : 0;
    return { over, under, ok, total, accuracy };
  }, [items]);

  const columns = useMemo<ColumnDef<StockTakeItemRow>[]>(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => (
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace' }}
          >
            {row.original.sku}
          </Typography>
        ),
      },
      {
        accessorKey: 'name',
        header: i18n.t('pages.wms_stock_take_detail_page.k8'),
        cell: ({ row }) => <Typography variant='body2'>{row.original.name}</Typography>,
      },
      {
        accessorKey: 'location',
        header: i18n.t('pages.wms_stock_take_detail_page.k9'),
        cell: ({ row }) => (
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace' }}
          >
            {row.original.location}
          </Typography>
        ),
      },
      {
        accessorKey: 'systemQty',
        header: () => (
          <Box sx={{ textAlign: 'right' }}>{i18n.t('pages.wms_stock_take_detail_page.k10')}</Box>
        ),
        cell: ({ row }) => (
          <Typography
            variant='body2'
            sx={{ textAlign: 'right' }}
          >
            {row.original.systemQty}
          </Typography>
        ),
      },
      {
        accessorKey: 'actualQty',
        header: () => (
          <Box sx={{ textAlign: 'right' }}>{i18n.t('pages.wms_stock_take_detail_page.k11')}</Box>
        ),
        cell: ({ row }) => (
          <Typography
            variant='body2'
            sx={{ textAlign: 'right' }}
          >
            {row.original.actualQty}
          </Typography>
        ),
      },
      {
        accessorKey: 'diff',
        header: () => (
          <Box sx={{ textAlign: 'right' }}>{i18n.t('pages.wms_stock_take_detail_page.k12')}</Box>
        ),
        cell: ({ row }) => <DiffCell diff={row.original.diff} />,
      },
      {
        accessorKey: 'reason',
        header: i18n.t('pages.wms_stock_take_detail_page.k13'),
        cell: ({ row }) => <Typography variant='body2'>{row.original.reason}</Typography>,
      },
    ],
    []
  );

  if (!task) {
    return (
      <PageContainer
        autoTitle
        autoBreadcrumbs
      >
        <Typography>{i18n.t('pages.wms_stock_take_detail_page.k1')}</Typography>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
    >
      <DetailPageTemplate
        title={`${i18n.t('wms.stockTakeDetail.k0')} ${task.stock_take_number}`}
        subtitle={`${i18n.t('pages.wms_stock_take_detail_page.k2')}${
          task.stock_take_type ?? i18n.t('pages.wms_stock_take_detail_page.k3')
        } ${i18n.t('wms.stockTakeDetail.k1')}${task.warehouse_name ?? '-'}`}
        detailItemName={task.stock_take_number}
        headerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WmsStatusBadge
              fsm='stocktake'
              status={task.status}
            />
            <WmsFSMActionButtons
              fsm='stocktake'
              currentStatus={task.status}
              onAction={() => {}}
            />
          </Box>
        }
        infoCard={{
          title: task.stock_take_number,
          subtitle: `${i18n.t('pages.wms_stock_take_detail_page.k2')}${
            task.stock_take_type ?? i18n.t('pages.wms_stock_take_detail_page.k3')
          }`,
          tags: [task.warehouse_name ?? '-'],
          stats: [
            {
              label: i18n.t('pages.wms_stock_take_detail_page.k4'),
              value: String(diffSummary.ok),
            },
            {
              label: i18n.t('pages.wms_stock_take_detail_page.k5'),
              value: String(diffSummary.over),
            },
            {
              label: i18n.t('pages.wms_stock_take_detail_page.k6'),
              value: String(diffSummary.under),
            },
            {
              label: i18n.t('pages.wms_stock_take_detail_page.k7'),
              value: `${diffSummary.accuracy}%`,
            },
          ],
        }}
        sections={[
          {
            id: 'items',
            title: i18n.t('wms.stockTakeDetail.k2'),
            content: (
              <DataTable
                columns={columns}
                data={items}
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
