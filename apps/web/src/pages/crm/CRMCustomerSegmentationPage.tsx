import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Chip, Button, Grid } from '@mui/material';
import { Plus, Users, Tag, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import apiClient from '@/api/client';
import { CRM_PATHS } from '@/modules/crm/config';

interface SegmentRule {
  field: string;
  operator: string;
  value: string;
}

interface SegmentCriteria {
  rules?: SegmentRule[];
  [key: string]: unknown;
}

interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  criteria: SegmentCriteria;
  customer_count: number;
  created_at: string;
  updated_at: string;
}

const CRMCustomerSegmentationPage: React.FC = () => {
  const navigate = useNavigate();
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSegments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.crm.get('/segments', {
        params: { page: 1, pagesize: 50 },
      });
      if (res.success && res.data) {
        const data = res.data as { items?: CustomerSegment[] };
        setSegments(data.items || (res.data as CustomerSegment[]) || []);
      }
    } catch (error: unknown) {
      setSegments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

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
      render: (row) => {
        const rules = (row.criteria?.rules || [])
          .map((r: SegmentRule) => `${r.field} ${r.operator} ${r.value}`)
          .join(', ');
        return (
          <Typography
            variant='caption'
            color='text.secondary'
            noWrap
          >
            {rules || JSON.stringify(row.criteria)}
          </Typography>
        );
      },
    },
    {
      id: 'created_at',
      label: '创建时间',
      width: 160,
    },
  ];

  const actions: RowAction<CustomerSegment>[] = [
    {
      label: '查看客户',
      icon: <Users size={16} />,
      onClick: (row: CustomerSegment) => {
        navigate(`${CRM_PATHS.customers}?segment_id=${row.id}`);
      },
    },
    {
      label: '编辑',
      icon: <Tag size={16} />,
      onClick: (_row: CustomerSegment) => {},
    },
  ];

  return (
    <PageContainer
      title='客户分群'
      subtitle='基于多维度条件对客户进行精细化分群运营'
      autoTitle
      autoBreadcrumbs
    >
      <Box>
        <Box
          sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
        >
          <Box>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700 }}
            >
              客户分群
            </Typography>
            <Typography color='text.secondary'>基于多维度条件对客户进行精细化分群运营</Typography>
          </Box>
          <Button
            variant='contained'
            startIcon={<Plus size={18} />}
          >
            新建分群
          </Button>
        </Box>

        <Grid
          container
          spacing={3}
          sx={{ mb: 3 }}
        >
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      bgcolor: 'primary.50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Tag
                      size={24}
                      color='primary.main'
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
                      {segments.length}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      bgcolor: 'success.50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Users
                      size={24}
                      color='success.main'
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
                      {segments.reduce((sum, s) => sum + (s.customer_count || 0), 0)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      bgcolor: 'warning.50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUp
                      size={24}
                      color='warning.main'
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
                      {segments.length > 0
                        ? Math.round(
                            segments.reduce((sum, s) => sum + (s.customer_count || 0), 0) /
                              segments.length
                          )
                        : 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <ListPageTemplate<CustomerSegment>
          columns={columns}
          data={segments}
          loading={loading}
          rowActions={actions}
          onRefresh={loadSegments}
          searchable={true}
          emptyMessage='暂无客户分群'
        />
      </Box>
    </PageContainer>
  );
};

export default CRMCustomerSegmentationPage;
