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
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { useNotificationStore } from '@/store';

const ct= designTokens.colors;

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
          throw new Error('加载条码列表失败');
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
          throw new Error(response.message || '生成条码失败');
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
          throw new Error(response.message || '更新条码失败');
        }
        return response.data as unknown as BarcodeType;
      },

      delete: async (id) => {
        const response = await limsApi.deleteBarcode(id);
        if (!response.success) {
          throw new Error(response.message || '删除条码失败');
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
        addNotification({ title: '成功', message: '条码已开始打印', type: 'success' });
      } else {
        addNotification({ title: '错误', message: response.message || '打印失败', type: 'error' });
      }
    } catch (err) {
      addNotification({
        title: '错误',
        message: (err as { message?: string })?.message || '打印条码失败',
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
          title: '扫描成功',
          message: `条码 ${barcode} 扫描成功`,
          type: 'success',
        });
      } else {
        addNotification({ title: '错误', message: response.message || '扫描失败', type: 'error' });
      }
    } catch (err) {
      addNotification({
        title: '错误',
        message: (err as { message?: string })?.message || '条码扫描失败',
        type: 'error',
      });
    }
  };

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'print',
        label: '打印',
        icon: <Printer size={14} />,
        color: 'info',
        onClick: (row: Record<string, unknown>) => handlePrint(row),
      },
      {
        key: 'scan',
        label: '扫描',
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
      normal: barcodes.filter((b) => b.status === '正常' || b.status === 'normal').length,
      printed: barcodes.filter((b) => b.status === '已打印' || b.status === 'printed').length,
      scanned: barcodes.filter((b) => b.status === '已扫描' || b.status === 'scanned').length,
    };

    const cards = [
      {
        label: '条码总数',
        value: stats.total,
        icon: <BarcodeIcon sx={{ width: 20, height: 20, color: 'info.main' }} />,
        bg: 'info.lighter',
      },
      {
        label: '正常',
        value: stats.normal,
        icon: <BarcodeIcon sx={{ width: 20, height: 20, color: 'success.main' }} />,
        bg: 'success.lighter',
      },
      {
        label: '已打印',
        value: stats.printed,
        icon: <Printer sx={{ width: 20, height: 20, color: 'info.main' }} />,
        bg: 'info.lighter',
      },
      {
        label: '已扫描',
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
      正常: 'success.lighter',
      已打印: 'info.lighter',
      已扫描: 'primary.lighter',
      停用: 'grey.100',
      normal: 'success.lighter',
      printed: 'info.lighter',
      scanned: 'primary.lighter',
      disabled: 'grey.100',
    };
    const statusLabelMap: Record<string, string> = {
      正常: '正常',
      已打印: '已打印',
      已扫描: '已扫描',
      停用: '停用',
      normal: '正常',
      printed: '已打印',
      scanned: '已扫描',
      disabled: '停用',
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
            条码
          </Box>
          <Box sx={{ fontWeight: 500, fontFamily: 'monospace' }}>{barcode.barcode}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            状态
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
            条码类型
          </Box>
          <Box>{barcode.barcode_type || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            格式
          </Box>
          <Box>{barcode.format}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            关联样品
          </Box>
          <Box>{barcode.sample_name || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            内容
          </Box>
          <Box>{barcode.content || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            生成时间
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
            打印时间
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
            扫描时间
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
            创建人
          </Box>
          <Box>{barcode.created_by || '-'}</Box>
        </Box>
      </Box>
    );
  };

  return (
    <PageContainer
      title='条码管理'
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
          { label: '首页', href: DASHBOARD_PATHS.dashboard },
          { label: 'LIMS', href: LIMS_PATHS.root },
          { label: '条码管理' },
        ]}
        idField='id'
      />
    </PageContainer>
  );
};

export default BarcodePage;
