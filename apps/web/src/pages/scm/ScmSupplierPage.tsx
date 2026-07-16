import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Grid,
  Button,
} from '@mui/material';
import { Plus, Eye, TrendingUp, Award, Target, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { scmApi } from '@/api/scm';
import type {
  Supplier,
  SupplierPerformance,
  CreateSupplierRequest,
  UpdateSupplierRequest,
} from '@/api/scm';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { SCM_PATHS } from '@/modules/scm/config';
import { useCrudOperations, type CrudOperations } from '@/hooks/useCrudQueries';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const ScmSupplierPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedPerformance, setSelectedPerformance] = useState<SupplierPerformance | null>(null);
  const [formData, setFormData] = useState<CreateSupplierRequest & { status?: string }>({
    name: '',
    short_name: '',
    contact_name: '',
    contact_phone: '',
    email: '',
    address: '',
    bank_account: '',
    tax_number: '',
    status: 'active',
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  const {
    data: suppliers,
    loading,
    pagination,
    create,
    fetch,
  } = useCrudOperations<Supplier, CreateSupplierRequest, UpdateSupplierRequest>({
    api: scmApi.suppliers as unknown as CrudOperations<Supplier, CreateSupplierRequest, UpdateSupplierRequest>,
    queryKey: 'scm-suppliers',
    defaultPageSize: 10,
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const params: Record<string, unknown> = {};
    if (value) params.search = value;
    fetch(params);
    pagination.setPage(1);
  };

  const performanceQuery = useQuery({
    queryKey: QUERY_KEYS.SCM.SUPPLIER_PERFORMANCE,
    queryFn: async () => {
      const response = await scmApi.supplyChainDashboard.supplierPerformance({
        page: 1,
        pageSize: 20,
      });
      if (!response.success || !response.data) {
        throw new Error('加载供应商绩效失败');
      }
      return response.data.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const supplierPerformance = performanceQuery.data || [];
  const performanceLoading = performanceQuery.isLoading;

  const handleCreate = async () => {
    try {
      await create(formData);
      setShowCreateModal(false);
      pagination.setPage(1);
    } catch (error: unknown) {
      apiLogger.error('创建供应商失败:', error);
    }
  };

  const handleViewDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailModal(true);
  };

  // 表格列定义
  const columns: ColumnDef<Supplier>[] = [
    {
      id: 'id',
      label: 'ID',
    },
    {
      id: 'name',
      label: '供应商名称',
    },
    {
      id: 'short_name',
      label: '简称',
    },
    {
      id: 'contact_name',
      label: '联系人',
    },
    {
      id: 'contact_phone',
      label: '联系电话',
    },
    {
      id: 'email',
      label: '邮箱',
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => (
        <Chip
          label={row.status === 'active' ? '活跃' : '禁用'}
          color={row.status === 'active' ? 'success' : 'error'}
          size='small'
        />
      ),
    },
    {
      id: 'performance',
      label: '绩效评分',
      align: 'center',
      render: (row) => {
        const performance = supplierPerformance.find((p) => p.supplier_id === row.id);
        if (!performance) {
          return <Box>-</Box>;
        }
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Rating
              value={performance.overall_score || 0}
              precision={0.5}
              max={100}
              readOnly
              size='small'
              sx={{
                '& .MuiRating-iconFilled': {
                  color:
                    performance.overall_score >= 80
                      ? 'success.main'
                      : performance.overall_score >= 60
                        ? 'warning.main'
                        : 'error.main',
                },
              }}
            />
            <Box sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
              {performance.overall_score || '-'}
            </Box>
          </Box>
        );
      },
    },
    {
      id: 'grade',
      label: '评级',
      align: 'center',
      render: (row) => {
        const performance = supplierPerformance.find((p) => p.supplier_id === row.id);
        if (!performance?.grade) {
          return <Box>-</Box>;
        }
        return (
          <Chip
            label={performance.grade}
            color={
              performance.grade === 'A'
                ? 'success'
                : performance.grade === 'B'
                  ? 'primary'
                  : performance.grade === 'C'
                    ? 'warning'
                    : 'error'
            }
            size='small'
          />
        );
      },
    },
  ];

  const handleViewPerformance = (supplier: Supplier) => {
    const performance = supplierPerformance.find((p) => p.supplier_id === supplier.id);
    if (performance) {
      setSelectedPerformance(performance);
      setShowPerformanceModal(true);
    } else {
      addNotification({
        title: '提示',
        message: '暂无该供应商绩效数据',
        type: 'info',
      });
    }
  };

  // 行操作
  const rowActions = [
    {
      label: '查看',
      icon: <Eye size={14} />,
      onClick: (row: Supplier) => handleViewDetail(row),
    },
    {
      label: '绩效',
      icon: <TrendingUp size={14} />,
      onClick: (row: Supplier) => handleViewPerformance(row),
    },
    {
      label: '详情',
      onClick: (row: Supplier) => navigate(SCM_PATHS.suppliers),
    },
  ];

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Truck style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        columns={columns}
        data={suppliers}
        loading={loading}
        pagination={{
          page: pagination.page - 1,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: (page) => pagination.setPage(page + 1),
          onPageSizeChange: (size) => pagination.setPageSize(size),
        }}
        searchable
        searchValue={searchTerm}
        onSearch={handleSearch}
        searchPlaceholder='搜索供应商...'
        actions={[
          {
            label: '新增供应商',
            icon: <Plus size={16} />,
            onClick: () => setShowCreateModal(true),
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={() => fetch()}
        emptyMessage='暂无供应商数据'
      />

      {/* 创建模态框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增供应商</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
              mt: 2,
            }}
          >
            <TextField
              label='供应商名称'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label='简称'
              value={formData.short_name}
              onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
              fullWidth
            />
            <TextField
              label='联系人'
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              fullWidth
            />
            <TextField
              label='联系电话'
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              fullWidth
            />
            <TextField
              label='邮箱'
              type='email'
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <TextField
              label='银行账户'
              value={formData.bank_account}
              onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
              fullWidth
            />
            <TextField
              label='税号'
              value={formData.tax_number}
              onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
              fullWidth
            />
            <TextField
              label='地址'
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              fullWidth
              multiline
              rows={2}
              sx={{ gridColumn: '1 / -1' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleCreate}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 详情模态框 */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>供应商详情</DialogTitle>
        <DialogContent>
          {selectedSupplier && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                供应商名称
              </Typography>
              <Typography>{selectedSupplier.name}</Typography>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mt: 2 }}
              >
                简称
              </Typography>
              <Typography>{selectedSupplier.short_name || '-'}</Typography>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mt: 2 }}
              >
                联系人
              </Typography>
              <Typography>{selectedSupplier.contact_name || '-'}</Typography>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mt: 2 }}
              >
                联系电话
              </Typography>
              <Typography>{selectedSupplier.contact_phone || '-'}</Typography>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mt: 2 }}
              >
                邮箱
              </Typography>
              <Typography>{selectedSupplier.email || '-'}</Typography>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mt: 2 }}
              >
                地址
              </Typography>
              <Typography>{selectedSupplier.address || '-'}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 供应商绩效详情模态框 */}
      <Dialog
        open={showPerformanceModal}
        onClose={() => setShowPerformanceModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>供应商绩效详情</DialogTitle>
        <DialogContent>
          {selectedPerformance && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                供应商名称
              </Typography>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 500 }}>
                {selectedPerformance.supplier_name}
              </Typography>

              <Grid
                container
                spacing={3}
                sx={{ mt: 3 }}
              >
                <Grid size={{ xs: 6, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Award
                      size={20}
                      color='primary'
                    />
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600 }}
                    >
                      综合评级
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={selectedPerformance.grade || '-'}
                      color={
                        selectedPerformance.grade === 'A'
                          ? 'success'
                          : selectedPerformance.grade === 'B'
                            ? 'primary'
                            : selectedPerformance.grade === 'C'
                              ? 'warning'
                              : 'error'
                      }
                      sx={{ fontSize: '1.25rem', padding: '8px 16px' }}
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Target
                      size={20}
                      color='primary'
                    />
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600 }}
                    >
                      排名
                    </Typography>
                  </Box>
                  <Typography sx={{ mt: 1, fontSize: '1.5rem', fontWeight: 600 }}>
                    {selectedPerformance.rank ? `第 ${selectedPerformance.rank} 名` : '-'}
                  </Typography>
                </Grid>
              </Grid>

              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mt: 4 }}
              >
                绩效评分详情
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>综合得分</Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    {selectedPerformance.overall_score}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>准时交付率</Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    {selectedPerformance.on_time_delivery_rate}%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>质量合格率</Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    {selectedPerformance.quality_pass_rate}%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>价格稳定性</Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    {selectedPerformance.price_stability_score}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>服务评分</Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    {selectedPerformance.service_score}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>合作订单数</Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    {selectedPerformance.order_count}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPerformanceModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ScmSupplierPage;
