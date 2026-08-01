import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { Clock, Activity, AlertCircle, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { drillSchema } from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';
import type { DrillRecord, CreateDrillRecordRequest } from '@/api/ehs';
import { PageContainer } from '@/components/common/PageContainer';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const drillApi = {
  list: ehsApi.listDrills,
  create: ehsApi.createDrill,
  update: ehsApi.updateDrill,
  delete: ehsApi.deleteDrill,
};

const baseAdapter = createCrudPageAdapter<DrillRecord, CreateDrillRecordRequest>(drillApi);

const drillAdapter: CrudApiAdapter<DrillRecord> = {
  list: baseAdapter.list as unknown as CrudApiAdapter<DrillRecord>['list'],
  create: async (data) => {
    const transformed = { ...data };
    if (typeof transformed.participants === 'string') {
      transformed.participants = (transformed.participants as string)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s);
    }
    return baseAdapter.create(transformed) as unknown as DrillRecord;
  },
  update: async (id, data) => {
    const transformed = { ...data };
    if (typeof transformed.participants === 'string') {
      transformed.participants = (transformed.participants as string)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s);
    }
    return baseAdapter.update(id, transformed) as unknown as DrillRecord;
  },
  delete: baseAdapter.delete,
};

const statusColorMap: Record<string, { bg: string; color: string }> = {
  scheduled: { bg: 'info.lighter', color: 'info.dark' },
  in_progress: { bg: 'warning.lighter', color: 'warning.dark' },
  completed: { bg: 'success.lighter', color: 'success.dark' },
};

const statusLabelMap: Record<string, string> = {
  scheduled: '已计划',
  in_progress: '进行中',
  completed: '已完成',
};

function extractListData(response: unknown): DrillRecord[] {
  if (!response || typeof response !== 'object') return [];
  const obj = response as Record<string, unknown>;
  const data = obj.data;
  if (!data) return [];
  if (Array.isArray(data)) return data as DrillRecord[];
  if (typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.items)) return d.items as DrillRecord[];
    if (Array.isArray(d.data)) return d.data as DrillRecord[];
  }
  return [];
}

const EhsDrillPage: React.FC = () => {
  const { data: drillsResp } = useQuery({
    queryKey: ['ehs', 'drills', 'stats'],
    queryFn: async () => ehsApi.listDrills({ pagesize: 500 }),
  });

  const stats = useMemo(() => {
    const drills = extractListData(drillsResp);
    return {
      total: drills.length,
      completed: drills.filter((d) => d.status === 'completed').length,
      scheduled: drills.filter((d) => d.status === 'scheduled' || d.status === 'in_progress')
        .length,
    };
  }, [drillsResp]);

  const headerContent = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card sx={{ bgcolor: 'warning.light' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'warning.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock sx={{ width: 20, height: 20, color: 'warning.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                演练总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
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
              <Activity sx={{ width: 20, height: 20, color: 'success.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已完成
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.completed}
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
              <AlertCircle sx={{ width: 20, height: 20, color: 'info.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                计划/进行中
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.scheduled}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const detailContent = (row: Record<string, unknown>) => {
    const drill = row as unknown as DrillRecord;
    const statusColors = statusColorMap[drill.status] || {
      bg: 'grey.100',
      color: 'text.secondary',
    };
    const statusLabel = statusLabelMap[drill.status] || drill.status;
    const participantsText = Array.isArray(drill.participants)
      ? drill.participants.join(', ')
      : drill.participants || '-';

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
            演练编号
          </Box>
          <Box sx={{ fontWeight: 500 }}>{drill.drill_no}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            演练名称
          </Box>
          <Box>{drill.drill_name}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            演练日期
          </Box>
          <Box>{drill.drill_date || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            时长(小时)
          </Box>
          <Box>{drill.duration_hours ?? '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            地点
          </Box>
          <Box>{drill.location || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            状态
          </Box>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={statusLabel}
              size='small'
              sx={{
                backgroundColor: statusColors.bg,
                color: statusColors.color,
                fontWeight: 500,
              }}
            />
          </Box>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            参与人员
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Users style={{ width: 16, height: 16 }} />
            {participantsText}
          </Box>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            演练评估
          </Box>
          <Box>{drill.summary || '-'}</Box>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            发现问题
          </Box>
          <Box>{drill.issues_found || '-'}</Box>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            改进措施
          </Box>
          <Box>{drill.improvements || '-'}</Box>
        </Box>
      </Box>
    );
  };

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Clock sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
      maxWidth='xl'
    >
      <CrudPage
        schema={drillSchema}
        apiAdapter={drillAdapter}
        breadcrumbs={[{ label: 'EHS' }, { label: '应急演练' }]}
        headerContent={headerContent}
        detailContent={detailContent}
        detailMaxWidth='lg'
      />
    </PageContainer>
  );
};

export default EhsDrillPage;
