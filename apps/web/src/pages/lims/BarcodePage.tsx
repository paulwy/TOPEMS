import React, { useMemo } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Barcode as BarcodeIcon, Printer, ScanLine } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { barcodeSchema } from '@/schemas/lims';
import {
  limsApi,
  type Barcode as BarcodeType,
  type CreateBarcodeRequest,
  type UpdateBarcodeRequest,
} from '@/api/lims';
import i18n from '@/i18n';
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { useNotificationStore } from '@/store';

const ct = designTokens.colors;
const BarcodePage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const barcodeApiAdapter: CrudApiAdapter<BarcodeType> = useMemo(
    () => ({
      list: async (params) => {
        const response = await limsApi.listBarcodes({
          page: params?.page !== undefined ? params.page : 0,
          pagesize: params?.pageSize ?? 10,
          search: params?.search as string | undefined,
          status: params?.status && params.status !== 'all' ? (params.status as string) : undefined,
        });
        if (!response.success || !response.data) {
          throw new Error(i18n.t('lims.barcode_page.k0'));
        }
        const data = response.data as { items?: BarcodeType[]; total?: number } | BarcodeType[];
        if (Array.isArray(data)) {
          return { data, total: data.length };
        }
        return {
          data: data.items || [],
          total: data.total || data.items?.length || 0,
        };
      },
      create: async (data) => {
        const response = await limsApi.generateBarcode(data as CreateBarcodeRequest);
        if (!response.success) {
          throw new Error(response.message || i18n.t('lims.barcode_page.k1'));
        }
        const created = response.data as unknown as BarcodeType[] | BarcodeType;
        if (Array.isArray(created)) {
          return created[0];
        }
        return created;
      },
      update: async (id, data) => {
        const response = await limsApi.updateBarcode(id, data as UpdateBarcodeRequest);
        if (!response.success) {
          throw new Error(response.message || i18n.t('lims.barcode_page.k2'));
        }
        return response.data as unknown as BarcodeType;
      },
      delete: async (id) => {
        const response = await limsApi.deleteBarcode(id);
        if (!response.success) {
          throw new Error(response.message || i18n.t('lims.barcode_page.k3'));
        }
      },
    }),
    []
  );
  const handlePrint = async (row: Record<string, unknown>) => {
    const id = String(row.id);
    try {
      const response = await limsApi.printBarcode({ barcode_ids: [id] });
      if (response.success) {
        addNotification({
          title: i18n.t('lims.barcode_page.k5'),
          message: i18n.t('lims.barcode_page.k4'),
          type: 'success',
        });
      } else {
        addNotification({
          title: i18n.t('lims.barcode_page.k7'),
          message: response.message || i18n.t('lims.barcode_page.k6'),
          type: 'error',
        });
      }
    } catch (err) {
      addNotification({
        title: i18n.t('lims.barcode_page.k8'),
        message: (err as { message?: string })?.message || i18n.t('lims.barcode_page.k9'),
        type: 'error',
      });
    }
  };
  const handleScan = async (row: Record<string, unknown>) => {
    const barcode = String(row.barcode);
    try {
      const response = await limsApi.scanBarcode(barcode);
      if (response.success) {
        addNotification({
          title: i18n.t('lims.barcode_page.k10'),
          message: `${i18n.t('pages.barcode_page.k0')}${barcode}${i18n.t('pages.barcode_page.k1')}`,
          type: 'success',
        });
      } else {
        addNotification({
          title: i18n.t('lims.barcode_page.k12'),
          message: response.message || i18n.t('lims.barcode_page.k11'),
          type: 'error',
        });
      }
    } catch (err) {
      addNotification({
        title: i18n.t('lims.barcode_page.k13'),
        message: (err as { message?: string })?.message || i18n.t('lims.barcode_page.k14'),
        type: 'error',
      });
    }
  };
  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'print',
        label: i18n.t('lims.barcode_page.k15'),
        icon: <Printer size={14} />,
        color: 'info',
        onClick: (row: Record<string, unknown>) => handlePrint(row),
      },
      {
        key: 'scan',
        label: i18n.t('lims.barcode_page.k16'),
        icon: <ScanLine size={14} />,
        color: 'primary',
        onClick: (row: Record<string, unknown>) => handleScan(row),
      },
    ],
    []
  );
  const statsContent = (rows: Record<string, unknown>[]) => {
    const barcodes = rows as unknown as BarcodeType[];
    const stats = {
      total: barcodes.length,
      normal: barcodes.filter(
        (b) => b.status === i18n.t('lims.barcode_page.k17') || b.status === 'normal'
      ).length,
      printed: barcodes.filter(
        (b) => b.status === i18n.t('lims.barcode_page.k18') || b.status === 'printed'
      ).length,
      scanned: barcodes.filter(
        (b) => b.status === i18n.t('lims.barcode_page.k19') || b.status === 'scanned'
      ).length,
    };
    const cards = [
      {
        label: i18n.t('lims.barcode_page.k20'),
        value: stats.total,
        icon: <BarcodeIcon sx={{ width: 20, height: 20, color: 'info.main' }} />,
        bg: 'info.lighter',
      },
      {
        label: i18n.t('lims.barcode_page.k21'),
        value: stats.normal,
        icon: <BarcodeIcon sx={{ width: 20, height: 20, color: 'success.main' }} />,
        bg: 'success.lighter',
      },
      {
        label: i18n.t('lims.barcode_page.k22'),
        value: stats.printed,
        icon: <Printer sx={{ width: 20, height: 20, color: 'info.main' }} />,
        bg: 'info.lighter',
      },
      {
        label: i18n.t('lims.barcode_page.k23'),
        value: stats.scanned,
        icon: <ScanLine sx={{ width: 20, height: 20, color: 'primary.main' }} />,
        bg: 'primary.lighter',
      },
    ];
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: card.bg,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {card.icon}
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    {card.label}
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700 }}
                  >
                    {card.value}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };
  const detailContent = (row: Record<string, unknown>) => {
    const barcode = row as unknown as BarcodeType;
    const statusColorMap: Record<string, string> = {
      [i18n.t('pages.barcode_page.k0')]: 'success.lighter',
      [i18n.t('pages.barcode_page.k1')]: 'info.lighter',
      [i18n.t('pages.barcode_page.k2')]: 'primary.lighter',
      [i18n.t('pages.barcode_page.k3')]: 'grey.100',
      normal: 'success.lighter',
      printed: 'info.lighter',
      scanned: 'primary.lighter',
      disabled: 'grey.100',
    };
    const statusLabelMap: Record<string, string> = {
      [i18n.t('pages.barcode_page.k4')]: i18n.t('lims.barcode_page.k24'),
      [i18n.t('pages.barcode_page.k5')]: i18n.t('lims.barcode_page.k25'),
      [i18n.t('pages.barcode_page.k6')]: i18n.t('lims.barcode_page.k26'),
      [i18n.t('pages.barcode_page.k7')]: i18n.t('lims.barcode_page.k27'),
      normal: i18n.t('lims.barcode_page.k28'),
      printed: i18n.t('lims.barcode_page.k29'),
      scanned: i18n.t('lims.barcode_page.k30'),
      disabled: i18n.t('lims.barcode_page.k31'),
    };
    const bg = statusColorMap[barcode.status] || 'grey.100';
    const color =
      bg === 'success.lighter'
        ? 'success.dark'
        : bg === 'info.lighter'
          ? 'info.dark'
          : bg === 'primary.lighter'
            ? 'primary.dark'
            : 'text.secondary';
    return (
      <Box
        sx={{
          pt: 2,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
        }}
      >
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            {i18n.t('pages.barcode_page.k8')}
          </Box>
          <Box sx={{ fontWeight: 500, fontFamily: 'monospace' }}>{barcode.barcode}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            {i18n.t('pages.barcode_page.k9')}
          </Box>
          <Box sx={{ mt: 0.5 }}>
            <Box
              component='span'
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                fontSize: '0.75rem',
                fontWeight: 500,
                bgcolor: bg,
                color,
              }}
            >
              {statusLabelMap[barcode.status] || barcode.status}
            </Box>
          </Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            {i18n.t('pages.barcode_page.k10')}
          </Box>
          <Box>{barcode.barcode_type || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            {i18n.t('pages.barcode_page.k11')}
          </Box>
          <Box>{barcode.format}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            {i18n.t('pages.barcode_page.k12')}
          </Box>
          <Box>{barcode.sample_name || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            {i18n.t('pages.barcode_page.k13')}
          </Box>
          <Box>{barcode.content || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            {i18n.t('pages.barcode_page.k14')}
          </Box>
          <Box>
            {barcode.generated_at ? new Date(barcode.generated_at).toLocaleString('zh-CN') : '-'}
          </Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            {i18n.t('pages.barcode_page.k15')}
          </Box>
          <Box>
            {barcode.printed_at ? new Date(barcode.printed_at).toLocaleString('zh-CN') : '-'}
          </Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            {i18n.t('pages.barcode_page.k16')}
          </Box>
          <Box>
            {barcode.scanned_at ? new Date(barcode.scanned_at).toLocaleString('zh-CN') : '-'}
          </Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            {i18n.t('pages.barcode_page.k17')}
          </Box>
          <Box>{barcode.created_by || '-'}</Box>
        </Box>
      </Box>
    );
  };
  return (
    <PageContainer
      title={i18n.t('lims.barcode_page.k32')}
      subtitle='Barcode Management'
      headerProps={{
        pageIcon: <BarcodeIcon style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]} 0%, ${ct.teal[600]} 100%)`,
      }}
    >
      <CrudPage
        schema={barcodeSchema}
        apiAdapter={barcodeApiAdapter}
        customRowActions={customRowActions}
        headerContent={statsContent}
        detailContent={detailContent}
        detailMaxWidth='md'
        breadcrumbs={[
          { label: i18n.t('lims.barcode_page.k33'), href: DASHBOARD_PATHS.dashboard },
          { label: 'LIMS', href: LIMS_PATHS.root },
          { label: i18n.t('lims.barcode_page.k34') },
        ]}
        idField='id'
      />
    </PageContainer>
  );
};
export default BarcodePage;
