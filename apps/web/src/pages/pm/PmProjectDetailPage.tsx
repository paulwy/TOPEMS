import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { useAppStore } from '@/store';
import {
  Edit,
  Users,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Badge,
  LinearProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
} from '@mui/material';

import GanttChart from '@/components/pm/GanttChart';
import { pmApi } from '@/api/pm';
import type { Project, ProjectPhase, ProjectMilestone, GanttPhase, GanttMilestone } from '@/api/pm';
import { BackButton } from '@/components/common';

const PmProjectDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      loadProjectData(id);
    }
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    setLoading(true);
    try {
      const [projectResponse, phasesResponse, milestonesResponse, ganttResponse] =
        await Promise.all([
          pmApi.projects.get(projectId),
          pmApi.phases.list(projectId),
          pmApi.milestones.list(projectId),
          pmApi.projects.gantt(projectId),
        ]);

      if (projectResponse.success && projectResponse.data) {
        setProject(projectResponse.data);
      }
      if (phasesResponse.success && phasesResponse.data) {
        setPhases(phasesResponse.data.phases || []);
      }
      if (milestonesResponse.success && milestonesResponse.data) {
        setMilestones(milestonesResponse.data.milestones || []);
      }
    } catch (error: unknown) {
      logger.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return { bgcolor: 'success.lighter', color: '#166534' };
      case 'completed':
        return { bgcolor: '#dbeafe', color: '#1e40af' };
      case 'pending':
        return { bgcolor: '#fef9c3', color: '#a16207' };
      case 'approved':
        return { bgcolor: '#f3e8ff', color: 'secondary.dark' };
      case 'cancelled':
        return { bgcolor: 'grey.100', color: 'grey.700' };
      case 'draft':
        return { bgcolor: 'grey.100', color: 'text.secondary' };
      default:
        return { bgcolor: 'grey.100', color: 'grey.700' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'pending':
        return '待审批';
      case 'approved':
        return '已批准';
      case 'cancelled':
        return '已取消';
      case 'draft':
        return '草稿';
      default:
        return status;
    }
  };

  const getRiskColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return { bgcolor: 'error.lighter', color: '#991b1b' };
      case 'medium':
        return { bgcolor: '#fef9c3', color: '#a16207' };
      case 'low':
        return { bgcolor: 'success.lighter', color: '#166534' };
      default:
        return { bgcolor: 'grey.100', color: 'grey.700' };
    }
  };

  const getRiskLabel = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return '高风险';
      case 'medium':
        return '中风险';
      case 'low':
        return '低风险';
      default:
        return '未评估';
    }
  };

  const ganttPhases: GanttPhase[] = phases.map((p) => ({
    id: p.id,
    name: p.name,
    project_id: p.project_id,
    start_date: p.start_date,
    end_date: p.end_date,
    progress: p.progress,
    status: p.status,
    predecessor_ids: p.predecessor_ids || [],
  }));

  const ganttMilestones: GanttMilestone[] = milestones.map((m) => ({
    id: m.id,
    name: m.name,
    project_id: m.project_id,
    date: m.date,
    status: m.status,
  }));

  const completedPhases = phases.filter((p) => p.status === 'completed').length;
  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          bgcolor: 'slate.50',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            border: '3px solid',
            borderColor: 'primary.dark',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
      </Box>
    );
  }

  if (!project) {
    return (
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          bgcolor: 'slate.50',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography sx={{ color: 'grey.500' }}>项目不存在</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'slate.50' }}>
      <Box sx={{ flex: 1, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <BackButton href='/pm/projects' variant='outlined' label='返回列表' />
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => navigate(`/pm/projects/${id}/edit`)}>
            <Edit sx={{ width: 16, height: 16, mr: 1 }} />
            编辑项目
          </Button>
        </Box>

        <Card sx={{ overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'flex-start', md: 'flex-start' },
                justifyContent: 'space-between',
                gap: 3,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    mb: 1,
                  }}
                >
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'grey.900' }}
                  >
                    {project.name}
                  </Typography>
                  <Badge sx={getStatusColor(project.status)}>
                    {getStatusLabel(project.status)}
                  </Badge>
                </Box>
                <Typography sx={{ color: 'grey.500' }}>{project.code}</Typography>
                {project.description && (
                  <Typography sx={{ color: 'grey.600', mt: 2 }}>{project.description}</Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Badge
                  variant='standard'
                  sx={getRiskColor(project.risk_level)}
                >
                  {getRiskLabel(project.risk_level)}
                </Badge>
                {project.priority && <Badge variant='standard'>优先级: {project.priority}</Badge>}
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
            my: 3,
          }}
        >
          <Card sx={{ '&:hover': { boxShadow: 6 } }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '50%', bgcolor: '#dbeafe' }}>
                  <Clock sx={{ width: 20, height: 20, color: 'primary.dark' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    项目进度
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'grey.900' }}
                  >
                    {project.progress}%
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                value={project.progress}
                sx={{ mt: 1.5, height: 8 }}
              />
            </CardContent>
          </Card>

          <Card sx={{ '&:hover': { boxShadow: 6 } }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'success.lighter' }}>
                  <CheckCircle2 sx={{ width: 20, height: 20, color: 'success.dark' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    阶段完成
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'success.dark' }}
                  >
                    {completedPhases}/{phases.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ '&:hover': { boxShadow: 6 } }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'warning.light' }}>
                  <DollarSign sx={{ width: 20, height: 20, color: 'warning.dark' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    项目预算
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'warning.dark' }}
                  >
                    {formatCurrency(project.budget)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ '&:hover': { boxShadow: 6 } }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '50%', bgcolor: '#f3e8ff' }}>
                  <TrendingUp sx={{ width: 20, height: 20, color: 'secondary.dark' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    里程碑完成
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'secondary.dark' }}
                  >
                    {completedMilestones}/{milestones.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ bgcolor: 'grey.100', p: 0.5, borderRadius: 1 }}
            slotProps={{ indicator: { style: { display: 'none' } } }}
          >
            <Tab
              value='overview'
              label='项目概览'
              sx={{
                '&.Mui-selected': { bgcolor: 'white', fontWeight: 500 },
                borderRadius: 0.75,
              }}
            />
            <Tab
              value='gantt'
              label='甘特图'
              sx={{
                '&.Mui-selected': { bgcolor: 'white', fontWeight: 500 },
                borderRadius: 0.75,
              }}
            />
            <Tab
              value='phases'
              label='阶段管理'
              sx={{
                '&.Mui-selected': { bgcolor: 'white', fontWeight: 500 },
                borderRadius: 0.75,
              }}
            />
            <Tab
              value='milestones'
              label='里程碑'
              sx={{
                '&.Mui-selected': { bgcolor: 'white', fontWeight: 500 },
                borderRadius: 0.75,
              }}
            />
            <Tab
              value='finance'
              label='财务'
              sx={{
                '&.Mui-selected': { bgcolor: 'white', fontWeight: 500 },
                borderRadius: 0.75,
              }}
            />
          </Tabs>
        </Box>

        {activeTab === 'overview' && (
          <Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                gap: 3,
              }}
            >
              <Card>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography
                    variant='h6'
                    sx={{ fontSize: '1.125rem' }}
                  >
                    基本信息
                  </Typography>
                </CardHeader>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>项目编号</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                      {project.code}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>项目类型</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                      {project.project_type}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>项目负责人</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                      {project.leader || '-'}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>开始日期</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                      {formatDate(project.start_date)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>结束日期</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                      {formatDate(project.end_date)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>风险等级</Typography>
                    <Badge sx={getRiskColor(project.risk_level)}>
                      {getRiskLabel(project.risk_level)}
                    </Badge>
                  </Box>
                </CardContent>
              </Card>

              <Card>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography
                    variant='h6'
                    sx={{ fontSize: '1.125rem' }}
                  >
                    关键指标
                  </Typography>
                </CardHeader>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.600' }}
                      >
                        整体进度
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500, color: 'grey.900' }}
                      >
                        {project.progress}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      value={project.progress}
                      sx={{ height: 12 }}
                    />
                  </Box>

                  <Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.600' }}
                      >
                        阶段进度
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500, color: 'grey.900' }}
                      >
                        {phases.length > 0
                          ? Math.round((completedPhases / phases.length) * 100)
                          : 0}
                        %
                      </Typography>
                    </Box>
                    <LinearProgress
                      value={
                        phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0
                      }
                      sx={{ height: 12 }}
                    />
                  </Box>

                  <Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.600' }}
                      >
                        里程碑完成
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500, color: 'grey.900' }}
                      >
                        {milestones.length > 0
                          ? Math.round((completedMilestones / milestones.length) * 100)
                          : 0}
                        %
                      </Typography>
                    </Box>
                    <LinearProgress
                      value={
                        milestones.length > 0
                          ? Math.round((completedMilestones / milestones.length) * 100)
                          : 0
                      }
                      sx={{ height: 12 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}

        {activeTab === 'gantt' && (
          <Box>
            <Card>
              <CardHeader sx={{ pb: 2 }}>
                <Typography
                  variant='h6'
                  sx={{ fontSize: '1.125rem' }}
                >
                  项目甘特图
                </Typography>
              </CardHeader>
              <CardContent>
                <GanttChart
                  phases={ganttPhases}
                  milestones={ganttMilestones}
                  projectStartDate={project.start_date}
                  projectEndDate={project.end_date}
                />
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === 'phases' && (
          <Box>
            <Card>
              <CardHeader
                sx={{
                  pb: 2,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  variant='h6'
                  sx={{ fontSize: '1.125rem' }}
                >
                  阶段列表
                </Typography>
                <Button
                  variant='outlined'
                  size='small'
                >
                  添加阶段
                </Button>
              </CardHeader>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHead sx={{ width: 200 }}>阶段名称</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead sx={{ width: 180 }}>进度</TableHead>
                        <TableHead sx={{ width: 150 }}>时间</TableHead>
                        <TableHead sx={{ width: 120 }}>操作</TableHead>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {phases.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            sx={{
                              textAlign: 'center',
                              py: 6,
                              color: 'grey.500',
                            }}
                          >
                            暂无阶段数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        phases.map((phase) => (
                          <TableRow
                            key={phase.id}
                            sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                          >
                            <TableCell>
                              <Box>
                                <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                                  {phase.name}
                                </Typography>
                                {phase.description && (
                                  <Typography
                                    variant='body2'
                                    sx={{
                                      color: 'grey.500',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {phase.description}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Badge
                                sx={
                                  phase.status === 'completed'
                                    ? { bgcolor: 'success.lighter', color: '#166534' }
                                    : phase.status === 'active'
                                      ? { bgcolor: '#dbeafe', color: '#1e40af' }
                                      : { bgcolor: 'grey.100', color: 'grey.700' }
                                }
                              >
                                {phase.status === 'completed'
                                  ? '已完成'
                                  : phase.status === 'active'
                                    ? '进行中'
                                    : '未开始'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.5,
                                }}
                              >
                                <Box sx={{ width: 96 }}>
                                  <LinearProgress
                                    value={phase.progress}
                                    sx={{ height: 8 }}
                                  />
                                </Box>
                                <Typography
                                  variant='body2'
                                  sx={{ color: 'grey.600' }}
                                >
                                  {phase.progress}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                              <Box>
                                <Typography variant='body2'>
                                  {formatDate(phase.start_date)}
                                </Typography>
                                <Typography
                                  variant='body2'
                                  sx={{
                                    color: 'grey.400',
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  至 {formatDate(phase.end_date)}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant='text'
                                size='small'
                                sx={{ gap: 0.5 }}
                              >
                                <Edit sx={{ width: 16, height: 16 }} />
                                编辑
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === 'milestones' && (
          <Box>
            <Card>
              <CardHeader
                sx={{
                  pb: 2,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  variant='h6'
                  sx={{ fontSize: '1.125rem' }}
                >
                  里程碑列表
                </Typography>
                <Button
                  variant='outlined'
                  size='small'
                >
                  添加里程碑
                </Button>
              </CardHeader>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHead sx={{ width: 200 }}>里程碑名称</TableHead>
                        <TableHead sx={{ width: 150 }}>目标日期</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>所属阶段</TableHead>
                        <TableHead sx={{ width: 120 }}>操作</TableHead>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {milestones.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            sx={{
                              textAlign: 'center',
                              py: 6,
                              color: 'grey.500',
                            }}
                          >
                            暂无里程碑数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        milestones.map((milestone) => (
                          <TableRow
                            key={milestone.id}
                            sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                          >
                            <TableCell>
                              <Box>
                                <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                                  {milestone.name}
                                </Typography>
                                {milestone.description && (
                                  <Typography
                                    variant='body2'
                                    sx={{
                                      color: 'grey.500',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {milestone.description}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                              {formatDate(milestone.date)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                sx={
                                  milestone.status === 'completed'
                                    ? { bgcolor: 'success.lighter', color: '#166534' }
                                    : milestone.status === 'active'
                                      ? { bgcolor: '#dbeafe', color: '#1e40af' }
                                      : { bgcolor: 'grey.100', color: 'grey.700' }
                                }
                              >
                                {milestone.status === 'completed'
                                  ? '已完成'
                                  : milestone.status === 'active'
                                    ? '进行中'
                                    : '未开始'}
                              </Badge>
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                              {milestone.phase_id
                                ? phases.find((p) => p.id === milestone.phase_id)?.name || '-'
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant='text'
                                size='small'
                                sx={{ gap: 0.5 }}
                              >
                                <Edit sx={{ width: 16, height: 16 }} />
                                编辑
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === 'finance' && (
          <Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                gap: 3,
              }}
            >
              {/* 预算执行概览 */}
              <Card>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography
                    variant='h6'
                    sx={{ fontSize: '1.125rem' }}
                  >
                    预算执行概览
                  </Typography>
                </CardHeader>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>项目预算</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                      {formatCurrency(project.budget)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>实际成本</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'warning.dark' }}>
                      {formatCurrency(project.actual_cost)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>已承诺成本</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'primary.dark' }}>
                      {formatCurrency(project.committed_cost)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>剩余预算</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'success.dark' }}>
                      {formatCurrency(project.remaining_budget)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>成本差异</Typography>
                    <Typography
                      sx={{
                        fontWeight: 500,
                        color: (project.cost_variance || 0) >= 0 ? 'success.dark' : 'error.dark',
                      }}
                    >
                      {formatCurrency(project.cost_variance)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>预算执行率</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                      {project.budget_utilization_rate?.toFixed(1) || '0'}%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* 收入与利润 */}
              <Card>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography
                    variant='h6'
                    sx={{ fontSize: '1.125rem' }}
                  >
                    收入与利润
                  </Typography>
                </CardHeader>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>已确认收入</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                      {formatCurrency(project.revenue_recognized)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>应收账款</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'warning.dark' }}>
                      {formatCurrency(project.accounts_receivable)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>已开票金额</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'primary.dark' }}>
                      {formatCurrency(
                        (project.revenue_recognized || 0) - (project.accounts_receivable || 0)
                      )}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>毛利润</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'success.dark' }}>
                      {formatCurrency(project.gross_profit)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>毛利率</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                      {project.gross_margin?.toFixed(1) || '0'}%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* 成本构成分析 */}
              <Card sx={{ lg: { gridColumn: 'span 2' } }}>
                <CardHeader
                  sx={{
                    pb: 2,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography
                    variant='h6'
                    sx={{ fontSize: '1.125rem' }}
                  >
                    成本构成分析
                  </Typography>
                  <Button
                    variant='outlined'
                    size='small'
                  >
                    查看详情
                  </Button>
                </CardHeader>
                <CardContent>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'repeat(2, 1fr)',
                        md: 'repeat(5, 1fr)',
                      },
                      gap: 2,
                    }}
                  >
                    <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500', mb: 0.5 }}
                      >
                        人工成本
                      </Typography>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600, color: 'primary.dark' }}
                      >
                        -
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500', mb: 0.5 }}
                      >
                        材料成本
                      </Typography>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600, color: 'success.dark' }}
                      >
                        -
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500', mb: 0.5 }}
                      >
                        费用支出
                      </Typography>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600, color: 'warning.dark' }}
                      >
                        -
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 2 }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500', mb: 0.5 }}
                      >
                        分包成本
                      </Typography>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600, color: 'secondary.dark' }}
                      >
                        -
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500', mb: 0.5 }}
                      >
                        其他成本
                      </Typography>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600, color: 'text.secondary' }}
                      >
                        -
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* 成本中心信息 */}
              <Card>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography
                    variant='h6'
                    sx={{ fontSize: '1.125rem' }}
                  >
                    成本中心信息
                  </Typography>
                </CardHeader>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>成本中心ID</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                      {project.cost_center_id || '-'}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>成本中心名称</Typography>
                    <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                      {project.cost_center_name || '-'}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                    }}
                  >
                    <Typography sx={{ color: 'grey.500' }}>执行状态</Typography>
                    <Badge
                      sx={
                        project.budget_utilization_rate && project.budget_utilization_rate > 100
                          ? { bgcolor: 'error.lighter', color: '#991b1b' }
                          : project.budget_utilization_rate && project.budget_utilization_rate > 80
                            ? { bgcolor: '#fef9c3', color: '#a16207' }
                            : { bgcolor: 'success.lighter', color: '#166534' }
                      }
                    >
                      {project.budget_utilization_rate && project.budget_utilization_rate > 100
                        ? '超预算'
                        : project.budget_utilization_rate && project.budget_utilization_rate > 80
                          ? '预警'
                          : '正常'}
                    </Badge>
                  </Box>
                </CardContent>
              </Card>

              {/* 快速操作 */}
              <Card>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography
                    variant='h6'
                    sx={{ fontSize: '1.125rem' }}
                  >
                    快速操作
                  </Typography>
                </CardHeader>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant='outlined'
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    <DollarSign sx={{ width: 16, height: 16, mr: 1 }} />
                    查看成本明细
                  </Button>
                  <Button
                    variant='outlined'
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    <FileText sx={{ width: 16, height: 16, mr: 1 }} />
                    查看项目发票
                  </Button>
                  <Button
                    variant='outlined'
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    <TrendingUp sx={{ width: 16, height: 16, mr: 1 }} />
                    预算执行分析
                  </Button>
                  <Button>
                    <FileText sx={{ width: 16, height: 16, mr: 1 }} />
                    生成项目凭证
                  </Button>
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PmProjectDetailPage;
