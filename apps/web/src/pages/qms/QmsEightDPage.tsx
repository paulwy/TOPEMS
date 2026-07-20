import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Stepper,
  Step,
  StepLabel,
  StepContent,
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
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar,
  AvatarGroup,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Send,
  User,
  AlertTriangle,
} from 'lucide-react';
import { useNotificationStore } from '@/store';
import * as z from 'zod';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { eightDApi } from '@/api/qms';
import type { EightDReport, EightDAuditLog } from '@/api/qms';
import { designTokens } from '@/theme/tokens';
import { logger } from '@/utils/logger';
import { useCrudMutations, useUrlListState } from '@/hooks';

const ct = designTokens.colors;

const D_STEPS = [
  { label: 'D1 团队建立', key: 'd1TeamEstablished' },
  { label: 'D2 问题描述', key: 'd2ProblemDescribed' },
  { label: 'D3 临时措施', key: 'd3ContainmentImplemented' },
  { label: 'D4 根本原因分析', key: 'd4RootCauseIdentified' },
  { label: 'D5 永久措施', key: 'd5PermanentActionSelected' },
  { label: 'D6 效果验证', key: 'd6ActionVerified' },
  { label: 'D7 预防措施', key: 'd7PreventiveImplemented' },
  { label: 'D8 团队认可', key: 'd8TeamRecognized' },
];

const QmsEightDPage: React.FC = () => {
  const { searchQuery, setSearchQuery, debouncedSearch } = useUrlListState({
    defaultPageSize: 10,
    defaultFilters: {},
    baseIndex: 1,
    historyMode: 'replace',
  });

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<EightDReport | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [stepContent, setStepContent] = useState('');
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    problemDescription: '',
    severity: 'medium',
    productName: '',
    customer: '',
    teamLeader: '',
    teamMembers: '',
    dueDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const eightDSchema = z.object({
    title: z.string().min(2, '标题至少需要2个字符').max(200, '标题不能超过200个字符'),
    problemDescription: z.string().min(10, '问题描述至少需要10个字符'),
    severity: z.string(),
  });

  const validateForm = (data: typeof formData) => {
    const result = eightDSchema.safeParse(data);
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

  const loadReports = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['qms-eightd-reports'] });
  }, [queryClient]);

  const { data: reports = [], isLoading: loading } = useQuery({
    queryKey: ['qms-eightd-reports'],
    queryFn: async () => {
      const response = await eightDApi.listEightDReports();
      if (response.success && response.data) {
        return response.data as EightDReport[];
      }
      return [];
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['qms-eightd-audit-logs', selectedReport?.id],
    queryFn: async () => {
      if (!selectedReport?.id) return [];
      const response = await eightDApi.getEightDAuditLogs(selectedReport.id);
      if (response.success && response.data) {
        return response.data as EightDAuditLog[];
      }
      return [];
    },
    enabled: !!selectedReport?.id,
  });

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      critical: { bg: 'error.lighter', color: 'error.dark' },
      high: { bg: 'error.lighter', color: 'error.dark' },
      medium: { bg: 'warning.light', color: 'warning.dark' },
      low: { bg: 'success.lighter', color: 'success.dark' },
    };
    const labels: Record<string, string> = {
      critical: '严重',
      high: '高',
      medium: '中',
      low: '低',
    };
    const colorKey = severity as keyof typeof colors;
    return (
      <Chip
        label={labels[colorKey] || severity}
        size='small'
        sx={{
          backgroundColor: colors[colorKey]?.bg || 'grey.100',
          color: colors[colorKey]?.color || 'text.secondary',
        }}
      />
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      open: { bg: 'error.lighter', color: 'error.dark' },
      待处理: { bg: 'error.lighter', color: 'error.dark' },
      in_progress: { bg: 'primary.light', color: 'primary.dark' },
      进行中: { bg: 'primary.light', color: 'primary.dark' },
      completed: { bg: 'success.lighter', color: 'success.dark' },
      已完成: { bg: 'success.lighter', color: 'success.dark' },
      closed: { bg: 'grey.100', color: 'text.secondary' },
      已关闭: { bg: 'grey.100', color: 'text.secondary' },
    };
    const labels: Record<string, string> = {
      open: '待处理',
      待处理: '待处理',
      in_progress: '进行中',
      进行中: '进行中',
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

  const getProgressSteps = (report: EightDReport) => {
    const stepsCompleted = D_STEPS.filter((step) => {
      const value = report[step.key as keyof EightDReport];
      return value === true || value === 'true';
    }).length;
    return stepsCompleted;
  };

  const columns: ColumnDef<EightDReport>[] = [
    { id: 'reportNo', label: '报告编号' },
    { id: 'title', label: '问题标题' },
    {
      id: 'severity',
      label: '严重程度',
      render: (row) => getSeverityBadge(row.severity),
    },
    { id: 'productName', label: '产品' },
    { id: 'customer', label: '客户' },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'progress',
      label: '进度',
      render: (row) => {
        const completed = getProgressSteps(row);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 80,
                height: 6,
                bgcolor: 'grey.200',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${(completed / 8) * 100}%`,
                  height: '100%',
                  bgcolor: completed === 8 ? 'success.main' : 'primary.main',
                  transition: 'width 0.3s',
                }}
              />
            </Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {completed}/8
            </Typography>
          </Box>
        );
      },
    },
    {
      id: 'createdAt',
      label: '创建日期',
      render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString('zh-CN') : '-'),
    },
  ];

  const rowActions: RowAction<EightDReport>[] = [
    {
      label: '查看详情',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => viewReport(row),
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => editReport(row),
    },
    {
      label: '删除',
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      color: 'error',
      onClick: (row) => deleteReport(row.id),
    },
  ];

  const {
    createMutation: createReportMutation,
    updateMutation: updateReportMutation,
    deleteMutation: deleteReportMutation,
  } = useCrudMutations<
    Parameters<typeof eightDApi.createEightDReport>[0],
    Parameters<typeof eightDApi.updateEightDReport>[1],
    string
  >({
    queryKeyToInvalidate: ['qms-eightd-reports'],
    createFn: (data) => eightDApi.createEightDReport(data),
    updateFn: ({ id, data }) => eightDApi.updateEightDReport(String(id), data),
    deleteFn: (id) => eightDApi.deleteEightDReport(String(id)),
    entityName: '8D报告',
  });

  const submitStepMutation = useMutation({
    mutationFn: async ({
      reportId,
      step,
      content,
      teamLeader,
      teamMembers,
    }: {
      reportId: string;
      step: number;
      content: string;
      teamLeader?: string;
      teamMembers?: string[];
    }) => {
      let response;
      switch (step) {
        case 0:
          response = await eightDApi.updateD1Team(reportId, {
            content,
            teamLeader: teamLeader || undefined,
            teamMembers,
          });
          break;
        case 2:
          response = await eightDApi.submitD3Containment(reportId, { content });
          break;
        case 3:
          response = await eightDApi.submitD4RootCause(reportId, { content });
          break;
        case 4:
          response = await eightDApi.submitD5PermanentAction(reportId, { content });
          break;
        case 5:
          response = await eightDApi.verifyD6Effectiveness(reportId, {
            content,
            isEffective: true,
          });
          break;
        case 6:
          response = await eightDApi.submitD7Preventive(reportId, { content });
          break;
        case 7:
          response = await eightDApi.closeEightDReport(reportId, { content });
          break;
        default:
          throw new Error('Invalid step');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qms-eightd-reports'] });
      queryClient.invalidateQueries({ queryKey: ['qms-eightd-audit-logs'] });
    },
    onError: () => {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    },
  });

  const viewReport = (report: EightDReport) => {
    setSelectedReport(report);
    setShowDetailModal(true);
    const completedSteps = D_STEPS.filter((step) => {
      const value = report[step.key as keyof EightDReport];
      return value === true || value === 'true';
    }).length;
    setActiveStep(Math.min(completedSteps, 7));
  };

  const editReport = (report: EightDReport) => {
    setSelectedReport(report);
    setIsEditing(true);
    setFormData({
      title: report.title,
      problemDescription: report.problemDescription,
      severity: report.severity,
      productName: report.productName || '',
      customer: report.customer || '',
      teamLeader: report.teamLeader || '',
      teamMembers: report.teamMembers?.join(', ') || '',
      dueDate: report.dueDate || '',
    });
    setShowModal(true);
  };

  const deleteReport = (id: string) => {
    if (!confirm('确定要删除此 8D 报告吗？')) return;
    deleteReportMutation.mutate(id);
  };

  const handleSubmit = async () => {
    if (!validateForm(formData)) {
      return;
    }
    setSubmitting(true);
    try {
      const submitData = {
        title: formData.title,
        problemDescription: formData.problemDescription,
        severity: formData.severity,
        productName: formData.productName || undefined,
        customer: formData.customer || undefined,
        teamLeader: formData.teamLeader || undefined,
        teamMembers: formData.teamMembers
          ? formData.teamMembers
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        dueDate: formData.dueDate || undefined,
      };

      if (isEditing && selectedReport) {
        await updateReportMutation.mutateAsync({ id: selectedReport.id, data: submitData });
      } else {
        await createReportMutation.mutateAsync({
          ...submitData,
          reportNo: `8D-${Date.now()}`,
        });
      }
      setShowModal(false);
      setIsEditing(false);
      setFormData({
        title: '',
        problemDescription: '',
        severity: 'medium',
        productName: '',
        customer: '',
        teamLeader: '',
        teamMembers: '',
        dueDate: '',
      });
      setErrors({});
    } catch (error: unknown) {
      addNotification({ title: '错误', message: '操作失败，请重试', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStepSubmit = async () => {
    if (!selectedReport || !stepContent.trim()) {
      addNotification({ title: '错误', message: '请输入内容', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const response = await submitStepMutation.mutateAsync({
        reportId: selectedReport.id,
        step: activeStep,
        content: stepContent,
        teamLeader: formData.teamLeader,
        teamMembers: formData.teamMembers
          ? formData.teamMembers
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      });

      if (response.success) {
        setSelectedReport(response.data!);
        addNotification({
          title: '成功',
          message: `${D_STEPS[activeStep].label}完成`,
          type: 'success',
        });
        setStepContent('');
        if (activeStep < 7) {
          setActiveStep(activeStep + 1);
        }
      } else {
        addNotification({ title: '失败', message: response.message || '操作失败', type: 'error' });
      }
    } catch (error: unknown) {
      addNotification({ title: '错误', message: '操作失败，请重试', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter(
      (item) =>
        item.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        item.reportNo.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [reports, debouncedSearch]);

  const stats = useMemo(() => {
    return {
      totalReports: reports.length,
      openReports: reports.filter((r) => r.status === 'open' || r.status === '待处理').length,
      inProgressReports: reports.filter((r) => r.status === 'in_progress' || r.status === '进行中')
        .length,
      completedReports: reports.filter((r) => r.status === 'completed' || r.status === '已完成')
        .length,
    };
  }, [reports]);

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
              <FileText sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                8D 报告总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.totalReports}
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
              <AlertCircle sx={{ width: 20, height: 20, color: 'error.dark' }} />
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
                {stats.openReports}
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
                bgcolor: 'primary.light',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock sx={{ width: 20, height: 20, color: 'primary.dark' }} />
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
                {stats.inProgressReports}
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
                已完成
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.completedReports}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <PageContainer
      title='8D 问题解决'
      subtitle='Eight Disciplines Problem Solving'
      headerProps={{
        pageIcon: <FileText style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]}, ${ct.secondary.main})`,
        search: {
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: '搜索报告编号或标题...',
        },
        actions: [
          {
            label: '新建 8D 报告',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            variant: 'contained' as const,
            color: 'primary' as const,
            onClick: () => {
              setIsEditing(false);
              setFormData({
                title: '',
                problemDescription: '',
                severity: 'medium',
                productName: '',
                customer: '',
                teamLeader: '',
                teamMembers: '',
                dueDate: '',
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
            data={filteredReports}
            loading={loading}
            getRowId={(row: EightDReport) => row.id}
            rowActions={rowActions as unknown as RowAction<EightDReport>[]}
            searchable={false}
            filters={[]}
            actions={[]}
            onRefresh={loadReports}
            mobileCardTitleKey='title'
            mobileCardSubtitleKey='reportNo'
            mobileCardDisplayFields={['severity', 'productName', 'customer', 'status']}
            mobileCardFieldLabels={{
              severity: '严重程度',
              productName: '产品',
              customer: '客户',
              status: '状态',
            }}
          />
        </CardContent>
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑 8D 报告' : '新建 8D 报告'}</DialogTitle>
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
                placeholder='简述问题'
                error={!!errors.title}
                helperText={errors.title}
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
                问题描述 *
              </Box>
              <TextField
                size='small'
                fullWidth
                multiline
                rows={4}
                value={formData.problemDescription}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, problemDescription: e.target.value }));
                  if (errors.problemDescription)
                    setErrors((prev) => ({ ...prev, problemDescription: '' }));
                }}
                placeholder='详细描述问题现象'
                error={!!errors.problemDescription}
                helperText={errors.problemDescription}
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
                  严重程度
                </Box>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    value={formData.severity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, severity: e.target.value }))}
                  >
                    <MenuItem value='critical'>严重</MenuItem>
                    <MenuItem value='high'>高</MenuItem>
                    <MenuItem value='medium'>中</MenuItem>
                    <MenuItem value='low'>低</MenuItem>
                  </Select>
                </FormControl>
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
                  截止日期
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  type='date'
                  value={formData.dueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } } as const}
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
                  客户
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.customer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customer: e.target.value }))}
                  placeholder='客户名称'
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
                  团队负责人
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.teamLeader}
                  onChange={(e) => setFormData((prev) => ({ ...prev, teamLeader: e.target.value }))}
                  placeholder='负责人姓名'
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
                  团队成员 (逗号分隔)
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.teamMembers}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, teamMembers: e.target.value }))
                  }
                  placeholder='成员1, 成员2, ...'
                />
              </Box>
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
          {selectedReport?.title}
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {getSeverityBadge(selectedReport?.severity || '')}
            {getStatusBadge(selectedReport?.status || '')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ mt: 1 }}>
              {/* 8D 步骤进度 */}
              <Stepper
                activeStep={activeStep}
                alternativeLabel
                sx={{ mb: 3 }}
              >
                {D_STEPS.map((step, index) => {
                  const isCompleted =
                    selectedReport[step.key as keyof EightDReport] === true ||
                    selectedReport[step.key as keyof EightDReport] === 'true';
                  return (
                    <Step
                      key={step.key}
                      completed={isCompleted}
                    >
                      <StepLabel>{step.label}</StepLabel>
                    </Step>
                  );
                })}
              </Stepper>

              <Divider sx={{ my: 2 }} />

              {/* 步骤内容输入 */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {D_STEPS[activeStep].label}
                </Typography>
                {activeStep === 0 && selectedReport.d1Content && (
                  <Alert
                    severity='info'
                    sx={{ mb: 2 }}
                  >
                    <Typography variant='body2'>{selectedReport.d1Content}</Typography>
                  </Alert>
                )}
                {activeStep === 2 && selectedReport.d3Content && (
                  <Alert
                    severity='info'
                    sx={{ mb: 2 }}
                  >
                    <Typography variant='body2'>{selectedReport.d3Content}</Typography>
                  </Alert>
                )}
                {activeStep === 3 && selectedReport.d4Content && (
                  <Alert
                    severity='info'
                    sx={{ mb: 2 }}
                  >
                    <Typography variant='body2'>{selectedReport.d4Content}</Typography>
                  </Alert>
                )}
                {activeStep === 4 && selectedReport.d5Content && (
                  <Alert
                    severity='info'
                    sx={{ mb: 2 }}
                  >
                    <Typography variant='body2'>{selectedReport.d5Content}</Typography>
                  </Alert>
                )}
                {activeStep === 5 && selectedReport.d6Content && (
                  <Alert
                    severity='info'
                    sx={{ mb: 2 }}
                  >
                    <Typography variant='body2'>{selectedReport.d6Content}</Typography>
                  </Alert>
                )}
                {activeStep === 6 && selectedReport.d7Content && (
                  <Alert
                    severity='info'
                    sx={{ mb: 2 }}
                  >
                    <Typography variant='body2'>{selectedReport.d7Content}</Typography>
                  </Alert>
                )}
                {activeStep === 7 && selectedReport.d8Content && (
                  <Alert
                    severity='info'
                    sx={{ mb: 2 }}
                  >
                    <Typography variant='body2'>{selectedReport.d8Content}</Typography>
                  </Alert>
                )}

                {selectedReport.status !== 'closed' && selectedReport.status !== '已完成' && (
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      size='small'
                      fullWidth
                      multiline
                      rows={3}
                      value={stepContent}
                      onChange={(e) => setStepContent(e.target.value)}
                      placeholder={`输入 ${D_STEPS[activeStep].label} 的内容...`}
                    />
                  </Box>
                )}
              </Box>

              {/* 团队信息 */}
              {(selectedReport.teamLeader || selectedReport.teamMembers?.length) && (
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    <Users
                      size={16}
                      style={{ marginRight: 8, verticalAlign: 'middle' }}
                    />
                    团队成员
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {selectedReport.teamLeader && (
                      <Chip
                        avatar={
                          <Avatar>
                            <User size={14} />
                          </Avatar>
                        }
                        label={`负责人: ${selectedReport.teamLeader}`}
                        size='small'
                        sx={{ mr: 1 }}
                      />
                    )}
                    {selectedReport.teamMembers?.map((member, index) => (
                      <Chip
                        key={index}
                        label={member}
                        size='small'
                        variant='outlined'
                        sx={{ mr: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* 操作日志 */}
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 1 }}
              >
                操作日志
              </Typography>
              <List
                dense
                sx={{ maxHeight: 200, overflow: 'auto' }}
              >
                {auditLogs.map((log) => (
                  <ListItem
                    key={log.id}
                    divider
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant='body2'>{log.action}</Typography>
                          {log.stage && (
                            <Chip
                              label={`D${log.stage}`}
                              size='small'
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      }
                      secondary={`${log.operator} - ${log.createdAt ? new Date(log.createdAt).toLocaleString('zh-CN') : '-'}`}
                    />
                  </ListItem>
                ))}
                {auditLogs.length === 0 && (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ py: 2 }}
                  >
                    暂无操作日志
                  </Typography>
                )}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          {selectedReport &&
            selectedReport.status !== 'closed' &&
            selectedReport.status !== '已完成' && (
              <>
                {activeStep > 0 && (
                  <Button onClick={() => setActiveStep(activeStep - 1)}>上一步</Button>
                )}
                {activeStep < 7 && (
                  <Button
                    variant='contained'
                    onClick={handleStepSubmit}
                    disabled={submitting || !stepContent.trim()}
                  >
                    {submitting ? '提交中...' : '提交当前步骤'}
                  </Button>
                )}
                {activeStep === 7 && (
                  <Button
                    variant='contained'
                    color='success'
                    onClick={handleStepSubmit}
                    disabled={submitting || !stepContent.trim()}
                  >
                    {submitting ? '关闭中...' : '关闭报告'}
                  </Button>
                )}
              </>
            )}
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default QmsEightDPage;
