import React, { useCallback } from 'react';
import { Box, Typography, Chip, Paper } from '@mui/material';
import { Users, Tag, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { customerSegmentationSchema } from '@/schemas/crm';
import { crmApi } from '@/api/crm';
import type { CustomerSegment, CreateSegmentRequest, SegmentCriteria } from '@/api/crm';
import { CRM_PATHS } from '@/modules/crm/config';

// ============ API 适配器 ============

const apiAdapter: CrudApiAdapter<CustomerSegment> = {
  list: async (params) => {
    const res = await crmApi.customerSegmentation.list({
      page: params?.page,
      pageSize: params?.pageSize,
    });
    if (res.success && res.data) {
      return { data: res.data.items || [], total: res.data.total || 0 };
    }
    return { data: [], total: 0 };
  },
  create: async (data) => {
    const criteria =
      typeof data.criteria === 'string'
        ? (JSON.parse(data.criteria as string) as SegmentCriteria)
        : (data.criteria as SegmentCriteria);
    const res = await crmApi.customerSegmentation.create({
      name: data.name as string,
      description: data.description as string | undefined,
      criteria,
    } as CreateSegmentRequest);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || '创建分群失败');
  },
  update: async () => {
    throw new Error('分群不支持编辑');
  },
  delete: async (id) => {
    const res = await crmApi.customerSegmentation.delete(id);
    if (res.success === false) {
      throw new Error(res.message || '删除分群失败');
    }
  },
};

// ============ 列定义 ============

const columns: ColumnDef<CustomerSegment>[] = [
  {
    id: 'name',
    label: '分群名称',
    width: 200,
    render: (row) => (
      <Box>
        <Typography
          variant='body2'
          sx={{ fontWeight: 600 }}
        >
          {row.name}
        </Typography>
        {row.description && (
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {row.description}
          </Typography>
        )}
      </Box>
    ),
  },
  {
    id: 'customer_count',
    label: '客户数',
    width: 100,
    align: 'right',
    render: (row) => (
      <Chip
        label={row.customer_count}
        color='primary'
        size='small'
        icon={<Users size={14} />}
      />
    ),
  },
  {
    id: 'criteria',
    label: '分群条件',
    render: (row) => (
      <Typography
        variant='caption'
        color='text.secondary'
        noWrap
      >
        {JSON.stringify(row.criteria)}
      </Typography>
    ),
  },
  {
    id: 'created_at',
    label: '创建时间',
    width: 160,
    render: (row) => (
      <Typography
        variant='caption'
        color='text.secondary'
      >
        {new Date(row.created_at).toLocaleString('zh-CN')}
      </Typography>
    ),
  },
];

// ============ 组件 ============

const CRMCustomerSegmentationPage: React.FC = () => {
  const navigate = useNavigate();

  const customRowActions: RowAction<CustomerSegment>[] = [
    {
      key: 'viewCustomers',
      label: '查看客户',
      icon: <Users size={16} />,
      onClick: (row) => {
        navigate(`${CRM_PATHS.customers}?segment_id=${row.id}`);
      },
    },
  ];

  const detailContent = useCallback((row: Record<string, unknown>) => {
    const segment = row as unknown as CustomerSegment;
    return (
      <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Typography
            variant='subtitle2'
            gutterBottom
          >
            基本信息
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
            <Typography variant='body2'>分群名称: {segment.name}</Typography>
            <Typography variant='body2'>客户数: {segment.customer_count}</Typography>
            <Typography variant='body2'>
              创建时间: {new Date(segment.created_at).toLocaleString('zh-CN')}
            </Typography>
          </Box>
          {segment.description && (
            <Typography
              variant='body2'
              sx={{ mt: 1 }}
              color='text.secondary'
            >
              {segment.description}
            </Typography>
          )}
        </Paper>
        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Typography
            variant='subtitle2'
            gutterBottom
          >
            分群条件
          </Typography>
          <Box
            component='pre'
            sx={{
              mt: 1,
              p: 1.5,
              bgcolor: 'grey.100',
              borderRadius: 1,
              fontSize: '0.75rem',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {JSON.stringify(segment.criteria, null, 2)}
          </Box>
        </Paper>
      </Box>
    );
  }, []);

  const headerContent = useCallback((rows: unknown[], _total: number) => {
    const segments = rows as CustomerSegment[];
    const totalCustomers = segments.reduce((sum, s) => sum + (s.customer_count || 0), 0);
    const avgCustomers = segments.length > 0 ? Math.round(totalCustomers / segments.length) : 0;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ bgcolor: 'primary.50', borderRadius: 3, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Tag
                size={24}
                color='white'
              />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                分群总数
              </Typography>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                {_total}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ bgcolor: 'success.50', borderRadius: 3, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                bgcolor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users
                size={24}
                color='white'
              />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                覆盖客户
              </Typography>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                {totalCustomers}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ bgcolor: 'warning.50', borderRadius: 3, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                bgcolor: 'warning.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp
                size={24}
                color='white'
              />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                平均客户数
              </Typography>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                {avgCustomers}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }, []);

  return (
    <CrudPage
      schema={customerSegmentationSchema}
      apiAdapter={apiAdapter}
      customColumns={columns as ColumnDef[]}
      customRowActions={customRowActions as RowAction[]}
      detailContent={detailContent}
      headerContent={headerContent}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: '客户关系管理', href: CRM_PATHS.root },
        { label: '客户分群' },
      ]}
    />
  );
};

export default CRMCustomerSegmentationPage;
