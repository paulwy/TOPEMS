import { Grid } from '@/components/Grid';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { logger } from '@/utils/logger';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Stack,
} from '@mui/material';
import { Button } from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  Edit as EditIcon,
  FlaskConical as FlaskConical,
  FileText as DescriptionIcon,
  Users as PeopleIcon,
  Clock as Clock,
  DollarSign as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  AlertTriangle as AlertTriangle,
} from 'lucide-react';
import { DetailPageTemplate, type TabConfig } from '@/components/templates';
import { rsApi } from '@/api/rs';
import { useAppStore } from '@/store';
import type { Project, GanttPhase, GanttMilestone, Experiment } from '@/api/rs';

const RsProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useAppStore();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<GanttPhase[]>([]);
  const [milestones, setMilestones] = useState<GanttMilestone[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);

  useEffect(() => {
    if (!id) return;
    loadProjectData(id);
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    try {
      setLoading(true);
      const [projectRes, ganttRes, experimentsRes] = await Promise.all([
        rsApi.getProject(projectId),
        rsApi.getProjectGantt(projectId),
        rsApi.listExperiments({ project_id: projectId, page_size: 100 }),
      ]);

      if (projectRes.success && projectRes.data) {
        setProject(projectRes.data);
      }
      if (ganttRes.success && ganttRes.data) {
        setPhases(ganttRes.data.phases || []);
        setMilestones(ganttRes.data.milestones || []);
      }
      if (experimentsRes.success && experimentsRes.data) {
        setExperiments(experimentsRes.data.experiments || []);
      }
    } catch (error: unknown) {
      logger.error('加载项目详情失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载项目详情',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (
    status: string
  ): 'primary' | 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case '已完成':
      case 'completed':
        return 'success';
      case '进行中':
      case 'in_progress':
        return 'primary';
      case '待开始':
      case 'pending':
        return 'default';
      case '暂停':
      case 'paused':
        return 'warning';
      case '取消':
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'in_progress':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'paused':
        return '暂停';
      case 'cancelled':
        return '取消';
      case 'pending':
        return '待开始';
      default:
        return status;
    }
  };

  const getPhaseColor = (phase: string): 'info' | 'warning' | 'error' | 'default' => {
    switch (phase) {
      case '小试':
        return 'info';
      case '中试':
        return 'warning';
      case '放大':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRiskColor = (risk: string): 'success' | 'warning' | 'error' => {
    switch (risk) {
      case '低':
        return 'success';
      case '中':
        return 'warning';
      case '高':
        return 'error';
      default:
        return 'warning';
    }
  };

  const teamMembers = project?.team_members || [];

  const tabContents: TabConfig[] = [
    {
      id: 'phases',
      label: '项目阶段',
      icon: <Clock size={16} />,
      content: (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>阶段名称</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>进度</TableCell>
                <TableCell>开始日期</TableCell>
                <TableCell>结束日期</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {phases.map((phase) => (
                <TableRow
                  key={phase.id}
                  hover
                >
                  <TableCell>{phase.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(phase.status)}
                      size='small'
                      color={getStatusColor(phase.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <LinearProgress
                        variant='determinate'
                        value={phase.progress}
                        sx={{ width: 80 }}
                      />
                      <Typography variant='body2'>{phase.progress}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{phase.start_date || '-'}</TableCell>
                  <TableCell>{phase.end_date || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ),
    },
    {
      id: 'milestones',
      label: '里程碑',
      icon: <CheckCircleIcon size={16} />,
      content: (
        <Timeline position='alternate'>
          {milestones.map((milestone) => (
            <TimelineItem key={milestone.id}>
              <TimelineSeparator>
                <TimelineDot color={milestone.status === 'completed' ? 'success' : 'primary'}>
                  {milestone.status === 'completed' ? <CheckCircleIcon /> : <AlertTriangle />}
                </TimelineDot>
                <TimelineConnector />
              </TimelineSeparator>
              <TimelineContent>
                <Paper
                  variant='outlined'
                  sx={{ p: 2 }}
                >
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {milestone.name}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    目标日期: {milestone.date}
                  </Typography>
                  <Chip
                    label={getStatusLabel(milestone.status)}
                    size='small'
                    color={getStatusColor(milestone.status)}
                    sx={{ mt: 1 }}
                  />
                </Paper>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      ),
    },
    {
      id: 'experiments',
      label: '试验记录',
      icon: <FlaskConical size={16} />,
      content: (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>试验名称</TableCell>
                <TableCell>阶段</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>实验员</TableCell>
                <TableCell align='center'>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {experiments.map((exp) => (
                <TableRow
                  key={exp.id}
                  hover
                >
                  <TableCell>{exp.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={exp.phase}
                      size='small'
                      color={getPhaseColor(exp.phase)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(exp.status)}
                      size='small'
                      color={getStatusColor(exp.status)}
                    />
                  </TableCell>
                  <TableCell>{exp.experimenter}</TableCell>
                  <TableCell align='center'>
                    <Link to={`/rs/experiments/${exp.id}`}>
                      <Button
                        size='small'
                        variant='outlined'
                      >
                        查看
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ),
    },
    {
      id: 'team',
      label: '团队成员',
      icon: <PeopleIcon size={16} />,
      content: (
        <List>
          <ListItemButton>
            <ListItemIcon>
              <Avatar>{project?.leader?.[0] || '-'}</Avatar>
            </ListItemIcon>
            <ListItemText
              primary={project?.leader || '-'}
              secondary='项目负责人'
            />
            <Chip
              label='负责人'
              color='primary'
              size='small'
            />
          </ListItemButton>
          {teamMembers.map((member: string, index: number) => (
            <ListItemButton key={index}>
              <ListItemIcon>
                <Avatar>{member?.[0] || '-'}</Avatar>
              </ListItemIcon>
              <ListItemText
                primary={member}
                secondary='团队成员'
              />
              <Chip
                label='成员'
                variant='outlined'
                size='small'
              />
            </ListItemButton>
          ))}
        </List>
      ),
    },
    {
      id: 'documents',
      label: '文档资料',
      icon: <DescriptionIcon size={16} />,
      content: (
        <List>
          <ListItemButton>
            <ListItemIcon>
              <DescriptionIcon />
            </ListItemIcon>
            <ListItemText
              primary='项目立项报告'
              secondary={project?.created_at || '-'}
            />
          </ListItemButton>
        </List>
      ),
    },
  ];

  const infoCard = project
    ? {
        title: project.name,
        subtitle: `编码: ${project.code} | 类型: ${project.project_type} | 负责人: ${project.leader}`,
        tags: [
          getStatusLabel(project.status),
          `风险: ${project.risk_level || '-'}`,
          `预算: ${project.budget ? (project.budget / 10000).toFixed(1) : '-'}万元`,
        ],
        stats: [
          { label: '项目进度', value: `${project.progress}%` },
          {
            label: '已完成阶段',
            value: `${phases.filter((p) => p.status === 'completed').length}/${phases.length}`,
          },
          {
            label: '里程碑',
            value: `${milestones.filter((m) => m.status === 'completed').length}/${milestones.length}`,
          },
        ],
      }
    : null;

  const actions = [
    {
      label: '编辑',
      icon: <EditIcon size={18} />,
      onClick: () => navigate(`/rs/projects/${id}/edit`),
      variant: 'outlined' as const,
    },
    {
      label: '新建试验',
      icon: <FlaskConical size={18} />,
      onClick: () => {},
      variant: 'contained' as const,
    },
  ];

  return (
    <DetailPageTemplate
      title={project?.name || '项目详情'}
      subtitle={project ? `编码: ${project.code} | 类型: ${project.project_type} | 负责人: ${project.leader}` : ''}
      infoCard={infoCard}
      tabs={tabContents}
      defaultTab='phases'
      actions={actions}
      loading={loading}
    />
  );
};

export default RsProjectDetailPage;