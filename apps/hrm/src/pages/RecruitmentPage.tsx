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
  IconButton,
  Tabs,
  Tab,
  Pagination,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
} from '@mui/material';

import { Briefcase, RefreshCw, Send, User, X } from 'lucide-react';

import { jobOpeningApi, candidateApi, type JobOpening, type Candidate } from '../api/hrm';

const PublishIcon = Send;
const RefreshIcon = RefreshCw;
const PersonOutlineIcon = User;
const CloseIcon = X;
const WorkOutlineIcon = Briefcase;

const getJobStatusColor = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'open':
    case 'published':
      return 'success';
    case 'draft':
      return 'default';
    case 'closed':
    case 'filled':
      return 'warning';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const getJobStatusLabel = (status: string) => {
  switch (status) {
    case 'open':
    case 'published':
      return '招聘中';
    case 'draft':
      return '草稿';
    case 'closed':
    case 'filled':
      return '已关闭';
    case 'cancelled':
      return '已取消';
    default:
      return status;
  }
};

const getCandidateStatusColor = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'hired':
    case 'accepted':
      return 'success';
    case 'interviewing':
    case 'screening':
      return 'info';
    case 'applied':
    case 'pending':
      return 'default';
    case 'rejected':
    case 'withdrawn':
      return 'error';
    default:
      return 'default';
  }
};

const getCandidateStatusLabel = (status: string) => {
  switch (status) {
    case 'hired':
    case 'accepted':
      return '已入职';
    case 'interviewing':
      return '面试中';
    case 'screening':
      return '筛选中';
    case 'applied':
    case 'pending':
      return '待处理';
    case 'rejected':
      return '已拒绝';
    case 'withdrawn':
      return '已撤回';
    default:
      return status;
  }
};

export const RecruitmentPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [candidatesTotal, setCandidatesTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await jobOpeningApi.list({ page: p, page_size: pageSize });
      setJobs(data.items);
      setJobsTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载职位失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCandidates = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await candidateApi.list({ page: p, page_size: pageSize });
      setCandidates(data.items);
      setCandidatesTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载候选人失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 0) {
      loadJobs(1);
    } else {
      loadCandidates(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handlePublish = async (id: string) => {
    try {
      await jobOpeningApi.publish(id);
      await loadJobs(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布职位失败');
    }
  };

  const handleClose = async (id: string) => {
    if (!window.confirm('确定关闭该职位吗？')) return;
    try {
      await jobOpeningApi.close(id);
      await loadJobs(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '关闭职位失败');
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  const jobsTotalPages = Math.ceil(jobsTotal / pageSize);
  const candidatesTotalPages = Math.ceil(candidatesTotal / pageSize);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            招聘管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理招聘需求、职位发布与候选人
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => (tab === 0 ? loadJobs(page) : loadCandidates(page))}
          >
            刷新
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <WorkOutlineIcon color="primary" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    职位总数
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {jobsTotal}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <WorkOutlineIcon color="success" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    招聘中
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {jobs.filter((j) => j.status === 'open' || j.status === 'published').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <PersonOutlineIcon color="info" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    候选人总数
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {candidatesTotal}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <PersonOutlineIcon color="warning" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    面试中
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {candidates.filter((c) => c.status === 'interviewing').length}
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
          <Tab label="招聘职位" />
          <Tab label="候选人" />
        </Tabs>
      </Paper>

      <Paper>
        {tab === 0 ? (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>职位名称</TableCell>
                    <TableCell>工作地点</TableCell>
                    <TableCell>工作类型</TableCell>
                    <TableCell>薪资范围</TableCell>
                    <TableCell>发布日期</TableCell>
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
                  ) : jobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">暂无招聘职位</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    jobs.map((job) => (
                      <TableRow key={job.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {job.title}
                          </Typography>
                        </TableCell>
                        <TableCell>{job.location || '-'}</TableCell>
                        <TableCell>{job.employment_type || '-'}</TableCell>
                        <TableCell>
                          {job.salary_min && job.salary_max
                            ? `¥${job.salary_min.toLocaleString()} - ¥${job.salary_max.toLocaleString()}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {job.publish_date
                            ? new Date(job.publish_date).toLocaleDateString('zh-CN')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getJobStatusLabel(job.status)}
                            size="small"
                            color={getJobStatusColor(job.status)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {job.status === 'draft' && (
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handlePublish(job.id)}
                              title="发布"
                            >
                              <PublishIcon size={16} />
                            </IconButton>
                          )}
                          {(job.status === 'open' || job.status === 'published') && (
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleClose(job.id)}
                              title="关闭"
                            >
                              <CloseIcon size={16} />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {jobsTotal > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
                <Pagination
                  count={jobsTotalPages}
                  page={page}
                  onChange={(_, p) => loadJobs(p)}
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
                    <TableCell>姓名</TableCell>
                    <TableCell>邮箱</TableCell>
                    <TableCell>电话</TableCell>
                    <TableCell>来源</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>申请时间</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : candidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">暂无候选人</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    candidates.map((cand) => (
                      <TableRow key={cand.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {cand.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{cand.email || '-'}</TableCell>
                        <TableCell>{cand.phone || '-'}</TableCell>
                        <TableCell>{cand.source || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={getCandidateStatusLabel(cand.status)}
                            size="small"
                            color={getCandidateStatusColor(cand.status)}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(cand.created_at).toLocaleDateString('zh-CN')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {candidatesTotal > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
                <Pagination
                  count={candidatesTotalPages}
                  page={page}
                  onChange={(_, p) => loadCandidates(p)}
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

export default RecruitmentPage;
