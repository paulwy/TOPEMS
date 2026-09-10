import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import { stockTakeApi } from '@/api/wms/stocktake';
import type { StockTake } from '@/api/wms/types';
import { WmsFSMActionButtons, WmsStatusBadge } from '@/components/wms';
import { DataTable, PageContainer } from '@/components/common';
import { DetailPageTemplate } from '@/components/templates';
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
  const [task, setTask] = useState<StockTake | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    stockTakeApi
      .get(id)
      .then((res: { data: StockTake }) => {
        if (!cancelled) {
          setTask(res.data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load stock take');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const items = useMemo<StockTakeItemRow[]>(
    () => (task ? buildStockTakeItems(task.id, 8) : []),
    [task]
  );

  const diffSummary = useMemo(() => {
    // 优先使用 API 返回的真实统计数据
    if (task && task.totalitems) {
      return {
        over: task.discrepancyitems ?? 0,
        under: 0,
        ok: task.counteditems ?? 0,
        total: task.totalitems,
        accuracy: task.accuracy_rate ?? 0,
      };
    }
    // 回退到 items 列表计算
    const over = items.filter((i) => i.diff > 0).length;
    const under = items.filter((i) => i.diff < 0).length;
    const ok = items.filter((i) => i.diff === 0).length;
    const total = items.length;
    const accuracy = total ? Math.round((ok / total) * 100) : 0;
    return { over, under, ok, total, accuracy };
  }, [items, task]);

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

  if (loading) {
    return (
      <PageContainer autoTitle autoBreadcrumbs>
        <Typography>{i18n.t('common.loading')}</Typography>
      </PageContainer>
    );
  }

  if (error || !task) {
    return (
      <PageContainer autoTitle autoBreadcrumbs>
        <Typography color="error">{error ?? i18n.t('pages.wms_stock_take_detail_page.k1')}</Typography>
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
