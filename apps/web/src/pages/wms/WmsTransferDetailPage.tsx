import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import { Truck, ArrowLeftRight, MapPin, Package, CheckCircle2 } from 'lucide-react';
import { transferApi } from '@/api/wms/transfer';
import type { TransferOrder } from '@/api/wms/types';
import { WmsStatusBadge, WmsFSMActionButtons } from '@/components/wms';
import { PageContainer } from '@/components/common';
import { DetailPageTemplate } from '@/components/templates';
import i18n from '@/i18n';

// 扩展类型：包含页面需要但 API 可能不返回的字段
type ExtendedTransfer = TransferOrder & {
  received_at?: string;
};

function TransferRouteCard({ transfer }: { transfer: ExtendedTransfer }) {
  return (
    <Card variant='outlined'>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: 'primary.50',
              border: 1,
              borderColor: 'primary.200',
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
              }}
            >
              <MapPin size={20} />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='primary.main'
              >
                {i18n.t('pages.wms_transfer_detail_page.k0')}
              </Typography>
              <Typography
                variant='h6'
                sx={{ color: 'primary.900', fontWeight: 700 }}
              >
                {transfer.from_warehouse_name ?? '-'}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.disabled', px: 2 }}
          >
            <Package size={18} />
            <ArrowLeftRight size={24} />
            <Truck size={20} />
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: 'success.50',
              border: 1,
              borderColor: 'success.200',
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: '50%',
                bgcolor: 'success.main',
                color: 'success.contrastText',
                display: 'flex',
              }}
            >
              <CheckCircle2 size={20} />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='success.main'
              >
                {i18n.t('pages.wms_transfer_detail_page.k1')}
              </Typography>
              <Typography
                variant='h6'
                sx={{ color: 'success.900', fontWeight: 700 }}
              >
                {transfer.to_warehouse_name ?? '-'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function TransferDetails({ transfer }: { transfer: ExtendedTransfer }) {
  const items = [
    {
      label: i18n.t('pages.wms_transfer_detail_page.k4'),
      value: transfer.shipped_at?.slice(0, 19).replace('T', ' ') ?? '-',
    },
    {
      label: i18n.t('pages.wms_transfer_detail_page.k5'),
      value: transfer.received_at?.slice(0, 19).replace('T', ' ') ?? '-',
    },
    {
      label: i18n.t('pages.wms_transfer_detail_page.k6'),
      value: transfer.remarks ?? i18n.t('pages.wms_transfer_detail_page.k7'),
    },
  ];

  return (
    <Grid
      container
      spacing={2}
    >
      {items.map((it) => (
        <Grid
          key={it.label}
          size={{ xs: 12, md: it.label === i18n.t('pages.wms_transfer_detail_page.k6') ? 12 : 6 }}
        >
          <Typography
            variant='caption'
            color='text.secondary'
            component='div'
          >
            {it.label}
          </Typography>
          <Typography variant='body2'>{it.value}</Typography>
        </Grid>
      ))}
    </Grid>
  );
}

export default function WmsTransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [transfer, setTransfer] = useState<ExtendedTransfer | null>(null);
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

    transferApi
      .get(id)
      .then((res) => {
        if (!cancelled) {
          setTransfer(res.data as ExtendedTransfer);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load transfer order');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <PageContainer autoTitle autoBreadcrumbs>
        <Typography>{i18n.t('common.loading')}</Typography>
      </PageContainer>
    );
  }

  if (error || !transfer) {
    return (
      <PageContainer autoTitle autoBreadcrumbs>
        <Typography color="error">{error ?? i18n.t('pages.wms_transfer_detail_page.k0')}</Typography>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
    >
      <DetailPageTemplate
        title={i18n.t('wms:wms_transfer_detail_page.v0_4', { v0: transfer.order_number })}
        subtitle={i18n.t('wms:wms_transfer_detail_page.v0_3', {
          v0: transfer.created_at.slice(0, 10),
        })}
        detailItemName={transfer.order_number}
        headerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WmsStatusBadge
              fsm='transfer'
              status={transfer.status}
            />
            <WmsFSMActionButtons
              fsm='transfer'
              currentStatus={transfer.status}
              onAction={() => {}}
            />
          </Box>
        }
        infoCard={{
          title: transfer.order_number,
          subtitle: i18n.t('wms:wms_transfer_detail_page.v0_3', {
            v0: transfer.created_at.slice(0, 10),
          }),
          tags: [transfer.from_warehouse_name ?? '-', transfer.to_warehouse_name ?? '-'],
          stats: [
            {
              label: i18n.t('wms:wms_transfer_detail_page.k2'),
              value: transfer.transfer_type ?? i18n.t('pages.wms_transfer_detail_page.k2'),
            },
            {
              label: i18n.t('wms:wms_transfer_detail_page.k1'),
              value: `${transfer.transporter ?? '-'} / ${transfer.tracking_number ?? '-'}`,
            },
            {
              label: i18n.t('wms:wms_transfer_detail_page.k0'),
              value: `${transfer.total_quantity ?? 0} · ${transfer.planned_date?.slice(0, 10) ?? '-'}`,
            },
          ],
        }}
        sections={[
          {
            id: 'route',
            title: i18n.t('pages.wms_transfer_detail_page.k8'),
            content: <TransferRouteCard transfer={transfer} />,
          },
          {
            id: 'details',
            title: i18n.t('pages.wms_transfer_detail_page.k3'),
            content: <TransferDetails transfer={transfer} />,
          },
        ]}
      />
    </PageContainer>
  );
}
