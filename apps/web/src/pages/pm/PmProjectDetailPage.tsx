import React, { useState, useEffect, useMemo } from 'react';
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

const STATUS_LABELS: Record<string, string> = {
  active: '进行中',
  completed: '已完成',
  pending: '待审批',
  approved: '已批准',
  cancelled: '已取消',
  draft: '草稿',
};

const STATUS_COLORS: Record<string, { bgcolor: string; color: string }> = {
  active: { bgcolor: 'success.lighter', color: '#166534' },
  completed: { bgcolor: 'primary.100', color: 'primary.800' },
  pending: { bgcolor: 'warning.100', color: '#a16207' },
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
  high: { bgcolor: 'error.lighter', color: '#991b1b' },
  medium: { bgcolor: 'warning.100', color: '#a16207' },
  low: { bgcolor: 'success.lighter', color: '#166534' },
};

const PmProjectDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadProjectData(id);
    }
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    setLoading(true);
    setError('');
    try {
      const [projectResponse, phasesResponse, milestonesResponse] = await Promise.all([
        pmApi.projects.get(projectId),
        pmApi.phases.list(projectId),
        pmApi.milestones.list(projectId),
      ]);

      if (projectResponse.success && projectResponse.data) {
        setProject(projectResponse.data);
      }
      if (phasesResponse.success && phasesResponse.data) {
        setPhases(phasesResponse.data.phases || phasesResponse.data || []);
      }
      if (milestonesResponse.success && milestonesResponse.data) {
        setMilestones(milestonesResponse.data.milestones || milestonesResponse.data || []);
      }
    } catch (error: unknown) {
      logger.error('Failed to load project data:', error);
      setError('加载项目数据失败');
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
            里程碑列表
          </Typography>
          <ActionButton
            label='添加里程碑'
            variant='secondary'
            size='small'
          />
        </CardHeader>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 200 }}>里程碑名称</TableCell>
                  <TableCell sx={{ width: 150 }}>目标日期</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>所属阶段</TableCell>
                  <TableCell sx={{ width: 120 }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {milestones.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      sx={{ textAlign: 'center', py: 6, color: 'grey.500' }}
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
                        <StatusBadge
                          status={milestone.status}
                          label={
                            milestone.status === 'completed'
                              ? '已完成'
                              : milestone.status === 'active'
                                ? '进行中'
                                : '未开始'
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
                          ? phases.find((p) => p.id === milestone.phase_id)?.name || '-'
                          : '-'}
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
    [milestones, phases]
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
            <ActionButton
              label='查看详情'
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
                  人工成本
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
                  材料成本
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
                  费用支出
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
                  分包成本
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
                    ? '超预算'
                    : project.budget_utilization_rate && project.budget_utilization_rate > 80
                      ? '预警'
                      : '正常'
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
              快速操作
            </Typography>
          </CardHeader>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <ActionButton
              label='查看成本明细'
              icon={<DollarSign size={16} />}
              variant='secondary'
              sx={{ justifyContent: 'flex-start' }}
            />
            <ActionButton
              label='查看项目发票'
              icon={<FileText size={16} />}
              variant='secondary'
              sx={{ justifyContent: 'flex-start' }}
            />
            <ActionButton
              label='预算执行分析'
              icon={<TrendingUp size={16} />}
              variant='secondary'
              sx={{ justifyContent: 'flex-start' }}
            />
            <ActionButton
              label='生成项目凭证'
              icon={<FileText size={16} />}
              variant='secondary'
              sx={{ justifyContent: 'flex-start' }}
            />
          </CardContent>
        </Card>
      </Box>
    );
  }, [project]);

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'overview',
        label: '项目概览',
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
        label: '甘特图',
        content: (
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
        label: '阶段管理',
        content: phasesContent,
      },
      {
        id: 'milestones',
        label: '里程碑',
        content: milestonesContent,
      },
      {
        id: 'finance',
        label: '财务',
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
    ]
  );

  const infoCard = useMemo(() => {
    if (!project) return;

    const statusKey = project.status || 'draft';

    return {
      title: project.name,
      subtitle: project.code,
      tags: [STATUS_LABELS[statusKey], RISK_LABELS[project.risklevel || ''] || '未评估'],
      stats: [
        { label: '项目进度', value: `${project.progress}%` },
        { label: '阶段完成', value: `${completedPhases}/${phases.length}` },
        { label: '项目预算', value: formatCurrency(project.budget) },
        { label: '里程碑', value: `${completedMilestones}/${milestones.length}` },
      ],
    };
  }, [project, phases, milestones, completedPhases, completedMilestones]);

  return (
    <PageContainer
      title={project?.name || '项目详情'}
      subtitle={project?.code}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '项目管理', href: '/pm/projects' },
          { label: '项目详情' },
        ]}
        loading={loading}
        error={error}
        backHref='/pm/projects'
        onEdit={() => id && navigate(`/pm/projects/${id}/edit`)}
        tabs={tabs}
        defaultTab='overview'
        infoCard={infoCard}
        onRefresh={() => id && loadProjectData(id)}
      />
    </PageContainer>
  );
};

export default PmProjectDetailPage;
