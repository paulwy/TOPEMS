import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Box, LinearProgress, Typography } from '@mui/material';
import { useWmsMock, type WmsMockShape } from '@/api/wms/mockData';
import type { WavePickDto } from '@/types/wms';
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

function buildWaveOrders(waveId: string, count: number): WaveOrderRow[] {
  return Array.from({ length: count }, (_, i) => {
    const totalQty = 10 + i * 4;
    const pickedQty = Math.floor(totalQty * (0.6 + i * 0.1));
    return {
      id: `${waveId}-order-${i + 1}`,
      orderNumber: `OUT-${20250100 + i + 1}`,
      customer: `${i18n.t('pages.wms_wave_pick_detail_page.k0')}${i + 1}`,
      lines: 2 + (i % 3),
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
  const { data } = useWmsMock<WmsMockShape>();

  const wave = useMemo<WavePickDto | undefined>(() => {
    if (!id) return data.wavePickList?.[0];
    return (
      data.wavePickList?.find((w) => w.id === id || w.wave_pick_number === id) ??
      data.wavePickList?.[0]
    );
  }, [id, data.wavePickList]);

  const orders = useMemo<WaveOrderRow[]>(() => (wave ? buildWaveOrders(wave.id, 6) : []), [wave]);

  const progress = useMemo(() => {
    const total = orders.reduce((s, o) => s + o.totalQty, 0);
    const picked = orders.reduce((s, o) => s + o.pickedQty, 0);
    return { total, picked, pct: total ? Math.round((picked / total) * 100) : 0 };
  }, [orders]);

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

  if (!wave) {
    return (
      <PageContainer
        autoTitle
        autoBreadcrumbs
      >
        <Typography>{i18n.t('pages.wms_wave_pick_detail_page.k1')}</Typography>
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
                data={orders}
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
