import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  Database,
  LayoutGrid,
  Workflow,
  Users,
  Activity,
  Plus,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { PageContainer } from '@/components/common';
import { getAppOverview, listApps } from '../../api/lowcode';
import type { AppOverview, LowCodeApp } from '../../api/lowcode/types';
import AppCard from '../../components/lowcode/AppCard';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logger';

const AppOverviewPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<AppOverview | null>(null);
  const [recentApps, setRecentApps] = useState<LowCodeApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, appsRes] = await Promise.all([
        getAppOverview(),
        listApps({ pageSize: 6 }),
      ]);
      if (overviewRes.success) setOverview(overviewRes.data);
      if (appsRes.success) setRecentApps(appsRes.data.items || []);
    } catch (error) {
      logger.error('Failed to load overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      label: '应用总数',
      value: overview?.totalApps || 0,
      icon: LayoutGrid,
      color: 'primary.main',
      bg: 'primary.light',
    },
    {
      label: '数据模型',
      value: overview?.totalModels || 0,
      icon: Database,
      color: 'secondary.main',
      bg: 'secondary.light',
    },
    {
      label: '工作流',
      value: overview?.totalWorkflows || 0,
      icon: Workflow,
      color: 'success.main',
      bg: 'success.light',
    },
    {
      label: '用户数',
      value: overview?.totalUsers || 0,
      icon: Users,
      color: 'warning.main',
      bg: 'warning.light',
    },
  ];

  const stringToColor = (string: string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <PageContainer
      title='低代码平台'
      subtitle='快速构建企业级应用'
      loading={loading}
      headerActions={
        <Button
          variant='contained'
          startIcon={<Plus style={{ width: 18, height: 18 }} />}
          onClick={() => navigate('/lowcode/apps')}
        >
          创建应用
        </Button>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Grid
          container
          spacing={3}
        >
          {stats.map((stat, idx) => (
            <Grid
              size={{ xs: 12, sm: 6, md: 3 }}
              key={idx}
            >
              <Card
                variant='outlined'
                sx={{ height: '100%' }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: stat.bg,
                        color: stat.color,
                      }}
                    >
                      <stat.icon style={{ width: 24, height: 24 }} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant='h4'
                        sx={{ fontWeight: 700 }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {stat.label}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid
          container
          spacing={3}
        >
          <Grid size={{ xs: 12, md: 8 }}>
            <Card variant='outlined'>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant='h6'>最近应用</Typography>
                  <Button
                    size='small'
                    endIcon={<ArrowRight style={{ width: 16, height: 16 }} />}
                    onClick={() => navigate('/lowcode/apps')}
                  >
                    查看全部
                  </Button>
                </Box>
                <Grid
                  container
                  spacing={2}
                >
                  {recentApps.map((app) => (
                    <Grid
                      size={{ xs: 12, sm: 6, md: 4 }}
                      key={app.id}
                    >
                      <AppCard
                        app={app}
                        onClick={() => navigate(`/lowcode/apps/${app.id}`)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card variant='outlined'>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Activity
                      style={{ width: 20, height: 20, color: theme.palette.success.main }}
                    />
                    <Typography
                      variant='subtitle1'
                      sx={{ fontWeight: 600 }}
                    >
                      使用趋势
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[
                      { label: '本周访问', value: 1250, change: '+12%' },
                      { label: '数据记录', value: 86420, change: '+8%' },
                      { label: '工作流执行', value: 342, change: '+25%' },
                    ].map((item, idx) => (
                      <Box key={idx}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {item.label}
                          </Typography>
                          <Chip
                            label={item.change}
                            size='small'
                            color='success'
                            sx={{ height: 20, '& .MuiChip-label': { px: 1, py: 0 } }}
                          />
                        </Box>
                        <Typography
                          variant='h6'
                          sx={{ fontWeight: 600 }}
                        >
                          {item.value.toLocaleString()}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>

              <Card variant='outlined'>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Zap style={{ width: 20, height: 20, color: theme.palette.warning.main }} />
                    <Typography
                      variant='subtitle1'
                      sx={{ fontWeight: 600 }}
                    >
                      快速入门
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {[
                      { step: 1, title: '创建数据模型', desc: '设计您的数据结构' },
                      { step: 2, title: '配置页面', desc: '拖拽式页面构建' },
                      { step: 3, title: '设置权限', desc: '角色与字段权限' },
                      { step: 4, title: '发布应用', desc: '一键部署上线' },
                    ].map((item, idx) => (
                      <Box
                        key={idx}
                        sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}
                      >
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            fontSize: 14,
                            bgcolor: 'primary.main',
                            flexShrink: 0,
                          }}
                        >
                          {item.step}
                        </Avatar>
                        <Box>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 500 }}
                          >
                            {item.title}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {item.desc}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default AppOverviewPage;
