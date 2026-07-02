import React, { useState, useEffect, useCallback } from 'react';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
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
import type { SafetyIssue, Rectification, Verification } from '@/api/ehs';
import { useAppStore } from '@/store';

const EhsHazardPage: React.FC = () => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<SafetyIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
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
  const addNotification = useAppStore((state) => state.addNotification);
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

  const loadIssues = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ehsApi.listSafetyIssues({ pagesize: 100 });
      if (response.success && response.data) {
        const issuesData = Array.isArray(response.data) ? response.data : response.data.data || [];
        const adapted = issuesData.map((item: SafetyIssue) => ({
          ...item,
          status: translateStatus(item.status),
        }));
        setIssues(adapted);
      } else {
        setIssues([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载隐患列表失败:', err);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const loadIssueDetail = async (issueId: string) => {
    try {
      const response = await ehsApi.getSafetyIssue(issueId);
      if (response.success && response.data) {
        const data = response.data as any;
        setSelectedIssue(data.hazard);
        setRectification(data.rectification || null);
        setVerification(data.verification || null);
      }
    } catch (err: unknown) {
      apiLogger.error('加载隐患详情失败:', err);
    }
  };

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      reported: '待整改',
      rectifying: '整改中',
      pending_verification: '待验收',
      verified: '已验收',
      closed: '已闭环',
      rejected: '已驳回',
    };
    return statusMap[status] || status;
  };

  const getLevelLabel = (level: string) => {
    const levelMap: Record<string, string> = {
      major: '重大隐患',
      serious: '严重隐患',
      general: '一般隐患',
      minor: '轻微隐患',
    };
    return levelMap[level] || level;
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      equipment: '设备隐患',
      environment: '环境隐患',
      behavior: '行为隐患',
      management: '管理隐患',
      fire: '消防隐患',
      electrical: '电气隐患',
      chemical: '化学品隐患',
      structural: '结构隐患',
    };
    return categoryMap[category] || category;
  };

  const getSourceLabel = (source: string) => {
    const sourceMap: Record<string, string> = {
      inspection: '检查发现',
      reporting: '员工上报',
      audit: '审计发现',
      accident: '事故排查',
      monitoring: '监测预警',
    };
    return sourceMap[source] || source;
  };

  const getLevelBadge = (level: string) => {
    const levelMap: Record<string, { bg: string; color: string; label: string }> = {
      major: { bg: 'error.lighter', color: 'error.dark', label: '重大' },
      serious: { bg: 'error.light', color: 'error.darker', label: '严重' },
      general: { bg: 'warning.100', color: '#ca8a04', label: '一般' },
      minor: { bg: 'success.lighter', color: 'success.dark', label: '轻微' },
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
      整改中: { bg: 'warning.100', color: '#ca8a04' },
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
    { id: 'hazard_no', label: '隐患编号' },
    { id: 'title', label: '隐患名称' },
    {
      id: 'level',
      label: '等级',
      render: (row) => getLevelBadge(row.level),
    },
    {
      id: 'category',
      label: '类别',
      render: (row) => getCategoryLabel(row.category),
    },
    {
      id: 'location',
      label: '位置',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <MapPin style={{ width: 14, height: 14 }} />
          {row.location || '-'}
        </Box>
      ),
    },
    {
      id: 'source',
      label: '来源',
      render: (row) => getSourceLabel(row.source),
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'actions',
      label: '操作',
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
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.hazard_no.toLowerCase().includes(searchTerm.toLowerCase());
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

  const handleSave = async () => {
    try {
      await ehsApi.createSafetyIssue({
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        level: formData.level,
        source: formData.source,
        location: formData.location || null,
        reported_by: formData.reported_by || null,
      });
      addNotification({ title: '成功', message: '隐患上报成功', type: 'success' });
      setShowCreateModal(false);
      loadIssues();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '上报失败', type: 'error' });
      apiLogger.error('创建隐患失败:', err);
    }
  };

  const handleStartRectification = () => {
    setRectificationFormData({
      description: '',
      responsible: '',
      deadline: '',
    });
    setShowRectificationModal(true);
  };

  const handleSaveRectification = async () => {
    if (!selectedIssue) return;
    try {
      await ehsApi.startRectification(selectedIssue.id, {
        description: rectificationFormData.description,
        responsible: rectificationFormData.responsible || null,
        deadline: rectificationFormData.deadline || null,
      });
      addNotification({ title: '成功', message: '整改任务创建成功', type: 'success' });
      setShowRectificationModal(false);
      await loadIssueDetail(selectedIssue.id);
      loadIssues();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建整改任务失败:', err);
    }
  };

  const handleSubmitRectification = async () => {
    if (!selectedIssue) return;
    try {
      await ehsApi.submitRectification(selectedIssue.id);
      addNotification({ title: '成功', message: '整改完成，等待验收', type: 'success' });
      await loadIssueDetail(selectedIssue.id);
      loadIssues();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '提交失败', type: 'error' });
      apiLogger.error('提交整改失败:', err);
    }
  };

  const handleStartVerification = () => {
    setVerificationFormData({
      verifier: '',
      result: 'passed',
      remarks: '',
    });
    setShowVerificationModal(true);
  };

  const handleSaveVerification = async () => {
    if (!selectedIssue) return;
    try {
      await ehsApi.verifySafetyIssue(selectedIssue.id, {
        verifier: verificationFormData.verifier || null,
        result: verificationFormData.result,
        remarks: verificationFormData.remarks || null,
      });
      addNotification({ title: '成功', message: '验收完成', type: 'success' });
      setShowVerificationModal(false);
      await loadIssueDetail(selectedIssue.id);
      loadIssues();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '验收失败', type: 'error' });
      apiLogger.error('验收失败:', err);
    }
  };

  const handleCloseIssue = async () => {
    if (!selectedIssue) return;
    try {
      await ehsApi.closeSafetyIssue(selectedIssue.id);
      addNotification({ title: '成功', message: '隐患已闭环', type: 'success' });
      setShowDetailModal(false);
      loadIssues();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '闭环失败', type: 'error' });
      apiLogger.error('闭环失败:', err);
    }
  };

  const stats = {
    total: issues.length,
    major: issues.filter((i) => i.level === 'major').length,
    serious: issues.filter((i) => i.level === 'serious').length,
    pending: issues.filter((i) => i.status === '待整改').length,
    rectifying: issues.filter((i) => i.status === '整改中').length,
    pendingVerification: issues.filter((i) => i.status === '待验收').length,
    closed: issues.filter((i) => i.status === '已闭环').length,
  };

  const filters = [
    {
      id: 'level',
      label: '隐患等级',
      type: 'select' as const,
      options: [
        { label: '全部', value: 'all' },
        { label: '重大', value: 'major' },
        { label: '严重', value: 'serious' },
        { label: '一般', value: 'general' },
        { label: '轻微', value: 'minor' },
      ],
      value: levelFilter,
      onChange: (value: string) => setLevelFilter(value),
    },
    {
      id: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { label: '全部', value: 'all' },
        { label: '待整改', value: '待整改' },
        { label: '整改中', value: '整改中' },
        { label: '待验收', value: '待验收' },
        { label: '已验收', value: '已验收' },
        { label: '已闭环', value: '已闭环' },
        { label: '已驳回', value: '已驳回' },
      ],
      value: statusFilter,
      onChange: (value: string) => setStatusFilter(value),
    },
  ];

  const steps = ['隐患上报', '整改中', '待验收', '已验收', '已闭环'];

  const headerActions = [
    {
      label: '上报隐患',
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
        pageGradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
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
                <Clock sx={{ width: 20, height: 20, color: '#ca8a04' }} />
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
        searchPlaceholder='搜索隐患名称或编号...'
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        emptyMessage='暂无隐患记录'
        onRefresh={loadIssues}
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
              label='隐患名称 *'
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder='请输入隐患名称'
            />
            <TextField
              fullWidth
              label='隐患描述'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='请描述隐患详情'
              multiline
              rows={3}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>隐患类别 *</InputLabel>
                <Select
                  value={formData.category}
                  label='隐患类别'
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
                  label='隐患等级'
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
                  label='来源'
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
                label='位置'
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder='请输入隐患位置'
              />
            </Box>
            <TextField
              fullWidth
              label='上报人'
              value={formData.reported_by}
              onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
              placeholder='请输入上报人姓名'
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
                      <FileEdit sx={{ width: 18, height: 18, color: '#ca8a04' }} />
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
                          {rectification.status === 'in_progress' ? '整改中' : '已完成'}
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
                              label='验收通过'
                              size='small'
                              sx={{ bgcolor: 'success.lighter', color: 'success.dark' }}
                            />
                          ) : (
                            <Chip
                              label='验收未通过'
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
              {selectedIssue.status === '待整改' && (
                <Button
                  variant='contained'
                  onClick={handleStartRectification}
                  sx={{ bgcolor: '#ca8a04' }}
                >
                  开始整改
                </Button>
              )}
              {selectedIssue.status === '整改中' && (
                <Button
                  variant='contained'
                  onClick={handleSubmitRectification}
                  sx={{ bgcolor: 'primary.dark' }}
                >
                  提交整改
                </Button>
              )}
              {selectedIssue.status === '待验收' && (
                <Button
                  variant='contained'
                  onClick={handleStartVerification}
                  sx={{ bgcolor: 'success.dark' }}
                >
                  开始验收
                </Button>
              )}
              {selectedIssue.status === '已验收' && (
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
              label='整改措施 *'
              value={rectificationFormData.description}
              onChange={(e) =>
                setRectificationFormData({
                  ...rectificationFormData,
                  description: e.target.value,
                })
              }
              placeholder='请输入具体的整改措施'
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label='整改负责人 *'
              value={rectificationFormData.responsible}
              onChange={(e) =>
                setRectificationFormData({
                  ...rectificationFormData,
                  responsible: e.target.value,
                })
              }
              placeholder='请输入整改负责人姓名'
            />
            <TextField
              fullWidth
              type='date'
              label='整改期限 *'
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
            sx={{ bgcolor: '#ca8a04' }}
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
              label='验收人 *'
              value={verificationFormData.verifier}
              onChange={(e) =>
                setVerificationFormData({
                  ...verificationFormData,
                  verifier: e.target.value,
                })
              }
              placeholder='请输入验收人姓名'
            />
            <FormControl fullWidth>
              <InputLabel>验收结果 *</InputLabel>
              <Select
                value={verificationFormData.result}
                label='验收结果'
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
              label='验收备注'
              value={verificationFormData.remarks}
              onChange={(e) =>
                setVerificationFormData({
                  ...verificationFormData,
                  remarks: e.target.value,
                })
              }
              placeholder='请输入验收意见'
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
