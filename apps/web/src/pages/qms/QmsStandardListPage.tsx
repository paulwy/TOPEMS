import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, FileText, FileCheck, Eye } from 'lucide-react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { qualityStandardSchema } from '@/schemas/qms';
import { qmsApi } from '@/api/qms';
import type { QualityStandard } from '@/api/qms';
import { designTokens } from '@/theme/tokens';
import { QMS_PATHS } from '@/modules/qms/config';

const ct = designTokens.colors;

const standardAdapter = {
  list: async (params?: { page?: number; pageSize?: number; search?: string; status?: string }) => {
    const response = await qmsApi.listStandards();
    if (!response.success || !response.data) {
      throw new Error(response.message || '加载质量标准数据失败');
    }
    let data = response.data as QualityStandard[];

    if (params?.search) {
      const search = params.search.toLowerCase();
      data = data.filter(
        (item) =>
          item.name.toLowerCase().includes(search) || item.code.toLowerCase().includes(search)
      );
    }

    if (params?.status && params.status !== 'all') {
      data = data.filter((item) => item.status === params.status);
    }

    const total = data.length;
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = data.slice(start, end);

    return { data: paginatedData, total };
  },
  create: async (data: Partial<QualityStandard>) => {
    const response = await qmsApi.createStandard(data as QualityStandard);
    if (!response.success || !response.data) {
      throw new Error(response.message || '创建失败');
    }
    return response.data;
  },
  update: async (id: string, data: Partial<QualityStandard>) => {
    const response = await qmsApi.updateStandard(id, data as QualityStandard);
    if (!response.success || !response.data) {
      throw new Error(response.message || '更新失败');
    }
    return response.data;
  },
  delete: async (id: string) => {
    const response = await qmsApi.deleteStandard(id);
    if (!response.success) {
      throw new Error(response.message || '删除失败');
    }
  },
};

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
}> = ({ label, value, icon, iconBgColor, iconColor }) => (
  <Card>
    <CardContent sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            bgcolor: iconBgColor,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ color: iconColor, display: 'flex' }}>{icon}</Box>
        </Box>
        <Box>
          <Typography
            variant='body2'
            sx={{ color: 'slate.600', fontSize: '0.875rem' }}
          >
            {label}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'slate.900' }}
          >
            {value}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const QmsStandardListPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: allStandards } = useQuery({
    queryKey: [qualityStandardSchema.entity, 'stats'],
    queryFn: async () => {
      const response = await qmsApi.listStandards();
      if (response.success && response.data) {
        return response.data as QualityStandard[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const standards = allStandards || [];

  const stats = useMemo(() => {
    return {
      totalStandards: standards.length,
      activeStandards: standards.filter((s) => s.status === 'active' || s.status === '有效').length,
      draftStandards: standards.filter((s) => s.status === 'draft' || s.status === '草稿').length,
    };
  }, [standards]);

  const customRowActions: RowAction[] = [
    {
      label: '查看',
      icon: <Eye size={16} />,
      onClick: (row) => {
        navigate(QMS_PATHS.standardDetail.replace(':id', (row as unknown as QualityStandard).id));
      },
    },
  ];

  const headerContent = () => (
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
      <StatCard
        label='标准总数'
        value={stats.totalStandards}
        icon={<FileText size={20} />}
        iconBgColor='primary.lighter'
        iconColor='primary.dark'
      />
      <StatCard
        label='有效标准'
        value={stats.activeStandards}
        icon={<FileCheck size={20} />}
        iconBgColor='success.lighter'
        iconColor='success.dark'
      />
      <StatCard
        label='草稿状态'
        value={stats.draftStandards}
        icon={<FileText size={20} />}
        iconBgColor='warning.100'
        iconColor={ct.yellow[600]}
      />
    </Box>
  );

  return (
    <PageContainer
      title='质量标准'
      subtitle='Quality Standards'
      headerProps={{
        pageIcon: <ClipboardCheck style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.main} 100%)`,
      }}
      maxWidth='xl'
    >
      <CrudPage
        schema={qualityStandardSchema}
        apiAdapter={standardAdapter}
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'QMS' },
          { label: '质量标准' },
        ]}
        headerContent={headerContent}
        customRowActions={customRowActions}
      />
    </PageContainer>
  );
};

export default QmsStandardListPage;
