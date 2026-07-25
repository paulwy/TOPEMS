import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Microscope, Settings, AlertTriangle } from 'lucide-react';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { instrumentSchema } from '@/schemas/lims';
import { limsApi, type Instrument, type CreateInstrumentRequest } from '@/api/lims';
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';

const ct = designTokens.colors;

const InstrumentPage: React.FC = () => {
  const navigate = useNavigate();

  const instrumentApiAdapter: CrudApiAdapter<Instrument> = useMemo(
    () => ({
      list: async (params) => {
        const response = await limsApi.listInstruments({
          page: params?.page !== undefined ? params.page : 0,
          pagesize: params?.pageSize ?? 10,
          search: params?.search as string | undefined,
          status: params?.status && params.status !== 'all' ? (params.status as string) : undefined,
        });
        if (!response.success || !response.data) {
          throw new Error('加载仪器列表失败');
        }
        return {
          data: response.data.items,
          total: response.data.total,
        };
      },

      create: async (data) => {
        const response = await limsApi.createInstrument(data as unknown as CreateInstrumentRequest);
        if (!response.success) {
          throw new Error(response.message || '创建仪器失败');
        }
        return response.data as unknown as Instrument;
      },

      update: async (id, data) => {
        const response = await limsApi.updateInstrument(
          id,
          data as unknown as Partial<CreateInstrumentRequest>
        );
        if (!response.success) {
          throw new Error(response.message || '更新仪器失败');
        }
        return response.data as unknown as Instrument;
      },

      delete: async (id) => {
        const response = await limsApi.deleteInstrument(id);
        if (!response.success) {
          throw new Error(response.message || '删除仪器失败');
        }
      },
    }),
    []
  );

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'maintenance',
        label: '维护记录',
        icon: <Settings size={14} />,
        color: 'info',
        onClick: (row: Record<string, unknown>) =>
          navigate(`${LIMS_PATHS.instrumentDetail}?id=${row.id}`),
      },
    ],
    [navigate]
  );

  const needsCalibration = (instrument: Instrument): boolean => {
    if (!instrument.next_calibration_date) return false;
    return new Date(instrument.next_calibration_date) < new Date();
  };

  const statsContent = (rows: Record<string, unknown>[]) => {
    const items = rows as unknown as Instrument[];
    const stats = {
      total: items.length,
      normal: items.filter((i) => i.status === '正常' || i.status === 'normal').length,
      calibrating: items.filter((i) => i.status === '校准中' || i.status === 'calibrating').length,
      maintenance: items.filter((i) => i.status === '维修中' || i.status === 'maintenance').length,
      needsCalibration: items.filter((i) => needsCalibration(i)).length,
    };

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            md: 'repeat(5, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'info.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Microscope sx={{ width: 20, height: 20, color: 'info.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ fontSize: '0.875rem' }}
                >
                  仪器总数
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.total}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'success.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Microscope sx={{ width: 20, height: 20, color: 'success.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ fontSize: '0.875rem' }}
                >
                  正常
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.normal}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'info.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Settings sx={{ width: 20, height: 20, color: 'info.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ fontSize: '0.875rem' }}
                >
                  校准中
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.calibrating}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'warning.light',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle sx={{ width: 20, height: 20, color: ct.yellow[600] }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ fontSize: '0.875rem' }}
                >
                  维修中
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.maintenance}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'error.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle sx={{ width: 20, height: 20, color: 'error.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ fontSize: '0.875rem' }}
                >
                  待校准
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.needsCalibration}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <PageContainer
      title='仪器管理'
      subtitle='Instrument Management'
      headerProps={{
        pageIcon: <Microscope style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]} 0%, ${ct.teal[600]} 100%)`,
      }}
    >
      <CrudPage
        schema={instrumentSchema}
        apiAdapter={instrumentApiAdapter}
        customRowActions={customRowActions}
        headerContent={statsContent}
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'LIMS', href: LIMS_PATHS.root },
          { label: '仪器管理' },
        ]}
        idField='id'
      />
    </PageContainer>
  );
};

export default InstrumentPage;
