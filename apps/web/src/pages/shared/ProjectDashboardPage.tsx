import React, { useEffect, useState } from 'react';
import { apiLogger } from '@/utils/logger';
import {
  FolderKanban,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
  BarChart3,
  Target,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { apiClient } from '@/api/client';

interface ProjectSummary {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  delayed_projects: number;
  total_budget: number;
  total_actual_cost: number;
  avg_progress: number;
  total_members: number;
}

interface ProjectTypeStats {
  project_type: string;
  count: number;
  total_budget: number;
  avg_progress: number;
}

interface TrendData {
  date: string;
  project_count: number;
  completed_count: number;
  avg_progress: number;
  total_budget: number;
  total_cost: number;
}

interface PerformanceMetrics {
  on_time_delivery_rate: number;
  budget_adherence_rate: number;
  avg_completion_time_days: number;
  resource_utilization_rate: number;
}

interface Project {
  id: string;
  name: string;
  code: string;
  project_type: string;
  status: string;
  progress: number;
  budget?: number;
  actual_cost?: number;
  start_date?: string;
  end_date?: string;
}

const ProjectDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [typeStats, setTypeStats] = useState<ProjectTypeStats[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [summaryRes, typeRes, trendsRes, perfRes, projectsRes] = await Promise.all([
        apiClient.rs.get('/api/rs/reports/projects/summary'),
        apiClient.rs.get('/api/rs/reports/projects/types'),
        apiClient.rs.get('/api/rs/reports/projects/trends'),
        apiClient.rs.get('/api/rs/reports/projects/performance'),
        apiClient.rs.get('/api/rs/projects'),
      ]);

      if (summaryRes.success) setSummary(summaryRes.data);
      if (typeRes.success) setTypeStats(typeRes.data);
      if (trendsRes.success) setTrends(trendsRes.data);
      if (perfRes.success) setPerformance(perfRes.data);
      if (projectsRes.success) {
        setActiveProjects(projectsRes.data || []);
        setActiveProjects((projectsRes.data || []).filter((p: Project) => p.status === 'active'));
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusSx = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return { bgcolor: 'success.light', color: 'success.dark' };
      case 'completed':
        return { bgcolor: 'info.light', color: 'info.dark' };
      case 'delayed':
        return { bgcolor: 'error.light', color: 'error.dark' };
      default:
        return { bgcolor: 'grey.200', color: 'grey.800' };
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 384,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '2px solid primary.dark',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              to: { transform: 'rotate(360deg)' },
            },
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: 'grey.50', minHeight: '100vh' }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant='h4'
          sx={{ fontWeight: 700, color: 'grey.900' }}
        >
          项目管理驾驶舱
        </Typography>
        <Typography sx={{ color: 'grey.500', mt: 1 }}>实时监控项目状态、进度和绩效</Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                总项目数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'grey.900' }}
              >
                {summary?.total_projects || 0}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: '#dbeafe', borderRadius: '50%' }}>
              <FolderKanban
                size={24}
                color='primary.dark'
              />
            </Box>
          </Box>
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Box
              component='span'
              sx={{
                fontSize: '0.75rem',
                px: 1,
                py: 0.5,
                bgcolor: 'success.light',
                color: 'success.dark',
                borderRadius: 1,
              }}
            >
              进行中 {summary?.active_projects || 0}
            </Box>
            <Box
              component='span'
              sx={{
                fontSize: '0.75rem',
                px: 1,
                py: 0.5,
                bgcolor: 'grey.200',
                color: 'grey.800',
                borderRadius: 1,
              }}
            >
              已完成 {summary?.completed_projects || 0}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                平均进度
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'grey.900' }}
              >
                {formatPercent(summary?.avg_progress || 0)}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: 'success.light', borderRadius: '50%' }}>
              <TrendingUp
                size={24}
                color='success.dark'
              />
            </Box>
          </Box>
          <Box sx={{ mt: 1 }}>
            <Box
              sx={{
                width: '100%',
                bgcolor: 'grey.200',
                borderRadius: '9999px',
                height: 8,
              }}
            >
              <Box
                sx={{
                  bgcolor: 'success.dark',
                  height: 8,
                  borderRadius: '9999px',
                  width: `${summary?.avg_progress || 0}%`,
                }}
              />
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                总预算
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'grey.900' }}
              >
                {formatCurrency(summary?.total_budget || 0)}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: '#e9d5ff', borderRadius: '50%' }}>
              <DollarSign
                size={24}
                color='#7e22ce'
              />
            </Box>
          </Box>
          <Typography
            variant='caption'
            sx={{ color: 'grey.500', mt: 1, display: 'block' }}
          >
            实际支出: {formatCurrency(summary?.total_actual_cost || 0)}
          </Typography>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                团队成员
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'grey.900' }}
              >
                {summary?.total_members || 0}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: '#ffedd5', borderRadius: '50%' }}>
              <Users
                size={24}
                color='#ea580c'
              />
            </Box>
          </Box>
          <Typography
            variant='caption'
            sx={{ color: 'grey.500', mt: 1, display: 'block' }}
          >
            利用率: {formatPercent(performance?.resource_utilization_rate || 0)}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                逾期项目
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'error.dark' }}
              >
                {summary?.delayed_projects || 0}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: 'error.light', borderRadius: '50%' }}>
              <AlertTriangle
                size={24}
                color='error.dark'
              />
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                准时交付率
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'success.dark' }}
              >
                {formatPercent(performance?.on_time_delivery_rate || 0)}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: 'success.light', borderRadius: '50%' }}>
              <CheckCircle
                size={24}
                color='success.dark'
              />
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                预算遵守率
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'info.dark' }}
              >
                {formatPercent(performance?.budget_adherence_rate || 0)}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: 'info.light', borderRadius: '50%' }}>
              <DollarSign
                size={24}
                color='primary.dark'
              />
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                平均完成周期
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: '#7e22ce' }}
              >
                {performance?.avg_completion_time_days || 0}天
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: '#e9d5ff', borderRadius: '50%' }}>
              <Clock
                size={24}
                color='#7e22ce'
              />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
          gap: 3,
          mb: 3,
        }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography
              variant='h6'
              sx={{
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <BarChart3
                size={20}
                color='primary.dark'
              />
              项目类型分布
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {typeStats.map((stat, index) => (
              <Box key={index}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem',
                    mb: 0.5,
                  }}
                >
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {stat.project_type}
                  </Box>
                  <Box
                    component='span'
                    sx={{ color: 'grey.500' }}
                  >
                    {stat.count} 个项目
                  </Box>
                </Box>
                <Box
                  sx={{
                    width: '100%',
                    bgcolor: 'grey.200',
                    borderRadius: '9999px',
                    height: 8,
                  }}
                >
                  <Box
                    sx={{
                      height: 8,
                      borderRadius: '9999px',
                      bgcolor: 'primary.dark',
                      width: `${(stat.count / (summary?.total_projects || 1)) * 100}%`,
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: 'grey.500',
                    mt: 0.5,
                  }}
                >
                  <Box component='span'>预算: {formatCurrency(stat.total_budget)}</Box>
                  <Box component='span'>平均进度: {formatPercent(stat.avg_progress)}</Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography
              variant='h6'
              sx={{
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Activity
                size={20}
                color='success.dark'
              />
              项目趋势
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {trends.slice(0, 5).map((trend, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 500 }}>{trend.date}</Typography>
                  <Typography
                    variant='caption'
                    sx={{ color: 'grey.500' }}
                  >
                    新建 {trend.project_count} 个，完成 {trend.completed_count} 个
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, color: 'success.dark' }}
                  >
                    {formatPercent(trend.avg_progress)}
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ color: 'grey.500' }}
                  >
                    {formatCurrency(trend.total_budget)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
        <Box sx={{ p: 3, borderBottom: '1px solid grey.200' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              variant='h6'
              sx={{
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Target
                size={20}
                color='#7e22ce'
              />
              进行中项目
            </Typography>
            <button
              onClick={() => navigate('/rs')}
              style={{
                fontSize: '0.875rem',
                color: 'primary.dark',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              查看全部 →
            </button>
          </Box>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Box
            component='table'
            sx={{ width: '100%' }}
          >
            <Box
              component='thead'
              sx={{ bgcolor: 'grey.50' }}
            >
              <Box component='tr'>
                <Box
                  component='th'
                  sx={{
                    px: 3,
                    py: 1.5,
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'grey.500',
                    textTransform: 'uppercase',
                  }}
                >
                  项目名称
                </Box>
                <Box
                  component='th'
                  sx={{
                    px: 3,
                    py: 1.5,
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'grey.500',
                    textTransform: 'uppercase',
                  }}
                >
                  类型
                </Box>
                <Box
                  component='th'
                  sx={{
                    px: 3,
                    py: 1.5,
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'grey.500',
                    textTransform: 'uppercase',
                  }}
                >
                  状态
                </Box>
                <Box
                  component='th'
                  sx={{
                    px: 3,
                    py: 1.5,
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'grey.500',
                    textTransform: 'uppercase',
                  }}
                >
                  进度
                </Box>
                <Box
                  component='th'
                  sx={{
                    px: 3,
                    py: 1.5,
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'grey.500',
                    textTransform: 'uppercase',
                  }}
                >
                  预算
                </Box>
                <Box
                  component='th'
                  sx={{
                    px: 3,
                    py: 1.5,
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'grey.500',
                    textTransform: 'uppercase',
                  }}
                >
                  结束日期
                </Box>
              </Box>
            </Box>
            <Box component='tbody'>
              {activeProjects.slice(0, 5).map((project) => (
                <Box
                  component='tr'
                  key={project.id}
                  sx={{
                    '&:hover': { bgcolor: 'grey.50' },
                  }}
                >
                  <Box
                    component='td'
                    sx={{ px: 3, py: 2 }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                        {project.name}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ color: 'grey.500' }}
                      >
                        {project.code}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    component='td'
                    sx={{
                      px: 3,
                      py: 2,
                      fontSize: '0.875rem',
                      color: 'grey.600',
                    }}
                  >
                    {project.project_type}
                  </Box>
                  <Box
                    component='td'
                    sx={{ px: 3, py: 2 }}
                  >
                    <Box
                      component='span'
                      sx={{
                        px: 1,
                        py: 0.5,
                        fontSize: '0.75rem',
                        borderRadius: '9999px',
                        display: 'inline-block',
                        ...getStatusSx(project.status),
                      }}
                    >
                      {project.status}
                    </Box>
                  </Box>
                  <Box
                    component='td'
                    sx={{ px: 3, py: 2 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 96,
                          bgcolor: 'grey.200',
                          borderRadius: '9999px',
                          height: 8,
                        }}
                      >
                        <Box
                          sx={{
                            bgcolor: 'primary.dark',
                            height: 8,
                            borderRadius: '9999px',
                            width: `${project.progress}%`,
                          }}
                        />
                      </Box>
                      <Box
                        component='span'
                        sx={{
                          fontSize: '0.875rem',
                          color: 'grey.600',
                        }}
                      >
                        {project.progress}%
                      </Box>
                    </Box>
                  </Box>
                  <Box
                    component='td'
                    sx={{
                      px: 3,
                      py: 2,
                      fontSize: '0.875rem',
                      color: 'grey.600',
                    }}
                  >
                    {project.budget ? formatCurrency(project.budget) : '-'}
                  </Box>
                  <Box
                    component='td'
                    sx={{
                      px: 3,
                      py: 2,
                      fontSize: '0.875rem',
                      color: 'grey.600',
                    }}
                  >
                    {project.end_date ? new Date(project.end_date).toLocaleDateString() : '-'}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ProjectDashboardPage;
