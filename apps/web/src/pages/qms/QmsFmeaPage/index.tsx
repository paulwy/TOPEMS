import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { designTokens } from '@/theme/tokens';
import {
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  TriangleAlert,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useNotificationStore } from '@/store';
import * as z from 'zod';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { fmeaApi } from '@/api/qms';
import type { FmeaAnalysis, FmeaItem, FmeaStatistics } from '@/api/qms';
import { getStatusBadge, getRpnRiskLevel, getSeverityLabel } from './utils';
import StatsCards from './components/StatsCards';
import AnalysisFormModal, { type AnalysisFormData } from './components/AnalysisFormModal';
import DetailModal from './components/DetailModal';
import ItemFormModal, { type ItemFormData } from './components/ItemFormModal';

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

  const [formData, setFormData] = useState<AnalysisFormData>({
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

  const [itemFormData, setItemFormData] = useState<ItemFormData>({
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
      <StatsCards
        totalAnalyses={stats.totalAnalyses}
        activeAnalyses={stats.activeAnalyses}
        highRiskItems={stats.highRiskItems}
        avgRpn={stats.avgRpn}
      />

      <Card>
        <CardContent sx={{ p: 0 }}>
          <ListPageTemplate
            columns={columns}
            data={filteredAnalyses}
            loading={loading}
            getRowId={(row: FmeaAnalysis) => row.id}
            rowActions={rowActions as unknown as RowAction<FmeaAnalysis>[]}
            searchable={false}
            filters={[]}
            actions={[]}
            onRefresh={loadAnalyses}
          />
        </CardContent>
      </Card>

      {/* 创建/编辑 FMEA 对话框 */}
      <AnalysisFormModal
        open={showModal}
        isEditing={isEditing}
        formData={formData}
        errors={errors}
        submitting={submitting}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        onFormDataChange={setFormData}
        onFieldErrorClear={(field) => setErrors((prev) => ({ ...prev, [field]: '' }))}
      />

      {/* 详情对话框 */}
      <DetailModal
        open={showDetailModal}
        selectedAnalysis={selectedAnalysis}
        activeTab={activeTab}
        fmeaItems={fmeaItems}
        statistics={statistics}
        loadingItems={loadingItems}
        onClose={() => setShowDetailModal(false)}
        onTabChange={setActiveTab}
        onViewItem={viewItem}
        onEditItem={editItem}
        onAddItem={openAddItem}
      />

      {/* 添加/编辑 FMEA 项目对话框 */}
      <ItemFormModal
        open={showItemModal}
        isEditing={isEditingItem}
        formData={itemFormData}
        errors={itemErrors}
        submitting={submitting}
        onClose={() => setShowItemModal(false)}
        onSubmit={handleItemSubmit}
        onFormDataChange={setItemFormData}
        onFieldErrorClear={(field) => setItemErrors((prev) => ({ ...prev, [field]: '' }))}
      />
    </PageContainer>
  );
};

export default QmsFmeaPage;
