import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Settings,
  Download,
  BarChart3,
} from 'lucide-react';
import { useAppStore } from '@/store';
import * as z from 'zod';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { spcApi, qmsApi } from '@/api/qms';
import type { SpcChart, SpcDataPoint, ControlLimitsResult } from '@/api/qms';
import { designTokens } from '@/theme/tokens';
const ct = designTokens.colors;

const QmsSpcPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDataPointModal, setShowDataPointModal] = useState(false);
  const [selectedChart, setSelectedChart] = useState<SpcChart | null>(null);
  const [selectedDataPoint, setSelectedDataPoint] = useState<SpcDataPoint | null>(null);
  const [dataPoints, setDataPoints] = useState<SpcDataPoint[]>([]);
  const [controlLimits, setControlLimits] = useState<ControlLimitsResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDataPoints, setLoadingDataPoints] = useState(false);
  const addNotification = useAppStore((state) => state.addNotification);

  const [charts, setCharts] = useState<SpcChart[]>([]);

  const [formData, setFormData] = useState({
    chartName: '',
    chartType: 'xbar',
    characteristic: '',
    productName: '',
    processName: '',
    unit: '',
    usl: '',
    lsl: '',
    target: '',
    sampleSize: '5',
    samplingFrequency: '',
    description: '',
  });

  const [dataPointForm, setDataPointForm] = useState({
    sampleNo: '',
    values: '',
    operator: '',
    remark: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const spcChartSchema = z.object({
    chartName: z.string().min(2, '图表名称至少需要2个字符').max(100, '图表名称不能超过100个字符'),
    chartType: z.string(),
    characteristic: z.string().min(1, '请输入特性名称'),
    usl: z.string().optional(),
    lsl: z.string().optional(),
    target: z.string().optional(),
    sampleSize: z.string().min(1, '请输入样本大小'),
  });

  const validateForm = (data: typeof formData) => {
    const result = spcChartSchema.safeParse(data);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        newErrors[field] = issue.message;
      });
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const loadCharts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await qmsApi.listSpcCharts();
      if (response.success && response.data) {
        setCharts(response.data);
      }
    } catch (error: unknown) {
      addNotification({
        title: '加载失败',
        message: '加载 SPC 图表数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const loadDataPoints = useCallback(
    async (chartId: string) => {
      try {
        setLoadingDataPoints(true);
        const [dataPointsRes, controlLimitsRes] = await Promise.all([
          qmsApi.getSpcDataPoints(chartId),
          qmsApi.calculateControlLimits(chartId),
        ]);
        if (dataPointsRes.success && dataPointsRes.data) {
          setDataPoints(dataPointsRes.data);
        }
        if (controlLimitsRes.success && controlLimitsRes.data) {
          setControlLimits(controlLimitsRes.data);
        }
      } catch (error: unknown) {
        addNotification({
          title: '加载失败',
          message: '加载数据点失败',
          type: 'error',
        });
      } finally {
        setLoadingDataPoints(false);
      }
    },
    [addNotification]
  );

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      active: { bg: 'success.lighter', color: 'success.dark' },
      启用: { bg: 'success.lighter', color: 'success.dark' },
      inactive: { bg: 'grey.100', color: 'text.secondary' },
      停用: { bg: 'grey.100', color: 'text.secondary' },
      warning: { bg: 'warning.light', color: 'warning.dark' },
      预警: { bg: 'warning.light', color: 'warning.dark' },
    };
    const labels: Record<string, string> = {
      active: '启用',
      启用: '启用',
      inactive: '停用',
      停用: '停用',
      warning: '预警',
      预警: '预警',
    };
    const colorKey = status as keyof typeof colors;
    return (
      <Chip
        label={labels[colorKey] || status}
        size='small'
        sx={{
          backgroundColor: colors[colorKey]?.bg || 'grey.100',
          color: colors[colorKey]?.color || 'text.secondary',
        }}
      />
    );
  };

  const getChartTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      xbar: 'X-bar 控制图',
      xbarR: 'X-bar R 控制图',
      xbarS: 'X-bar S 控制图',
      p: 'P 控制图',
      np: 'np 控制图',
      c: 'c 控制图',
      u: 'u 控制图',
    };
    return labels[type] || type;
  };

  const columns: ColumnDef<SpcChart>[] = [
    { id: 'chartNo', label: '图表编号' },
    { id: 'chartName', label: '图表名称' },
    { id: 'chartType', label: '图表类型', render: (row) => getChartTypeLabel(row.chartType) },
    { id: 'characteristic', label: '特性' },
    { id: 'productName', label: '产品' },
    { id: 'processName', label: '工序' },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'createdAt',
      label: '创建日期',
      render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString('zh-CN') : '-'),
    },
  ];

  const rowActions: RowAction<SpcChart>[] = [
    {
      label: '查看详情',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => viewChart(row),
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => editChart(row),
    },
    {
      label: '添加数据',
      icon: <Plus style={{ width: 16, height: 16 }} />,
      onClick: (row) => openAddDataPoint(row),
    },
    {
      label: '删除',
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      color: 'error',
      onClick: (row) => deleteChart(row.id),
    },
  ];

  const viewChart = async (chart: SpcChart) => {
    setSelectedChart(chart);
    setShowDetailModal(true);
    await loadDataPoints(chart.id);
  };

  const editChart = (chart: SpcChart) => {
    setSelectedChart(chart);
    setIsEditing(true);
    setFormData({
      chartName: chart.chartName,
      chartType: chart.chartType,
      characteristic: chart.characteristic,
      productName: chart.productName || '',
      processName: chart.processName || '',
      unit: chart.unit || '',
      usl: chart.usl?.toString() || '',
      lsl: chart.lsl?.toString() || '',
      target: chart.target?.toString() || '',
      sampleSize: chart.sampleSize?.toString() || '5',
      samplingFrequency: chart.samplingFrequency || '',
      description: chart.description || '',
    });
    setShowModal(true);
  };

  const openAddDataPoint = (chart: SpcChart) => {
    setSelectedChart(chart);
    setDataPointForm({
      sampleNo: '',
      values: '',
      operator: '',
      remark: '',
    });
    setShowDataPointModal(true);
  };

  const deleteChart = async (id: string) => {
    if (!confirm('确定要删除此 SPC 图表吗？')) return;
    try {
      const response = await qmsApi.deleteSpcChart(id);
      if (response.success) {
        setCharts((prev) => prev.filter((item) => item.id !== id));
        addNotification({ title: '成功', message: '图表删除成功', type: 'success' });
      } else {
        addNotification({ title: '失败', message: response.message || '删除失败', type: 'error' });
      }
    } catch (error: unknown) {
      addNotification({ title: '错误', message: '删除图表时发生错误', type: 'error' });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm(formData)) {
      return;
    }
    setSubmitting(true);
    try {
      const submitData = {
        chartNo: isEditing && selectedChart ? selectedChart.chartNo : `SPC-${Date.now()}`,
        chartName: formData.chartName,
        chartType: formData.chartType,
        characteristic: formData.characteristic,
        productName: formData.productName || undefined,
        processName: formData.processName || undefined,
        unit: formData.unit || undefined,
        usl: formData.usl ? parseFloat(formData.usl) : undefined,
        lsl: formData.lsl ? parseFloat(formData.lsl) : undefined,
        target: formData.target ? parseFloat(formData.target) : undefined,
        sampleSize: parseInt(formData.sampleSize) || 5,
        samplingFrequency: formData.samplingFrequency || undefined,
        description: formData.description || undefined,
      };

      if (isEditing && selectedChart) {
        const response = await qmsApi.updateSpcChart(selectedChart.id, submitData);
        if (response.success) {
          setCharts((prev) =>
            prev.map((item) =>
              item.id === selectedChart.id ? { ...item, ...response.data } : item
            )
          );
          addNotification({ title: '成功', message: '图表更新成功', type: 'success' });
        } else {
          addNotification({
            title: '失败',
            message: response.message || '更新失败',
            type: 'error',
          });
        }
      } else {
        const response = await qmsApi.createSpcChart(submitData);
        if (response.success && response.data) {
          setCharts((prev) => [response.data!, ...prev]);
          addNotification({ title: '成功', message: '图表创建成功', type: 'success' });
        } else {
          addNotification({
            title: '失败',
            message: response.message || '创建失败',
            type: 'error',
          });
        }
      }
      setShowModal(false);
      setIsEditing(false);
      setFormData({
        chartName: '',
        chartType: 'xbar',
        characteristic: '',
        productName: '',
        processName: '',
        unit: '',
        usl: '',
        lsl: '',
        target: '',
        sampleSize: '5',
        samplingFrequency: '',
        description: '',
      });
      setErrors({});
    } catch (error: unknown) {
      addNotification({ title: '错误', message: '操作失败，请重试', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDataPoint = async () => {
    if (!selectedChart || !dataPointForm.sampleNo || !dataPointForm.values) {
      addNotification({ title: '错误', message: '请填写必填字段', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const valuesArray = dataPointForm.values
        .split(',')
        .map((v) => parseFloat(v.trim()))
        .filter((v) => !isNaN(v));
      if (valuesArray.length === 0) {
        addNotification({ title: '错误', message: '请输入有效的数值', type: 'error' });
        return;
      }
      const response = await qmsApi.addSpcDataPoint(selectedChart.id, {
        sampleNo: dataPointForm.sampleNo,
        sampleTime: new Date().toISOString(),
        values: valuesArray,
        operator: dataPointForm.operator || undefined,
        remark: dataPointForm.remark || undefined,
      });
      if (response.success && response.data) {
        setDataPoints((prev) => [...prev, response.data!]);
        addNotification({ title: '成功', message: '数据点添加成功', type: 'success' });
        setShowDataPointModal(false);
        setDataPointForm({ sampleNo: '', values: '', operator: '', remark: '' });
        // 重新计算控制限
        await loadDataPoints(selectedChart.id);
      } else {
        addNotification({ title: '失败', message: response.message || '添加失败', type: 'error' });
      }
    } catch (error: unknown) {
      addNotification({ title: '错误', message: '操作失败，请重试', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCharts = useMemo(() => {
    return charts.filter(
      (item) =>
        item.chartName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.chartNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.characteristic.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [charts, searchTerm]);

  const stats = useMemo(() => {
    return {
      totalCharts: charts.length,
      activeCharts: charts.filter((c) => c.status === 'active' || c.status === '启用').length,
      outOfControl: dataPoints.filter((d) => d.isOutOfControl).length,
      totalDataPoints: dataPoints.length,
    };
  }, [charts, dataPoints]);

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, 1fr)',
          md: 'repeat(4, 1fr)',
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
                bgcolor: 'primary.light',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BarChart3 sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                SPC 图表总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.totalCharts}
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
                启用图表
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.activeCharts}
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
                bgcolor: 'error.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle sx={{ width: 20, height: 20, color: 'error.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                失控点数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.outOfControl}
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
              <Activity sx={{ width: 20, height: 20, color: 'warning.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                数据点总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.totalDataPoints}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <PageContainer
      title='SPC 统计过程控制'
      subtitle='Statistical Process Control'
      headerProps={{
        pageIcon: <Activity style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main}, ${ct.success.dark})`,
        search: {
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: '搜索图表编号、名称或特性...',
        },
        actions: [
          {
            label: '新建图表',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            variant: 'contained' as const,
            color: 'primary' as const,
            onClick: () => {
              setIsEditing(false);
              setFormData({
                chartName: '',
                chartType: 'xbar',
                characteristic: '',
                productName: '',
                processName: '',
                unit: '',
                usl: '',
                lsl: '',
                target: '',
                sampleSize: '5',
                samplingFrequency: '',
                description: '',
              });
              setShowModal(true);
            },
          },
        ],
      }}
      maxWidth='xl'
    >
      {statsCards}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <ListPageTemplate
            columns={columns}
            data={filteredCharts as any[]}
            loading={loading}
            getRowId={(row: SpcChart) => row.id}
            rowActions={rowActions as any}
            searchable={false}
            filters={[]}
            actions={[]}
            onRefresh={loadCharts}
          />
        </CardContent>
      </Card>

      {/* 创建/编辑图表对话框 */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑 SPC 图表' : '新建 SPC 图表'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  图表名称 *
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.chartName}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, chartName: e.target.value }));
                    if (errors.chartName) setErrors((prev) => ({ ...prev, chartName: '' }));
                  }}
                  placeholder='请输入图表名称'
                  error={!!errors.chartName}
                  helperText={errors.chartName}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  图表类型 *
                </Box>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    value={formData.chartType}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, chartType: e.target.value }))
                    }
                  >
                    <MenuItem value='xbar'>X-bar 控制图</MenuItem>
                    <MenuItem value='xbarR'>X-bar R 控制图</MenuItem>
                    <MenuItem value='xbarS'>X-bar S 控制图</MenuItem>
                    <MenuItem value='p'>P 控制图</MenuItem>
                    <MenuItem value='np'>np 控制图</MenuItem>
                    <MenuItem value='c'>c 控制图</MenuItem>
                    <MenuItem value='u'>u 控制图</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  特性名称 *
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.characteristic}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, characteristic: e.target.value }));
                    if (errors.characteristic)
                      setErrors((prev) => ({ ...prev, characteristic: '' }));
                  }}
                  placeholder='如：直径、重量、温度'
                  error={!!errors.characteristic}
                  helperText={errors.characteristic}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  单位
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.unit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                  placeholder='如：mm、kg、°C'
                />
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  规格上限 (USL)
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  type='number'
                  value={formData.usl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, usl: e.target.value }))}
                  placeholder='上限'
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  目标值 (Target)
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  type='number'
                  value={formData.target}
                  onChange={(e) => setFormData((prev) => ({ ...prev, target: e.target.value }))}
                  placeholder='目标'
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  规格下限 (LSL)
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  type='number'
                  value={formData.lsl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lsl: e.target.value }))}
                  placeholder='下限'
                />
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  样本大小 *
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  type='number'
                  value={formData.sampleSize}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, sampleSize: e.target.value }));
                    if (errors.sampleSize) setErrors((prev) => ({ ...prev, sampleSize: '' }));
                  }}
                  placeholder='默认 5'
                  error={!!errors.sampleSize}
                  helperText={errors.sampleSize}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  采样频率
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.samplingFrequency}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, samplingFrequency: e.target.value }))
                  }
                  placeholder='如：每班次、每小时'
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                产品/工序
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.productName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, productName: e.target.value }))
                  }
                  placeholder='产品名称'
                />
                <TextField
                  size='small'
                  fullWidth
                  value={formData.processName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, processName: e.target.value }))
                  }
                  placeholder='工序名称'
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                描述
              </Box>
              <TextField
                size='small'
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder='图表描述...'
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowModal(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '保存中...' : isEditing ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 图表详情对话框 */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>
          {selectedChart?.chartName} - {getChartTypeLabel(selectedChart?.chartType || '')}
        </DialogTitle>
        <DialogContent>
          {selectedChart && (
            <Box sx={{ mt: 1 }}>
              {/* 控制限信息 */}
              {controlLimits && (
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    控制限信息
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                    <Card variant='outlined'>
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          UCL (上控制限)
                        </Typography>
                        <Typography
                          variant='body1'
                          sx={{ fontWeight: 600 }}
                        >
                          {controlLimits.ucl?.toFixed(4)}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card variant='outlined'>
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          CL (中心线)
                        </Typography>
                        <Typography
                          variant='body1'
                          sx={{ fontWeight: 600 }}
                        >
                          {controlLimits.cl?.toFixed(4)}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card variant='outlined'>
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          LCL (下控制限)
                        </Typography>
                        <Typography
                          variant='body1'
                          sx={{ fontWeight: 600 }}
                        >
                          {controlLimits.lcl?.toFixed(4)}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card variant='outlined'>
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          Cpk
                        </Typography>
                        <Typography
                          variant='body1'
                          sx={{ fontWeight: 600 }}
                        >
                          {controlLimits.cpk?.toFixed(4) || '-'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                </Box>
              )}

              {/* 数据点列表 */}
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 1 }}
              >
                数据点列表
              </Typography>
              {loadingDataPoints ? (
                <LinearProgress />
              ) : (
                <TableContainer
                  component={Paper}
                  variant='outlined'
                >
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>样本号</TableCell>
                        <TableCell>采样时间</TableCell>
                        <TableCell align='right'>平均值</TableCell>
                        <TableCell align='right'>极差</TableCell>
                        <TableCell align='right'>标准差</TableCell>
                        <TableCell>状态</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dataPoints.map((point) => (
                        <TableRow
                          key={point.id}
                          sx={{
                            bgcolor: point.isOutOfControl ? 'error.50' : 'inherit',
                          }}
                        >
                          <TableCell>{point.sampleNo}</TableCell>
                          <TableCell>
                            {point.sampleTime
                              ? new Date(point.sampleTime).toLocaleString('zh-CN')
                              : '-'}
                          </TableCell>
                          <TableCell align='right'>{point.mean?.toFixed(4) || '-'}</TableCell>
                          <TableCell align='right'>{point.range?.toFixed(4) || '-'}</TableCell>
                          <TableCell align='right'>{point.stdDev?.toFixed(4) || '-'}</TableCell>
                          <TableCell>
                            {point.isOutOfControl ? (
                              <Chip
                                label='失控'
                                size='small'
                                color='error'
                                sx={{ fontSize: '0.75rem' }}
                              />
                            ) : (
                              <Chip
                                label='受控'
                                size='small'
                                color='success'
                                sx={{ fontSize: '0.75rem' }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {dataPoints.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            align='center'
                            sx={{ py: 4 }}
                          >
                            暂无数据点，请添加数据
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* 失控规则提示 */}
              {dataPoints.some((d) => d.isOutOfControl) && (
                <Alert
                  severity='warning'
                  sx={{ mt: 2 }}
                >
                  检测到 {dataPoints.filter((d) => d.isOutOfControl).length} 个失控点，请检查
                  工艺稳定性并采取纠正措施。
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          <Button
            variant='contained'
            onClick={() => {
              setShowDetailModal(false);
              if (selectedChart) openAddDataPoint(selectedChart);
            }}
          >
            添加数据点
          </Button>
        </DialogActions>
      </Dialog>

      {/* 添加数据点对话框 */}
      <Dialog
        open={showDataPointModal}
        onClose={() => setShowDataPointModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>添加数据点 - {selectedChart?.chartName}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                样本编号 *
              </Box>
              <TextField
                size='small'
                fullWidth
                value={dataPointForm.sampleNo}
                onChange={(e) =>
                  setDataPointForm((prev) => ({ ...prev, sampleNo: e.target.value }))
                }
                placeholder='如：Sample-001'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                测量值 * (逗号分隔多个值)
              </Box>
              <TextField
                size='small'
                fullWidth
                value={dataPointForm.values}
                onChange={(e) => setDataPointForm((prev) => ({ ...prev, values: e.target.value }))}
                placeholder='如：10.2, 10.5, 10.3, 10.4, 10.1'
                helperText='输入逗号分隔的测量值，系统将计算平均值'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                操作员
              </Box>
              <TextField
                size='small'
                fullWidth
                value={dataPointForm.operator}
                onChange={(e) =>
                  setDataPointForm((prev) => ({ ...prev, operator: e.target.value }))
                }
                placeholder='操作员姓名'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                备注
              </Box>
              <TextField
                size='small'
                fullWidth
                multiline
                rows={2}
                value={dataPointForm.remark}
                onChange={(e) => setDataPointForm((prev) => ({ ...prev, remark: e.target.value }))}
                placeholder='备注信息'
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowDataPointModal(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleAddDataPoint}
            disabled={submitting}
          >
            {submitting ? '添加中...' : '添加'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default QmsSpcPage;
