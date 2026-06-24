import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Button,
  Tabs,
  Tab,
  Pagination,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  School as SchoolIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import {
  trainingPlanApi,
  trainingCourseApi,
  type TrainingPlan,
  type TrainingCourse,
} from '../api/hrm';

const getStatusColor = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'active':
    case 'in_progress':
    case 'ongoing':
      return 'success';
    case 'draft':
    case 'pending':
      return 'default';
    case 'completed':
      return 'info';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
    case 'ongoing':
      return '进行中';
    case 'draft':
    case 'pending':
      return '草稿';
    case 'completed':
      return '已完成';
    case 'cancelled':
      return '已取消';
    default:
      return status;
  }
};

export const TrainingPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [plansTotal, setPlansTotal] = useState(0);
  const [coursesTotal, setCoursesTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await trainingPlanApi.list({ page: p, page_size: pageSize });
      setPlans(data.items);
      setPlansTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载培训计划失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await trainingCourseApi.list({ page: p, page_size: pageSize });
      setCourses(data.items);
      setCoursesTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载培训课程失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 0) {
      loadPlans(1);
    } else {
      loadCourses(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleActivate = async (id: string) => {
    try {
      await trainingPlanApi.activate(id);
      await loadPlans(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '激活培训计划失败');
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  const plansTotalPages = Math.ceil(plansTotal / pageSize);
  const coursesTotalPages = Math.ceil(coursesTotal / pageSize);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            培训管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理培训计划、课程与员工培训记录
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => (tab === 0 ? loadPlans(page) : loadCourses(page))}
          >
            刷新
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <SchoolIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    培训计划
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {plansTotal}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <SchoolIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    培训课程
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {coursesTotal}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <SchoolIcon color="info" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    进行中课程
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {courses.filter((c) => c.status === 'active' || c.status === 'ongoing').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <PersonAddIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    报名总人次
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {courses.reduce((sum, c) => sum + (c.enrolled_count || 0), 0)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="培训计划" />
          <Tab label="培训课程" />
        </Tabs>
      </Paper>

      <Paper>
        {tab === 0 ? (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>计划名称</TableCell>
                    <TableCell>编码</TableCell>
                    <TableCell>开始日期</TableCell>
                    <TableCell>结束日期</TableCell>
                    <TableCell>预算</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : plans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">暂无培训计划</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans.map((plan) => (
                      <TableRow key={plan.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {plan.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{plan.code || '-'}</TableCell>
                        <TableCell>{plan.start_date}</TableCell>
                        <TableCell>{plan.end_date}</TableCell>
                        <TableCell>{plan.budget ? `¥${plan.budget.toLocaleString()}` : '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(plan.status)}
                            size="small"
                            color={getStatusColor(plan.status)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {plan.status === 'draft' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleActivate(plan.id)}
                            >
                              激活
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {plansTotal > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
                <Pagination
                  count={plansTotalPages}
                  page={page}
                  onChange={(_, p) => loadPlans(p)}
                  size="small"
                />
              </Box>
            )}
          </>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>课程名称</TableCell>
                    <TableCell>类别</TableCell>
                    <TableCell>级别</TableCell>
                    <TableCell>时长</TableCell>
                    <TableCell>讲师</TableCell>
                    <TableCell>已报名</TableCell>
                    <TableCell>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : courses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">暂无培训课程</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    courses.map((course) => (
                      <TableRow key={course.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {course.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{course.category}</TableCell>
                        <TableCell>{course.level}</TableCell>
                        <TableCell>
                          {course.duration_hours ? `${course.duration_hours} 小时` : '-'}
                        </TableCell>
                        <TableCell>{course.instructor_name || '-'}</TableCell>
                        <TableCell>
                          {course.enrolled_count || 0} / {course.max_participants || '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(course.status)}
                            size="small"
                            color={getStatusColor(course.status)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {coursesTotal > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
                <Pagination
                  count={coursesTotalPages}
                  page={page}
                  onChange={(_, p) => loadCourses(p)}
                  size="small"
                />
              </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default TrainingPage;
