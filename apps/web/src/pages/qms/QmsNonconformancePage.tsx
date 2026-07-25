import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { AlertCircle, CheckCircle } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { nonconformanceSchema } from '@/schemas/qms';
import { qmsApi } from '@/api/qms';
import type { QualityIssue } from '@/api/qms';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const issueAdapter: CrudApiAdapter<QualityIssue> = {
  list: async (params) => {
    const response = await qmsApi.listIssues();
    if (!response.success || !response.data) {
      throw new Error(response.message || '加载不合格品数据失败');
    }
    const items = response.data;

    const search = params?.search as string | undefined;
    let filtered = items;
    if (search) {
      const lower = search.toLowerCase();
      filtered = items.filter(
        (item) =>
          item.title.toLowerCase().includes(lower) || item.issue_no.toLowerCase().includes(lower)
      );
    }

    const filterParams = params as Record<string, string | undefined>;
    if (filterParams.severity && filterParams.severity !== 'all') {
      filtered = filtered.filter((item) => item.severity === filterParams.severity);
    }
    if (filterParams.status && filterParams.status !== 'all') {
      filtered = filtered.filter((item) => item.status === filterParams.status);
    }

    const page = Number(params?.page) || 1;
    const pageSize = Number(params?.pageSize) || 10;
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return { data: paged, total };
  },

  create: async (data) => {
    const response = await qmsApi.createIssue(data as Parameters<typeof qmsApi.createIssue>[0]);
    if (!response.success) {
      throw new Error(response.message || '创建失败');
    }
    return (response.data ?? {}) as QualityIssue;
  },

  update: async (id, data) => {
    const response = await qmsApi.updateIssue(id, data as Parameters<typeof qmsApi.updateIssue>[1]);
    if (!response.success) {
      throw new Error(response.message || '更新失败');
    }
    return (response.data ?? {}) as QualityIssue;
  },

  delete: async (id) => {
    const response = await qmsApi.deleteIssue(id);
    if (!response.success) {
      throw new Error(response.message || '删除失败');
    }
  },
};

const QmsNonconformancePage: React.FC = () => {
  const headerContent = (rows: QualityIssue[], total: number) => {
    const openCount = rows.filter((n) => n.status === 'open' || n.status === '待处理').length;
    const closedCount = rows.filter(
      (n) => n.status === 'closed' || n.status === 'resolved' || n.status === '已关闭'
    ).length;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: 2,
          mb: 4,
        }}
      >
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
                <AlertCircle sx={{ width: 20, height: 20, color: 'error.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  不合格品总数
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {total}
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
                  bgcolor: 'warning.100',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle sx={{ width: 20, height: 20, color: ct.yellow[600] }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  待处理
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {openCount}
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
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  已关闭
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {closedCount}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <CrudPage
      schema={nonconformanceSchema}
      apiAdapter={issueAdapter}
      breadcrumbs={[{ label: 'QMS' }, { label: '不合格品管理' }]}
      headerContent={headerContent}
      detailMaxWidth='lg'
    />
  );
};

export default QmsNonconformancePage;
