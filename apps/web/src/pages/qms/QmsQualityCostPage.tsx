import React, { useState, useEffect, useCallback } from 'react';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Plus,
  Eye,
  BarChart3,
  PieChart,
  Calendar,
} from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Tabs,
  Tab,
  Button,
  Grid,
} from '@mui/material';

import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { qmsApi } from '@/api/qms';
import type { QualityCost, CostStatistics, CostTrendItem } from '@/api/qms';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { QMS_PATHS } from '@/modules/qms/config';

const ct = designTokens.colors;

const QmsQualityCostPage: React.FC = () => {
  const navigate = useNavigate();
  const [costs, setCosts] = useState<QualityCost[]>([]);
  const [statistics, setStatistics] = useState<CostStatistics | null>(null);
  const [trendData, setTrendData] = useState<CostTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState<QualityCost | null>(null);
  const [detailTab, setDetailTab] = useState(0);
  const [formData, setFormData] = useState({
    cost_type: 'prevention',
    cost_category: '',
    amount: '',
    currency: 'CNY',
    occurrence_date: '',
    department: '',
    related_order_no: '',
    description: '',
    responsible_person: '',
  });
  const [filterData, setFilterData] = useState({
    cost_type: '',
    department: '',
    startDate: '',
    endDate: '',
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    loadCosts();
    loadStatistics();
  }, []);

  const loadCosts = async () => {
    try {
      setLoading(true);
      const response = await qmsApi.listQualityCosts();
      if (response.success && response.data) {
        const data = response.data as any;
        const costsArray = Array.isArray(data) ? data : data.costs || [];
        setCosts(costsArray);
      } else if (!response.success) {
        addNotification({
          title: '加载失败',
          message: response.message || '加载质量成本数据失败',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      apiLogger.error('加载质量成本失败:', error);
      addNotification({
        title: '加载失败',
        message: '加载质量成本数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await qmsApi.getCostStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error: unknown) {
      apiLogger.error('加载质量成本统计失败:', error);
    }

    try {
      const trendRes = await qmsApi.getCostTrend({ period: 'month' });
      if (trendRes.success && trendRes.data) {
        const data = trendRes.data as any;
        setTrendData(Array.isArray(data) ? data : data.trend || []);
      }
    } catch (error: unknown) {
      apiLogger.error('加载质量成本趋势失败:', error);
    }
  };

  const handleCreateCost = async () => {
    try {
      setSubmitting(true);
      const response = await qmsApi.createQualityCost({
        costNo: `QC-${Date.now()}`,
        costType: formData.cost_type,
        costCategory: formData.cost_category,
        amount: parseFloat(formData.amount) || 0,
        currency: formData.currency,
        occurrenceDate: formData.occurrence_date,
        department: formData.department,
        relatedOrderNo: formData.related_order_no,
        description: formData.description,
        responsiblePerson: formData.responsible_person,
        status: 'pending',
      });
      if (response.success) {
        addNotification({
          title: '成功',
          message: '质量成本记录创建成功',
          type: 'success',
        });
        setShowAddModal(false);
        loadCosts();
        loadStatistics();
        resetForm();
      } else {
        addNotification({
          title: '失败',
          message: response.message || '创建质量成本记录失败',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      apiLogger.error('创建质量成本记录失败:', error);
      addNotification({
        title: '错误',
        message: '创建质量成本记录时发生错误',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      cost_type: 'prevention',
      cost_category: '',
      amount: '',
      currency: 'CNY',
      occurrence_date: '',
      department: '',
      related_order_no: '',
      description: '',
      responsible_person: '',
    });
  };

  const getCostTypeBadge = (type?: string) => {
    const typeMap: Record<string, { bg: string; color: string; label: string }> = {
      prevention: { bg: 'primary.light', color: 'primary.dark', label: '预防成本' },
      appraisal: { bg: 'warning.light', color: 'warning.dark', label: '鉴定成本' },
      internal_failure: { bg: 'error.light', color: 'error.dark', label: '内部损失' },
      external_failure: { bg: 'secondary.light', color: 'secondary.dark', label: '外部损失' },
    };
    const item = typeMap[type || ''] || {
      bg: 'grey.100',
      color: 'text.secondary',
      label: type || '-',
    };
    return (
      <Chip
        label={item.label}
        size='small'
        sx={{ backgroundColor: item.bg, color: item.color }}
      />
    );
  };

  const getStatusBadge = (status?: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: 'grey.100', color: 'text.secondary', label: '待审核' },
      approved: { bg: 'primary.light', color: 'primary.dark', label: '已审核' },
      rejected: { bg: 'error.light', color: 'error.dark', label: '已驳回' },
      closed: { bg: 'success.lighter', color: 'success.dark', label: '已关闭' },
    };
    const item = statusMap[status || ''] || {
      bg: 'grey.100',
      color: 'text.secondary',
      label: status || '-',
    };
    return (
      <Chip
        label={item.label}
        size='small'
        sx={{ backgroundColor: item.bg, color: item.color }}
      />
    );
  };

  const columns: ColumnDef<QualityCost>[] = [
    {
      id: 'costNo',
      label: '成本编号',
      render: (row) => (
        <Typography sx={{ fontWeight: 600, color: 'primary.dark' }}>{row.costNo}</Typography>
      ),
    },
    {
      id: 'costType',
      label: '成本类型',
      render: (row) => getCostTypeBadge(row.costType),
    },
    {
      id: 'costCategory',
      label: '成本类别',
      render: (row) => row.costCategory || '-',
    },
    {
      id: 'amount',
      label: '金额',
      render: (row) => (
        <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>
          {row.currency || '¥'}
          {row.amount?.toLocaleString() || '0'}
        </Typography>
      ),
    },
    {
      id: 'department',
      label: '部门',
      render: (row) => row.department || '-',
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'occurrenceDate',
      label: '发生日期',
      render: (row) =>
        row.occurrenceDate ? new Date(row.occurrenceDate).toLocaleDateString('zh-CN') : '-',
    },
    {
      id: 'actions',
      label: '操作',
      render: (row) => (
        <Button
          variant='text'
          size='small'
          onClick={() => {
            setSelectedCost(row);
            setShowDetailModal(true);
          }}
          startIcon={
            <Box
              component={Eye}
              sx={{ fontSize: 16 }}
            />
          }
        >
          查看
        </Button>
      ),
    },
  ];

  const filteredCosts = costs.filter((cost) => {
    if (filterData.cost_type && cost.costType !== filterData.cost_type) return false;
    if (filterData.department && cost.department !== filterData.department) return false;
    return true;
  });

  const stats = {
    total: statistics?.totalCost || 0,
    prevention: statistics?.preventionCost || 0,
    appraisal: statistics?.appraisalCost || 0,
    internal: statistics?.internalFailureCost || 0,
    external: statistics?.externalFailureCost || 0,
  };

  const costTypeColumns: ColumnDef<{ name: string; value: number; percentage: number }>[] = [
    { id: 'name', label: '成本类型' },
    {
      id: 'value',
      label: '金额',
      render: (row) => `¥${row.value.toLocaleString()}`,
    },
    {
      id: 'percentage',
      label: '占比',
      render: (row) => (
        <Box sx={{ width: 100 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {row.percentage.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant='determinate'
            value={row.percentage}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      ),
    },
  ];

  const costTypeData = [
    {
      name: '预防成本',
      value: stats.prevention,
      percentage: stats.total ? (stats.prevention / stats.total) * 100 : 0,
    },
    {
      name: '鉴定成本',
      value: stats.appraisal,
      percentage: stats.total ? (stats.appraisal / stats.total) * 100 : 0,
    },
    {
      name: '内部损失',
      value: stats.internal,
      percentage: stats.total ? (stats.internal / stats.total) * 100 : 0,
    },
    {
      name: '外部损失',
      value: stats.external,
      percentage: stats.total ? (stats.external / stats.total) * 100 : 0,
    },
  ];

  return (
    <PageContainer
      title='质量成本分析'
      subtitle='Quality Cost Analysis'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        backButton={{
          href: QMS_PATHS.root,
          onClick: () => navigate(QMS_PATHS.root),
        }}
        columns={columns}
        data={filteredCosts}
        loading={loading}
        actions={[
          {
            label: '添加记录',
            icon: <Plus sx={{ width: 16, height: 16, mr: 1 }} />,
            onClick: () => setShowAddModal(true),
            variant: 'contained',
          },
        ]}
        headerContent={
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(5, 1fr)',
              },
              gap: 3,
              mb: 4,
            }}
          >
            <Card
              sx={{
                background: 'linear-gradient(135deg, primary.main 0%, primary.dark 100%)',
                color: 'white',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography sx={{ color: 'info.light', fontSize: '0.875rem' }}>
                      总质量成本
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    >
                      ¥{stats.total.toLocaleString()}
                    </Typography>
                  </Box>
                  <DollarSign sx={{ width: 40, height: 40, color: 'info.light' }} />
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
                color: 'white',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography sx={{ color: 'success.light', fontSize: '0.875rem' }}>
                      预防成本
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    >
                      ¥{stats.prevention.toLocaleString()}
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ width: 40, height: 40, color: 'success.light' }} />
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
                color: 'white',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography sx={{ color: 'primary.light', fontSize: '0.875rem' }}>
                      鉴定成本
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    >
                      ¥{stats.appraisal.toLocaleString()}
                    </Typography>
                  </Box>
                  <BarChart3 sx={{ width: 40, height: 40, color: 'primary.light' }} />
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
                color: 'white',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography sx={{ color: 'warning.light', fontSize: '0.875rem' }}>
                      内部损失
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    >
                      ¥{stats.internal.toLocaleString()}
                    </Typography>
                  </Box>
                  <TrendingDown sx={{ width: 40, height: 40, color: 'warning.light' }} />
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error[600]} 100%)`,
                color: 'white',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography sx={{ color: 'error.light', fontSize: '0.875rem' }}>
                      外部损失
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    >
                      ¥{stats.external.toLocaleString()}
                    </Typography>
                  </Box>
                  <AlertTriangle sx={{ width: 40, height: 40, color: 'error.light' }} />
                </Box>
              </CardContent>
            </Card>
          </Box>
        }
        filters={[
          {
            id: 'cost_type',
            label: '成本类型',
            type: 'select' as const,
            options: [
              { value: '', label: '全部' },
              { value: 'prevention', label: '预防成本' },
              { value: 'appraisal', label: '鉴定成本' },
              { value: 'internal_failure', label: '内部损失' },
              { value: 'external_failure', label: '外部损失' },
            ],
          },
          { id: 'department', label: '部门', type: 'text' as const, placeholder: '输入部门名称' },
        ]}
        filtersValue={filterData}
        onFilterChange={(filters) => setFilterData(filters as typeof filterData)}
        emptyMessage='暂无质量成本记录'
        onRefresh={loadCosts}
      />

      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>添加质量成本记录</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl
                fullWidth
                size='small'
              >
                <InputLabel>成本类型 *</InputLabel>
                <Select
                  value={formData.cost_type}
                  label='成本类型 *'
                  onChange={(e) => setFormData((prev) => ({ ...prev, cost_type: e.target.value }))}
                >
                  <MenuItem value='prevention'>预防成本</MenuItem>
                  <MenuItem value='appraisal'>鉴定成本</MenuItem>
                  <MenuItem value='internal_failure'>内部损失</MenuItem>
                  <MenuItem value='external_failure'>外部损失</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size='small'
                fullWidth
                label='成本类别'
                value={formData.cost_category}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cost_category: e.target.value }))
                }
                placeholder='如：培训费、检测费'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                size='small'
                fullWidth
                label='金额 *'
                type='number'
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder='请输入金额'
              />
              <FormControl
                fullWidth
                size='small'
              >
                <InputLabel>币种</InputLabel>
                <Select
                  value={formData.currency}
                  label='币种'
                  onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                >
                  <MenuItem value='CNY'>人民币 (CNY)</MenuItem>
                  <MenuItem value='USD'>美元 (USD)</MenuItem>
                  <MenuItem value='EUR'>欧元 (EUR)</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                type='date'
                size='small'
                fullWidth
                label='发生日期'
                slotProps={{ inputLabel: { shrink: true } } as any}
                value={formData.occurrence_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, occurrence_date: e.target.value }))
                }
              />
              <TextField
                size='small'
                fullWidth
                label='部门'
                value={formData.department}
                onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                placeholder='请输入部门名称'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                size='small'
                fullWidth
                label='关联订单号'
                value={formData.related_order_no}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, related_order_no: e.target.value }))
                }
                placeholder='请输入关联订单号'
              />
              <TextField
                size='small'
                fullWidth
                label='负责人'
                value={formData.responsible_person}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, responsible_person: e.target.value }))
                }
                placeholder='请输入负责人姓名'
              />
            </Box>
            <Box>
              <TextField
                multiline
                rows={3}
                fullWidth
                label='描述'
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder='请描述成本的具体情况...'
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowAddModal(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleCreateCost}
            disabled={submitting || !formData.amount || !formData.cost_category}
          >
            {submitting ? '创建中...' : '创建记录'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            component={PieChart}
            sx={{ fontSize: 24, color: 'primary.dark' }}
          />
          质量成本详情
        </DialogTitle>
        <DialogContent>
          {selectedCost && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'primary.dark' }}
                  >
                    成本编号
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600, color: 'primary.dark', mt: 0.5 }}
                  >
                    {selectedCost.costNo}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'warning.dark' }}
                  >
                    成本类型
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getCostTypeBadge(selectedCost.costType)}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'success.dark' }}
                  >
                    金额
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600, color: 'success.dark', mt: 0.5 }}
                  >
                    {selectedCost.currency || '¥'}
                    {selectedCost.amount?.toLocaleString() || '0'}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'secondary.dark' }}
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedCost.status)}</Box>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    成本类别
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ mt: 0.5, color: 'text.primary' }}
                  >
                    {selectedCost.costCategory || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    部门
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ mt: 0.5 }}
                  >
                    {selectedCost.department || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    关联订单号
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ mt: 0.5 }}
                  >
                    {selectedCost.relatedOrderNo || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    负责人
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ mt: 0.5 }}
                  >
                    {selectedCost.responsiblePerson || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    发生日期
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Box
                      component={Calendar}
                      sx={{ fontSize: 16 }}
                    />
                    <Typography
                      variant='body1'
                      sx={{ color: 'text.primary' }}
                    >
                      {selectedCost.occurrenceDate
                        ? new Date(selectedCost.occurrenceDate).toLocaleDateString('zh-CN')
                        : '-'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {selectedCost.description && (
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    描述
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ mt: 1 }}
                  >
                    {selectedCost.description}
                  </Typography>
                </Box>
              )}

              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={detailTab}
                  onChange={(_, newValue) => setDetailTab(newValue)}
                >
                  <Tab label='成本构成分析' />
                  <Tab label='趋势分析' />
                </Tabs>
              </Box>

              {detailTab === 0 && (
                <Box>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500, mb: 2 }}
                  >
                    成本构成
                  </Typography>
                  <ListPageTemplate
                    columns={costTypeColumns}
                    data={costTypeData}
                    loading={false}
                    pagination={{
                      page: 0,
                      pageSize: 10,
                      total: costTypeData.length,
                      onPageChange: () => {},
                    }}
                  />
                </Box>
              )}

              {detailTab === 1 && (
                <Box>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500, mb: 2 }}
                  >
                    趋势分析
                  </Typography>
                  <Box sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      趋势数据加载中...
                    </Typography>
                    {trendData.length > 0 ? (
                      <Box sx={{ mt: 2 }}>
                        {trendData.slice(0, 6).map((item, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              py: 1,
                              borderBottom: index < 5 ? '1px solid' : 'none',
                              borderColor: 'divider',
                            }}
                          >
                            <Typography variant='body2'>{item.date}</Typography>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500 }}
                            >
                              ¥{item.totalCost.toLocaleString()}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography
                        variant='body2'
                        sx={{ mt: 1, color: 'text.secondary' }}
                      >
                        暂无趋势数据
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowDetailModal(false)}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default QmsQualityCostPage;
