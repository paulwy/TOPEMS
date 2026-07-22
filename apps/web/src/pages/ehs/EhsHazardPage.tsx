import React, { useState } from 'react';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Button,
} from '@mui/material';
import {
  Plus,
  Eye,
  AlertTriangle,
  MapPin,
  User,
  Calendar,
  CheckCircle,
  Clock,
  FileEdit,
  CheckSquare,
  XCircle,
} from 'lucide-react';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { ehsApi } from '@/api/ehs';
import { PageContainer } from '@/components/common/PageContainerV2';
import type { SafetyIssue, SafetyIssueDetail, Rectification, Verification } from '@/api/ehs';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { useUrlListState } from '@/hooks';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const EhsHazardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    filters: urlFilters,
    setFilter,
    setCurrentPage,
  } = useUrlListState<{ level: string; status: string }>({
    defaultPageSize: 10,
    defaultFilters: { level: 'all', status: 'all' },
    baseIndex: 1,
    historyMode: 'replace',
  });
  const levelFilter = urlFilters.level;
  const statusFilter = urlFilters.status;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRectificationModal, setShowRectificationModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<SafetyIssue | null>(null);
  const [rectification, setRectification] = useState<Rectification | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'equipment',
    level: 'major',
    source: 'inspection',
    location: '',
    reported_by: '',
  });
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [rectificationFormData, setRectificationFormData] = useState({
    description: '',
    responsible: '',
    deadline: '',
  });
  const [verificationFormData, setVerificationFormData] = useState({
    verifier: '',
    result: 'passed',
    remarks: '',
  });

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      reported: t('ehs.ehs_hazard_page.text_e17445'),
      rectifying: t('ehs.ehs_hazard_page.text_1aa44e'),
      pending_verification: t('ehs.ehs_hazard_page.text_9e251a'),
      verified: t('ehs.ehs_hazard_page.text_74fdfc'),
      closed: t('ehs.ehs_hazard_page.text_653162'),
      rejected: t('ehs.ehs_hazard_page.text_dbf36d'),
    };
    return statusMap[status] || status;
  };

  const { data: issuesData, isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.EHS.SAFETY_ISSUES,
    queryFn: async () => {
      const response = await ehsApi.listSafetyIssues({ pagesize: 100 });
      if (response.success && response.data) {
        const issuesData = Array.isArray(response.data) ? response.data : response.data.items || [];
        return issuesData.map((item: SafetyIssue) => ({
          ...item,
          status: translateStatus(item.status),
        }));
      }
      return [];
    },
  });
  const issues = (issuesData as SafetyIssue[]) || [];

  const invalidateIssues = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.SAFETY_ISSUES });
  };

  const loadIssueDetail = async (issueId: string) => {
    try {
      const response = await ehsApi.getSafetyIssue(issueId);
      if (response.success && response.data) {
        const data = response.data as unknown as SafetyIssueDetail;
        setSelectedIssue(data.hazard);
        setRectification(data.rectification || null);
        setVerification(data.verification || null);
      }
    } catch (err: unknown) {
      apiLogger.error(t('ehs.ehs_hazard_page.detail'), err);
    }
  };

  const getLevelLabel = (level: string) => {
    const levelMap: Record<string, string> = {
      major: t('ehs.ehs_hazard_page.text_3c2d0c'),
      serious: t('ehs.ehs_hazard_page.text_fc35a0'),
      general: t('ehs.ehs_hazard_page.text_879ee5'),
      minor: t('ehs.ehs_hazard_page.text_545004'),
    };
    return levelMap[level] || level;
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      equipment: t('ehs.ehs_hazard_page.equipment'),
      environment: t('ehs.ehs_hazard_page.text_38106d'),
      behavior: t('ehs.ehs_hazard_page.text_db08bc'),
      management: t('ehs.ehs_hazard_page.text_b22404'),
      fire: t('ehs.ehs_hazard_page.text_a1c672'),
      electrical: t('ehs.ehs_hazard_page.text_02d8cd'),
      chemical: t('ehs.ehs_hazard_page.text_0922c5'),
      structural: t('ehs.ehs_hazard_page.text_ace272'),
    };
    return categoryMap[category] || category;
  };

  const getSourceLabel = (source: string) => {
    const sourceMap: Record<string, string> = {
      inspection: t('ehs.ehs_hazard_page.text_8f9df1'),
      reporting: t('ehs.ehs_hazard_page.text_f3924b'),
      audit: t('ehs.ehs_hazard_page.text_f6cc4d'),
      accident: t('ehs.ehs_hazard_page.text_be9271'),
      monitoring: t('ehs.ehs_hazard_page.text_522500'),
    };
    return sourceMap[source] || source;
  };

  const getLevelBadge = (level: string) => {
    const levelMap: Record<string, { bg: string; color: string; label: string }> = {
      major: { bg: 'error.lighter', color: 'error.dark', label: t('ehs.ehs_hazard_page.text_5a558d') },
      serious: { bg: 'error.light', color: 'error.darker', label: t('ehs.ehs_hazard_page.text_e2e27a') },
      general: { bg: 'warning.100', color: ct.yellow[600], label: t('ehs.ehs_hazard_page.text_2ab01e') },
      minor: { bg: 'success.lighter', color: 'success.dark', label: t('ehs.ehs_hazard_page.text_b3bd3d') },
    };
    const colors = levelMap[level] || { bg: 'grey.100', color: 'text.secondary', label: level };
    return (
      <Chip
        label={colors.label}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      待整改: { bg: 'error.lighter', color: 'error.dark' },
      整改中: { bg: 'warning.100', color: ct.yellow[600] },
      待验收: { bg: 'primary.light', color: 'primary.dark' },
      已验收: { bg: 'success.lighter', color: 'success.dark' },
      已闭环: { bg: 'grey.100', color: 'text.secondary' },
      已驳回: { bg: 'error.light', color: 'error.darker' },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        label={status}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const getStepIndex = (status: string) => {
    const stepMap: Record<string, number> = {
      待整改: 0,
      整改中: 1,
      待验收: 2,
      已验收: 3,
      已闭环: 4,
      已驳回: 0,
    };
    return stepMap[status] || 0;
  };

  const columns: ColumnDef<SafetyIssue>[] = [
    { id: 'hazard_no', label: t('ehs.ehs_hazard_page.text_10296d') },
    { id: 'title', label: t('ehs.ehs_hazard_page.name') },
    {
      id: 'level',
      label: t('ehs.ehs_hazard_page.text_95e0d7'),
      render: (row) => getLevelBadge(row.level),
    },
    {
      id: 'category',
      label: t('ehs.ehs_hazard_page.text_383a6d'),
      render: (row) => getCategoryLabel(row.category),
    },
    {
      id: 'location',
      label: t('ehs.ehs_hazard_page.text_d4d2a6'),
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <MapPin style={{ width: 14, height: 14 }} />
          {row.location || '-'}
        </Box>
      ),
    },
    {
      id: 'source',
      label: t('ehs.ehs_hazard_page.text_26ca20'),
      render: (row) => getSourceLabel(row.source),
    },
    {
      id: 'status',
      label: t('ehs.ehs_hazard_page.status'),
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'actions',
      label: t('ehs.ehs_hazard_page.action'),
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size='small'
            onClick={() => handleView(row)}
            startIcon={<Eye style={{ width: 16, height: 16 }} />}
          >
            详情
          </Button>
        </Box>
      ),
    },
  ];

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      issue.hazard_no.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesLevel = levelFilter === 'all' || issue.level === levelFilter;
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    return matchesSearch && matchesLevel && matchesStatus;
  });

  const handleView = async (issue: SafetyIssue) => {
    await loadIssueDetail(issue.id);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      title: '',
      description: '',
      category: 'equipment',
      level: 'general',
      source: 'inspection',
      location: '',
      reported_by: '',
    });
    setShowCreateModal(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof ehsApi.createSafetyIssue>[0]) =>
      ehsApi.createSafetyIssue(data),
    onSuccess: () => {
      addNotification({ title: t('ehs.ehs_hazard_page.success'), message: t('ehs.ehs_hazard_page.success_1'), type: 'success' });
      invalidateIssues();
      setShowCreateModal(false);
    },
    onError: (error: unknown) => {
      apiLogger.error(t('ehs.ehs_hazard_page.create'), error);
      addNotification({ title: t('ehs.ehs_hazard_page.error'), message: t('ehs.ehs_hazard_page.fail'), type: 'error' });
    },
  });

  const handleSave = () => {
    createMutation.mutate({
      title: formData.title,
      description: formData.description || null,
      category: formData.category,
      level: formData.level,
      source: formData.source,
      location: formData.location || null,
      reported_by: formData.reported_by || null,
    });
  };

  const handleStartRectification = () => {
    setRectificationFormData({
      description: '',
      responsible: '',
      deadline: '',
    });
    setShowRectificationModal(true);
  };

  const startRectificationMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof ehsApi.startRectification>[1];
    }) => ehsApi.startRectification(id, data),
    onSuccess: () => {
      addNotification({ title: t('ehs.ehs_hazard_page.success'), message: t('ehs.ehs_hazard_page.create_1'), type: 'success' });
      invalidateIssues();
      setShowRectificationModal(false);
      if (selectedIssue) void loadIssueDetail(selectedIssue.id);
    },
    onError: (error: unknown) => {
      apiLogger.error(t('ehs.ehs_hazard_page.create_2'), error);
      addNotification({ title: t('ehs.ehs_hazard_page.error'), message: t('ehs.ehs_hazard_page.create_3'), type: 'error' });
    },
  });

  const handleSaveRectification = () => {
    if (!selectedIssue) return;
    startRectificationMutation.mutate({
      id: selectedIssue.id,
      data: {
        description: rectificationFormData.description,
        responsible: rectificationFormData.responsible || null,
        deadline: rectificationFormData.deadline || null,
      },
    });
  };

  const submitRectificationMutation = useMutation({
    mutationFn: (id: string) => ehsApi.submitRectification(id),
    onSuccess: () => {
      addNotification({ title: t('ehs.ehs_hazard_page.success'), message: t('ehs.ehs_hazard_page.completed'), type: 'success' });
      invalidateIssues();
      if (selectedIssue) void loadIssueDetail(selectedIssue.id);
    },
    onError: (error: unknown) => {
      apiLogger.error(t('ehs.ehs_hazard_page.submit'), error);
      addNotification({ title: t('ehs.ehs_hazard_page.error'), message: t('ehs.ehs_hazard_page.submit_1'), type: 'error' });
    },
  });

  const handleSubmitRectification = () => {
    if (!selectedIssue) return;
    submitRectificationMutation.mutate(selectedIssue.id);
  };

  const handleStartVerification = () => {
    setVerificationFormData({
      verifier: '',
      result: 'passed',
      remarks: '',
    });
    setShowVerificationModal(true);
  };

  const verifyMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof ehsApi.verifySafetyIssue>[1];
    }) => ehsApi.verifySafetyIssue(id, data),
    onSuccess: () => {
      addNotification({ title: t('ehs.ehs_hazard_page.success'), message: t('ehs.ehs_hazard_page.completed_1'), type: 'success' });
      invalidateIssues();
      setShowVerificationModal(false);
      if (selectedIssue) void loadIssueDetail(selectedIssue.id);
    },
    onError: (error: unknown) => {
      apiLogger.error(t('ehs.ehs_hazard_page.fail_1'), error);
      addNotification({ title: t('ehs.ehs_hazard_page.error'), message: t('ehs.ehs_hazard_page.fail_2'), type: 'error' });
    },
  });

  const handleSaveVerification = () => {
    if (!selectedIssue) return;
    verifyMutation.mutate({
      id: selectedIssue.id,
      data: {
        verifier: verificationFormData.verifier || null,
        result: verificationFormData.result,
        remarks: verificationFormData.remarks || null,
      },
    });
  };

  const closeIssueMutation = useMutation({
    mutationFn: (id: string) => ehsApi.closeSafetyIssue(id),
    onSuccess: () => {
      addNotification({ title: t('ehs.ehs_hazard_page.success'), message: t('ehs.ehs_hazard_page.text_aa1147'), type: 'success' });
      invalidateIssues();
      setShowDetailModal(false);
    },
    onError: (error: unknown) => {
      apiLogger.error(t('ehs.ehs_hazard_page.fail_3'), error);
      addNotification({ title: t('ehs.ehs_hazard_page.error'), message: t('ehs.ehs_hazard_page.fail_4'), type: 'error' });
    },
  });

  const handleCloseIssue = () => {
    if (!selectedIssue) return;
    closeIssueMutation.mutate(selectedIssue.id);
  };

  const stats = {
    total: issues.length,
    major: issues.filter((i) => i.level === 'major').length,
    serious: issues.filter((i) => i.level === 'serious').length,
    pending: issues.filter((i) => i.status === t('ehs.ehs_hazard_page.text_e17445')).length,
    rectifying: issues.filter((i) => i.status === t('ehs.ehs_hazard_page.text_1aa44e')).length,
    pendingVerification: issues.filter((i) => i.status === t('ehs.ehs_hazard_page.text_9e251a')).length,
    closed: issues.filter((i) => i.status === t('ehs.ehs_hazard_page.text_653162')).length,
  };

  const filters = [
    {
      id: 'level',
      label: t('ehs.ehs_hazard_page.text_fbad1c'),
      type: 'select' as const,
      options: [
        { label: t('ehs.ehs_hazard_page.all'), value: 'all' },
        { label: t('ehs.ehs_hazard_page.text_5a558d'), value: 'major' },
        { label: t('ehs.ehs_hazard_page.text_e2e27a'), value: 'serious' },
        { label: t('ehs.ehs_hazard_page.text_2ab01e'), value: 'general' },
        { label: t('ehs.ehs_hazard_page.text_b3bd3d'), value: 'minor' },
      ],
      value: levelFilter,
      onChange: (value: unknown) => {
        setFilter('level', value as string);
        setCurrentPage(1);
      },
    },
    {
      id: 'status',
      label: t('ehs.ehs_hazard_page.status'),
      type: 'select' as const,
      options: [
        { label: t('ehs.ehs_hazard_page.all'), value: 'all' },
        { label: t('ehs.ehs_hazard_page.text_e17445'), value: t('ehs.ehs_hazard_page.text_e17445') },
        { label: t('ehs.ehs_hazard_page.text_1aa44e'), value: t('ehs.ehs_hazard_page.text_1aa44e') },
        { label: t('ehs.ehs_hazard_page.text_9e251a'), value: t('ehs.ehs_hazard_page.text_9e251a') },
        { label: t('ehs.ehs_hazard_page.text_74fdfc'), value: t('ehs.ehs_hazard_page.text_74fdfc') },
        { label: t('ehs.ehs_hazard_page.text_653162'), value: t('ehs.ehs_hazard_page.text_653162') },
        { label: t('ehs.ehs_hazard_page.text_dbf36d'), value: t('ehs.ehs_hazard_page.text_dbf36d') },
      ],
      value: statusFilter,
      onChange: (value: unknown) => {
        setFilter('status', value as string);
        setCurrentPage(1);
      },
    },
  ];

  const steps = [t('ehs.ehs_hazard_page.text_581f96'), t('ehs.ehs_hazard_page.text_1aa44e'), t('ehs.ehs_hazard_page.text_9e251a'), t('ehs.ehs_hazard_page.text_74fdfc'), t('ehs.ehs_hazard_page.text_653162')];

  const headerActions = [
    {
      label: t('ehs.ehs_hazard_page.text_1ed126'),
      icon: <Plus style={{ width: 18, height: 18 }} />,
      onClick: handleCreate,
      variant: 'contained' as const,
      color: 'error' as const,
    },
  ];

  return (
    <PageContainer
      headerProps={{
        actions: headerActions,
        pageIcon: <AlertTriangle sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 4,
        }}
      >
        <Card sx={{ bgcolor: 'error.light' }}>
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
                <AlertTriangle sx={{ width: 20, height: 20, color: 'error.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  隐患总数
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.total}
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
                <XCircle sx={{ width: 20, height: 20, color: 'error.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  重大/严重
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.major + stats.serious}
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
                <Clock sx={{ width: 20, height: 20, color: ct.yellow[600] }} />
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
                  {stats.pending + stats.rectifying + stats.pendingVerification}
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
                  已闭环
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.closed}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <ListPageTemplate
        title=''
        columns={columns}
        data={filteredIssues}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('ehs.ehs_hazard_page.search')}
        searchValue={searchQuery}
        onSearch={(value) => setSearchQuery(value)}
        emptyMessage={t('ehs.ehs_hazard_page.no_data')}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.SAFETY_ISSUES })}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>上报隐患</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={t('ehs.ehs_hazard_page.name_1')}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('ehs.ehs_hazard_page.please_input')}
            />
            <TextField
              fullWidth
              label={t('ehs.ehs_hazard_page.description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('ehs.ehs_hazard_page.detail_1')}
              multiline
              rows={3}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>隐患类别 *</InputLabel>
                <Select
                  value={formData.category}
                  label={t('ehs.ehs_hazard_page.text_a812fd')}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <MenuItem value='equipment'>设备隐患</MenuItem>
                  <MenuItem value='environment'>环境隐患</MenuItem>
                  <MenuItem value='behavior'>行为隐患</MenuItem>
                  <MenuItem value='management'>管理隐患</MenuItem>
                  <MenuItem value='fire'>消防隐患</MenuItem>
                  <MenuItem value='electrical'>电气隐患</MenuItem>
                  <MenuItem value='chemical'>化学品隐患</MenuItem>
                  <MenuItem value='structural'>结构隐患</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>隐患等级 *</InputLabel>
                <Select
                  value={formData.level}
                  label={t('ehs.ehs_hazard_page.text_fbad1c')}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                >
                  <MenuItem value='major'>重大隐患</MenuItem>
                  <MenuItem value='serious'>严重隐患</MenuItem>
                  <MenuItem value='general'>一般隐患</MenuItem>
                  <MenuItem value='minor'>轻微隐患</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>来源 *</InputLabel>
                <Select
                  value={formData.source}
                  label={t('ehs.ehs_hazard_page.text_26ca20')}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                >
                  <MenuItem value='inspection'>检查发现</MenuItem>
                  <MenuItem value='reporting'>员工上报</MenuItem>
                  <MenuItem value='audit'>审计发现</MenuItem>
                  <MenuItem value='accident'>事故排查</MenuItem>
                  <MenuItem value='monitoring'>监测预警</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={t('ehs.ehs_hazard_page.text_d4d2a6')}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder={t('ehs.ehs_hazard_page.please_input_1')}
              />
            </Box>
            <TextField
              fullWidth
              label={t('ehs.ehs_hazard_page.text_8a4b90')}
              value={formData.reported_by}
              onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
              placeholder={t('ehs.ehs_hazard_page.please_input_2')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            sx={{ bgcolor: 'error.main' }}
          >
            上报
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{selectedIssue?.title}</DialogTitle>
        <DialogContent>
          {selectedIssue && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ mb: 4 }}>
                <Stepper
                  activeStep={getStepIndex(selectedIssue.status)}
                  alternativeLabel
                >
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                  mb: 4,
                }}
              >
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    隐患编号
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>{selectedIssue.hazard_no}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    隐患等级
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>{getLevelBadge(selectedIssue.level)}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    类别
                  </Typography>
                  <Typography>{getCategoryLabel(selectedIssue.category)}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    状态
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>{getStatusBadge(selectedIssue.status)}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    位置
                  </Typography>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <MapPin style={{ width: 16, height: 16 }} />
                    {selectedIssue.location || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    来源
                  </Typography>
                  <Typography>{getSourceLabel(selectedIssue.source)}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    上报人
                  </Typography>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <User style={{ width: 16, height: 16 }} />
                    {selectedIssue.reported_by || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    上报时间
                  </Typography>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Calendar style={{ width: 16, height: 16 }} />
                    {selectedIssue.reported_at
                      ? new Date(selectedIssue.reported_at).toLocaleString('zh-CN')
                      : '-'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  隐患描述
                </Typography>
                <Typography>{selectedIssue.description || '-'}</Typography>
              </Box>

              {rectification && (
                <Card sx={{ mb: 4 }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      <FileEdit sx={{ width: 18, height: 18, color: ct.yellow[600] }} />
                      <Typography
                        variant='subtitle2'
                        sx={{ fontWeight: 600 }}
                      >
                        整改信息
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          整改措施
                        </Typography>
                        <Typography>{rectification.description}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          整改负责人
                        </Typography>
                        <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <User style={{ width: 14, height: 14 }} />
                          {rectification.responsible || '-'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          整改期限
                        </Typography>
                        <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Calendar style={{ width: 14, height: 14 }} />
                          {rectification.deadline || '-'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          整改状态
                        </Typography>
                        <Typography>
                          {rectification.status === 'in_progress' ? t('ehs.ehs_hazard_page.text_1aa44e') : t('ehs.ehs_hazard_page.completed_2')}
                        </Typography>
                      </Box>
                      {rectification.progress !== undefined && (
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            整改进度
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                            <LinearProgress
                              variant='determinate'
                              value={rectification.progress}
                              sx={{ flex: 1 }}
                            />
                            <Typography sx={{ fontWeight: 500 }}>
                              {rectification.progress}%
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              )}

              {verification && (
                <Card sx={{ mb: 4 }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      <CheckSquare sx={{ width: 18, height: 18, color: 'success.dark' }} />
                      <Typography
                        variant='subtitle2'
                        sx={{ fontWeight: 600 }}
                      >
                        验收信息
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          验收人
                        </Typography>
                        <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <User style={{ width: 14, height: 14 }} />
                          {verification.verifier || '-'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          验收结果
                        </Typography>
                        <Typography>
                          {verification.result === 'passed' ? (
                            <Chip
                              label={t('ehs.ehs_hazard_page.text_5a726a')}
                              size='small'
                              sx={{ bgcolor: 'success.lighter', color: 'success.dark' }}
                            />
                          ) : (
                            <Chip
                              label={t('ehs.ehs_hazard_page.text_3e6c60')}
                              size='small'
                              sx={{ bgcolor: 'error.lighter', color: 'error.dark' }}
                            />
                          )}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          验收时间
                        </Typography>
                        <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Calendar style={{ width: 14, height: 14 }} />
                          {verification.verified_at
                            ? new Date(verification.verified_at).toLocaleString('zh-CN')
                            : '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          验收备注
                        </Typography>
                        <Typography>{verification.remarks || '-'}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedIssue && (
            <>
              {selectedIssue.status === t('ehs.ehs_hazard_page.text_e17445') && (
                <Button
                  variant='contained'
                  onClick={handleStartRectification}
                  sx={{ bgcolor: ct.yellow[600] }}
                >
                  开始整改
                </Button>
              )}
              {selectedIssue.status === t('ehs.ehs_hazard_page.text_1aa44e') && (
                <Button
                  variant='contained'
                  onClick={handleSubmitRectification}
                  sx={{ bgcolor: 'primary.dark' }}
                >
                  提交整改
                </Button>
              )}
              {selectedIssue.status === t('ehs.ehs_hazard_page.text_9e251a') && (
                <Button
                  variant='contained'
                  onClick={handleStartVerification}
                  sx={{ bgcolor: 'success.dark' }}
                >
                  开始验收
                </Button>
              )}
              {selectedIssue.status === t('ehs.ehs_hazard_page.text_74fdfc') && (
                <Button
                  variant='contained'
                  onClick={handleCloseIssue}
                  sx={{ bgcolor: 'text.secondary' }}
                >
                  闭环处理
                </Button>
              )}
            </>
          )}
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showRectificationModal}
        onClose={() => setShowRectificationModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>创建整改任务</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={t('ehs.ehs_hazard_page.text_7ca866')}
              value={rectificationFormData.description}
              onChange={(e) =>
                setRectificationFormData({
                  ...rectificationFormData,
                  description: e.target.value,
                })
              }
              placeholder={t('ehs.ehs_hazard_page.please_input_3')}
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label={t('ehs.ehs_hazard_page.manager')}
              value={rectificationFormData.responsible}
              onChange={(e) =>
                setRectificationFormData({
                  ...rectificationFormData,
                  responsible: e.target.value,
                })
              }
              placeholder={t('ehs.ehs_hazard_page.manager_1')}
            />
            <TextField
              fullWidth
              type='date'
              label={t('ehs.ehs_hazard_page.text_2ea30f')}
              value={rectificationFormData.deadline}
              onChange={(e) =>
                setRectificationFormData({
                  ...rectificationFormData,
                  deadline: e.target.value,
                })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowRectificationModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSaveRectification}
            sx={{ bgcolor: ct.yellow[600] }}
          >
            创建整改任务
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>验收整改结果</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={t('ehs.ehs_hazard_page.text_aed7fa')}
              value={verificationFormData.verifier}
              onChange={(e) =>
                setVerificationFormData({
                  ...verificationFormData,
                  verifier: e.target.value,
                })
              }
              placeholder={t('ehs.ehs_hazard_page.please_input_4')}
            />
            <FormControl fullWidth>
              <InputLabel>验收结果 *</InputLabel>
              <Select
                value={verificationFormData.result}
                label={t('ehs.ehs_hazard_page.text_9ff177')}
                onChange={(e) =>
                  setVerificationFormData({
                    ...verificationFormData,
                    result: e.target.value,
                  })
                }
              >
                <MenuItem value='passed'>验收通过</MenuItem>
                <MenuItem value='failed'>验收未通过</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label={t('ehs.ehs_hazard_page.remark')}
              value={verificationFormData.remarks}
              onChange={(e) =>
                setVerificationFormData({
                  ...verificationFormData,
                  remarks: e.target.value,
                })
              }
              placeholder={t('ehs.ehs_hazard_page.please_input_5')}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowVerificationModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSaveVerification}
            sx={{ bgcolor: 'success.dark' }}
          >
            完成验收
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default EhsHazardPage;
