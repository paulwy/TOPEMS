import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Plus,
  Search,
  Eye,
  MessageSquare,
  Check,
  X,
  GitPullRequest,
  Clock,
  User,
  Filter,
} from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [reviewerFilter, setReviewerFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [newReviewDialogOpen, setNewReviewDialogOpen] = useState(false);
  const [newReviewForm, setNewReviewForm] = useState({
    title: "",
    description: "",
    author: "",
  });

  useEffect(() => {
    const mockReviews: Review[] = [
      {
        id: "1",
        title: "用户认证模块重构",
        reviewer: "张三",
        author: "李四",
        status: "pending",
        create_time: "2024-06-15 10:30:00",
        comment_count: 5,
      },
      {
        id: "2",
        title: "数据库查询优化",
        reviewer: "王五",
        author: "赵六",
        status: "approved",
        create_time: "2024-06-14 14:20:00",
        comment_count: 12,
      },
      {
        id: "3",
        title: "API接口版本升级",
        reviewer: "孙七",
        author: "周八",
        status: "rejected",
        create_time: "2024-06-13 09:15:00",
        comment_count: 8,
      },
      {
        id: "4",
        title: "前端组件库更新",
        reviewer: "吴九",
        author: "郑十",
        status: "in_progress",
        create_time: "2024-06-12 16:45:00",
        comment_count: 3,
      },
      {
        id: "5",
        title: "缓存机制实现",
        reviewer: "张三",
        author: "李四",
        status: "pending",
        create_time: "2024-06-11 11:00:00",
        comment_count: 0,
      },
    ];
    setReviews(mockReviews);
    setLoading(false);
  }, []);

  const getStatusColor = (
    status: string,
  ): "default" | "primary" | "success" | "error" | "warning" => {
    switch (status) {
      case "pending":
        return "warning";
      case "approved":
        return "success";
      case "rejected":
        return "error";
      case "in_progress":
        return "primary";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "pending":
        return "待评审";
      case "approved":
        return "已通过";
      case "rejected":
        return "已拒绝";
      case "in_progress":
        return "评审中";
      default:
        return status;
    }
  };

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.reviewer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || review.status === statusFilter;
    const matchesReviewer =
      !reviewerFilter || review.reviewer === reviewerFilter;
    const matchesDateRange =
      (!dateRange.start || review.create_time >= dateRange.start) &&
      (!dateRange.end || review.create_time <= dateRange.end);
    return (
      matchesSearch && matchesStatus && matchesReviewer && matchesDateRange
    );
  });

  const uniqueReviewers = [...new Set(reviews.map((r) => r.reviewer))];

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetail = (review: Review) => {
    setSelectedReview(review);
    setDetailDialogOpen(true);
  };

  const handleApprove = (reviewId: string) => {
    setReviews(
      reviews.map((r) =>
        r.id === reviewId ? { ...r, status: "approved" } : r,
      ),
    );
  };

  const handleReject = (reviewId: string) => {
    setReviews(
      reviews.map((r) =>
        r.id === reviewId ? { ...r, status: "rejected" } : r,
      ),
    );
  };

  const handleCreateReview = () => {
    const newReview: Review = {
      id: String(Date.now()),
      title: newReviewForm.title,
      reviewer: "当前用户",
      author: newReviewForm.author,
      status: "pending",
      create_time: new Date().toLocaleString(),
      comment_count: 0,
    };
    setReviews([newReview, ...reviews]);
    setNewReviewDialogOpen(false);
    setNewReviewForm({ title: "", description: "", author: "" });
  };

  return (
    <Box sx={{ bgcolor: "#f5f5f5", minHeight: "100vh", py: 3 }}>
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h5"
            sx={{ ...{ color: "#3b82f6" }, fontWeight: "bold" }}
          >
            代码评审
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            sx={{ bgcolor: "#3b82f6" }}
            onClick={() => setNewReviewDialogOpen(true)}
          >
            新建评审
          </Button>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", flexWrap: "wrap" }}
          >
            <TextField
              size="small"
              placeholder="搜索评审标题、作者..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: 250 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter || ""}
                label="状态"
                onChange={(e) => setStatusFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="pending">待评审</MenuItem>
                <MenuItem value="in_progress">评审中</MenuItem>
                <MenuItem value="approved">已通过</MenuItem>
                <MenuItem value="rejected">已拒绝</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>评审人</InputLabel>
              <Select
                value={reviewerFilter || ""}
                label="评审人"
                onChange={(e) => setReviewerFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                {uniqueReviewers.map((reviewer) => (
                  <MenuItem key={reviewer} value={reviewer}>
                    {reviewer}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="date"
              label="开始日期"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              sx={{ width: 150 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              type="date"
              label="结束日期"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              sx={{ width: 150 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </Paper>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#3b82f6" }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    评审标题
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    评审人
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    作者
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    状态
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    创建时间
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    评论数
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    操作
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReviews
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((review) => (
                    <TableRow key={review.id} hover>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <GitPullRequest size={16} color="#3b82f6" />
                          {review.title}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <User size={14} />
                          {review.reviewer}
                        </Box>
                      </TableCell>
                      <TableCell>{review.author}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(review.status)}
                          size="small"
                          color={getStatusColor(review.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Clock size={14} />
                          {review.create_time}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <MessageSquare size={14} />
                          {review.comment_count}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="查看评审">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetail(review)}
                            >
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                          {review.status === "pending" && (
                            <>
                              <Tooltip title="通过">
                                <IconButton
                                  size="small"
                                  onClick={() => handleApprove(review.id)}
                                >
                                  <Check size={16} color="green" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="拒绝">
                                <IconButton
                                  size="small"
                                  onClick={() => handleReject(review.id)}
                                >
                                  <X size={16} color="red" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={filteredReviews.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Container>

      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>评审详情</DialogTitle>
        <DialogContent>
          {selectedReview && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {selectedReview.title}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip
                  label={getStatusLabel(selectedReview.status)}
                  color={getStatusColor(selectedReview.status)}
                />
                <Typography variant="body2" color="text.secondary">
                  作者: {selectedReview.author}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  评审人: {selectedReview.reviewer}
                </Typography>
              </Stack>
              <Paper sx={{ p: 2, mt: 3, bgcolor: "#f5f5f5" }}>
                <Typography variant="body2">评审内容区域 - 待实现</Typography>
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建评审</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="评审标题"
              fullWidth
              value={newReviewForm.title}
              onChange={(e) =>
                setNewReviewForm({ ...newReviewForm, title: e.target.value })
              }
            />
            <TextField
              label="作者"
              fullWidth
              value={newReviewForm.author}
              onChange={(e) =>
                setNewReviewForm({ ...newReviewForm, author: e.target.value })
              }
            />
            <TextField
              label="描述"
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
            variant="contained"
            sx={{ bgcolor: "#3b82f6" }}
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
