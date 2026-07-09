import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertCircle, CheckCircle, FileText, Plus, Edit, Trash2, Eye } from 'lucide-react';
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
} from '@mui/material';
import { useAppStore } from '@/store';
import * as z from 'zod';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { qmsApi } from '@/api/qms';
import type { QualityIssue, AuditPlan } from '@/api/qms';

const ct = designTokens.colors;

const QmsQualityControlPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'nonconformance' | 'audit'>('nonconformance');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QualityIssue | AuditPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    severity: 'medium' as 'high' | 'medium' | 'low',
    category: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const addNotification = useAppStore((state) => state.addNotification);

  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [auditPlans, setAuditPlans] = useState<AuditPlan[]>([]);

  const nonconformanceSchema = z.object({
    title: z.string().min(2, '标题至少需要2个字符').max(100, '标题不能超过100个字符'),
    description: z.string().max(500, '描述不能超过500个字符'),
    severity: z.enum(['high', 'medium', 'low']),
    category: z.string().max(50, '类别不能超过50个字符'),
  });

  const validateForm = (data: typeof formData) => {
    const result = nonconformanceSchema.safeParse(data);
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

  const loadIssues = useCallback(async () => {
    try {
      setLoading(true);
      const response = await qmsApi.listIssues();
      if (response.success && response.data) {
        setIssues(response.data);
      }
    } catch (error: unknown) {
      addNotification({
        title: '加载失败',
        message: '加载不合格品数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const loadAuditPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await qmsApi.listAuditPlans();
      if (response.success && response.data) {
        const plansData = response.data as any;
        const plansArray = Array.isArray(plansData) ? plansData : plansData.plans || [];
        setAuditPlans(plansArray);
      }
    } catch (error: unknown) {
      addNotification({
        title: '加载失败',
        message: '加载审核数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    if (activeTab === 'nonconformance') {
      loadIssues();
    } else {
      loadAuditPlans();
    }
  }, [activeTab, loadIssues, loadAuditPlans]);

  const getSeverityBadge = (severity: string) => {
    const colors = {
      high: { bg: 'error.lighter', color: 'error.dark' },
      critical: { bg: 'error.lighter', color: 'error.dark' },
      严重: { bg: 'error.lighter', color: 'error.dark' },
      medium: { bg: 'warning.100', color: ct.yellow[600] },
      中等: { bg: 'warning.100', color: ct.yellow[600] },
      一般: { bg: 'warning.100', color: ct.yellow[600] },
      low: { bg: 'success.lighter', color: 'success.dark' },
      轻微: { bg: 'success.lighter', color: 'success.dark' },
    };
    const labels = {
      high: '严重',
      critical: '严重',
      严重: '严重',
      medium: '中等',
      中等: '中等',
      一般: '一般',
      low: '轻微',
      轻微: '轻微',
    };
    const colorKey = severity as keyof typeof colors;
    const labelKey = severity as keyof typeof labels;
    return (
      <Chip
        label={labels[labelKey] || severity}
        size='small'
        sx={{
          backgroundColor: colors[colorKey]?.bg || 'grey.100',
          color: colors[colorKey]?.color || 'text.secondary',
        }}
      />
    );
  };

  const getStatusBadge = (status: string, type: string) => {
    if (type === 'audit') {
      const colors: Record<string, { bg: string; color: string }> = {
        scheduled: { bg: 'primary.100', color: 'primary.dark' },
        planning: { bg: 'primary.100', color: 'primary.dark' },
        计划中: { bg: 'primary.100', color: 'primary.dark' },
        in_progress: { bg: 'warning.100', color: ct.yellow[600] },
        进行中: { bg: 'warning.100', color: ct.yellow[600] },
        completed: { bg: 'success.lighter', color: 'success.dark' },
        已完成: { bg: 'success.lighter', color: 'success.dark' },
        已计划: { bg: 'primary.100', color: 'primary.dark' },
      };
      const labels: Record<string, string> = {
        scheduled: '已计划',
        planning: '计划中',
        计划中: '计划中',
        in_progress: '进行中',
        进行中: '进行中',
        completed: '已完成',
        已完成: '已完成',
        已计划: '已计划',
      };
      const colorKey = status as keyof typeof colors;
      return (
        <Chip
          label={labels[status] || status}
          size='small'
          sx={{
            backgroundColor: colors[colorKey]?.bg || 'grey.100',
            color: colors[colorKey]?.color || 'text.secondary',
          }}
        />
      );
    }
    const colors: Record<string, { bg: string; color: string }> = {
      open: { bg: 'error.lighter', color: 'error.dark' },
      待处理: { bg: 'error.lighter', color: 'error.dark' },
      in_progress: { bg: 'warning.100', color: ct.yellow[600] },
      处理中: { bg: 'warning.100', color: ct.yellow[600] },
      closed: { bg: 'success.lighter', color: 'success.dark' },
      resolved: { bg: 'success.lighter', color: 'success.dark' },
      已关闭: { bg: 'success.lighter', color: 'success.dark' },
    };
    const labels: Record<string, string> = {
      open: '待处理',
      待处理: '待处理',
      in_progress: '处理中',
      处理中: '处理中',
      closed: '已关闭',
      resolved: '已关闭',
      已关闭: '已关闭',
    };
    const colorKey = status as keyof typeof colors;
    return (
      <Chip
        label={labels[status] || status}
        size='small'
        sx={{
          backgroundColor: colors[colorKey]?.bg || 'grey.100',
          color: colors[colorKey]?.color || 'text.secondary',
        }}
      />
    );
  };

  const nonconformanceColumns: ColumnDef<QualityIssue>[] = [
    { id: 'issue_no', label: '编号' },
    { id: 'title', label: '问题标题' },
    { id: 'category', label: '类别' },
    {
      id: 'severity',
      label: '严重程度',
      render: (row) => getSeverityBadge(row.severity),
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status, 'nc'),
    },
    { id: 'assignee', label: '负责人' },
    { id: 'created_at', label: '创建日期' },
  ];

  const nonconformanceRowActions: RowAction<QualityIssue>[] = [
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

  const auditColumns: ColumnDef<AuditPlan>[] = [
    { id: 'plan_no', label: '审核编号' },
    { id: 'title', label: '审核标题' },
    { id: 'audit_type', label: '审核类型' },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status, 'audit'),
    },
    { id: 'auditor', label: '审核人' },
    { id: 'start_date', label: '审核日期' },
    { id: 'departments', label: '涉及部门', render: (row) => row.departments?.join(', ') || '-' },
  ];

  const auditRowActions: RowAction<AuditPlan>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => viewItem(row),
    },
  ];

  const viewItem = (item: QualityIssue | AuditPlan) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const editItem = (item: QualityIssue) => {
    setSelectedItem(item);
    setIsEditing(true);
    setShowModal(true);
    setFormData({
      code: item.issue_no,
      title: item.title,
      description: item.description,
      severity: (item.severity as 'high' | 'medium' | 'low') || 'medium',
      category: item.category,
    });
  };

  const deleteItem = async (id: string) => {
    if (!confirm('确定要删除此记录吗？')) return;
    try {
      const response = await qmsApi.deleteIssue(id);
      if (response.success) {
        setIssues((prev) => prev.filter((item) => item.id !== id));
        addNotification({ title: '成功', message: '记录删除成功', type: 'success' });
      } else {
        addNotification({ title: '失败', message: response.message || '删除失败', type: 'error' });
      }
    } catch (error: unknown) {
      addNotification({ title: '错误', message: '删除记录时发生错误', type: 'error' });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm(formData)) {
      return;
    }
    setSubmitting(true);
    try {
      if (isEditing && selectedItem && 'issue_no' in selectedItem) {
        const response = await qmsApi.updateIssue(selectedItem.id, {
          issue_no: formData.code,
          title: formData.title,
          description: formData.description,
          severity: formData.severity,
          category: formData.category,
          status: selectedItem.status,
          assignee: selectedItem.assignee,
        });
        if (response.success) {
          setIssues((prev) =>
            prev.map((item) => (item.id === selectedItem.id ? { ...item, ...response.data } : item))
          );
          addNotification({ title: '成功', message: '记录更新成功', type: 'success' });
        } else {
          addNotification({
            title: '失败',
            message: response.message || '更新失败',
            type: 'error',
          });
        }
      } else {
        const response = await qmsApi.createIssue({
          issue_no: formData.code || `NC-${Date.now()}`,
          title: formData.title,
          description: formData.description,
          severity: formData.severity,
          category: formData.category,
          status: 'open',
          assignee: '',
        });
        if (response.success && response.data) {
          setIssues((prev) => [response.data!, ...prev]);
          addNotification({ title: '成功', message: '记录创建成功', type: 'success' });
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
        code: '',
        title: '',
        description: '',
        severity: 'medium',
        category: '',
      });
      setErrors({});
    } catch (error: unknown) {
      addNotification({ title: '错误', message: '操作失败，请重试', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIssues = useMemo(() => {
    return issues.filter(
      (item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.issue_no.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [issues, searchTerm]);

  const filteredAudits = useMemo(() => {
    return auditPlans.filter(
      (item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.plan_no && item.plan_no.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [auditPlans, searchTerm]);

  const stats = {
    totalNonconformances: issues.length,
    openNonconformances: issues.filter((n) => n.status === 'open' || n.status === '待处理').length,
    closedNonconformances: issues.filter(
      (n) => n.status === 'closed' || n.status === 'resolved' || n.status === '已关闭'
    ).length,
    totalAudits: auditPlans.length,
    completedAudits: auditPlans.filter((a) => a.status === 'completed' || a.status === '已完成')
      .length,
    inProgressAudits: auditPlans.filter((a) => a.status === 'in_progress' || a.status === '进行中')
      .length,
  };

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(6, 1fr)',
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
                {stats.totalNonconformances}
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
                {stats.openNonconformances}
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
                {stats.closedNonconformances}
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
                bgcolor: 'primary.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                审核总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.totalAudits}
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
                bgcolor: 'secondary.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText sx={{ width: 20, height: 20, color: 'secondary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                进行中审核
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.inProgressAudits}
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
                已完成审核
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.completedAudits}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const currentData = activeTab === 'nonconformance' ? filteredIssues : filteredAudits;
  const currentColumns = activeTab === 'nonconformance' ? nonconformanceColumns : auditColumns;
  const currentRowActions =
    activeTab === 'nonconformance' ? nonconformanceRowActions : auditRowActions;

  const headerTabs = [
    {
      label: '不合格品管理',
      value: 'nonconformance',
      active: activeTab === 'nonconformance',
    },
    { label: '审核管理', value: 'audit', active: activeTab === 'audit' },
  ];

  const headerActions =
    activeTab === 'nonconformance'
      ? [
          {
            label: '新增不合格品',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            variant: 'contained' as const,
            color: 'primary' as const,
            onClick: () => {
              setIsEditing(false);
              setFormData({
                code: '',
                title: '',
                description: '',
                severity: 'medium',
                category: '',
              });
              setShowModal(true);
            },
          },
        ]
      : [];

  return (
    <PageContainer
      title='质量管理'
      subtitle='Quality Management System'
      headerProps={{
        pageIcon: <Shield style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]}, ${ct.secondary.main})`,
        tabs: headerTabs,
        onTabChange: (value) => setActiveTab(value as 'nonconformance' | 'audit'),
        search: {
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: '搜索编号或标题...',
        },
        actions: headerActions,
      }}
      maxWidth='xl'
    >
      {statsCards}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <ListPageTemplate
            columns={currentColumns as any}
            data={currentData as any[]}
            loading={loading}
            getRowId={(row: QualityIssue | AuditPlan) => row.id}
            rowActions={currentRowActions as any}
            searchable={false}
            filters={[]}
            actions={[]}
            mobileCardTitleKey='title'
            mobileCardSubtitleKey='issue_no'
            mobileCardDisplayFields={['category', 'severity', 'status', 'assignee']}
            mobileCardFieldLabels={{
              category: '类别',
              severity: '严重程度',
              status: '状态',
              assignee: '负责人',
            }}
          />
        </CardContent>
      </Card>

      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑不合格品' : '新增不合格品'}</DialogTitle>
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
                  编号
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.code}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, code: e.target.value }));
                    if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
                  }}
                  placeholder='NC-XXXX-XXX'
                  error={!!errors.code}
                />
                {errors.code && (
                  <Typography
                    variant='caption'
                    sx={{ color: 'error.main', fontSize: '0.875rem' }}
                  >
                    {errors.code}
                  </Typography>
                )}
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
                  严重程度
                </Box>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <InputLabel>请选择</InputLabel>
                  <Select
                    value={formData.severity}
                    label='请选择'
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        severity: e.target.value as 'high' | 'medium' | 'low',
                      }))
                    }
                  >
                    <MenuItem value='high'>严重</MenuItem>
                    <MenuItem value='medium'>中等</MenuItem>
                    <MenuItem value='low'>轻微</MenuItem>
                  </Select>
                </FormControl>
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
                问题标题 *
              </Box>
              <TextField
                size='small'
                fullWidth
                value={formData.title}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, title: e.target.value }));
                  if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                }}
                placeholder='请输入问题标题'
                error={!!errors.title}
              />
              {errors.title && (
                <Typography
                  variant='caption'
                  sx={{ color: 'error.main', fontSize: '0.875rem' }}
                >
                  {errors.title}
                </Typography>
              )}
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
                问题类别
              </Box>
              <TextField
                size='small'
                fullWidth
                value={formData.category}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }));
                  if (errors.category) setErrors((prev) => ({ ...prev, category: '' }));
                }}
                placeholder='外观缺陷、尺寸问题、包装问题等'
                error={!!errors.category}
              />
              {errors.category && (
                <Typography
                  variant='caption'
                  sx={{ color: 'error.main', fontSize: '0.875rem' }}
                >
                  {errors.category}
                </Typography>
              )}
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
                问题描述
              </Box>
              <TextField
                size='small'
                fullWidth
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }));
                  if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                }}
                placeholder='请详细描述问题...'
                error={!!errors.description}
              />
              {errors.description && (
                <Typography
                  variant='caption'
                  sx={{ color: 'error.main', fontSize: '0.875rem' }}
                >
                  {errors.description}
                </Typography>
              )}
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

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>
          {selectedItem && 'issue_no' in selectedItem
            ? `${selectedItem.issue_no} - ${selectedItem.title}`
            : selectedItem && 'plan_no' in selectedItem
              ? `${selectedItem.plan_no} - ${selectedItem.title}`
              : ''}
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {'severity' in selectedItem ? (
                <>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        component='label'
                        sx={{
                          display: 'block',
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                          mb: 0.5,
                        }}
                      >
                        严重程度
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>{getSeverityBadge(selectedItem.severity)}</Box>
                    </Box>
                    <Box>
                      <Typography
                        component='label'
                        sx={{
                          display: 'block',
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                          mb: 0.5,
                        }}
                      >
                        状态
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedItem.status, 'nc')}</Box>
                    </Box>
                  </Box>
                  <Box>
                    <Typography
                      component='label'
                      sx={{
                        display: 'block',
                        fontSize: '0.875rem',
                        color: 'text.secondary',
                        mb: 0.5,
                      }}
                    >
                      问题类别
                    </Typography>
                    <Typography sx={{ mt: 0.5 }}>{selectedItem.category}</Typography>
                  </Box>
                  <Box>
                    <Typography
                      component='label'
                      sx={{
                        display: 'block',
                        fontSize: '0.875rem',
                        color: 'text.secondary',
                        mb: 0.5,
                      }}
                    >
                      问题描述
                    </Typography>
                    <Typography sx={{ mt: 0.5 }}>{selectedItem.description}</Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        component='label'
                        sx={{
                          display: 'block',
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                          mb: 0.5,
                        }}
                      >
                        负责人
                      </Typography>
                      <Typography sx={{ mt: 0.5 }}>{selectedItem.assignee || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography
                        component='label'
                        sx={{
                          display: 'block',
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                          mb: 0.5,
                        }}
                      >
                        创建日期
                      </Typography>
                      <Typography sx={{ mt: 0.5 }}>
                        {selectedItem.created_at
                          ? new Date(selectedItem.created_at).toLocaleDateString('zh-CN')
                          : '-'}
                      </Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        component='label'
                        sx={{
                          display: 'block',
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                          mb: 0.5,
                        }}
                      >
                        审核类型
                      </Typography>
                      <Typography sx={{ mt: 0.5 }}>
                        {selectedItem.audit_type === 'internal' ? '内部审核' : '外部审核'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        component='label'
                        sx={{
                          display: 'block',
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                          mb: 0.5,
                        }}
                      >
                        状态
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedItem.status, 'audit')}</Box>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        component='label'
                        sx={{
                          display: 'block',
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                          mb: 0.5,
                        }}
                      >
                        审核人
                      </Typography>
                      <Typography sx={{ mt: 0.5 }}>{selectedItem.auditor || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography
                        component='label'
                        sx={{
                          display: 'block',
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                          mb: 0.5,
                        }}
                      >
                        开始日期
                      </Typography>
                      <Typography sx={{ mt: 0.5 }}>
                        {selectedItem.start_date
                          ? new Date(selectedItem.start_date).toLocaleDateString('zh-CN')
                          : '-'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography
                      component='label'
                      sx={{
                        display: 'block',
                        fontSize: '0.875rem',
                        color: 'text.secondary',
                        mb: 0.5,
                      }}
                    >
                      涉及部门
                    </Typography>
                    <Typography sx={{ mt: 0.5 }}>
                      {selectedItem.departments?.join(', ') || '-'}
                    </Typography>
                  </Box>
                  {selectedItem.description && (
                    <Box>
                      <Typography
                        component='label'
                        sx={{
                          display: 'block',
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                          mb: 0.5,
                        }}
                      >
                        描述
                      </Typography>
                      <Typography sx={{ mt: 0.5 }}>{selectedItem.description}</Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default QmsQualityControlPage;
