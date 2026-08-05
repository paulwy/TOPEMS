import React, { useState, useCallback } from 'react';
import { Box, Chip, Typography, InputLabel, Stack } from '@mui/material';
import { PageContainer } from '@/components/common';
import { Route } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { processRouteSchema } from '@/schemas/mes';
import { processRouteApi } from '@/api/mes/process';
import type {
  ProcessRoute,
  CreateProcessRouteRequest,
  UpdateProcessRouteRequest,
  ProcessRouteStep,
} from '@/api/mes/process';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const processRouteAdapter: CrudApiAdapter<ProcessRoute> = {
  list: async (params) => {
    const statusValue = params?.status as string | undefined;
    const response = await processRouteApi.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: statusValue && statusValue !== 'all' ? statusValue : undefined,
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || '加载工艺路线失败');
    }
    return {
      data: response.data.routes || [],
      total: response.data.total || 0,
    };
  },
  create: async (data) => {
    const response = await processRouteApi.create(data as CreateProcessRouteRequest);
    if (!response.success) {
      throw new Error(response.message || '创建工艺路线失败');
    }
    return response.data as ProcessRoute;
  },
  update: async (id, data) => {
    const response = await processRouteApi.update(id, data as UpdateProcessRouteRequest);
    if (!response.success) {
      throw new Error(response.message || '更新工艺路线失败');
    }
    return response.data as ProcessRoute;
  },
  delete: async (id) => {
    const response = await processRouteApi.delete(id);
    if (!response.success) {
      throw new Error(response.message || '删除工艺路线失败');
    }
  },
};

const ProcessRoutePage: React.FC = () => {
  const { t } = useTranslation();
  const [routeSteps, setRouteSteps] = useState<ProcessRouteStep[]>([]);

  const loadRouteSteps = useCallback(async (routeId: string) => {
    try {
      const response = await processRouteApi.getSteps(routeId);
      if (response.success && response.data) {
        setRouteSteps(response.data.steps || []);
      }
    } catch (error: unknown) {
      console.error('加载工序步骤失败:', error);
    }
  }, []);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      active: {
        label: t('mes.process_route_page.active'),
        bg: 'success.lighter',
        color: 'success.dark',
      },
      inactive: {
        label: t('mes.process_route_page.inactive'),
        bg: 'grey.100',
        color: 'text.secondary',
      },
      draft: {
        label: t('mes.process_route_page.status_draft'),
        bg: 'warning.light',
        color: 'warning.dark',
      },
    };
    const s = statusMap[status] || { label: status, bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        size='small'
        label={s.label}
        sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 500 }}
      />
    );
  };

  const detailContent = (row: Record<string, unknown>) => {
    const route = row as unknown as ProcessRoute;
    loadRouteSteps(route.id);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>路线编号</InputLabel>
            <Box
              component='span'
              sx={{ fontWeight: 500 }}
            >
              {route.code}
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>路线名称</InputLabel>
            <Box component='span'>{route.name}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>版本</InputLabel>
            <Box component='span'>{route.version || '-'}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
            <Box>{getStatusBadge(route.status)}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>标准工时</InputLabel>
            <Box component='span'>{route.total_standard_time || 0} 分钟</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
            <Box component='span'>{new Date(route.created_at).toLocaleString('zh-CN')}</Box>
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>描述</InputLabel>
            <Box component='span'>{route.description || '-'}</Box>
          </Box>
        </Box>

        <Typography
          variant='h6'
          sx={{ mt: 2 }}
        >
          工序列表
        </Typography>
        {routeSteps.length > 0 ? (
          <Stack spacing={1}>
            {routeSteps.map((step, index) => (
              <Box
                key={step.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'common.white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                  }}
                >
                  {index + 1}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {step.process_name}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {step.process_code} | 标准工时: {step.standard_time || 0} 分钟
                  </Typography>
                </Box>
                {step.work_station_name && (
                  <Chip
                    size='small'
                    label={step.work_station_name}
                    variant='outlined'
                  />
                )}
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography color='text.secondary'>暂无工序数据</Typography>
        )}
      </Box>
    );
  };

  return (
    <PageContainer
      title={t('mes.process_route_page.process')}
      subtitle={t('mes.process_route_page.process_1')}
      headerProps={{
        pageIcon: <Route style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={processRouteSchema}
        apiAdapter={processRouteAdapter}
        breadcrumbs={[{ label: 'MES' }, { label: '工艺路线' }]}
        detailContent={detailContent}
        detailMaxWidth='md'
      />
    </PageContainer>
  );
};

export default ProcessRoutePage;
