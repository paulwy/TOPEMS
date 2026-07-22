import React, { useState, useMemo } from 'react';
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
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import { Plus, GraduationCap, FileText, Award, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { ehsApi } from '@/api/ehs';
import { PageContainer } from '@/components/common/PageContainerV2';
import type { TrainingPlan, TrainingRecord, TrainingCertificate } from '@/api/ehs';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const TrainingPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [planFormData, setPlanFormData] = useState({
    title: '',
    training_type: 'safety',
    category: 'mandatory',
    description: '',
    trainer: '',
    location: '',
    duration_hours: '',
    max_participants: '',
    start_date: '',
    end_date: '',
  });

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: [...QUERY_KEYS.EHS.TRAINING_PLANS, searchTerm],
    queryFn: async () => {
      const response = await ehsApi.listTrainingPlans({
        pagesize: 100,
        search: searchTerm || undefined,
      });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data) ? data : data.data || [];
      }
      return [];
    },
  });
  const plans = (plansData as TrainingPlan[]) || [];

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.EHS.TRAINING_RECORDS, searchTerm],
    queryFn: async () => {
      const response = await ehsApi.listTrainingRecords({
        pagesize: 100,
        search: searchTerm || undefined,
      });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data) ? data : data.data || [];
      }
      return [];
    },
  });
  const records = (recordsData as TrainingRecord[]) || [];

  const { data: certificatesData, isLoading: certificatesLoading } = useQuery({
    queryKey: [...QUERY_KEYS.EHS.TRAINING_CERTIFICATES, searchTerm],
    queryFn: async () => {
      const response = await ehsApi.listTrainingCertificates({
        pagesize: 100,
        search: searchTerm || undefined,
      });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data) ? data : data.data || [];
      }
      return [];
    },
  });
  const certificates = (certificatesData as TrainingCertificate[]) || [];

  const loading = plansLoading || recordsLoading || certificatesLoading;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      draft: { bg: 'grey.100', color: 'text.secondary', label: t('ehs.training_page.text_22b433') },
      published: { bg: 'info.lighter', color: 'info.dark', label: t('ehs.training_page.text_dca0c1') },
      ongoing: { bg: 'warning.lighter', color: 'warning.dark', label: t('ehs.training_page.in_progress') },
      completed: { bg: 'success.lighter', color: 'success.dark', label: t('ehs.training_page.completed') },
      cancelled: { bg: 'error.lighter', color: 'error.dark', label: t('ehs.training_page.cancelled') },
      valid: { bg: 'success.lighter', color: 'success.dark', label: t('ehs.training_page.text_c6cc39') },
      expired: { bg: 'error.lighter', color: 'error.dark', label: t('ehs.training_page.text_4d5ccd') },
      revoked: { bg: 'grey.200', color: 'text.secondary', label: t('ehs.training_page.text_50239f') },
      failed: { bg: 'error.light', color: 'error.dark', label: t('ehs.training_page.text_4fcdbf') },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary', label: status };
    return (
      <Chip
        label={colors.label}
        size='small'
        sx={{ backgroundColor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

  const getTrainingTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      safety: t('ehs.training_page.text_7e89cf'),
      professional: t('ehs.training_page.text_6a13a6'),
      skill: t('ehs.training_page.text_9f5a93'),
      awareness: t('ehs.training_page.text_ee10d8'),
      emergency: t('ehs.training_page.text_48e7ed'),
    };
    return typeMap[type] || type;
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      mandatory: t('ehs.training_page.text_748fdd'),
      optional: t('ehs.training_page.text_2e6913'),
      onboarding: t('ehs.training_page.text_ee3d2c'),
      special: t('ehs.training_page.text_017049'),
    };
    return categoryMap[category] || category;
  };

  const planColumns: ColumnDef<TrainingPlan>[] = useMemo(
    () => [
      { id: 'plan_no', label: t('ehs.training_page.plan') },
      { id: 'title', label: t('ehs.training_page.name') },
      {
        id: 'training_type',
        label: t('ehs.training_page.type'),
        render: (row) => getTrainingTypeLabel(row.training_type),
      },
      { id: 'category', label: t('ehs.training_page.text_383a6d'), render: (row) => getCategoryLabel(row.category) },
      { id: 'trainer', label: t('ehs.training_page.text_e7bf21'), render: (row) => row.trainer || '-' },
      { id: 'start_date', label: t('ehs.training_page.start_date'), render: (row) => row.start_date || '-' },
      { id: 'status', label: t('ehs.training_page.status'), render: (row) => getStatusBadge(row.status) },
    ],
    []
  );

  const recordColumns: ColumnDef<TrainingRecord>[] = useMemo(
    () => [
      { id: 'record_no', label: t('ehs.training_page.text_4868f6') },
      { id: 'title', label: t('ehs.training_page.text_be89e2') },
      {
        id: 'training_type',
        label: t('ehs.training_page.type'),
        render: (row) => getTrainingTypeLabel(row.training_type),
      },
      { id: 'trainer', label: t('ehs.training_page.text_e7bf21'), render: (row) => row.trainer || '-' },
      { id: 'training_date', label: t('ehs.training_page.date'), render: (row) => row.training_date || '-' },
      { id: 'duration_hours', label: t('ehs.training_page.text_68f989'), render: (row) => row.duration_hours || '-' },
      { id: 'status', label: t('ehs.training_page.status'), render: (row) => getStatusBadge(row.status) },
    ],
    []
  );

  const certificateColumns: ColumnDef<TrainingCertificate>[] = useMemo(
    () => [
      { id: 'certificate_no', label: t('ehs.training_page.text_3d4bca') },
      { id: 'employee_name', label: t('ehs.training_page.text_50df90') },
      {
        id: 'training_type',
        label: t('ehs.training_page.type'),
        render: (row) => getTrainingTypeLabel(row.training_type),
      },
      { id: 'certificate_type', label: t('ehs.training_page.type_1') },
      { id: 'issue_date', label: t('ehs.training_page.date_1'), render: (row) => row.issue_date || '-' },
      { id: 'expiry_date', label: t('ehs.training_page.text_6460f4'), render: (row) => row.expiry_date || '-' },
      { id: 'status', label: t('ehs.training_page.status'), render: (row) => getStatusBadge(row.status) },
    ],
    []
  );

  const currentColumns =
    activeTab === 0 ? planColumns : activeTab === 1 ? recordColumns : certificateColumns;
  const currentData = activeTab === 0 ? plans : activeTab === 1 ? records : certificates;

  const stats = useMemo(
    () => ({
      totalPlans: plans.length,
      ongoingPlans: plans.filter((p) => p.status === 'ongoing').length,
      completedRecords: records.filter((r) => r.status === 'completed').length,
      validCertificates: certificates.filter((c) => c.status === 'valid').length,
    }),
    [plans, records, certificates]
  );

  const filters = useMemo(
    () => [
      {
        id: 'status',
        label: t('ehs.training_page.status'),
        type: 'select' as const,
        options: [
          { value: 'all', label: t('ehs.training_page.all') },
          { value: 'draft', label: t('ehs.training_page.text_22b433') },
          { value: 'published', label: t('ehs.training_page.text_dca0c1') },
          { value: 'ongoing', label: t('ehs.training_page.in_progress') },
          { value: 'completed', label: t('ehs.training_page.completed') },
          { value: 'cancelled', label: t('ehs.training_page.cancelled') },
        ],
        value: statusFilter,
        onChange: (value: unknown) => setStatusFilter(value as string),
      },
    ],
    [statusFilter]
  );

  const handleCreate = () => {
    setPlanFormData({
      title: '',
      training_type: 'safety',
      category: 'mandatory',
      description: '',
      trainer: '',
      location: '',
      duration_hours: '',
      max_participants: '',
      start_date: '',
      end_date: '',
    });
    setShowCreateModal(true);
  };

  const createPlanMutation = useMutation({
    mutationFn: (data: Parameters<typeof ehsApi.createTrainingPlan>[0]) =>
      ehsApi.createTrainingPlan(data),
    onSuccess: () => {
      addNotification({ title: t('ehs.training_page.success'), message: t('ehs.training_page.create'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.TRAINING_PLANS });
      setShowCreateModal(false);
    },
    onError: (error: unknown) => {
      addNotification({ title: t('ehs.training_page.error'), message: t('ehs.training_page.create_1'), type: 'error' });
      apiLogger.error(t('ehs.training_page.create_2'), error);
    },
  });

  const handleSavePlan = () => {
    createPlanMutation.mutate({
      title: planFormData.title,
      training_type: planFormData.training_type,
      category: planFormData.category,
      description: planFormData.description || null,
      trainer: planFormData.trainer || null,
      location: planFormData.location || null,
      duration_hours: planFormData.duration_hours ? Number(planFormData.duration_hours) : null,
      max_participants: planFormData.max_participants
        ? Number(planFormData.max_participants)
        : null,
      start_date: planFormData.start_date || null,
      end_date: planFormData.end_date || null,
    });
  };

  const headerActions = [
    {
      label: t('ehs.training_page.plan_1'),
      icon: <Plus style={{ width: 18, height: 18 }} />,
      onClick: handleCreate,
      variant: 'contained' as const,
      color: 'primary' as const,
    },
  ];

  return (
    <PageContainer
      headerProps={{
        actions: headerActions,
        pageIcon: <GraduationCap sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <Card sx={{ bgcolor: 'primary.light' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.lighter',
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
                  培训计划
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.totalPlans}
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
                  bgcolor: 'warning.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Search sx={{ width: 20, height: 20, color: 'warning.dark' }} />
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
                  {stats.ongoingPlans}
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
                <FileText sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  已完成培训
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.completedRecords}
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
                  bgcolor: 'info.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award sx={{ width: 20, height: 20, color: 'info.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  有效证书
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.validCertificates}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label={t('ehs.training_page.plan_2')} />
          <Tab label={t('ehs.training_page.text_6a18d7')} />
          <Tab label={t('ehs.training_page.text_400100')} />
        </Tabs>
      </Card>

      <ListPageTemplate
        title=''
        columns={currentColumns as unknown as ColumnDef<unknown>[]}
        data={currentData as unknown[]}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('ehs.training_page.search')}
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.TRAINING_PLANS });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.TRAINING_RECORDS });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.TRAINING_CERTIFICATES });
        }}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新建培训计划</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={t('ehs.training_page.name_1')}
              value={planFormData.title}
              onChange={(e) => setPlanFormData({ ...planFormData, title: e.target.value })}
              placeholder={t('ehs.training_page.please_input')}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>培训类型 *</InputLabel>
                <Select
                  value={planFormData.training_type}
                  label={t('ehs.training_page.type')}
                  onChange={(e) =>
                    setPlanFormData({ ...planFormData, training_type: e.target.value })
                  }
                >
                  <MenuItem value='safety'>安全培训</MenuItem>
                  <MenuItem value='professional'>专业培训</MenuItem>
                  <MenuItem value='skill'>技能培训</MenuItem>
                  <MenuItem value='awareness'>意识培训</MenuItem>
                  <MenuItem value='emergency'>应急培训</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>类别 *</InputLabel>
                <Select
                  value={planFormData.category}
                  label={t('ehs.training_page.text_383a6d')}
                  onChange={(e) => setPlanFormData({ ...planFormData, category: e.target.value })}
                >
                  <MenuItem value='mandatory'>必修</MenuItem>
                  <MenuItem value='optional'>选修</MenuItem>
                  <MenuItem value='onboarding'>入职培训</MenuItem>
                  <MenuItem value='special'>专项培训</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label={t('ehs.training_page.text_e7bf21')}
                value={planFormData.trainer}
                onChange={(e) => setPlanFormData({ ...planFormData, trainer: e.target.value })}
                placeholder={t('ehs.training_page.please_input_1')}
              />
              <TextField
                fullWidth
                label={t('ehs.training_page.text_ebdf54')}
                value={planFormData.location}
                onChange={(e) => setPlanFormData({ ...planFormData, location: e.target.value })}
                placeholder={t('ehs.training_page.please_input_2')}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                type='date'
                label={t('ehs.training_page.start_date')}
                value={planFormData.start_date}
                onChange={(e) => setPlanFormData({ ...planFormData, start_date: e.target.value })}
              />
              <TextField
                fullWidth
                type='date'
                label={t('ehs.training_page.end_date')}
                value={planFormData.end_date}
                onChange={(e) => setPlanFormData({ ...planFormData, end_date: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                type='number'
                label={t('ehs.training_page.text_8a07e0')}
                value={planFormData.duration_hours}
                onChange={(e) =>
                  setPlanFormData({ ...planFormData, duration_hours: e.target.value })
                }
                placeholder={t('ehs.training_page.please_input_3')}
              />
              <TextField
                fullWidth
                type='number'
                label={t('ehs.training_page.text_290444')}
                value={planFormData.max_participants}
                onChange={(e) =>
                  setPlanFormData({ ...planFormData, max_participants: e.target.value })
                }
                placeholder={t('ehs.training_page.please_input_4')}
              />
            </Box>
            <TextField
              fullWidth
              label={t('ehs.training_page.description')}
              value={planFormData.description}
              onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
              placeholder={t('ehs.training_page.please_input_5')}
              multiline
              rows={3}
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
            onClick={handleSavePlan}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default TrainingPage;
