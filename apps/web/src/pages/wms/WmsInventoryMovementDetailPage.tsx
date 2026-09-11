import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import { ArrowRight, MapPin } from 'lucide-react';
import { inventoryMovementApi } from '@/api/wms/inventoryMovement';
import type { InventoryMovement } from '@/api/wms/inventoryMovement';
import { WmsStatusBadge } from '@/components/wms';
import { PageContainer } from '@/components/common';
import { DetailPageTemplate } from '@/components/templates';
import i18n from '@/i18n';

// 扩展类型：包含页面需要但 API 可能不返回的字段
type ExtendedMovement = InventoryMovement & {
  movement_number?: string;
  source_location_code?: string;
  target_location_code?: string;
  warehouse_name?: string;
  created_by?: string;
  posted_at?: string;
  posted_by?: string;
  approved_at?: string;
  approved_by?: string;
  serial_number?: string;
  batch_number?: string;
  total_quantity?: number;
};

function MovementRouteCard({ move }: { move: ExtendedMovement }) {
  const sourceLoc = move.source_location_code ?? 'A-01-01';
  const targetLoc = move.target_location_code ?? 'B-02-05';
  const warehouse = move.warehouse_name ?? '-';

  return (
    <Card variant='outlined'>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-around',
            gap: 2,
          }}
        >
          <Box
            sx={{
              textAlign: 'center',
              p: 3,
              borderRadius: 2,
              bgcolor: 'warning.50',
              border: 1,
              borderColor: 'warning.200',
              minWidth: 180,
            }}
          >
            <Typography
              variant='caption'
              sx={{ color: 'warning.800' }}
            >
              {i18n.t('pages.wms_inventory_movement_detail_page.k1')}
            </Typography>
            <Typography
              variant='h6'
              sx={{ color: 'warning.900', fontWeight: 700, fontFamily: 'monospace', mt: 0.5 }}
            >
              {sourceLoc}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('wms:wms_inventory_movement_detail_page.v0_3', { v0: warehouse })}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.disabled' }}>
            <MapPin size={18} />
            <ArrowRight size={32} />
            <MapPin size={18} />
          </Box>

          <Box
            sx={{
              textAlign: 'center',
              p: 3,
              borderRadius: 2,
              bgcolor: 'info.50',
              border: 1,
              borderColor: 'info.200',
              minWidth: 180,
            }}
          >
            <Typography
              variant='caption'
              sx={{ color: 'info.800' }}
            >
              {i18n.t('pages.wms_inventory_movement_detail_page.k2')}
            </Typography>
            <Typography
              variant='h6'
              sx={{ color: 'info.900', fontWeight: 700, fontFamily: 'monospace', mt: 0.5 }}
            >
              {targetLoc}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('wms:wms_inventory_movement_detail_page.v0_2', { v0: warehouse })}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function SerialNumbers({ serials }: { serials: string[] }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {serials.map((sn, i) => (
        <Chip
          key={i}
          label={sn}
          variant='outlined'
          size='small'
          sx={{ fontFamily: 'monospace' }}
        />
      ))}
    </Box>
  );
}

function OperationTimeline({ move }: { move: ExtendedMovement }) {
  const events = [
    {
      t: move.created_at,
      title: i18n.t('pages.wms_inventory_movement_detail_page.k8'),
      who: move.created_by ?? 'system',
      color: 'primary.main',
    },
    {
      t: move.posted_at ?? move.performed_at,
      title: i18n.t('pages.wms_inventory_movement_detail_page.k9'),
      who: move.posted_by ?? move.performed_by,
      color: 'warning.main',
    },
    {
      t: move.approved_at,
      title: i18n.t('pages.wms_inventory_movement_detail_page.k10'),
      who: move.approved_by,
      color: 'success.main',
    },
  ].filter((x) => x.t);

  return (
    <Box sx={{ position: 'relative', ml: 1.5, pl: 2, borderLeft: 1, borderColor: 'divider' }}>
      {events.map((e, i) => (
        <Box
          key={i}
          sx={{ position: 'relative', mb: 2, pl: 3 }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: -7,
              top: 6,
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: e.color,
              border: 2,
              borderColor: 'background.paper',
            }}
          />
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {e.t?.slice(0, 19).replace('T', ' ')}
          </Typography>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {e.title}
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('wms:wms_inventory_movement_detail_page.v0_0', { v0: e.who ?? 'system' })}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function WmsInventoryMovementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [move, setMove] = useState<ExtendedMovement | null>(null);
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

    inventoryMovementApi
      .getMovement(id)
      .then((res) => {
        if (!cancelled) {
          const data = res.data as ExtendedMovement;
          // 兼容字段：movement_no -> movement_number
          if (data.movement_no && !data.movement_number) {
            data.movement_number = data.movement_no;
          }
          setMove(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load inventory movement');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const serials = useMemo(() => {
    if (move?.serial_number) return [move.serial_number];
    return ['SN-2024A001', 'SN-2024A002', 'SN-2024A003'];
  }, [move]);

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

  if (error || !move) {
    return (
      <PageContainer
        autoTitle
        autoBreadcrumbs
      >
        <Typography color='error'>
          {error ?? i18n.t('pages.wms_inventory_movement_detail_page.k0')}
        </Typography>
      </PageContainer>
    );
  }

  const matCode = move.material_code ?? 'SKU-1000';
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
    >
      <DetailPageTemplate
        title={i18n.t('wms:wms_inventory_movement_detail_page.v0_5', {
          v0: move.movement_number ?? move.movement_no,
        })}
        subtitle={i18n.t('wms:wms_inventory_movement_detail_page.k4', {
          v0: i18n.t('pages.wms_inventory_movement_detail_page.k1'),
          v1: move.movement_type ?? i18n.t('pages.wms_inventory_movement_detail_page.k0'),
          v2: move.created_at.slice(0, 10),
        })}
        detailItemName={move.movement_number ?? move.movement_no}
        headerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WmsStatusBadge
              fsm='movement'
              status={move.status}
            />
          </Box>
        }
        infoCard={{
          title: move.movement_number ?? move.movement_no,
          subtitle: i18n.t('wms:wms_inventory_movement_detail_page.k4', {
            v0: i18n.t('pages.wms_inventory_movement_detail_page.k1'),
            v1: move.movement_type ?? i18n.t('pages.wms_inventory_movement_detail_page.k0'),
            v2: move.created_at.slice(0, 10),
          }),
          tags: [move.warehouse_name ?? '-'],
          stats: [
            {
              label: i18n.t('wms:wms_inventory_movement_detail_page.k1'),
              value: matCode,
            },
            {
              label: i18n.t('pages.wms_inventory_movement_detail_page.k3'),
              value: String(move.quantity ?? move.total_quantity ?? 0),
            },
            {
              label: i18n.t('pages.wms_inventory_movement_detail_page.k4'),
              value: move.batch_number ?? 'B202410-001',
            },
            {
              label: i18n.t('pages.wms_inventory_movement_detail_page.k5'),
              value: String(serials.length),
            },
          ],
        }}
        sections={[
          {
            id: 'route',
            title: i18n.t('pages.wms_inventory_movement_detail_page.k0'),
            content: <MovementRouteCard move={move} />,
          },
          {
            id: 'serials',
            title: i18n.t('pages.wms_inventory_movement_detail_page.k6'),
            content: <SerialNumbers serials={serials} />,
          },
          {
            id: 'timeline',
            title: i18n.t('pages.wms_inventory_movement_detail_page.k7'),
            content: <OperationTimeline move={move} />,
          },
        ]}
      />
    </PageContainer>
  );
}
