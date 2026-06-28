import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';

import { BarChart3, Building2, GraduationCap, Trophy, UserPlus, Users } from 'lucide-react';

import { useHrmStore } from '../store/hrmStore';

const AssessmentIcon = BarChart3;
const PeopleIcon = Users;
const BusinessIcon = Building2;
const EmojiEventsIcon = Trophy;
const PersonAddIcon = UserPlus;
const SchoolIcon = GraduationCap;

interface StatItem {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'info' | 'error';
  change?: string;
}

export const DashboardPage: React.FC = () => {
  const { loading, error, setLoading, setError } = useHrmStore();
  const [stats, setStats] = useState<StatItem[]>([]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setStats([
        {
          id: 'total-employees',
          title: '员工总数',
          value: 256,
          icon: <PeopleIcon size={24} />,
          color: 'primary',
          change: '较上月 +12',
        },
        {
          id: 'new-hires',
          title: '本月入职',
          value: 8,
          icon: <PersonAddIcon size={24} />,
          color: 'success',
          change: '较上月 +3',
        },
        {
          id: 'departments',
          title: '部门数量',
          value: 12,
          icon: <BusinessIcon size={24} />,
          color: 'info',
          change: '新增 1 个',
        },
        {
          id: 'training',
          title: '培训课程',
          value: 23,
          icon: <SchoolIcon size={24} />,
          color: 'warning',
          change: '进行中 5',
        },
        {
          id: 'performance',
          title: '绩效考核',
          value: 189,
          icon: <EmojiEventsIcon size={24} />,
          color: 'error',
          change: '已完成 156',
        },
        {
          id: 'reports',
          title: '本月报表',
          value: 14,
          icon: <AssessmentIcon size={24} />,
          color: 'primary',
          change: '较上月 +2',
        },
      ]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [setLoading, setError]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          HRM 仪表盘
        </Typography>
        <Typography variant="body1" color="text.secondary">
          人力资源管理综合数据概览
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {stats.map((stat) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  sx={{
                    height: '100%',
                    borderTop: 3,
                    borderColor: `${stat.color}.main`,
                  }}
                >
                  <CardContent>
                    <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                      <Box sx={{ color: `${stat.color}.main` }}>{stat.icon}</Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {stat.title}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 600, mt: 0.5 }}>
                          {stat.value}
                        </Typography>
                        {stat.change && (
                          <Typography variant="caption" color="text.secondary">
                            {stat.change}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper sx={{ p: 3, height: 360 }}>
                <Typography variant="h6" gutterBottom>
                  部门人数分布
                </Typography>
                <Box
                  sx={{
                    height: 280,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  图表占位 - 部门人数分布柱状图
                </Box>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, height: 360 }}>
                <Typography variant="h6" gutterBottom>
                  员工状态分布
                </Typography>
                <Box
                  sx={{
                    height: 280,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  图表占位 - 员工状态饼图
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default DashboardPage;
