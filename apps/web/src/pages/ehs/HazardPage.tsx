import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { hazardSchema } from '@/schemas/ehs/hazard';
import { ehsApi } from '@/api/ehs';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { AlertTriangle, ShieldAlert, Clock } from 'lucide-react';

const HazardStats: React.FC = () => {
  const { data } = useQuery({
    queryKey: [QUERY_KEYS.EHS.HAZARDS, 'stats'],
    queryFn: async () => {
      const response = await ehsApi.listHazards({ page: 0, pagesize: 1000 } as Parameters<
        typeof ehsApi.listHazards
      >[0]);
      if (!response.success) throw new Error('加载危险源统计失败');
      const result = response.data;
      return result?.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const hazards = data || [];
  const total = hazards.length;
  const active = hazards.filter((h) => h.status === 'active').length;
  const controlled = hazards.filter((h) => h.status === 'controlled').length;
  const highRisk = hazards.filter((h) => {
    const severityScore = { high: 3, medium: 2, low: 1 };
    const likelihoodScore = { high: 3, medium: 2, low: 1 };
    const exposureScore = { high: 3, medium: 2, low: 1 };
    const total =
      (severityScore[h.severity as keyof typeof severityScore] || 2) *
      (likelihoodScore[h.likelihood as keyof typeof likelihoodScore] || 2) *
      (exposureScore[h.exposure as keyof typeof exposureScore] || 2);
    return total >= 9;
  }).length;

  const statCards = [
    {
      label: '危险源总数',
      value: total,
      color: 'error.light',
      textColor: 'text.secondary',
      icon: (
        <AlertTriangle
          size={20}
          color='error.main'
        />
      ),
    },
    {
      label: '活跃隐患',
      value: active,
      color: 'error.lighter',
      textColor: 'error.dark',
      icon: (
        <AlertTriangle
          size={20}
          color='error.dark'
        />
      ),
    },
    {
      label: '已控制',
      value: controlled,
      color: 'warning.lighter',
      textColor: 'warning.dark',
      icon: (
        <ShieldAlert
          size={20}
          color='warning.dark'
        />
      ),
    },
    {
      label: '高风险隐患',
      value: highRisk,
      color: 'error.light',
      textColor: 'error.dark',
      icon: (
        <Clock
          size={20}
          color='error.dark'
        />
      ),
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 4,
      }}
    >
      {statCards.map((stat) => (
        <Box
          key={stat.label}
          sx={{ p: 2, bgcolor: stat.color, borderRadius: 3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'action.hover',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {stat.icon}
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                {stat.label}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stat.value}
              </Typography>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const hazardApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await ehsApi.listHazards({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    } as Parameters<typeof ehsApi.listHazards>[0]);
    if (!response.success) {
      throw new Error('加载危险源失败');
    }
    const data = response.data;
    return {
      data: (data?.items || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },

  create: async (data) => {
    const response = await ehsApi.createHazard(
      data as unknown as Parameters<typeof ehsApi.createHazard>[0]
    );
    if (!response.success) {
      throw new Error('创建危险源失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await ehsApi.updateHazard(
      id,
      data as Parameters<typeof ehsApi.updateHazard>[1]
    );
    if (!response.success) {
      throw new Error('更新危险源失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await ehsApi.deleteHazard(id);
    if (!response.success) {
      throw new Error('删除危险源失败');
    }
  },
};

const HazardPage: React.FC = () => {
  return (
    <CrudPage
      schema={hazardSchema}
      apiAdapter={hazardApiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'EHS', href: '/ehs' },
        { label: '危险源管理' },
      ]}
      headerContent={<HazardStats />}
    />
  );
};

export default HazardPage;
