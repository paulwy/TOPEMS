import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import { stockTakeApi } from '@/api/wms/stocktake';
import type { StockTake, StockTakeItem } from '@/api/wms/types';
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

function mapStockTakeItems(items: StockTakeItem[]): StockTakeItemRow[] {
  return items.map((item) => {
    const diff = item.discrepancy_quantity ?? (item.counted_quantity ?? 0) - item.system_quantity;
    return {
      id: item.id,
      sku: item.material_code,
      name: item.material_name,
      location: item.location_code ?? item.location_name ?? '-',
      systemQty: item.system_quantity,
      actualQty: item.counted_quantity ?? 0,
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
  const [items, setItems] = useState<StockTakeItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = (taskId: string) => {
    setLoading(true);
    setError(null);
    Promise.all([
      stockTakeApi.get(taskId),
      stockTakeApi.listItems(taskId).catch(() => ({ data: { items: [], total: 0 } })),
    ])
      .then(([taskRes, itemsRes]) => {
        setTask(taskRes.data);
        setItems(mapStockTakeItems(itemsRes.data?.items ?? []));
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err?.message ?? 'Failed to load stock take');
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
        case 'start':
          await stockTakeApi.start(id);
          break;
        case 'complete':
          await stockTakeApi.complete(id);
          break;
        case 'cancel':
          await stockTakeApi.update(id, { status: 'cancelled' });
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

  const itemsData = useMemo<StockTakeItemRow[]>(() => items, [items]);

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
      <PageContainer
        autoTitle
        autoBreadcrumbs
      >
        <Typography>{i18n.t('common.loading')}</Typography>
      </PageContainer>
    );
  }

  if (error || !task) {
    return (
      <PageContainer
        autoTitle
        autoBreadcrumbs
      >
        <Typography color='error'>
          {error ?? i18n.t('pages.wms_stock_take_detail_page.k1')}
        </Typography>
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
              onAction={handleAction}
              disabled={actionLoading}
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
                data={itemsData}
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
