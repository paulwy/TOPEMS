import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { designTokens } from '@/theme/tokens';
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
  Slider,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  TriangleAlert,
  CheckCircle,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { useNotificationStore } from '@/store';
import * as z from 'zod';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { fmeaApi } from '@/api/qms';
import type { FmeaAnalysis, FmeaItem, FmeaStatistics } from '@/api/qms';

const ct = designTokens.colors;

const QmsFmeaPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<FmeaAnalysis | null>(null);
  const [selectedItem, setSelectedItem] = useState<FmeaItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    fmeaName: '',
    fmeaType: 'design',
    productName: '',
    processName: '',
    version: '1.0',
    scope: '',
    teamLeader: '',
    teamMembers: '',
    description: '',
  });

  const [itemFormData, setItemFormData] = useState({
    itemNo: '',
    functionDescription: '',
    failureMode: '',
    failureEffect: '',
    severity: 5,
    failureCause: '',
    occurrence: 5,
    currentControls: '',
    detection: 5,
    recommendedActions: '',
    responsibility: '',
    targetDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  const fmeaSchema = z.object({
    fmeaName: z.string().min(2, 'FMEA名称至少需要2个字符').max(100, 'FMEA名称不能超过100个字符'),
    fmeaType: z.string(),
  });

  const fmeaItemSchema = z.object({
    functionDescription: z.string().min(1, '请输入功能描述'),
    failureMode: z.string().min(1, '请输入失效模式'),
    severity: z.number().min(1).max(10),
    occurrence: z.number().min(1).max(10),
    detection: z.number().min(1).max(10),
  });

  const validateForm = (data: typeof formData) => {
    const result = fmeaSchema.safeParse(data);
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

  const validateItemForm = (data: typeof itemFormData) => {
    const result = fmeaItemSchema.safeParse(data);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        newErrors[field] = issue.message;
      });
      setItemErrors(newErrors);
      return false;
    }
    setItemErrors({});
    return true;
  };

  const loadAnalyses = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['qms-fmea-analyses'] });
  }, [queryClient]);

  const { data: analyses = [], isLoading: loading } = useQuery({
    queryKey: ['qms-fmea-analyses'],
    queryFn: async () => {
      const response = await fmeaApi.listFmeaAnalyses();
      if (response.success && response.data) {
        return response.data as FmeaAnalysis[];
      }
      return [];
    },
  });

  const { data: fmeaItemsData, isLoading: loadingItems } = useQuery({
    queryKey: ['qms-fmea-items', selectedAnalysis?.id],
    queryFn: async () => {
      if (!selectedAnalysis?.id) return { items: [], statistics: null };
      const [itemsRes, statsRes] = await Promise.all([
        fmeaApi.listFmeaItems(selectedAnalysis.id),
        fmeaApi.getFmeaStatistics(selectedAnalysis.id),
      ]);
      return {
        items: itemsRes.success && itemsRes.data ? (itemsRes.data as FmeaItem[]) : [],
        statistics: statsRes.success && statsRes.data ? (statsRes.data as FmeaStatistics) : null,
      };
    },
    enabled: !!selectedAnalysis?.id,
  });

  const fmeaItems = fmeaItemsData?.items || [];
  const statistics = fmeaItemsData?.statistics || null;

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      active: { bg: 'success.lighter', color: 'success.dark' },
      启用: { bg: 'success.lighter', color: 'success.dark' },
      draft: { bg: 'grey.100', color: 'text.secondary' },
      草稿: { bg: 'grey.100', color: 'text.secondary' },
      completed: { bg: 'primary.lighter', color: 'primary.dark' },
      已完成: { bg: 'primary.lighter', color: 'primary.dark' },
      closed: { bg: 'grey.100', color: 'text.secondary' },
      已关闭: { bg: 'grey.100', color: 'text.secondary' },
    };
    const labels: Record<string, string> = {
      active: '进行中',
      启用: '进行中',
      draft: '草稿',
      草稿: '草稿',
      completed: '已完成',
      已完成: '已完成',
      closed: '已关闭',
      已关闭: '已关闭',
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

  const getRpnRiskLevel = (rpn: number) => {
    if (rpn >= 100) return { level: '高', color: 'error' as const, bg: 'error.lighter' };
    if (rpn >= 50) return { level: '中', color: 'warning' as const, bg: 'warning.light' };
    return { level: '低', color: 'success' as const, bg: 'success.lighter' };
  };

  const getSeverityLabel = (value: number) => {
    if (value >= 8) return '严重';
    if (value >= 5) return '中等';
    return '轻微';
  };

  const columns: ColumnDef<FmeaAnalysis>[] = [
    { id: 'fmeaNo', label: 'FMEA 编号' },
    { id: 'fmeaName', label: 'FMEA 名称' },
    {
      id: 'fmeaType',
      label: '类型',
      render: (row) => (row.fmeaType === 'design' ? '设计 FMEA' : '过程 FMEA'),
    },
    { id: 'productName', label: '产品' },
    { id: 'processName', label: '工序' },
    { id: 'version', label: '版本' },
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

  const itemColumns: ColumnDef<FmeaItem>[] = [
    { id: 'itemNo', label: '项号' },
    { id: 'functionDescription', label: '功能' },
    { id: 'failureMode', label: '失效模式' },
    { id: 'failureEffect', label: '失效影响' },
    {
      id: 'severity',
      label: '严重度 (S)',
      render: (row) => (
        <Chip
          label={`${row.severity} - ${getSeverityLabel(row.severity)}`}
          size='small'
          color={row.severity >= 8 ? 'error' : row.severity >= 5 ? 'warning' : 'success'}
          sx={{ fontSize: '0.75rem' }}
        />
      ),
    },
    {
      id: 'occurrence',
      label: '发生度 (O)',
      render: (row) => (
        <Chip
          label={row.occurrence}
          size='small'
          color={row.occurrence >= 8 ? 'error' : row.occurrence >= 5 ? 'warning' : 'success'}
          sx={{ fontSize: '0.75rem' }}
        />
      ),
    },
    {
      id: 'detection',
      label: '探测度 (D)',
      render: (row) => (
        <Chip
          label={row.detection}
          size='small'
          color={row.detection >= 8 ? 'error' : row.detection >= 5 ? 'warning' : 'success'}
          sx={{ fontSize: '0.75rem' }}
        />
      ),
    },
    {
      id: 'rpn',
      label: 'RPN',
      render: (row) => {
        const risk = getRpnRiskLevel(row.rpn);
        return (
          <Chip
            label={row.rpn}
            size='small'
            color={risk.color}
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        );
      },
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
  ];

  const rowActions: RowAction<FmeaAnalysis>[] = [
    {
      label: '查看详情',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => viewAnalysis(row),
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => editAnalysis(row),
    },
    {
      label: '删除',
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      color: 'error',
      onClick: (row) => deleteAnalysis(row.id),
    },
  ];

  const itemRowActions: RowAction<FmeaItem>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => viewItem(row),
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => editItem(row),
    },
    {
      label: '删除',
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      color: 'error',
      onClick: (row) => deleteItem(row.id),
    },
  ];

  const deleteAnalysisMutation = useMutation({
    mutationFn: (id: string) => fmeaApi.deleteFmeaAnalysis(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qms-fmea-analyses'] });
      addNotification({ title: '成功', message: 'FMEA 分析删除成功', type: 'success' });
    },
    onError: () => {
      addNotification({ title: '错误', message: '删除时发生错误', type: 'error' });
    },
  });

  const createAnalysisMutation = useMutation({
    mutationFn: (data: Parameters<typeof fmeaApi.createFmeaAnalysis>[0]) =>
      fmeaApi.createFmeaAnalysis(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qms-fmea-analyses'] });
      addNotification({ title: '成功', message: 'FMEA 分析创建成功', type: 'success' });
    },
    onError: () => {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
    },
  });

  const updateAnalysisMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof fmeaApi.updateFmeaAnalysis>[1];
    }) => fmeaApi.updateFmeaAnalysis(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qms-fmea-analyses'] });
      addNotification({ title: '成功', message: 'FMEA 分析更新成功', type: 'success' });
    },
    onError: () => {
      addNotification({ title: '错误', message: '更新失败', type: 'error' });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => fmeaApi.deleteFmeaItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qms-fmea-items'] });
      addNotification({ title: '成功', message: 'FMEA 项目删除成功', type: 'success' });
    },
    onError: () => {
      addNotification({ title: '错误', message: '删除时发生错误', type: 'error' });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (data: Parameters<typeof fmeaApi.createFmeaItem>[0]) =>
      fmeaApi.createFmeaItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qms-fmea-items'] });
      addNotification({ title: '成功', message: 'FMEA 项目创建成功', type: 'success' });
    },
    onError: () => {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof fmeaApi.updateFmeaItem>[1];
    }) => fmeaApi.updateFmeaItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qms-fmea-items'] });
      addNotification({ title: '成功', message: 'FMEA 项目更新成功', type: 'success' });
    },
    onError: () => {
      addNotification({ title: '错误', message: '更新失败', type: 'error' });
    },
  });

  const viewAnalysis = (analysis: FmeaAnalysis) => {
    setSelectedAnalysis(analysis);
    setShowDetailModal(true);
  };

  const editAnalysis = (analysis: FmeaAnalysis) => {
    setSelectedAnalysis(analysis);
    setIsEditing(true);
    setFormData({
      fmeaName: analysis.fmeaName,
      fmeaType: analysis.fmeaType,
      productName: analysis.productName || '',
      processName: analysis.processName || '',
      version: analysis.version || '1.0',
      scope: analysis.scope || '',
      teamLeader: analysis.teamLeader || '',
      teamMembers: analysis.teamMembers?.join(', ') || '',
      description: analysis.description || '',
    });
    setShowModal(true);
  };

  const deleteAnalysis = (id: string) => {
    if (!confirm('确定要删除此 FMEA 分析吗？')) return;
    deleteAnalysisMutation.mutate(id);
  };

  const handleSubmit = async () => {
    if (!validateForm(formData)) {
      return;
    }
    setSubmitting(true);
    try {
      const submitData = {
        fmeaName: formData.fmeaName,
        fmeaType: formData.fmeaType,
        productName: formData.productName || undefined,
        processName: formData.processName || undefined,
        version: formData.version || undefined,
        scope: formData.scope || undefined,
        teamLeader: formData.teamLeader || undefined,
        teamMembers: formData.teamMembers
          ? formData.teamMembers
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        description: formData.description || undefined,
      };

      if (isEditing && selectedAnalysis) {
        await updateAnalysisMutation.mutateAsync({ id: selectedAnalysis.id, data: submitData });
      } else {
        await createAnalysisMutation.mutateAsync({
          ...submitData,
          fmeaNo: `FMEA-${Date.now()}`,
        });
      }
      setShowModal(false);
      setIsEditing(false);
      setFormData({
        fmeaName: '',
        fmeaType: 'design',
        productName: '',
        processName: '',
        version: '1.0',
        scope: '',
        teamLeader: '',
        teamMembers: '',
        description: '',
      });
      setErrors({});
    } catch (error: unknown) {
      addNotification({ title: '错误', message: '操作失败，请重试', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const viewItem = (item: FmeaItem) => {
    setSelectedItem(item);
    setIsEditingItem(false);
    setItemFormData({
      itemNo: item.itemNo,
      functionDescription: item.functionDescription,
      failureMode: item.failureMode,
      failureEffect: item.failureEffect,
      severity: item.severity,
      failureCause: item.failureCause,
      occurrence: item.occurrence,
      currentControls: item.currentControls || '',
      detection: item.detection,
      recommendedActions: item.recommendedActions || '',
      responsibility: item.responsibility || '',
      targetDate: item.targetDate || '',
    });
    setShowItemModal(true);
  };

  const editItem = (item: FmeaItem) => {
    setSelectedItem(item);
    setIsEditingItem(true);
    setItemFormData({
      itemNo: item.itemNo,
      functionDescription: item.functionDescription,
      failureMode: item.failureMode,
      failureEffect: item.failureEffect,
      severity: item.severity,
      failureCause: item.failureCause,
      occurrence: item.occurrence,
      currentControls: item.currentControls || '',
      detection: item.detection,
      recommendedActions: item.recommendedActions || '',
      responsibility: item.responsibility || '',
      targetDate: item.targetDate || '',
    });
    setShowItemModal(true);
  };

  const deleteItem = (id: string) => {
    if (!selectedAnalysis) return;
    if (!confirm('确定要删除此 FMEA 项目吗？')) return;
    deleteItemMutation.mutate(id);
  };

  const handleItemSubmit = async () => {
    if (!validateItemForm(itemFormData)) {
      return;
    }
    if (!selectedAnalysis) return;
    setSubmitting(true);
    try {
      const submitData = {
        itemNo: itemFormData.itemNo || `Item-${fmeaItems.length + 1}`,
        functionDescription: itemFormData.functionDescription,
        failureMode: itemFormData.failureMode,
        failureEffect: itemFormData.failureEffect,
        severity: itemFormData.severity,
        failureCause: itemFormData.failureCause,
        occurrence: itemFormData.occurrence,
        currentControls: itemFormData.currentControls || undefined,
        detection: itemFormData.detection,
        recommendedActions: itemFormData.recommendedActions || undefined,
        responsibility: itemFormData.responsibility || undefined,
        targetDate: itemFormData.targetDate || undefined,
      };

      if (isEditingItem && selectedItem) {
        await updateItemMutation.mutateAsync({ id: selectedItem.id, data: submitData });
      } else {
        await createItemMutation.mutateAsync({
          ...submitData,
          fmeaId: selectedAnalysis.id,
          status: 'open',
        });
      }
      setShowItemModal(false);
      setIsEditingItem(false);
      setItemFormData({
        itemNo: '',
        functionDescription: '',
        failureMode: '',
        failureEffect: '',
        severity: 5,
        failureCause: '',
        occurrence: 5,
        currentControls: '',
        detection: 5,
        recommendedActions: '',
        responsibility: '',
        targetDate: '',
      });
      setItemErrors({});
    } catch (error: unknown) {
      addNotification({ title: '错误', message: '操作失败，请重试', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const openAddItem = () => {
    setSelectedItem(null);
    setIsEditingItem(false);
    setItemFormData({
      itemNo: '',
      functionDescription: '',
      failureMode: '',
      failureEffect: '',
      severity: 5,
      failureCause: '',
      occurrence: 5,
      currentControls: '',
      detection: 5,
      recommendedActions: '',
      responsibility: '',
      targetDate: '',
    });
    setShowItemModal(true);
  };

  const filteredAnalyses = useMemo(() => {
    return analyses.filter(
      (item) =>
        item.fmeaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.fmeaNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [analyses, searchTerm]);

  const stats = useMemo(() => {
    return {
      totalAnalyses: analyses.length,
      activeAnalyses: analyses.filter((a) => a.status === 'active' || a.status === '进行中').length,
      highRiskItems: statistics?.highRiskCount || 0,
      avgRpn: statistics?.averageRpn || 0,
    };
  }, [analyses, statistics]);

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
                bgcolor: 'primary.100',
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
                FMEA 总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.totalAnalyses}
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
                进行中
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.activeAnalyses}
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
              <TriangleAlert sx={{ width: 20, height: 20, color: 'error.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                高风险项
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.highRiskItems}
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
              <TrendingUp sx={{ width: 20, height: 20, color: 'warning.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                平均 RPN
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.avgRpn.toFixed(1)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <PageContainer
      title='FMEA 失效模式分析'
      subtitle='Failure Mode and Effects Analysis'
      headerProps={{
        pageIcon: <TriangleAlert style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main}, ${ct.warning.dark})`,
        search: {
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: '搜索 FMEA 编号或名称...',
        },
        actions: [
          {
            label: '新建 FMEA',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            variant: 'contained' as const,
            color: 'primary' as const,
            onClick: () => {
              setIsEditing(false);
              setFormData({
                fmeaName: '',
                fmeaType: 'design',
                productName: '',
                processName: '',
                version: '1.0',
                scope: '',
                teamLeader: '',
                teamMembers: '',
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
            data={filteredAnalyses as any[]}
            loading={loading}
            getRowId={(row: FmeaAnalysis) => row.id}
            rowActions={rowActions as any}
            searchable={false}
            filters={[]}
            actions={[]}
            onRefresh={loadAnalyses}
          />
        </CardContent>
      </Card>

      {/* 创建/编辑 FMEA 对话框 */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑 FMEA' : '新建 FMEA'}</DialogTitle>
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
                  FMEA 名称 *
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.fmeaName}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, fmeaName: e.target.value }));
                    if (errors.fmeaName) setErrors((prev) => ({ ...prev, fmeaName: '' }));
                  }}
                  placeholder='请输入 FMEA 名称'
                  error={!!errors.fmeaName}
                  helperText={errors.fmeaName}
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
                  类型 *
                </Box>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    value={formData.fmeaType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fmeaType: e.target.value }))}
                  >
                    <MenuItem value='design'>设计 FMEA</MenuItem>
                    <MenuItem value='process'>过程 FMEA</MenuItem>
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
                  产品名称
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.productName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, productName: e.target.value }))
                  }
                  placeholder='产品名称'
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
                  工序名称
                </Box>
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
                  版本
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.version}
                  onChange={(e) => setFormData((prev) => ({ ...prev, version: e.target.value }))}
                  placeholder='1.0'
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
                  团队负责人
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.teamLeader}
                  onChange={(e) => setFormData((prev) => ({ ...prev, teamLeader: e.target.value }))}
                  placeholder='负责人'
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
                团队成员 (逗号分隔)
              </Box>
              <TextField
                size='small'
                fullWidth
                value={formData.teamMembers}
                onChange={(e) => setFormData((prev) => ({ ...prev, teamMembers: e.target.value }))}
                placeholder='成员1, 成员2, ...'
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
                范围描述
              </Box>
              <TextField
                size='small'
                fullWidth
                multiline
                rows={2}
                value={formData.scope}
                onChange={(e) => setFormData((prev) => ({ ...prev, scope: e.target.value }))}
                placeholder='FMEA 分析的范围'
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
                描述
              </Box>
              <TextField
                size='small'
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder='FMEA 描述...'
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

      {/* 详情对话框 */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>
          {selectedAnalysis?.fmeaName}
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {getStatusBadge(selectedAnalysis?.status || '')}
            <Chip
              label={selectedAnalysis?.fmeaType === 'design' ? '设计 FMEA' : '过程 FMEA'}
              size='small'
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAnalysis && (
            <Box sx={{ mt: 1 }}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{ mb: 2 }}
              >
                <Tab label='风险项列表' />
                <Tab label='统计信息' />
              </Tabs>

              {activeTab === 0 && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button
                      variant='contained'
                      size='small'
                      startIcon={<Plus />}
                      onClick={openAddItem}
                    >
                      添加风险项
                    </Button>
                  </Box>
                  {loadingItems ? (
                    <LinearProgress />
                  ) : (
                    <TableContainer
                      component={Paper}
                      variant='outlined'
                    >
                      <Table size='small'>
                        <TableHead>
                          <TableRow>
                            <TableCell>项号</TableCell>
                            <TableCell>功能</TableCell>
                            <TableCell>失效模式</TableCell>
                            <TableCell>失效影响</TableCell>
                            <TableCell align='center'>严重度</TableCell>
                            <TableCell align='center'>发生度</TableCell>
                            <TableCell align='center'>探测度</TableCell>
                            <TableCell align='center'>RPN</TableCell>
                            <TableCell align='center'>操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {fmeaItems.map((item) => {
                            const risk = getRpnRiskLevel(item.rpn);
                            return (
                              <TableRow
                                key={item.id}
                                sx={{
                                  bgcolor:
                                    item.rpn >= 100
                                      ? 'error.50'
                                      : item.rpn >= 50
                                        ? 'warning.light'
                                        : 'inherit',
                                }}
                              >
                                <TableCell>{item.itemNo}</TableCell>
                                <TableCell sx={{ maxWidth: 150 }}>
                                  {item.functionDescription}
                                </TableCell>
                                <TableCell sx={{ maxWidth: 150 }}>{item.failureMode}</TableCell>
                                <TableCell sx={{ maxWidth: 150 }}>{item.failureEffect}</TableCell>
                                <TableCell align='center'>
                                  <Chip
                                    label={item.severity}
                                    size='small'
                                    color={
                                      item.severity >= 8
                                        ? 'error'
                                        : item.severity >= 5
                                          ? 'warning'
                                          : 'success'
                                    }
                                    sx={{ minWidth: 40 }}
                                  />
                                </TableCell>
                                <TableCell align='center'>
                                  <Chip
                                    label={item.occurrence}
                                    size='small'
                                    color={
                                      item.occurrence >= 8
                                        ? 'error'
                                        : item.occurrence >= 5
                                          ? 'warning'
                                          : 'success'
                                    }
                                    sx={{ minWidth: 40 }}
                                  />
                                </TableCell>
                                <TableCell align='center'>
                                  <Chip
                                    label={item.detection}
                                    size='small'
                                    color={
                                      item.detection >= 8
                                        ? 'error'
                                        : item.detection >= 5
                                          ? 'warning'
                                          : 'success'
                                    }
                                    sx={{ minWidth: 40 }}
                                  />
                                </TableCell>
                                <TableCell align='center'>
                                  <Chip
                                    label={item.rpn}
                                    size='small'
                                    color={risk.color}
                                    sx={{ fontWeight: 600, minWidth: 50 }}
                                  />
                                </TableCell>
                                <TableCell align='center'>
                                  <IconButton
                                    size='small'
                                    onClick={() => viewItem(item)}
                                  >
                                    <Eye style={{ width: 16, height: 16 }} />
                                  </IconButton>
                                  <IconButton
                                    size='small'
                                    onClick={() => editItem(item)}
                                  >
                                    <Edit style={{ width: 16, height: 16 }} />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {fmeaItems.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={9}
                                align='center'
                                sx={{ py: 4 }}
                              >
                                暂无风险项，请添加
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}

              {activeTab === 1 && statistics && (
                <Box>
                  <Box
                    sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}
                  >
                    <Card variant='outlined'>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          总项目数
                        </Typography>
                        <Typography
                          variant='h4'
                          sx={{ fontWeight: 600 }}
                        >
                          {statistics.totalItems}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card variant='outlined'>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          高风险 (RPN≥100)
                        </Typography>
                        <Typography
                          variant='h4'
                          sx={{ fontWeight: 600, color: 'error.main' }}
                        >
                          {statistics.highRiskCount}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card variant='outlined'>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          中风险 (50≤RPN{'<100'})
                        </Typography>
                        <Typography
                          variant='h4'
                          sx={{ fontWeight: 600, color: 'warning.main' }}
                        >
                          {statistics.mediumRiskCount}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card variant='outlined'>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          低风险 (RPN{'<50'})
                        </Typography>
                        <Typography
                          variant='h4'
                          sx={{ fontWeight: 600, color: 'success.main' }}
                        >
                          {statistics.lowRiskCount}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Card variant='outlined'>
                      <CardContent>
                        <Typography
                          variant='subtitle2'
                          sx={{ fontWeight: 600, mb: 1 }}
                        >
                          风险指标
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant='body2'>平均 RPN</Typography>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 600 }}
                            >
                              {statistics.averageRpn.toFixed(1)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant='body2'>最大 RPN</Typography>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 600 }}
                            >
                              {statistics.maxRpn}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>

                    {statistics.highRiskCount > 0 && (
                      <Alert severity='error'>
                        有 <strong>{statistics.highRiskCount}</strong> 个高风险项需要优先处理！
                      </Alert>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 添加/编辑 FMEA 项目对话框 */}
      <Dialog
        open={showItemModal}
        onClose={() => setShowItemModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{isEditingItem ? '编辑 FMEA 项目' : '添加 FMEA 项目'}</DialogTitle>
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
                功能描述 *
              </Box>
              <TextField
                size='small'
                fullWidth
                value={itemFormData.functionDescription}
                onChange={(e) => {
                  setItemFormData((prev) => ({ ...prev, functionDescription: e.target.value }));
                  if (itemErrors.functionDescription)
                    setItemErrors((prev) => ({ ...prev, functionDescription: '' }));
                }}
                placeholder='描述预期功能'
                error={!!itemErrors.functionDescription}
                helperText={itemErrors.functionDescription}
              />
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
                  失效模式 *
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={itemFormData.failureMode}
                  onChange={(e) => {
                    setItemFormData((prev) => ({ ...prev, failureMode: e.target.value }));
                    if (itemErrors.failureMode)
                      setItemErrors((prev) => ({ ...prev, failureMode: '' }));
                  }}
                  placeholder='失效模式'
                  error={!!itemErrors.failureMode}
                  helperText={itemErrors.failureMode}
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
                  失效影响
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={itemFormData.failureEffect}
                  onChange={(e) =>
                    setItemFormData((prev) => ({ ...prev, failureEffect: e.target.value }))
                  }
                  placeholder='失效影响'
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
                失效原因
              </Box>
              <TextField
                size='small'
                fullWidth
                value={itemFormData.failureCause}
                onChange={(e) =>
                  setItemFormData((prev) => ({ ...prev, failureCause: e.target.value }))
                }
                placeholder='导致失效的原因'
              />
            </Box>

            {/* S, O, D 评分 */}
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
                  严重度 (S) * 1-10
                </Box>
                <Box sx={{ px: 1 }}>
                  <Slider
                    value={itemFormData.severity}
                    onChange={(_, v) =>
                      setItemFormData((prev) => ({ ...prev, severity: v as number }))
                    }
                    min={1}
                    max={10}
                    marks={[
                      { value: 1, label: '1' },
                      { value: 5, label: '5' },
                      { value: 10, label: '10' },
                    ]}
                    color={
                      itemFormData.severity >= 8
                        ? 'error'
                        : itemFormData.severity >= 5
                          ? 'warning'
                          : 'success'
                    }
                  />
                </Box>
                <Typography
                  align='center'
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {itemFormData.severity} - {getSeverityLabel(itemFormData.severity)}
                </Typography>
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
                  发生度 (O) * 1-10
                </Box>
                <Box sx={{ px: 1 }}>
                  <Slider
                    value={itemFormData.occurrence}
                    onChange={(_, v) =>
                      setItemFormData((prev) => ({ ...prev, occurrence: v as number }))
                    }
                    min={1}
                    max={10}
                    marks={[
                      { value: 1, label: '1' },
                      { value: 5, label: '5' },
                      { value: 10, label: '10' },
                    ]}
                    color={
                      itemFormData.occurrence >= 8
                        ? 'error'
                        : itemFormData.occurrence >= 5
                          ? 'warning'
                          : 'success'
                    }
                  />
                </Box>
                <Typography
                  align='center'
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {itemFormData.occurrence}
                </Typography>
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
                  探测度 (D) * 1-10
                </Box>
                <Box sx={{ px: 1 }}>
                  <Slider
                    value={itemFormData.detection}
                    onChange={(_, v) =>
                      setItemFormData((prev) => ({ ...prev, detection: v as number }))
                    }
                    min={1}
                    max={10}
                    marks={[
                      { value: 1, label: '1' },
                      { value: 5, label: '5' },
                      { value: 10, label: '10' },
                    ]}
                    color={
                      itemFormData.detection >= 8
                        ? 'error'
                        : itemFormData.detection >= 5
                          ? 'warning'
                          : 'success'
                    }
                  />
                </Box>
                <Typography
                  align='center'
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {itemFormData.detection}
                </Typography>
              </Box>
            </Box>

            {/* RPN 预览 */}
            <Alert severity='info'>
              RPN = S × O × D = {itemFormData.severity} × {itemFormData.occurrence} ×{' '}
              {itemFormData.detection} ={' '}
              <strong>
                {itemFormData.severity * itemFormData.occurrence * itemFormData.detection}
              </strong>
              {(() => {
                const rpn =
                  itemFormData.severity * itemFormData.occurrence * itemFormData.detection;
                const risk = getRpnRiskLevel(rpn);
                return (
                  <Chip
                    label={`风险等级: ${risk.level}`}
                    size='small'
                    color={risk.color}
                    sx={{ ml: 1 }}
                  />
                );
              })()}
            </Alert>

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
                当前控制措施
              </Box>
              <TextField
                size='small'
                fullWidth
                value={itemFormData.currentControls}
                onChange={(e) =>
                  setItemFormData((prev) => ({ ...prev, currentControls: e.target.value }))
                }
                placeholder='现有的控制措施'
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
                建议措施
              </Box>
              <TextField
                size='small'
                fullWidth
                multiline
                rows={2}
                value={itemFormData.recommendedActions}
                onChange={(e) =>
                  setItemFormData((prev) => ({ ...prev, recommendedActions: e.target.value }))
                }
                placeholder='降低风险的推荐措施'
              />
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
                  责任人
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={itemFormData.responsibility}
                  onChange={(e) =>
                    setItemFormData((prev) => ({ ...prev, responsibility: e.target.value }))
                  }
                  placeholder='责任人'
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
                  目标日期
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  type='date'
                  value={itemFormData.targetDate}
                  onChange={(e) =>
                    setItemFormData((prev) => ({ ...prev, targetDate: e.target.value }))
                  }
                  slotProps={{ inputLabel: { shrink: true } } as any}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowItemModal(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleItemSubmit}
            disabled={submitting}
          >
            {submitting ? '保存中...' : isEditingItem ? '保存' : '添加'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default QmsFmeaPage;
