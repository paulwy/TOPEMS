import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { Wrench, Calendar, DollarSign, Clock, AlertCircle } from 'lucide-react';
import {
  Chip,
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  Button,
  useTheme,
} from '@mui/material';

import { limsApi } from '@/api/lims';
import type { Instrument, MaintenanceRecord } from '@/api/lims';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';
import { instrumentMaintenanceSchema } from '@/schemas/lims';

const ct = designTokens.colors;

const LimsInstrumentMaintenancePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const navigate = useNavigate();

  const { data: instrument, isLoading: loadingInstrument } = useQuery({
    queryKey: QUERY_KEYS.LIMS.INSTRUMENT(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await limsApi.getInstrument(id);
      if (res.success && res.data) {
        return res.data as Instrument;
      }
      return null;
    },
    enabled: !!id,
  });

  const apiAdapter: CrudApiAdapter<MaintenanceRecord> = useMemo(
    () => ({
      list: async () => {
        if (!id) return { data: [], total: 0 };
        const res = await limsApi.listMaintenanceByInstrument(id);
        if (res.success && res.data) {
          const data = Array.isArray(res.data) ? res.data : (res.data as any).items || [];
          return { data, total: data.length };
        }
        return { data: [], total: 0 };
      },
      create: async (data) => {
        if (!id) throw new Error('仪器ID不存在');
        const res = await limsApi.createMaintenance({
          ...data,
          instrument_id: id,
        } as any);
        if (!res.success || !res.data) {
          throw new Error(res.message || '创建失败');
        }
        return res.data as MaintenanceRecord;
      },
      update: async (recordId, data) => {
        const res = await limsApi.updateMaintenance(recordId, data as any);
        if (!res.success || !res.data) {
          throw new Error(res.message || '更新失败');
        }
        return res.data as MaintenanceRecord;
      },
      delete: async (recordId) => {
        const res = await limsApi.deleteMaintenance(recordId);
        if (!res.success) {
          throw new Error(res.message || '删除失败');
        }
      },
    }),
    [id]
  );

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      normal: { bg: 'success.lighter', color: 'success.dark', label: '正常' },
      in_use: { bg: 'success.lighter', color: 'success.dark', label: '使用中' },
      calibration: { bg: 'warning.100', color: ct.yellow[600], label: '校准中' },
      calibrated: { bg: 'info.100', color: 'info.dark', label: '已校准' },
      maintenance: { bg: 'error.lighter', color: 'error.dark', label: '维修中' },
      under_maintenance: { bg: 'warning.light', color: 'warning.dark', label: '维护中' },
      disabled: { bg: 'grey.100', color: 'text.secondary', label: '停用' },
      scrapped: { bg: 'grey.100', color: 'text.secondary', label: '已报废' },
    };
    const item = statusMap[status] || {
      bg: 'grey.100',
      color: 'text.secondary',
      label: status,
    };
    return (
      <Chip
        label={item.label}
        size='small'
        sx={{ backgroundColor: item.bg, color: item.color }}
      />
    );
  };

  const headerContent = useMemo(() => {
    if (!instrument) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Card sx={{ mb: 3 }}>
          <CardHeader sx={{ pb: 1 }}>
            <Typography
              variant='h6'
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Box
                component={Wrench}
                sx={{ fontSize: 20, color: ct.teal[400] }}
              />
              仪器信息
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  仪器编号
                </Typography>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {instrument.code || instrument.id}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  仪器名称
                </Typography>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 500 }}
                >
                  {instrument.name}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  型号
                </Typography>
                <Typography variant='body1'>{instrument.model || '-'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                {getStatusBadge(instrument.status)}
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  位置
                </Typography>
                <Typography variant='body1'>{instrument.location || '-'}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  负责人
                </Typography>
                <Typography variant='body1'>{instrument.responsible_person || '-'}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <Calendar sx={{ width: 14, height: 14 }} />
                  采购日期
                </Typography>
                <Typography variant='body1'>
                  {instrument.purchase_date
                    ? new Date(instrument.purchase_date).toLocaleDateString('zh-CN')
                    : '-'}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <Clock sx={{ width: 14, height: 14 }} />
                  下次校准
                </Typography>
                <Typography variant='body1'>
                  {instrument.next_calibration_date
                    ? new Date(instrument.next_calibration_date).toLocaleDateString('zh-CN')
                    : '-'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <MaintenanceStatsCard />
      </Box>
    );
  }, [instrument, theme]);

  if (loadingInstrument) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <p style={{ color: ct.grey[600] }}>加载中...</p>
        </Box>
      </Box>
    );
  }

  if (!instrument) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <AlertCircle sx={{ width: 64, height: 64, color: 'error.main', mb: 2 }} />
          <p style={{ color: ct.grey[600] }}>仪器不存在或已被删除</p>
          <Button
            onClick={() => navigate(LIMS_PATHS.root)}
            sx={{ mt: 2 }}
          >
            返回列表
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <PageContainer
      title='仪器维护记录'
      subtitle='Instrument Maintenance'
      headerProps={{
        pageIcon: <Wrench style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]}, ${ct.teal[600]})`,
        backButton: { onClick: () => navigate(LIMS_PATHS.root) },
      }}
      maxWidth='xl'
    >
      <CrudPage
        schema={instrumentMaintenanceSchema}
        apiAdapter={apiAdapter}
        headerContent={headerContent}
        extraQueryParams={{ instrument_id: id }}
      />
    </PageContainer>
  );
};

const MaintenanceStatsCard: React.FC = () => {
  return (
    <Card>
      <CardHeader sx={{ pb: 1 }}>
        <Typography
          variant='h6'
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Box
            component={DollarSign}
            sx={{ fontSize: 20, color: 'success.dark' }}
          />
          维护统计
        </Typography>
      </CardHeader>
      <CardContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
          <Box
            sx={{
              textAlign: 'center',
              p: 2,
              bgcolor: 'success.light',
              borderRadius: 1,
            }}
          >
            <Typography
              variant='body2'
              color='success.dark'
            >
              维护次数
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: 'success.dark' }}
            >
              -
            </Typography>
          </Box>
          <Box
            sx={{
              textAlign: 'center',
              p: 2,
              bgcolor: 'primary.100',
              borderRadius: 1,
            }}
          >
            <Typography
              variant='body2'
              color='primary.dark'
            >
              累计费用
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: 'primary.dark' }}
            >
              ¥-
            </Typography>
          </Box>
          <Box
            sx={{
              textAlign: 'center',
              p: 2,
              bgcolor: 'info.100',
              borderRadius: 1,
            }}
          >
            <Typography
              variant='body2'
              color='info.dark'
            >
              日常维护
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: 'info.dark' }}
            >
              -
            </Typography>
          </Box>
          <Box
            sx={{
              textAlign: 'center',
              p: 2,
              bgcolor: 'warning.100',
              borderRadius: 1,
            }}
          >
            <Typography
              variant='body2'
              color='warning.dark'
            >
              故障维修
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: 'warning.dark' }}
            >
              -
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default LimsInstrumentMaintenancePage;
