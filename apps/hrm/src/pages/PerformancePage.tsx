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
  Pagination,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  LinearProgress,
} from '@mui/material';

import { CheckCircle, RefreshCw, Send, Trophy } from 'lucide-react';

import {
  performanceReviewApi,
  type PerformanceReview,
} from '../api/hrm';

const RefreshIcon = RefreshCw;
const CheckCircleIcon = CheckCircle;
const SendIcon = Send;
const EmojiEventsIcon = Trophy;

const getStatusColor = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'approved':
    case 'completed':
      return 'success';
    case 'submitted':
    case 'in_progress':
      return 'info';
    case 'draft':
    case 'pending':
      return 'default';
    case 'rejected':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'approved':
    case 'completed':
      return '已通过';
    case 'submitted':
    case 'in_progress':
      return '已提交';
    case 'draft':
    case 'pending':
      return '草稿';
    case 'rejected':
      return '已驳回';
    default:
      return status;
  }
};

export const PerformancePage: React.FC = () => {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await performanceReviewApi.list({ page: p, page_size: pageSize });
      setReviews(data.items);
      setTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载绩效列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (id: string) => {
    try {
      await performanceReviewApi.submit(id);
      await loadReviews(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交绩效失败');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await performanceReviewApi.approve(id);
      await loadReviews(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '审批绩效失败');
    }
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.final_rating || r.overall_rating || 0), 0) /
        reviews.length
      : 0;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            绩效管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理员工绩效考核、目标与评价
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadReviews(page)}
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
                <EmojiEventsIcon color="primary" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    考核总数
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {total}
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
                <EmojiEventsIcon color="success" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    已通过
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {reviews.filter((r) => r.status === 'approved' || r.status === 'completed').length}
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
                <EmojiEventsIcon color="info" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    进行中
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {reviews.filter((r) => r.status === 'submitted' || r.status === 'in_progress').length}
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
                <EmojiEventsIcon color="warning" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    平均评分
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {averageRating.toFixed(1)}
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

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>员工 ID</TableCell>
                <TableCell>考核周期</TableCell>
                <TableCell>自评</TableCell>
                <TableCell>上级评分</TableCell>
                <TableCell>最终评分</TableCell>
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
              ) : reviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无绩效数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                reviews.map((review) => {
                  const rating = review.final_rating || review.overall_rating || 0;
                  return (
                    <TableRow key={review.id} hover>
                      <TableCell>{review.employee_id}</TableCell>
                      <TableCell>{review.review_period}</TableCell>
                      <TableCell>{review.self_rating || '-'}</TableCell>
                      <TableCell>{review.manager_rating || '-'}</TableCell>
                      <TableCell>
                        <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                          <Box sx={{ width: 60 }}>
                            <LinearProgress
                              variant="determinate"
                              value={(rating / 5) * 100}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                          <Typography variant="body2">{rating.toFixed(1)}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(review.status)}
                          size="small"
                          color={getStatusColor(review.status)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {review.status === 'draft' && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleSubmit(review.id)}
                            title="提交"
                          >
                            <SendIcon size={16} />
                          </IconButton>
                        )}
                        {(review.status === 'submitted' || review.status === 'in_progress') && (
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprove(review.id)}
                            title="审批"
                          >
                            <CheckCircleIcon size={16} />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {total > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => loadReviews(p)}
              size="small"
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default PerformancePage;
