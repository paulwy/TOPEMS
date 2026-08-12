import React, { useCallback, useMemo } from 'react';
import { Box, Typography, Chip, Paper } from '@mui/material';
import { Users, Tag, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { customerSegmentationSchema } from '@/schemas/crm';
import { crmApi, useCrmMock, type SegmentationData, type Period } from '@/api/crm';
import type { CustomerSegment, CreateSegmentRequest, SegmentCriteria } from '@/api/crm';
import { CRM_PATHS } from '@/modules/crm/config';

// ============ 组件 ============

const CRMCustomerSegmentationPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [period] = React.useState<Period>('MTD');
  const { data: mockSeg, mockEnabled } = useCrmMock<SegmentationData>({ period });

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
      throw new Error(res.message || t('crm.customerSegmentation.error_create'));
    },
    update: async () => {
      throw new Error(t('crm.customerSegmentation.error_edit_not_supported'));
    },
    delete: async (id) => {
      const res = await crmApi.customerSegmentation.delete(id);
      if (res.success === false) {
        throw new Error(res.message || t('crm.customerSegmentation.error_delete'));
      }
    },
  };

  // ============ 列定义 ============

  const columns: ColumnDef<CustomerSegment>[] = [
    {
      id: 'name',
      label: t('crm.customerSegmentation.col_name'),
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
      label: t('crm.customerSegmentation.col_customer_count'),
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
      label: t('crm.customerSegmentation.col_criteria'),
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
      label: t('crm.customerSegmentation.col_created_at'),
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

  const customRowActions: RowAction<CustomerSegment>[] = [
    {
      key: 'viewCustomers',
      label: t('crm.customerSegmentation.action_view_customers'),
      icon: <Users size={16} />,
      onClick: (row) => {
        navigate(`${CRM_PATHS.customers}?segment_id=${row.id}`);
      },
    },
  ];

  const detailContent = useCallback(
    (row: Record<string, unknown>) => {
      const segment = row as unknown as CustomerSegment;
      return (
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography
              variant='subtitle2'
              gutterBottom
            >
              {t('crm.customerSegmentation.section_basic')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
              <Typography variant='body2'>
                {t('crm.customerSegmentation.text_name_label', { name: segment.name })}
              </Typography>
              <Typography variant='body2'>
                {t('crm.customerSegmentation.text_count_label', { count: segment.customer_count })}
              </Typography>
              <Typography variant='body2'>
                {t('crm.customerSegmentation.text_created_at_label', {
                  time: new Date(segment.created_at).toLocaleString('zh-CN'),
                })}
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
              {t('crm.customerSegmentation.section_criteria')}
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
    },
    [t]
  );

  const headerContent = useCallback(
    (rows: unknown[], _total: number) => {
      const segments = rows as CustomerSegment[];
      const realSummary = {
        totalSegments: _total,
        coveredCustomers: segments.reduce((sum, s) => sum + (s.customer_count || 0), 0),
        avgCustomers:
          segments.length > 0
            ? Math.round(segments.reduce((sum, s) => sum + (s.customer_count || 0), 0) / segments.length)
            : 0,
      };
      const summary = mockEnabled ? mockSeg.summary : realSummary;

      const quadrants = mockSeg.quadrants;
      const quadrantColors: Record<number, string> = {
        0: 'success.main',
        1: 'primary.main',
        2: 'warning.main',
        3: 'error.main',
      };

      return (
        <Box sx={{ mb: 3 }}>
          {mockEnabled && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Chip
                label={t('crm.common.mock_demo_badge') || 'Mock 演示'}
                color='warning'
                size='small'
                variant='outlined'
                sx={{ fontWeight: 600 }}
              />
            </Box>
          )}
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
                  <Tag size={24} color='white' />
                </Box>
                <Box>
                  <Typography variant='caption' color='text.secondary'>
                    {t('crm.customerSegmentation.stat_total_segments')}
                  </Typography>
                  <Typography variant='h4' sx={{ fontWeight: 700 }}>
                    {summary.totalSegments}
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
                  <Users size={24} color='white' />
                </Box>
                <Box>
                  <Typography variant='caption' color='text.secondary'>
                    {t('crm.customerSegmentation.stat_covered_customers')}
                  </Typography>
                  <Typography variant='h4' sx={{ fontWeight: 700 }}>
                    {summary.coveredCustomers}
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
                  <TrendingUp size={24} color='white' />
                </Box>
                <Box>
                  <Typography variant='caption' color='text.secondary'>
                    {t('crm.customerSegmentation.stat_avg_customers')}
                  </Typography>
                  <Typography variant='h4' sx={{ fontWeight: 700 }}>
                    {summary.avgCustomers}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {mockEnabled && (
            <Paper variant='outlined' sx={{ p: 3, mb: 3, position: 'relative' }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 2 }}>
                {t('crm.customerSegmentation.quadrant_title') || '客户价值×活动 四象限分布'}
              </Typography>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: 340,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: 1,
                    bgcolor: 'divider',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: 1,
                    bgcolor: 'divider',
                  }}
                />
                <Box sx={{ position: 'absolute', left: 8, top: 8, fontSize: 12, color: 'success.main', fontWeight: 600 }}>
                  {t('crm.customerSegmentation.q2_high_active_high_value') || '高价值·高活动'}
                </Box>
                <Box sx={{ position: 'absolute', right: 8, top: 8, fontSize: 12, color: 'primary.main', fontWeight: 600 }}>
                  {t('crm.customerSegmentation.q1_high_value_low_active') || '高价值·低活动'}
                </Box>
                <Box sx={{ position: 'absolute', left: 8, bottom: 8, fontSize: 12, color: 'warning.main', fontWeight: 600 }}>
                  {t('crm.customerSegmentation.q3_low_value_high_active') || '低价值·高活动'}
                </Box>
                <Box sx={{ position: 'absolute', right: 8, bottom: 8, fontSize: 12, color: 'error.main', fontWeight: 600 }}>
                  {t('crm.customerSegmentation.q4_low_value_low_active') || '低价值·低活动'}
                </Box>
                <Box sx={{ position: 'absolute', inset: 0 }}>
                  {quadrants.map((p) => {
                    const q =
                      p.value >= 50 && p.activity >= 50
                        ? 0
                        : p.value >= 50 && p.activity < 50
                          ? 1
                          : p.value < 50 && p.activity >= 50
                            ? 2
                            : 3;
                    const left = `${8 + (p.activity / 100) * 84}%`;
                    const top = `${8 + ((100 - p.value) / 100) * 84}%`;
                    return (
                      <Box
                        key={p.id}
                        sx={{
                          position: 'absolute',
                          left,
                          top,
                          transform: 'translate(-50%, -50%)',
                          width: 20 + p.size,
                          height: 20 + p.size,
                          borderRadius: '50%',
                          bgcolor: quadrantColors[q],
                          opacity: 0.7,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: 10,
                          fontWeight: 600,
                          border: '2px solid white',
                          boxShadow: 1,
                        }}
                        title={`${p.name} 价值:${p.value} 活动:${p.activity}`}
                      >
                        {p.size}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mt: 1,
                  px: 1,
                  fontSize: 12,
                  color: 'text.secondary',
                }}
              >
                <Box>← {t('crm.customerSegmentation.x_axis_activity') || '活跃度 低'}</Box>
                <Box>{t('crm.customerSegmentation.x_axis_activity_high') || '活跃度 高'} →</Box>
              </Box>
            </Paper>
          )}
        </Box>
      );
    },
    [t, mockEnabled, mockSeg]
  );

  return (
    <CrudPage
      schema={customerSegmentationSchema}
      apiAdapter={apiAdapter}
      customColumns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
      customRowActions={customRowActions as unknown as RowAction<Record<string, unknown>>[]}
      detailContent={detailContent}
      headerContent={headerContent}
      breadcrumbs={[
        { label: t('crm.common.home'), href: '/dashboard' },
        { label: t('crm.customerSegmentation.breadcrumb_manage'), href: CRM_PATHS.root },
        { label: t('crm.customerSegmentation.title') },
      ]}
    />
  );
};

export default CRMCustomerSegmentationPage;
