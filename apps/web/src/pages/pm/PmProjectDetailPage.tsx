import React, { useMemo } from 'react';
import { logger } from '@/utils/logger';
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
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';

import GanttChart from '@/components/pm/GanttChart';
import { pmApi } from '@/api/pm';
import type { Project, ProjectPhase, ProjectMilestone, GanttPhase, GanttMilestone } from '@/api/pm';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { ActionButton, StatusBadge, PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { PM_PATHS } from '@/modules/pm/config';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const STATUS_LABELS: Record<string, string> = {
  active: '进行中',
  completed: '已完成',
  pending: '待审批',
  approved: '已批准',
  cancelled: '已取消',
  draft: '草稿',
};

const STATUS_COLORS: Record<string, { bgcolor: string; color: string }> = {
  active: { bgcolor: 'success.lighter', color: ct.success[800] },
  completed: { bgcolor: 'primary.100', color: 'primary.800' },
  pending: { bgcolor: 'warning.100', color: ct.yellow[700] },
  approved: { bgcolor: 'secondary.100', color: 'secondary.dark' },
  cancelled: { bgcolor: 'grey.100', color: 'grey.700' },
  draft: { bgcolor: 'grey.100', color: 'text.secondary' },
};

const RISK_LABELS: Record<string, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

const RISK_COLORS: Record<string, { bgcolor: string; color: string }> = {
  high: { bgcolor: 'error.lighter', color: ct.error[800] },
  medium: { bgcolor: 'warning.100', color: ct.yellow[700] },
  low: { bgcolor: 'success.lighter', color: ct.success[800] },
};

const PmProjectDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const projectQuery = useQuery({
    queryKey: QUERY_KEYS.PM.PROJECT(id || ''),
    queryFn: () => pmApi.projects.get(id || ''),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const phasesQuery = useQuery({
    queryKey: [...QUERY_KEYS.PM.PROJECT(id || ''), 'phases'],
    queryFn: () => pmApi.phases.list(id || ''),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const milestonesQuery = useQuery({
    queryKey: [...QUERY_KEYS.PM.PROJECT(id || ''), 'milestones'],
    queryFn: () => pmApi.milestones.list(id || ''),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const project =
    projectQuery.data?.success && projectQuery.data.data ? projectQuery.data.data : null;
  const phases =
    phasesQuery.data?.success && phasesQuery.data.data
      ? phasesQuery.data.data.phases || phasesQuery.data.data || []
      : [];
  const milestones =
    milestonesQuery.data?.success && milestonesQuery.data.data
      ? milestonesQuery.data.data.milestones || milestonesQuery.data.data || []
      : [];
  const loading = projectQuery.isLoading || phasesQuery.isLoading || milestonesQuery.isLoading;
  const error = projectQuery.error || phasesQuery.error || milestonesQuery.error;

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

  const ganttPhases: GanttPhase[] = phases.map((p: ProjectPhase) => ({
    id: p.id,
    name: p.name,
    project_id: p.project_id,
    start_date: p.start_date,
    end_date: p.end_date,
    progress: p.progress,
    status: p.status,
    predecessor_ids: p.predecessor_ids || [],
  }));

  const ganttMilestones: GanttMilestone[] = milestones.map((m: ProjectMilestone) => ({
    id: m.id,
    name: m.name,
    project_id: m.project_id,
    date: m.date,
    status: m.status,
  }));

  const completedPhases = phases.filter((p: { status: string }) => p.status === 'completed').length;
  const completedMilestones = milestones.filter(
    (m: { status: string }) => m.status === 'completed'
  ).length;

  const overviewSections: SectionConfig[] = useMemo(() => {
    if (!project) return [];

    return [
      {
        id: 'basic-info',
        title: '基本信息',
        content: (
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
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{project.code}</Typography>
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
              <StatusBadge
                status={project.risklevel || 'low'}
                label={RISK_LABELS[project.risklevel || ''] || '未评估'}
                color={
                  project.risklevel === 'high'
                    ? 'error'
                    : project.risklevel === 'medium'
                      ? 'warning'
                      : 'success'
                }
              />
            </Box>
          </CardContent>
        ),
      },
      {
        id: 'key-indicators',
        title: '关键指标',
        content: (
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
                  {phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0}%
                </Typography>
              </Box>
              <LinearProgress
                value={phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0}
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
        ),
      },
    ];
  }, [project, phases, milestones, completedPhases, completedMilestones]);

  const phasesContent = useMemo(
    () => (
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
          <ActionButton
            label='添加阶段'
            variant='secondary'
            size='small'
          />
        </CardHeader>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 200 }}>阶段名称</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell sx={{ width: 180 }}>进度</TableCell>
                  <TableCell sx={{ width: 150 }}>时间</TableCell>
                  <TableCell sx={{ width: 120 }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {phases.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      sx={{ textAlign: 'center', py: 6, color: 'grey.500' }}
                    >
                      暂无阶段数据
                    </TableCell>
                  </TableRow>
                ) : (
                  phases.map((phase: ProjectPhase) => (
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
                        <StatusBadge
                          status={phase.status}
                          label={
                            phase.status === 'completed'
                              ? '已完成'
                              : phase.status === 'active'
                                ? '进行中'
                                : '未开始'
                          }
                          color={
                            phase.status === 'completed'
                              ? 'success'
                              : phase.status === 'active'
                                ? 'primary'
                                : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
                          <Typography variant='body2'>{formatDate(phase.start_date)}</Typography>
                          <Typography
                            variant='body2'
                            sx={{ color: 'grey.400', fontSize: '0.75rem' }}
                          >
                            至 {formatDate(phase.end_date)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <ActionButton
                          label='编辑'
                          icon={<Edit size={16} />}
                          variant='text'
                          size='small'
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>
    ),
    [phases]
  );

  const milestonesContent = useMemo(
    () => (
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
            {t('pm.project_detail.milestone_list')}
          </Typography>
          <ActionButton
            label={t('pm.project_detail.add_milestone')}
            variant='secondary'
            size='small'
          />
        </CardHeader>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 200 }}>{t('pm.project_detail.milestone_name')}</TableCell>
                  <TableCell sx={{ width: 150 }}>{t('pm.project_detail.target_date')}</TableCell>
                  <TableCell>{t('pm.project_detail.status_label')}</TableCell>
                  <TableCell>{t('pm.project_detail.belongs_to_phase')}</TableCell>
                  <TableCell sx={{ width: 120 }}>{t('pm.project_detail.action')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {milestones.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      sx={{ textAlign: 'center', py: 6, color: 'grey.500' }}
                    >
                      {t('pm.project_detail.no_milestone_data')}
                    </TableCell>
                  </TableRow>
                ) : (
                  milestones.map((milestone: ProjectMilestone) => (
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
                        <StatusBadge
                          status={milestone.status}
                          label={
                            milestone.status === 'completed'
                              ? t('pm.project_detail.completed')
                              : milestone.status === 'active'
                                ? t('pm.project_detail.in_progress')
                                : t('pm.project_detail.not_started')
                          }
                          color={
                            milestone.status === 'completed'
                              ? 'success'
                              : milestone.status === 'active'
                                ? 'primary'
                                : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                        {milestone.phase_id
                          ? phases.find((p: ProjectPhase) => p.id === milestone.phase_id)?.name ||
                            '-'
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <ActionButton
                          label={t('pm.project_detail.edit')}
                          icon={<Edit size={16} />}
                          variant='text'
                          size='small'
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>
    ),
    [milestones, phases, t]
  );

  const financeContent = useMemo(() => {
    if (!project) return null;

    return (
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
              {t('pm.project_detail.budget_execution_overview')}
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
              <Typography sx={{ color: 'grey.500' }}>
                {t('pm.project_detail.project_budget')}
              </Typography>
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
              <Typography sx={{ color: 'grey.500' }}>
                {t('pm.project_detail.actual_cost')}
              </Typography>
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
              <Typography sx={{ color: 'grey.500' }}>
                {t('pm.project_detail.committed_cost')}
              </Typography>
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
              <Typography sx={{ color: 'grey.500' }}>
                {t('pm.project_detail.remaining_budget')}
              </Typography>
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
              <Typography sx={{ color: 'grey.500' }}>
                {t('pm.project_detail.cost_variance')}
              </Typography>
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
              <Typography sx={{ color: 'grey.500' }}>
                {t('pm.project_detail.budget_utilization_rate')}
              </Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                {project.budget_utilization_rate?.toFixed(1) || '0'}%
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardHeader sx={{ pb: 2 }}>
            <Typography
              variant='h6'
              sx={{ fontSize: '1.125rem' }}
            >
              {t('pm.project_detail.revenue_and_profit')}
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
              <Typography sx={{ color: 'grey.500' }}>
                {t('pm.project_detail.recognized_revenue')}
              </Typography>
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
              <Typography sx={{ color: 'grey.500' }}>
                {t('pm.project_detail.accounts_receivable')}
              </Typography>
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
              <Typography sx={{ color: 'grey.500' }}>
                {t('pm.project_detail.invoiced_amount')}
              </Typography>
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
              <Typography sx={{ color: 'grey.500' }}>
                {t('pm.project_detail.gross_profit')}
              </Typography>
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
              <Typography sx={{ color: 'grey.500' }}>
                {t('pm.project_detail.gross_margin')}
              </Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                {project.gross_margin?.toFixed(1) || '0'}%
              </Typography>
            </Box>
          </CardContent>
        </Card>

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
              {t('pm.project_detail.cost_composition_analysis')}
            </Typography>
            <ActionButton
              label={t('pm.project_detail.view_details')}
              variant='secondary'
              size='small'
            />
          </CardHeader>
          <CardContent>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
                gap: 2,
              }}
            >
              <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {t('pm.project_detail.labor_cost')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600, color: 'primary.dark' }}
                >
                  -
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {t('pm.project_detail.material_cost')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600, color: 'success.dark' }}
                >
                  -
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {t('pm.project_detail.expense_cost')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600, color: 'warning.dark' }}
                >
                  -
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {t('pm.project_detail.subcontract_cost')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600, color: 'secondary.dark' }}
                >
                  -
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {t('pm.project_detail.other_cost')}
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

        <Card>
          <CardHeader sx={{ pb: 2 }}>
            <Typography
              variant='h6'
              sx={{ fontSize: '1.125rem' }}
            >
              {t('pm.project_detail.cost_center_info')}
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
              <Typography sx={{ color: 'grey.500' }}>
                {t('pm.project_detail.cost_center_id')}
              </Typography>
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
              <Typography sx={{ color: 'grey.500' }}>
                {t('pm.project_detail.cost_center_name')}
              </Typography>
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
              <Typography sx={{ color: 'grey.500' }}>
                {t('pm.project_detail.execution_status')}
              </Typography>
              <StatusBadge
                status={
                  project.budget_utilization_rate && project.budget_utilization_rate > 100
                    ? 'overbudget'
                    : project.budget_utilization_rate && project.budget_utilization_rate > 80
                      ? 'warning'
                      : 'normal'
                }
                label={
                  project.budget_utilization_rate && project.budget_utilization_rate > 100
                    ? t('pm.project_detail.over_budget')
                    : project.budget_utilization_rate && project.budget_utilization_rate > 80
                      ? t('pm.project_detail.warning_status')
                      : t('pm.project_detail.normal')
                }
                color={
                  project.budget_utilization_rate && project.budget_utilization_rate > 100
                    ? 'error'
                    : project.budget_utilization_rate && project.budget_utilization_rate > 80
                      ? 'warning'
                      : 'success'
                }
              />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardHeader sx={{ pb: 2 }}>
            <Typography
              variant='h6'
              sx={{ fontSize: '1.125rem' }}
            >
              {t('pm.project_detail.quick_actions')}
            </Typography>
          </CardHeader>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <ActionButton
              label={t('pm.project_detail.view_cost_details')}
              icon={<DollarSign size={16} />}
              variant='secondary'
              sx={{ justifyContent: 'flex-start' }}
            />
            <ActionButton
              label={t('pm.project_detail.view_project_invoices')}
              icon={<FileText size={16} />}
              variant='secondary'
              sx={{ justifyContent: 'flex-start' }}
            />
            <ActionButton
              label={t('pm.project_detail.budget_execution_analysis')}
              icon={<TrendingUp size={16} />}
              variant='secondary'
              sx={{ justifyContent: 'flex-start' }}
            />
            <ActionButton
              label={t('pm.project_detail.generate_voucher')}
              icon={<FileText size={16} />}
              variant='secondary'
              sx={{ justifyContent: 'flex-start' }}
            />
          </CardContent>
        </Card>
      </Box>
    );
  }, [project, t]);

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'overview',
        label: t('pm.project_detail.tab_overview'),
        content: (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
              gap: 3,
            }}
          >
            {overviewSections.map((section) => (
              <Card key={section.id}>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography
                    variant='h6'
                    sx={{ fontSize: '1.125rem' }}
                  >
                    {section.title}
                  </Typography>
                </CardHeader>
                {section.content}
              </Card>
            ))}
          </Box>
        ),
      },
      {
        id: 'gantt',
        label: t('pm.project_detail.tab_gantt'),
        content: (
          <Card>
            <CardHeader sx={{ pb: 2 }}>
              <Typography
                variant='h6'
                sx={{ fontSize: '1.125rem' }}
              >
                {t('pm.project_detail.project_gantt_chart')}
              </Typography>
            </CardHeader>
            <CardContent>
              {project ? (
                <GanttChart
                  phases={ganttPhases}
                  milestones={ganttMilestones}
                  projectStartDate={project.start_date}
                  projectEndDate={project.end_date}
                />
              ) : null}
            </CardContent>
          </Card>
        ),
      },
      {
        id: 'phases',
        label: t('pm.project_detail.tab_phases'),
        content: phasesContent,
      },
      {
        id: 'milestones',
        label: t('pm.project_detail.tab_milestones'),
        content: milestonesContent,
      },
      {
        id: 'finance',
        label: t('pm.project_detail.tab_finance'),
        content: financeContent,
      },
    ],
    [
      overviewSections,
      phasesContent,
      milestonesContent,
      financeContent,
      project,
      ganttPhases,
      ganttMilestones,
      t,
    ]
  );

  const infoCard = useMemo(() => {
    if (!project) return;

    const statusKey = project.status || 'draft';

    return {
      title: project.name,
      subtitle: project.code,
      tags: [
        STATUS_LABELS[statusKey],
        RISK_LABELS[project.risklevel || ''] || t('pm.project_detail.not_evaluated'),
      ],
      stats: [
        { label: t('pm.project_detail.project_progress'), value: `${project.progress}%` },
        {
          label: t('pm.project_detail.phase_completion'),
          value: `${completedPhases}/${phases.length}`,
        },
        { label: t('pm.project_detail.project_budget'), value: formatCurrency(project.budget) },
        {
          label: t('pm.project_detail.milestone'),
          value: `${completedMilestones}/${milestones.length}`,
        },
      ],
    };
  }, [
    project,
    phases,
    milestones,
    completedPhases,
    completedMilestones,
    t,
    STATUS_LABELS,
    RISK_LABELS,
  ]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PM.PROJECT(id || '') });
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.PM.PROJECT(id || ''), 'phases'] });
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.PM.PROJECT(id || ''), 'milestones'] });
  };

  return (
    <PageContainer
      title={project?.name || t('pm.project_detail.project_detail_title')}
      subtitle={project?.code}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('pm.project_detail.home'), href: '/dashboard' },
          { label: t('pm.project_detail.project_management'), href: PM_PATHS.projects },
          { label: t('pm.project_detail.project_detail_title') },
        ]}
        loading={loading}
        error={error ? (error as Error).message : ''}
        backHref={PM_PATHS.projects}
        onEdit={() => id && navigate(`${PM_PATHS.projects}/${id}/edit`)}
        tabs={tabs}
        defaultTab='overview'
        infoCard={infoCard}
        onRefresh={handleRefresh}
      />
    </PageContainer>
  );
};

export default PmProjectDetailPage;
