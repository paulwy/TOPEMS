import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Stack,
  TextField,
} from '@mui/material';
import { Button } from '@mui/material';
import { Plus, Eye, Check, X, GitPullRequest, Clock, User } from 'lucide-react';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';

interface Review {
  id: string;
  title: string;
  reviewer: string;
  author: string;
  status: string;
  create_time: string;
  comment_count: number;
}

const RsReviewPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [reviewerFilter, setReviewerFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [newReviewDialogOpen, setNewReviewDialogOpen] = useState(false);
  const [newReviewForm, setNewReviewForm] = useState({
    title: '',
    description: '',
    author: '',
  });

  useEffect(() => {
    const mockReviews: Review[] = [
      {
        id: '1',
        title: '用户认证模块重构',
        reviewer: '张三',
        author: '李四',
        status: 'pending',
        create_time: '2024-06-15 10:30:00',
        comment_count: 5,
      },
      {
        id: '2',
        title: '数据库查询优化',
        reviewer: '王五',
        author: '赵六',
        status: 'approved',
        create_time: '2024-06-14 14:20:00',
        comment_count: 12,
      },
      {
        id: '3',
        title: 'API接口版本升级',
        reviewer: '孙七',
        author: '周八',
        status: 'rejected',
        create_time: '2024-06-13 09:15:00',
        comment_count: 8,
      },
      {
        id: '4',
        title: '前端组件库更新',
        reviewer: '吴九',
        author: '郑十',
        status: 'in_progress',
        create_time: '2024-06-12 16:45:00',
        comment_count: 3,
      },
      {
        id: '5',
        title: '缓存机制实现',
        reviewer: '张三',
        author: '李四',
        status: 'pending',
        create_time: '2024-06-11 11:00:00',
        comment_count: 0,
      },
    ];
    setReviews(mockReviews);
  }, []);

  const getStatusColor = (
    status: string
  ): 'default' | 'primary' | 'success' | 'error' | 'warning' => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'in_progress':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending':
        return '待评审';
      case 'approved':
        return '已通过';
      case 'rejected':
        return '已拒绝';
      case 'in_progress':
        return '评审中';
      default:
        return status;
    }
  };

  const uniqueReviewers = useMemo(() => [...new Set(reviews.map((r) => r.reviewer))], [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const matchesSearch =
        review.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.reviewer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || review.status === statusFilter;
      const matchesReviewer = !reviewerFilter || review.reviewer === reviewerFilter;
      const matchesDateRange =
        (!dateRange.start || review.create_time >= dateRange.start) &&
        (!dateRange.end || review.create_time <= dateRange.end);
      return matchesSearch && matchesStatus && matchesReviewer && matchesDateRange;
    });
  }, [reviews, searchTerm, statusFilter, reviewerFilter, dateRange]);

  const handleViewDetail = (review: Review) => {
    setSelectedReview(review);
    setDetailDialogOpen(true);
  };

  const handleApprove = (review: Review) => {
    setReviews(reviews.map((r) => (r.id === review.id ? { ...r, status: 'approved' } : r)));
  };

  const handleReject = (review: Review) => {
    setReviews(reviews.map((r) => (r.id === review.id ? { ...r, status: 'rejected' } : r)));
  };

  const handleCreateReview = () => {
    const newReview: Review = {
      id: String(Date.now()),
      title: newReviewForm.title,
      reviewer: '当前用户',
      author: newReviewForm.author,
      status: 'pending',
      create_time: new Date().toLocaleString(),
      comment_count: 0,
    };
    setReviews([newReview, ...reviews]);
    setNewReviewDialogOpen(false);
    setNewReviewForm({ title: '', description: '', author: '' });
  };

  // 表格列定义
  const columns: ColumnDef<Review>[] = [
    {
      id: 'title',
      label: '评审标题',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GitPullRequest
            size={16}
            color='primary.main'
          />
          {row.title}
        </Box>
      ),
    },
    {
      id: 'reviewer',
      label: '评审人',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <User size={14} />
          {row.reviewer}
        </Box>
      ),
    },
    { id: 'author', label: '作者' },
    {
      id: 'status',
      label: '状态',
      render: (row) => (
        <Chip
          label={getStatusLabel(row.status)}
          size='small'
          color={getStatusColor(row.status)}
        />
      ),
    },
    {
      id: 'create_time',
      label: '创建时间',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Clock size={14} />
          {row.create_time}
        </Box>
      ),
    },
    {
      id: 'comment_count',
      label: '评论数',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{row.comment_count}</Box>
      ),
    },
  ];

  // 筛选器定义
  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        { label: '待评审', value: 'pending' },
        { label: '评审中', value: 'in_progress' },
        { label: '已通过', value: 'approved' },
        { label: '已拒绝', value: 'rejected' },
      ],
      value: statusFilter || '',
      onChange: (value) => setStatusFilter(value || null),
    },
    {
      id: 'reviewer',
      label: '评审人',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        ...uniqueReviewers.map((reviewer) => ({
          label: reviewer,
          value: reviewer,
        })),
      ],
      value: reviewerFilter || '',
      onChange: (value) => setReviewerFilter(value || null),
    },
    {
      id: 'dateRange',
      label: '日期范围',
      type: 'dateRange',
      value: dateRange,
      onChange: (value) => setDateRange(value || { start: '', end: '' }),
    },
  ];

  // 行操作定义
  const rowActions: RowAction<Review>[] = [
    {
      label: '查看评审',
      icon: <Eye size={16} />,
      onClick: handleViewDetail,
    },
    {
      label: '通过',
      icon: (
        <Check
          size={16}
          color='green'
        />
      ),
      onClick: handleApprove,
      show: (row) => row.status === 'pending',
    },
    {
      label: '拒绝',
      icon: (
        <X
          size={16}
          color='red'
        />
      ),
      onClick: handleReject,
      show: (row) => row.status === 'pending',
    },
  ];

  // 分页配置
  const pagination = {
    page,
    pageSize: rowsPerPage,
    total: filteredReviews.length,
    onPageChange: setPage,
    onPageSizeChange: setRowsPerPage,
  };

  // 操作按钮
  const actions = [
    {
      label: '新建评审',
      icon: <Plus size={18} />,
      onClick: () => setNewReviewDialogOpen(true),
    },
  ];

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100vh', py: 3 }}>
      <ListPageTemplate
        title='代码评审'
        columns={columns}
        data={filteredReviews}
        loading={loading}
        filters={filters}
        globalSearch={{
          fields: ['title', 'author', 'reviewer'],
          placeholder: '搜索评审标题、作者...',
        }}
        pagination={pagination}
        actions={actions}
        rowActions={rowActions}
        onSearch={setSearchTerm}
      />

      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>评审详情</DialogTitle>
        <DialogContent>
          {selectedReview && (
            <Box sx={{ py: 2 }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {selectedReview.title}
              </Typography>
              <Stack
                direction='row'
                spacing={2}
                sx={{ mt: 2 }}
              >
                <Chip
                  label={getStatusLabel(selectedReview.status)}
                  color={getStatusColor(selectedReview.status)}
                />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  作者: {selectedReview.author}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  评审人: {selectedReview.reviewer}
                </Typography>
              </Stack>
              <Paper sx={{ p: 2, mt: 3, bgcolor: 'grey.100' }}>
                <Typography variant='body2'>评审内容区域 - 待实现</Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={newReviewDialogOpen}
        onClose={() => setNewReviewDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新建评审</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 2 }}
          >
            <TextField
              label='评审标题'
              fullWidth
              value={newReviewForm.title}
              onChange={(e) => setNewReviewForm({ ...newReviewForm, title: e.target.value })}
            />
            <TextField
              label='作者'
              fullWidth
              value={newReviewForm.author}
              onChange={(e) => setNewReviewForm({ ...newReviewForm, author: e.target.value })}
            />
            <TextField
              label='描述'
              fullWidth
              multiline
              rows={4}
              value={newReviewForm.description}
              onChange={(e) =>
                setNewReviewForm({
                  ...newReviewForm,
                  description: e.target.value,
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewReviewDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            sx={{ bgcolor: 'primary.main' }}
            onClick={handleCreateReview}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RsReviewPage;
