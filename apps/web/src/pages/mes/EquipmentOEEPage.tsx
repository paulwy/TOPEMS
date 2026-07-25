import React from 'react';
import { Box, Typography, LinearProgress, InputLabel } from '@mui/material';
import { PageContainer } from '@/components/common/PageContainer';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { equipmentOeeSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import type { OeeRecord, OeeStatistics } from '@/api/mes';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { Gauge, Activity, TrendingUp, CheckCircle2 } from 'lucide-react';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const apiAdapter = createCrudPageAdapter(mesApi.equipmentOee, {
  itemsField: 'records',
});

const getOEEColor = (value: number | undefined | null) => {
  if (value == null || isNaN(value)) return 'primary';
  if (value >= 85) return 'success';
  if (value >= 70) return 'warning';
  return 'error';
};

const getOEEColorHex = (value: number | undefined | null) => {
  if (value == null || isNaN(value)) return 'text.primary';
  if (value >= 85) return 'success.700';
  if (value >= 70) return 'warning.700';
  return 'error.700';
};

const formatPercent = (value: number | undefined | null) => {
  if (value == null || isNaN(value)) return '-';
  return `${value.toFixed(1)}%`;
};

const EquipmentOEEPage: React.FC = () => {
  const { data: statistics } = useQuery({
    queryKey: QUERY_KEYS.MES.EQUIPMENT_OEE_STATISTICS,
    queryFn: async () => {
      const response = await mesApi.equipmentOee.getStatistics();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
  });

  const renderDetailContent = (row: Record<string, unknown>) => {
    const record = row as unknown as OeeRecord;
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>设备编号</InputLabel>
            <Box
              component='span'
              sx={{ fontWeight: 500 }}
            >
              {record.equipment_code}
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>设备名称</InputLabel>
            <Box component='span'>{record.equipment_name}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>记录日期</InputLabel>
            <Box component='span'>{new Date(record.record_date).toLocaleDateString('zh-CN')}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>班次</InputLabel>
            <Box component='span'>{record.shift || '-'}</Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3, textAlign: 'center' }}>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary', mb: 0.5 }}
            >
              综合OEE
            </Typography>
            <Typography
              variant='h5'
              sx={{
                fontWeight: 700,
                color: getOEEColorHex(record.oee),
              }}
            >
              {formatPercent(record.oee)}
            </Typography>
          </Box>
          <Box sx={{ p: 2, bgcolor: ct.success[100], borderRadius: 3, textAlign: 'center' }}>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary', mb: 0.5 }}
            >
              可用率
            </Typography>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'success.700' }}
            >
              {formatPercent(record.availability)}
            </Typography>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'warning.100', borderRadius: 3, textAlign: 'center' }}>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary', mb: 0.5 }}
            >
              性能率
            </Typography>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'warning.700' }}
            >
              {formatPercent(record.performance)}
            </Typography>
          </Box>
          <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3, textAlign: 'center' }}>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary', mb: 0.5 }}
            >
              质量率
            </Typography>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'secondary.700' }}
            >
              {formatPercent(record.quality)}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>计划生产时间</InputLabel>
            <Box component='span'>{record.planned_production_time} 分钟</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>运行时间</InputLabel>
            <Box component='span'>{record.run_time} 分钟</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>停机时间</InputLabel>
            <Box component='span'>{record.downtime} 分钟</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>理想周期时间</InputLabel>
            <Box component='span'>{record.ideal_cycle_time} 秒</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>总产量</InputLabel>
            <Box component='span'>{record.total_count} 件</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>合格数量</InputLabel>
            <Box
              component='span'
              sx={{ color: 'success.dark' }}
            >
              {record.good_count} 件
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>不良数量</InputLabel>
            <Box
              component='span'
              sx={{ color: 'error.dark' }}
            >
              {record.reject_count} 件
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
            <Box component='span'>{new Date(record.created_at).toLocaleString('zh-CN')}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
            <Box component='span'>{new Date(record.updated_at).toLocaleString('zh-CN')}</Box>
          </Box>
        </Box>
      </Box>
    );
  };

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Activity
            size={18}
            sx={{ color: 'primary.dark' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            综合OEE
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{
            fontWeight: 700,
            color: statistics ? getOEEColorHex(statistics.avg_oee) : 'text.primary',
          }}
        >
          {statistics ? formatPercent(statistics.avg_oee) : '-'}
        </Typography>
        <LinearProgress
          variant='determinate'
          value={statistics?.avg_oee || 0}
          sx={{ mt: 1, height: 6, borderRadius: 3 }}
          color={statistics ? getOEEColor(statistics.avg_oee) : 'primary'}
        />
      </Box>
      <Box sx={{ p: 2, bgcolor: ct.success[100], borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Gauge
            size={18}
            sx={{ color: 'success.700' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            可用率
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'success.700' }}
        >
          {statistics ? formatPercent(statistics.avg_availability) : '-'}
        </Typography>
        <LinearProgress
          variant='determinate'
          value={statistics?.avg_availability || 0}
          sx={{ mt: 1, height: 6, borderRadius: 3 }}
          color='success'
        />
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.100', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TrendingUp
            size={18}
            sx={{ color: 'warning.700' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            性能率
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'warning.700' }}
        >
          {statistics ? formatPercent(statistics.avg_performance) : '-'}
        </Typography>
        <LinearProgress
          variant='determinate'
          value={statistics?.avg_performance || 0}
          sx={{ mt: 1, height: 6, borderRadius: 3 }}
          color='warning'
        />
      </Box>
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CheckCircle2
            size={18}
            sx={{ color: 'secondary.700' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            质量率
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'secondary.700' }}
        >
          {statistics ? formatPercent(statistics.avg_quality) : '-'}
        </Typography>
        <LinearProgress
          variant='determinate'
          value={statistics?.avg_quality || 0}
          sx={{ mt: 1, height: 6, borderRadius: 3 }}
          color='primary'
        />
      </Box>
    </Box>
  );

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Gauge style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={equipmentOeeSchema}
        apiAdapter={apiAdapter as CrudApiAdapter}
        breadcrumbs={[{ label: 'MES' }, { label: '设备OEE' }]}
        detailMaxWidth='md'
        detailContent={renderDetailContent}
        headerContent={statsContent}
      />
    </PageContainer>
  );
};

export default EquipmentOEEPage;
