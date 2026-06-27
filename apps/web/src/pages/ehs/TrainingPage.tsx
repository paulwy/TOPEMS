import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { ehsApi } from '@/api/ehs';
import { PageContainer } from '@/components/common';
import type { TrainingPlan, TrainingRecord, TrainingCertificate } from '@/api/ehs';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';

const TrainingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [certificates, setCertificates] = useState<TrainingCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const addNotification = useAppStore((state) => state.addNotification);

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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [plansRes, recordsRes, certsRes] = await Promise.all([
        ehsApi.listTrainingPlans({ page_size: 100, search: searchTerm || undefined }),
        ehsApi.listTrainingRecords({ page_size: 100, search: searchTerm || undefined }),
        ehsApi.listTrainingCertificates({ page_size: 100, search: searchTerm || undefined }),
      ]);

      if (plansRes.success && plansRes.data) {
        const data = plansRes.data as any;
        setPlans(Array.isArray(data) ? data : data.data || []);
      }
      if (recordsRes.success && recordsRes.data) {
        const data = recordsRes.data as any;
        setRecords(Array.isArray(data) ? data : data.data || []);
      }
      if (certsRes.success && certsRes.data) {
        const data = certsRes.data as any;
        setCertificates(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err: unknown) {
      apiLogger.error('加载培训数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      draft: { bg: 'grey.100', color: 'text.secondary', label: '草稿' },
      published: { bg: 'info.lighter', color: 'info.dark', label: '已发布' },
      ongoing: { bg: 'warning.lighter', color: 'warning.dark', label: '进行中' },
      completed: { bg: 'success.lighter', color: 'success.dark', label: '已完成' },
      cancelled: { bg: 'error.lighter', color: 'error.dark', label: '已取消' },
      valid: { bg: 'success.lighter', color: 'success.dark', label: '有效' },
      expired: { bg: 'error.lighter', color: 'error.dark', label: '已过期' },
      revoked: { bg: 'grey.200', color: 'text.secondary', label: '已撤销' },
      failed: { bg: 'error.light', color: 'error.dark', label: '未通过' },
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
      safety: '安全培训',
      professional: '专业培训',
      skill: '技能培训',
      awareness: '意识培训',
      emergency: '应急培训',
    };
    return typeMap[type] || type;
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      mandatory: '必修',
      optional: '选修',
      onboarding: '入职培训',
      special: '专项培训',
    };
    return categoryMap[category] || category;
  };

  const planColumns: ColumnDef<TrainingPlan>[] = useMemo(
    () => [
      { id: 'plan_no', label: '计划编号' },
      { id: 'title', label: '计划名称' },
      {
        id: 'training_type',
        label: '培训类型',
        render: (row) => getTrainingTypeLabel(row.training_type),
      },
      { id: 'category', label: '类别', render: (row) => getCategoryLabel(row.category) },
      { id: 'trainer', label: '培训师', render: (row) => row.trainer || '-' },
      { id: 'start_date', label: '开始日期', render: (row) => row.start_date || '-' },
      { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
    ],
    []
  );

  const recordColumns: ColumnDef<TrainingRecord>[] = useMemo(
    () => [
      { id: 'record_no', label: '记录编号' },
      { id: 'title', label: '培训主题' },
      {
        id: 'training_type',
        label: '培训类型',
        render: (row) => getTrainingTypeLabel(row.training_type),
      },
      { id: 'trainer', label: '培训师', render: (row) => row.trainer || '-' },
      { id: 'training_date', label: '培训日期', render: (row) => row.training_date || '-' },
      { id: 'duration_hours', label: '时长(小时)', render: (row) => row.duration_hours || '-' },
      { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
    ],
    []
  );

  const certificateColumns: ColumnDef<TrainingCertificate>[] = useMemo(
    () => [
      { id: 'certificate_no', label: '证书编号' },
      { id: 'employee_name', label: '员工姓名' },
      {
        id: 'training_type',
        label: '培训类型',
        render: (row) => getTrainingTypeLabel(row.training_type),
      },
      { id: 'certificate_type', label: '证书类型' },
      { id: 'issue_date', label: '发证日期', render: (row) => row.issue_date || '-' },
      { id: 'expiry_date', label: '有效期至', render: (row) => row.expiry_date || '-' },
      { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
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
        label: '状态',
        type: 'select' as const,
        options: [
          { value: 'all', label: '全部' },
          { value: 'draft', label: '草稿' },
          { value: 'published', label: '已发布' },
          { value: 'ongoing', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
        value: statusFilter,
        onChange: (value: string) => setStatusFilter(value),
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

  const handleSavePlan = async () => {
    try {
      await ehsApi.createTrainingPlan({
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
      addNotification({ title: '成功', message: '培训计划创建成功', type: 'success' });
      setShowCreateModal(false);
      loadData();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建培训计划失败:', err);
    }
  };

  const headerActions = [
    {
      label: '新建计划',
      icon: <Plus style={{ width: 18, height: 18 }} />,
      onClick: handleCreate,
      variant: 'contained' as const,
      color: 'primary' as const,
    },
  ];

  return (
    <PageContainer
      title='培训管理'
      subtitle='Training Management'
      headerProps={{
        actions: headerActions,
        pageIcon: <GraduationCap sx={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
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
                  borderRadius: 2,
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
                  borderRadius: 2,
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
                  borderRadius: 2,
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
                  borderRadius: 2,
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
          <Tab label='培训计划' />
          <Tab label='培训记录' />
          <Tab label='证书管理' />
        </Tabs>
      </Card>

      <ListPageTemplate
        title=''
        columns={currentColumns as any}
        data={currentData as any}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索...'
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        onRefresh={loadData}
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
              label='计划名称 *'
              value={planFormData.title}
              onChange={(e) => setPlanFormData({ ...planFormData, title: e.target.value })}
              placeholder='请输入计划名称'
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>培训类型 *</InputLabel>
                <Select
                  value={planFormData.training_type}
                  label='培训类型'
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
                  label='类别'
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
                label='培训师'
                value={planFormData.trainer}
                onChange={(e) => setPlanFormData({ ...planFormData, trainer: e.target.value })}
                placeholder='请输入培训师姓名'
              />
              <TextField
                fullWidth
                label='培训地点'
                value={planFormData.location}
                onChange={(e) => setPlanFormData({ ...planFormData, location: e.target.value })}
                placeholder='请输入培训地点'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                type='date'
                label='开始日期'
                value={planFormData.start_date}
                onChange={(e) => setPlanFormData({ ...planFormData, start_date: e.target.value })}
              />
              <TextField
                fullWidth
                type='date'
                label='结束日期'
                value={planFormData.end_date}
                onChange={(e) => setPlanFormData({ ...planFormData, end_date: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                type='number'
                label='课时数'
                value={planFormData.duration_hours}
                onChange={(e) =>
                  setPlanFormData({ ...planFormData, duration_hours: e.target.value })
                }
                placeholder='请输入课时数'
              />
              <TextField
                fullWidth
                type='number'
                label='最大人数'
                value={planFormData.max_participants}
                onChange={(e) =>
                  setPlanFormData({ ...planFormData, max_participants: e.target.value })
                }
                placeholder='请输入最大人数'
              />
            </Box>
            <TextField
              fullWidth
              label='培训描述'
              value={planFormData.description}
              onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
              placeholder='请输入培训描述'
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
