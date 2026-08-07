import React, { useMemo } from 'react';
import { Box, Typography, Card, CardContent, Stepper, Step, StepLabel, Chip } from '@mui/material';
import { TestTube, Package, CheckCircle, Clock } from 'lucide-react';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { sampleSchema } from '@/schemas/lims';
import { limsApi, type Sample } from '@/api/lims';
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';
import { getStatusColor } from '@/utils/status';

const ct = designTokens.colors;

const workflowSteps = ['待登记', '待接收', '已接收', '待确认', '已确认'];

const getStageStep = (status: string): number => {
  const stageMap: Record<string, number> = {
    待登记: 0,
    待接收: 1,
    已接收: 2,
    待确认: 3,
    已确认: 4,
    检测中: 4,
    已完成: 5,
  };
  return stageMap[status] ?? 0;
};

const getSampleStatusColor = (status: string): string =>
  getStatusColor(status, { category: 'lims', fallback: 'grey.100' }) as string;

const SampleReceivePage: React.FC = () => {
  const sampleApiAdapter: CrudApiAdapter<Sample> = useMemo(
    () => ({
      list: async (params) => {
        const response = await limsApi.listSamples({
          page: params?.page !== undefined ? params.page : 0,
          pagesize: params?.pageSize ?? 10,
          search: params?.search as string | undefined,
          status: params?.status && params.status !== 'all' ? (params.status as string) : undefined,
        });
        if (!response.success || !response.data) {
          throw new Error('加载样品列表失败');
        }
        const data = response.data as { items?: Sample[]; total?: number } | Sample[];
        if (Array.isArray(data)) {
          return { data, total: data.length };
        }
        return {
          data: data.items || [],
          total: data.total || data.items?.length || 0,
        };
      },

      create: async (data) => {
        const response = await limsApi.createSample(
          data as unknown as Parameters<typeof limsApi.createSample>[0]
        );
        if (!response.success) {
          throw new Error(response.message || '登记失败');
        }
        return response.data as unknown as Sample;
      },

      update: async (id, data) => {
        const response = await limsApi.updateSample(
          id,
          data as unknown as Parameters<typeof limsApi.updateSample>[1]
        );
        if (!response.success) {
          throw new Error(response.message || '更新失败');
        }
        return response.data as unknown as Sample;
      },

      delete: async (id) => {
        const response = await limsApi.deleteSample(id);
        if (!response.success) {
          throw new Error(response.message || '删除失败');
        }
      },
    }),
    []
  );

  const transitionSampleStage = async (id: string, targetStage: string) => {
    const response = await limsApi.transitionSampleStage(id, {
      sample_id: id,
      target_stage: targetStage,
      operator: '系统用户',
      remarks: `样品状态变更为${targetStage}`,
    });
    if (!response.success) {
      throw new Error(response.message || '状态变更失败');
    }
  };

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'receive',
        label: '接收',
        icon: <Package size={14} />,
        color: 'warning',
        show: (row: Record<string, unknown>) =>
          row.status === '待接收' || row.status === 'received',
        onClick: async (row: Record<string, unknown>) => {
          await transitionSampleStage(String(row.id), '已接收');
        },
      },
      {
        key: 'confirm',
        label: '确认',
        icon: <CheckCircle size={14} />,
        color: 'success',
        show: (row: Record<string, unknown>) =>
          row.status === '已接收' || row.status === 'confirmed',
        onClick: async (row: Record<string, unknown>) => {
          await transitionSampleStage(String(row.id), '已确认');
        },
      },
    ],
    []
  );

  const statsContent = (rows: Record<string, unknown>[]) => {
    const samples = rows as unknown as Sample[];
    const stats = {
      total: samples.length,
      pending: samples.filter((s) => ['待登记', '待接收'].includes(s.status)).length,
      received: samples.filter((s) => ['已接收', '待确认'].includes(s.status)).length,
      confirmed: samples.filter((s) => ['已确认', '检测中', '已完成'].includes(s.status)).length,
    };

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            md: 'repeat(3, 1fr)',
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
                <TestTube sx={{ width: 20, height: 20, color: 'info.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ fontSize: '0.875rem' }}
                >
                  样品总数
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
                  bgcolor: 'warning.light',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock sx={{ width: 20, height: 20, color: ct.yellow[600] }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ fontSize: '0.875rem' }}
                >
                  待处理
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.pending}
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
                <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ fontSize: '0.875rem' }}
                >
                  已确认
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.confirmed}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  const detailContent = (row: Record<string, unknown>) => {
    const sample = row as unknown as Sample;
    const activeStep = getStageStep(sample.status);

    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, fontWeight: 600 }}
          >
            工作流程
          </Typography>
          <Stepper
            activeStep={activeStep}
            alternativeLabel
          >
            {workflowSteps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 2,
            mb: 3,
          }}
        >
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
            >
              样品编号
            </Box>
            <Box sx={{ fontWeight: 500 }}>{sample.sample_no || sample.id}</Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
            >
              样品名称
            </Box>
            <Box sx={{ fontWeight: 500 }}>{sample.name}</Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
            >
              检测项目
            </Box>
            <Box>{sample.description || '-'}</Box>
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
                label={sample.status}
                size='small'
                sx={{
                  backgroundColor: getSampleStatusColor(sample.status),
                  fontWeight: 500,
                }}
              />
            </Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
            >
              接收日期
            </Box>
            <Box>
              {sample.received_date
                ? new Date(sample.received_date).toLocaleDateString('zh-CN')
                : '-'}
            </Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
            >
              样品类型
            </Box>
            <Box>{sample.sample_type || '-'}</Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
            >
              来源
            </Box>
            <Box>{sample.source || '-'}</Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
            >
              数量
            </Box>
            <Box>
              {sample.quantity !== undefined ? `${sample.quantity} ${sample.unit || ''}` : '-'}
            </Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
            >
              存放位置
            </Box>
            <Box>{sample.location || '-'}</Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
            >
              负责人
            </Box>
            <Box>{sample.responsible_person || '-'}</Box>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <PageContainer
      title='样本接收'
      subtitle='Sample Receive Management'
      headerProps={{
        pageIcon: <TestTube style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]} 0%, ${ct.teal[600]} 100%)`,
      }}
    >
      <CrudPage
        schema={sampleSchema}
        apiAdapter={sampleApiAdapter}
        customRowActions={customRowActions}
        headerContent={statsContent}
        detailContent={detailContent}
        detailMaxWidth='md'
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'LIMS', href: LIMS_PATHS.root },
          { label: '样本接收' },
        ]}
        idField='id'
      />
    </PageContainer>
  );
};

export default SampleReceivePage;
