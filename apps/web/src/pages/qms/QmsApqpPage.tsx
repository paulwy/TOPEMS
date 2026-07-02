import React, { useState, useEffect } from 'react';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Plus,
  Eye,
  ChevronRight,
  Layers,
  ListTodo,
  ShieldAlert,
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
} from '@mui/material';

import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { qmsApi } from '@/api/qms';
import type { ApqpProject, ApqpPhase, ApqpTask, ApqpRisk, ApqpProgressStatistics } from '@/api/qms';
import { useAppStore } from '@/store';

const QmsApqpPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ApqpProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ApqpProject | null>(null);
  const [phases, setPhases] = useState<ApqpPhase[]>([]);
  const [tasks, setTasks] = useState<ApqpTask[]>([]);
  const [risks, setRisks] = useState<ApqpRisk[]>([]);
  const [progress, setProgress] = useState<ApqpProgressStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTab, setDetailTab] = useState(0);
  const [formData, setFormData] = useState({
    project_name: '',
    product_name: '',
    customer: '',
    description: '',
    leader: '',
    team: '',
    start_date: '',
    target_date: '',
  });
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await qmsApi.listApqpProjects();
      if (response.success && response.data) {
        const data = response.data as any;
        const projectsArray = Array.isArray(data) ? data : data.projects || [];
        setProjects(projectsArray);
      } else if (!response.success) {
        addNotification({
          title: '加载失败',
          message: response.message || '加载APQP项目失败',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      apiLogger.error('加载APQP项目失败:', error);
      addNotification({
        title: '加载失败',
        message: '加载APQP项目失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDetails = async (projectId: string) => {
    try {
      const [phasesRes, tasksRes, risksRes, progressRes] = await Promise.all([
        qmsApi.listApqpPhases(projectId),
        qmsApi.listApqpTasks({ project_id: projectId }),
        qmsApi.listApqpRisks({ project_id: projectId }),
        qmsApi.getApqpProgress(projectId),
      ]);

      if (phasesRes.success && phasesRes.data) {
        const data = phasesRes.data as any;
        setPhases(Array.isArray(data) ? data : data.phases || []);
      }

      if (tasksRes.success && tasksRes.data) {
        const data = tasksRes.data as any;
        setTasks(Array.isArray(data) ? data : data.tasks || []);
      }

      if (risksRes.success && risksRes.data) {
        const data = risksRes.data as any;
        setRisks(Array.isArray(data) ? data : data.risks || []);
      }

      if (progressRes.success && progressRes.data) {
        setProgress(progressRes.data);
      }
    } catch (error: unknown) {
      apiLogger.error('加载项目详情失败:', error);
    }
  };

  const handleSelectProject = async (project: ApqpProject) => {
    setSelectedProject(project);
    await loadProjectDetails(project.id);
    setShowDetailModal(true);
  };

  const handleCreateProject = async () => {
    try {
      setSubmitting(true);
      const response = await qmsApi.createApqpProject({
        project_name: formData.project_name,
        product_name: formData.product_name,
        customer: formData.customer,
        description: formData.description,
        leader: formData.leader,
        team: formData.team,
        start_date: formData.start_date,
        target_date: formData.target_date,
      });
      if (response.success) {
        addNotification({
          title: '成功',
          message: 'APQP项目创建成功',
          type: 'success',
        });
        setShowAddModal(false);
        loadProjects();
        resetForm();
      } else {
        addNotification({
          title: '失败',
          message: response.message || '创建APQP项目失败',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      apiLogger.error('创建APQP项目失败:', error);
      addNotification({
        title: '错误',
        message: '创建APQP项目时发生错误',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      project_name: '',
      product_name: '',
      customer: '',
      description: '',
      leader: '',
      team: '',
      start_date: '',
      target_date: '',
    });
  };

  const getStatusBadge = (status?: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      planning: { bg: 'primary.100', color: 'primary.dark', label: '策划中' },
      策划中: { bg: 'primary.100', color: 'primary.dark', label: '策划中' },
      developing: { bg: 'warning.100', color: '#ca8a04', label: '开发中' },
      开发中: { bg: 'warning.100', color: '#ca8a04', label: '开发中' },
      verifying: { bg: 'secondary.100', color: 'secondary.dark', label: '验证中' },
      验证中: { bg: 'secondary.100', color: 'secondary.dark', label: '验证中' },
      released: { bg: 'success.lighter', color: 'success.dark', label: '已发布' },
      已发布: { bg: 'success.lighter', color: 'success.dark', label: '已发布' },
      closed: { bg: 'grey.100', color: 'text.secondary', label: '已关闭' },
      已关闭: { bg: 'grey.100', color: 'text.secondary', label: '已关闭' },
      pending: { bg: 'grey.100', color: 'grey.500', label: '待开始' },
      待开始: { bg: 'grey.100', color: 'grey.500', label: '待开始' },
      in_progress: { bg: 'warning.100', color: '#ca8a04', label: '进行中' },
      进行中: { bg: 'warning.100', color: '#ca8a04', label: '进行中' },
      completed: { bg: 'success.lighter', color: 'success.dark', label: '已完成' },
      已完成: { bg: 'success.lighter', color: 'success.dark', label: '已完成' },
      open: { bg: 'error.lighter', color: 'error.dark', label: '开放' },
      mitigated: { bg: 'warning.100', color: '#ca8a04', label: '已缓解' },
      closed_risk: { bg: 'success.lighter', color: 'success.dark', label: '已关闭' },
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

  const getRiskLevelBadge = (level?: string) => {
    const levelMap: Record<string, { bg: string; color: string; label: string }> = {
      low: { bg: 'success.lighter', color: 'success.dark', label: '低' },
      medium: { bg: 'warning.100', color: '#ca8a04', label: '中' },
      high: { bg: 'error.lighter', color: 'error.dark', label: '高' },
    };
    const item = levelMap[level || ''] || {
      bg: 'grey.100',
      color: 'text.secondary',
      label: level || '-',
    };
    return (
      <Chip
        label={item.label}
        size='small'
        sx={{ backgroundColor: item.bg, color: item.color }}
      />
    );
  };

  const getRiskSeverityBadge = (rpn?: number) => {
    if (!rpn)
      return (
        <Chip
          label='-'
          size='small'
          sx={{ backgroundColor: 'grey.100', color: 'text.secondary' }}
        />
      );
    if (rpn >= 100) {
      return (
        <Chip
          label={`高 (${rpn})`}
          size='small'
          sx={{ backgroundColor: 'error.lighter', color: 'error.dark' }}
        />
      );
    }
    if (rpn >= 36) {
      return (
        <Chip
          label={`中 (${rpn})`}
          size='small'
          sx={{ backgroundColor: 'warning.100', color: '#ca8a04' }}
        />
      );
    }
    return (
      <Chip
        label={`低 (${rpn})`}
        size='small'
        sx={{ backgroundColor: 'success.lighter', color: 'success.dark' }}
      />
    );
  };

  const columns: ColumnDef<ApqpProject>[] = [
    {
      id: 'project_no',
      label: '项目编号',
      render: (row) => (
        <Typography sx={{ fontWeight: 600, color: 'primary.dark' }}>{row.project_no}</Typography>
      ),
    },
    {
      id: 'project_name',
      label: '项目名称',
      render: (row) => (
        <Typography sx={{ fontWeight: 500, color: 'slate.900' }}>{row.project_name}</Typography>
      ),
    },
    {
      id: 'product_name',
      label: '产品名称',
      render: (row) => row.product_name || '-',
    },
    {
      id: 'customer',
      label: '客户',
      render: (row) => row.customer || '-',
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'progress',
      label: '进度',
      render: (row) => (
        <Box sx={{ width: 100 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {row.progress || 0}%
            </Typography>
          </Box>
          <LinearProgress
            variant='determinate'
            value={row.progress || 0}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      ),
    },
    {
      id: 'leader',
      label: '负责人',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            component={Users}
            sx={{ fontSize: 16 }}
          />
          <Typography>{row.leader || '-'}</Typography>
        </Box>
      ),
    },
    {
      id: 'target_date',
      label: '目标日期',
      render: (row) => (
        <span>{row.target_date ? new Date(row.target_date).toLocaleDateString('zh-CN') : '-'}</span>
      ),
    },
    {
      id: 'actions',
      label: '操作',
      render: (row) => (
        <Button
          variant='text'
          size='small'
          onClick={() => handleSelectProject(row)}
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

  const stats = {
    total: projects.length,
    planning: projects.filter((p) => p.status === 'planning').length,
    developing: projects.filter((p) => p.status === 'developing').length,
    verifying: projects.filter((p) => p.status === 'verifying').length,
    released: projects.filter((p) => p.status === 'released').length,
  };

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const openRisks = risks.filter((r) => r.status === 'open').length;
  const highRisks = risks.filter((r) => (r.rpn || 0) >= 100).length;

  const phaseColumns: ColumnDef<ApqpPhase>[] = [
    { id: 'phase_name', label: '阶段名称', render: (row) => row.phase_name },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'progress',
      label: '进度',
      render: (row) => (
        <Box sx={{ width: 100 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {row.progress || 0}%
            </Typography>
          </Box>
          <LinearProgress
            variant='determinate'
            value={row.progress || 0}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      ),
    },
    {
      id: 'start_date',
      label: '开始日期',
      render: (row) =>
        row.start_date ? new Date(row.start_date).toLocaleDateString('zh-CN') : '-',
    },
    {
      id: 'end_date',
      label: '结束日期',
      render: (row) => (row.end_date ? new Date(row.end_date).toLocaleDateString('zh-CN') : '-'),
    },
  ];

  const taskColumns: ColumnDef<ApqpTask>[] = [
    { id: 'task_name', label: '任务名称', render: (row) => row.task_name },
    {
      id: 'task_type',
      label: '类型',
      render: (row) => row.task_type || '-',
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    { id: 'assignee', label: '负责人', render: (row) => row.assignee || '-' },
    {
      id: 'due_date',
      label: '截止日期',
      render: (row) => (row.due_date ? new Date(row.due_date).toLocaleDateString('zh-CN') : '-'),
    },
    { id: 'deliverable', label: '交付物', render: (row) => row.deliverable || '-' },
  ];

  const riskColumns: ColumnDef<ApqpRisk>[] = [
    { id: 'risk_name', label: '风险名称', render: (row) => row.risk_name },
    {
      id: 'risk_category',
      label: '类别',
      render: (row) => row.risk_category || '-',
    },
    {
      id: 'rpn',
      label: '风险等级',
      render: (row) => getRiskSeverityBadge(row.rpn),
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    { id: 'responsible', label: '负责人', render: (row) => row.responsible || '-' },
    {
      id: 'target_date',
      label: '目标日期',
      render: (row) =>
        row.target_date ? new Date(row.target_date).toLocaleDateString('zh-CN') : '-',
    },
  ];

  return (
    <PageContainer
      title='APQP 产品质量先期策划'
      subtitle='Advanced Product Quality Planning'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        backButton={{
          href: '/qms',
          onClick: () => navigate('/qms'),
        }}
        columns={columns}
        data={projects}
        loading={loading}
        actions={[
          {
            label: '创建项目',
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
                    <Typography sx={{ color: '#93c5fd', fontSize: '0.875rem' }}>
                      项目总数
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    >
                      {stats.total}
                    </Typography>
                  </Box>
                  <ClipboardList sx={{ width: 40, height: 40, color: '#93c5fd' }} />
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
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
                    <Typography sx={{ color: '#bfdbfe', fontSize: '0.875rem' }}>策划中</Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    >
                      {stats.planning}
                    </Typography>
                  </Box>
                  <Layers sx={{ width: 40, height: 40, color: '#bfdbfe' }} />
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: 'linear-gradient(135deg, warning.main 0%, #ea580c 100%)',
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
                    <Typography sx={{ color: 'warning.light', fontSize: '0.875rem' }}>
                      开发中
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    >
                      {stats.developing}
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ width: 40, height: 40, color: 'warning.light' }} />
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
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
                    <Typography sx={{ color: 'secondary.100', fontSize: '0.875rem' }}>验证中</Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    >
                      {stats.verifying}
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ width: 40, height: 40, color: 'secondary.100' }} />
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: 'linear-gradient(135deg, #22c55e 0%, success.main 100%)',
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
                    <Typography sx={{ color: 'success.light', fontSize: '0.875rem' }}>
                      已发布
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    >
                      {stats.released}
                    </Typography>
                  </Box>
                  <Clock sx={{ width: 40, height: 40, color: 'success.light' }} />
                </Box>
              </CardContent>
            </Card>
          </Box>
        }
        emptyMessage='暂无APQP项目'
        onRefresh={loadProjects}
      />

      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>创建APQP项目</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  项目名称 *
                </Typography>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.project_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, project_name: e.target.value }))
                  }
                  placeholder='请输入项目名称'
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  产品名称
                </Typography>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.product_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, product_name: e.target.value }))
                  }
                  placeholder='请输入产品名称'
                />
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  客户
                </Typography>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.customer}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, customer: e.target.value }))
                  }
                  placeholder='请输入客户名称'
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  负责人
                </Typography>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.leader}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, leader: e.target.value }))
                  }
                  placeholder='请输入负责人'
                />
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  开始日期
                </Typography>
                <TextField
                  type='date'
                  size='small'
                  fullWidth
                  value={formData.start_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, start_date: e.target.value }))
                  }
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  目标日期
                </Typography>
                <TextField
                  type='date'
                  size='small'
                  fullWidth
                  value={formData.target_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, target_date: e.target.value }))
                  }
                />
              </Box>
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                团队成员
              </Typography>
              <TextField
                size='small'
                fullWidth
                value={formData.team}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, team: e.target.value }))
                }
                placeholder='多人用逗号分隔'
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                项目描述
              </Typography>
              <TextField
                multiline
                rows={3}
                fullWidth
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder='请描述项目的目的和范围...'
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
            onClick={handleCreateProject}
            disabled={submitting || !formData.project_name}
          >
            {submitting ? '创建中...' : '创建项目'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='xl'
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            component={ClipboardList}
            sx={{ fontSize: 24, color: 'primary.dark' }}
          />
          {selectedProject?.project_name}
        </DialogTitle>
        <DialogContent>
          {selectedProject && (
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
                    项目编号
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600, color: 'primary.800', mt: 0.5 }}
                  >
                    {selectedProject.project_no}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: '#ca8a04' }}
                  >
                    项目状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedProject.status)}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'success.dark' }}
                  >
                    总体进度
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600, color: '#166534', mt: 0.5 }}
                  >
                    {progress?.overall_progress?.toFixed(1) || selectedProject.progress || 0}%
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'secondary.dark' }}
                  >
                    风险等级
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getRiskLevelBadge(selectedProject.risklevel)}</Box>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    产品名称
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ mt: 0.5, color: 'text.primary' }}
                  >
                    {selectedProject.product_name || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    客户
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ mt: 0.5 }}
                  >
                    {selectedProject.customer || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    负责人
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Box
                      component={Users}
                      sx={{ fontSize: 16 }}
                    />
                    <Typography
                      variant='body1'
                      sx={{ color: 'text.primary' }}
                    >
                      {selectedProject.leader || '-'}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    团队成员
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ mt: 0.5 }}
                  >
                    {selectedProject.team || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    开始日期
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Box
                      component={Calendar}
                      sx={{ fontSize: 16 }}
                    />
                    <Typography
                      variant='body1'
                      sx={{ color: 'text.primary' }}
                    >
                      {selectedProject.start_date
                        ? new Date(selectedProject.start_date).toLocaleDateString('zh-CN')
                        : '-'}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    目标日期
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Box
                      component={Calendar}
                      sx={{ fontSize: 16 }}
                    />
                    <Typography
                      variant='body1'
                      sx={{ color: 'text.primary' }}
                    >
                      {selectedProject.target_date
                        ? new Date(selectedProject.target_date).toLocaleDateString('zh-CN')
                        : '-'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {selectedProject.description && (
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    项目描述
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ mt: 1 }}
                  >
                    {selectedProject.description}
                  </Typography>
                </Box>
              )}

              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={detailTab}
                  onChange={(_, newValue) => setDetailTab(newValue)}
                >
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Layers sx={{ fontSize: 18 }} />
                        阶段管理 ({phases.length})
                      </Box>
                    }
                  />
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ListTodo sx={{ fontSize: 18 }} />
                        任务清单 ({tasks.length})
                      </Box>
                    }
                  />
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ShieldAlert sx={{ fontSize: 18 }} />
                        风险评估 ({risks.length})
                      </Box>
                    }
                  />
                </Tabs>
              </Box>

              {detailTab === 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography
                      variant='body1'
                      sx={{ fontWeight: 500 }}
                    >
                      项目阶段
                    </Typography>
                  </Box>
                  <ListPageTemplate
                    columns={phaseColumns}
                    data={phases}
                    loading={loading}
                    pagination={{
                      page: 0,
                      pageSize: 10,
                      total: phases.length,
                      onPageChange: () => {},
                    }}
                  />
                </Box>
              )}

              {detailTab === 1 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography
                      variant='body1'
                      sx={{ fontWeight: 500 }}
                    >
                      任务清单 ({completedTasks}/{totalTasks} 完成)
                    </Typography>
                  </Box>
                  <ListPageTemplate
                    columns={taskColumns}
                    data={tasks}
                    loading={loading}
                    pagination={{
                      page: 0,
                      pageSize: 10,
                      total: tasks.length,
                      onPageChange: () => {},
                    }}
                  />
                </Box>
              )}

              {detailTab === 2 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography
                      variant='body1'
                      sx={{ fontWeight: 500 }}
                    >
                      风险评估 ({openRisks} 项开放, {highRisks} 项高风险)
                    </Typography>
                  </Box>
                  <ListPageTemplate
                    columns={riskColumns}
                    data={risks}
                    loading={loading}
                    pagination={{
                      page: 0,
                      pageSize: 10,
                      total: risks.length,
                      onPageChange: () => {},
                    }}
                  />
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

export default QmsApqpPage;
