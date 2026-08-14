import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { logger } from '@/utils/logger';
import { RD_PATHS } from '@/modules/rd/config';
import {
  Box,
  Typography,
  Chip,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Stack,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
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
import { rdApi } from '@/api/rd';
import { PageContainer } from '@/components/common';
import type { Project, GanttPhase, GanttMilestone, Experiment } from '@/api/rd';
import {QUERY_KEYS, CACHE_DURATIONS} from '@/lib/reactQuery';
const RsProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectQuery = useQuery({
    queryKey: QUERY_KEYS.RD.PROJECT(id || ''),
    queryFn: async () => {
      const response = await rdApi.getProject(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('rd.rs_project_detail_page.k0'));
      }
      return response.data;
    },
    enabled: !!id,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
  const ganttQuery = useQuery({
    queryKey: QUERY_KEYS.RD.PROJECT_GANTT(id || ''),
    queryFn: async () => {
      const response = await rdApi.getProjectGantt(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('rd.rs_project_detail_page.k1'));
      }
      return response.data;
    },
    enabled: !!id,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
  const experimentsQuery = useQuery({
    queryKey: [...QUERY_KEYS.RD.EXPERIMENTS, { projectId: id, pagesize: 100 }],
    queryFn: async () => {
      const response = await rdApi.listExperiments({ project_id: id, pagesize: 100 });
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('rd.rs_project_detail_page.k2'));
      }
      return response.data.experiments || [];
    },
    enabled: !!id,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
  const project = projectQuery.data || null;
  const phases = ganttQuery.data?.phases || [];
  const milestones = ganttQuery.data?.milestones || [];
  const experiments = experimentsQuery.data || [];
  const loading = projectQuery.isLoading || ganttQuery.isLoading || experimentsQuery.isLoading;
  React.useEffect(() => {
    if (projectQuery.error) {
      logger.error(i18n.t('pages.rs_project_detail_page.k0'), projectQuery.error);
    }
  }, [projectQuery.error]);
  const getStatusColor = (
    status: string
  ): 'primary' | 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case i18n.t('rd.rs_project_detail_page.k3'):
      case 'completed':
        return 'success';
      case i18n.t('rd.rs_project_detail_page.k4'):
      case 'in_progress':
        return 'primary';
      case i18n.t('rd.rs_project_detail_page.k5'):
      case 'pending':
        return 'default';
      case i18n.t('rd.rs_project_detail_page.k6'):
      case 'paused':
        return 'warning';
      case i18n.t('rd.rs_project_detail_page.k7'):
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'in_progress':
        return i18n.t('rd.rs_project_detail_page.k8');
      case 'completed':
        return i18n.t('rd.rs_project_detail_page.k9');
      case 'paused':
        return i18n.t('rd.rs_project_detail_page.k10');
      case 'cancelled':
        return i18n.t('rd.rs_project_detail_page.k11');
      case 'pending':
        return i18n.t('rd.rs_project_detail_page.k12');
      default:
        return status;
    }
  };
  const getPhaseColor = (phase: string): 'info' | 'warning' | 'error' | 'default' => {
    switch (phase) {
      case i18n.t('rd.rs_project_detail_page.k13'):
        return 'info';
      case i18n.t('rd.rs_project_detail_page.k14'):
        return 'warning';
      case i18n.t('rd.rs_project_detail_page.k15'):
        return 'error';
      default:
        return 'default';
    }
  };
  const getRiskColor = (risk: string): 'success' | 'warning' | 'error' => {
    switch (risk) {
      case i18n.t('rd.rs_project_detail_page.k16'):
        return 'success';
      case i18n.t('rd.rs_project_detail_page.k17'):
        return 'warning';
      case i18n.t('rd.rs_project_detail_page.k18'):
        return 'error';
      default:
        return 'warning';
    }
  };
  const teamMembers = project?.team_members || [];
  const tabContents: TabConfig[] = [
    {
      id: 'phases',
      label: i18n.t('rd.rs_project_detail_page.k19'),
      icon: <Clock size={16} />,
      content: (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t('rd.rs_project_detail_page.k20')}</TableCell>
                <TableCell>{i18n.t('rd.rs_project_detail_page.k21')}</TableCell>
                <TableCell>{i18n.t('rd.rs_project_detail_page.k22')}</TableCell>
                <TableCell>{i18n.t('rd.rs_project_detail_page.k23')}</TableCell>
                <TableCell>{i18n.t('rd.rs_project_detail_page.k24')}</TableCell>
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
      label: i18n.t('rd.rs_project_detail_page.k25'),
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
                    [i18n.t('pages.rs_project_detail_page.k0')]: {milestone.date}
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
      label: i18n.t('rd.rs_project_detail_page.k26'),
      icon: <FlaskConical size={16} />,
      content: (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t('rd.rs_project_detail_page.k27')}</TableCell>
                <TableCell>{i18n.t('rd.rs_project_detail_page.k28')}</TableCell>
                <TableCell>{i18n.t('rd.rs_project_detail_page.k29')}</TableCell>
                <TableCell>{i18n.t('rd.rs_project_detail_page.k30')}</TableCell>
                <TableCell align='center'>{i18n.t('rd.rs_project_detail_page.k31')}</TableCell>
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
                    <Link to={`${RD_PATHS.experiment}/${exp.id}`}>
                      <Button
                        size='small'
                        variant='outlined'
                      >
                        {i18n.t('pages.rs_project_detail_page.k1')}
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
      label: i18n.t('rd.rs_project_detail_page.k32'),
      icon: <PeopleIcon size={16} />,
      content: (
        <List>
          <ListItemButton>
            <ListItemIcon>
              <Avatar>{project?.leader?.[0] || '-'}</Avatar>
            </ListItemIcon>
            <ListItemText
              primary={project?.leader || '-'}
              secondary={i18n.t('rd.rs_project_detail_page.k33')}
            />
            <Chip
              label={i18n.t('rd.rs_project_detail_page.k34')}
              color='primary'
              size='small'
            />
          </ListItemButton>
          {teamMembers.map((member, index: number) => (
            <ListItemButton key={index}>
              <ListItemIcon>
                <Avatar>{member.name?.[0] || '-'}</Avatar>
              </ListItemIcon>
              <ListItemText
                primary={member.name || '-'}
                secondary={i18n.t('rd.rs_project_detail_page.k35')}
              />
              <Chip
                label={i18n.t('rd.rs_project_detail_page.k36')}
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
      label: i18n.t('rd.rs_project_detail_page.k37'),
      icon: <DescriptionIcon size={16} />,
      content: (
        <List>
          <ListItemButton>
            <ListItemIcon>
              <DescriptionIcon />
            </ListItemIcon>
            <ListItemText
              primary={i18n.t('rd.rs_project_detail_page.k38')}
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
        subtitle: `${i18n.t('pages.rs_project_detail_page.k1')}${project.code}${i18n.t('pages.rs_project_detail_page.k2')}${project.project_type}${i18n.t('pages.rs_project_detail_page.k3')}${project.leader}`,
        tags: [
          getStatusLabel(project.status),
          `${i18n.t('pages.rs_project_detail_page.k4')}${project.risklevel || '-'}`,
          `${i18n.t('pages.rs_project_detail_page.k5')}${project.budget ? (project.budget / 10000).toFixed(1) : '-'}${i18n.t('pages.rs_project_detail_page.k6')}`,
        ],
        stats: [
          { label: i18n.t('rd.rs_project_detail_page.k39'), value: `${project.progress}%` },
          {
            label: i18n.t('rd.rs_project_detail_page.k40'),
            value: `${phases.filter((p) => p.status === 'completed').length}/${phases.length}`,
          },
          {
            label: i18n.t('rd.rs_project_detail_page.k41'),
            value: `${milestones.filter((m) => m.status === 'completed').length}/${milestones.length}`,
          },
        ],
      }
    : undefined;
  const actions = [
    {
      label: i18n.t('rd.rs_project_detail_page.k42'),
      icon: <EditIcon size={18} />,
      onClick: () => navigate(`${RD_PATHS.project}/${id}/edit`),
      variant: 'outlined' as const,
    },
    {
      label: i18n.t('rd.rs_project_detail_page.k43'),
      icon: <FlaskConical size={18} />,
      onClick: () => {},
      variant: 'contained' as const,
    },
  ];
  return (
    <PageContainer
      title={project?.name || i18n.t('rd.rs_project_detail_page.k44')}
      subtitle={
        project
          ? `${i18n.t('pages.rs_project_detail_page.k7')}${project.code}${i18n.t('pages.rs_project_detail_page.k8')}${project.project_type}${i18n.t('pages.rs_project_detail_page.k9')}${project.leader}`
          : ''
      }
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        backHref={RD_PATHS.project}
        detailItemName={project?.name || project?.code || i18n.t('rd.rs_project_detail_page.k45')}
        infoCard={infoCard}
        tabs={tabContents}
        defaultTab='phases'
        actions={actions}
        loading={loading}
      />
    </PageContainer>
  );
};
export default RsProjectDetailPage;