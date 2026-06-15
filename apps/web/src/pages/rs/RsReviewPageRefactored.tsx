/**
 * RsReviewPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 FilterBar 定义筛选器
 * 3. 使用 ListPageTemplate 替代 Card + Table 布局
 * 4. 使用 ColumnDef 定义表格列
 * 5. RS 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  TextField,
} from "@mui/material";
import {
  Plus,
  Eye,
  MessageSquare,
  Check,
  X,
  GitPullRequest,
  Clock,
  User,
  Download,
  RefreshCw,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef } from "../../components/templates";
import { PageHeader } from "../../components/layout";
import { FilterBar, type FilterConfig } from "../../components/mui";

// ============ 类型定义 ============
interface Review {
  id: string;
  title: string;
  reviewer: string;
  author: string;
  status: string;
  create_time: string;
  comment_count: number;
}

interface FilterValues {
  search: string;
  status: string;
  reviewer: string;
}

// ============ 列定义 ============
const columns: ColumnDef<Review>[] = [
  {
    id: "title",
    header: "评审标题",
    accessor: "title",
    sortable: true,
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <GitPullRequest size={16} color="#3b82f6" />
        {value}
      </Box>
    ),
  },
  {
    id: "reviewer",
    header: "评审人",
    accessor: "reviewer",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <User size={14} />
        {value}
      </Box>
    ),
  },
  {
    id: "author",
    header: "作者",
    accessor: "author",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    sortable: true,
    render: (value) => {
      const statusMap: Record<string, { label: string; color: "primary" | "success" | "warning" | "error" | "default" }> = {
        "pending": { label: "待评审", color: "warning" },
        "approved": { label: "已通过", color: "success" },
        "rejected": { label: "已拒绝", color: "error" },
        "in_progress": { label: "评审中", color: "primary" },
      };
      const config = statusMap[value] || { label: value, color: "default" as const };
      return <Chip label={config.label} size="small" color={config.color} />;
    },
  },
  {
    id: "create_time",
    header: "创建时间",
    accessor: "create_time",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Clock size={14} />
        {value}
      </Box>
    ),
  },
  {
    id: "comment_count",
    header: "评论数",
    accessor: "comment_count",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <MessageSquare size={14} />
        {value}
      </Box>
    ),
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
  },
  {
    id: "status",
    label: "状态",
    type: "text",
  },
  {
    id: "reviewer",
    label: "评审人",
    type: "text",
  },
];

// ============ 组件 ============
const RsReviewPageRefactored: React.FC = () => {
  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    status: "",
    reviewer: "",
  });

  // 模态框状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [newReviewDialogOpen, setNewReviewDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [newReviewForm, setNewReviewForm] = useState({ title: "", description: "", author: "" });

  // 模拟数据
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

    setTimeout(() => {
      setData(mockReviews);
      setTotal(mockReviews.length);
      setLoading(false);
    }, 500);
  }, []);

  // 获取数据
  const fetchReviews = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  // 处理筛选变化
  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setFiltersValue((prev) => ({ ...prev, [filterId]: value }));
  }, []);

  // 处理分页变化
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  // 处理查看详情
  const handleViewDetail = useCallback((review: Review) => {
    setSelectedReview(review);
    setDetailDialogOpen(true);
  }, []);

  // 处理通过
  const handleApprove = useCallback((reviewId: string) => {
    setData((prev) => prev.map((r) => (r.id === reviewId ? { ...r, status: "approved" } : r)));
  }, []);

  // 处理拒绝
  const handleReject = useCallback((reviewId: string) => {
    setData((prev) => prev.map((r) => (r.id === reviewId ? { ...r, status: "rejected" } : r)));
  }, []);

  // 处理创建评审
  const handleCreateReview = useCallback(() => {
    const newReview: Review = {
      id: String(Date.now()),
      title: newReviewForm.title,
      reviewer: "当前用户",
      author: newReviewForm.author,
      status: "pending",
      create_time: new Date().toLocaleString(),
      comment_count: 0,
    };
    setData((prev) => [newReview, ...prev]);
    setNewReviewDialogOpen(false);
    setNewReviewForm({ title: "", description: "", author: "" });
  }, [newReviewForm]);

  // 过滤数据
  const filteredData = data.filter((review) => {
    const matchesSearch =
      !filtersValue.search ||
      review.title.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      review.author.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      review.reviewer.toLowerCase().includes(filtersValue.search.toLowerCase());
    const matchesStatus = !filtersValue.status || review.status === filtersValue.status;
    const matchesReviewer = !filtersValue.reviewer || review.reviewer === filtersValue.reviewer;
    return matchesSearch && matchesStatus && matchesReviewer;
  });

  // 处理导出
  const handleExport = useCallback(() => {
    // 导出功能开发中
  }, []);

  // 行操作
  const rowActions = [
    {
      label: "查看评审",
      icon: <Eye size={16} />,
      onClick: handleViewDetail,
      color: "primary" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="代码评审"
        subtitle="管理代码评审请求和评审流程"
        createButton={{
          label: "新建评审",
          onClick: () => setNewReviewDialogOpen(true),
        }}
        actions={[
          {
            label: "导出",
            icon: <Download size={18} />,
            onClick: handleExport,
            variant: "outlined",
          },
        ]}
        rightContent={
          <Tooltip title="刷新">
            <IconButton onClick={fetchReviews}>
              <RefreshCw
                size={20}
                style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
              />
            </IconButton>
          </Tooltip>
        }
      />

      <ListPageTemplate
        columns={columns}
        data={filteredData}
        loading={loading}
        filters={filters}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: filteredData.length,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        onRowClick={handleViewDetail}
        rowActions={rowActions}
        emptyMessage="暂无评审数据"
        searchable
        searchPlaceholder="搜索评审标题、作者..."
      />

      {/* 评审详情对话框 */}
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
              <Typography variant="h6" fontWeight="bold">
                {selectedReview.title}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip
                  label={selectedReview.status === "pending" ? "待评审" : selectedReview.status === "approved" ? "已通过" : selectedReview.status === "rejected" ? "已拒绝" : "评审中"}
                  color={selectedReview.status === "pending" ? "warning" : selectedReview.status === "approved" ? "success" : selectedReview.status === "rejected" ? "error" : "primary"}
                />
                <Typography variant="body2" color="text.secondary">
                  作者: {selectedReview.author}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  评审人: {selectedReview.reviewer}
                </Typography>
              </Stack>
              <Box sx={{ p: 2, mt: 3, bgcolor: "#f5f5f5" }}>
                <Typography variant="body2">评审内容区域 - 待实现</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 新建评审对话框 */}
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
              onChange={(e) => setNewReviewForm({ ...newReviewForm, title: e.target.value })}
            />
            <TextField
              label="作者"
              fullWidth
              value={newReviewForm.author}
              onChange={(e) => setNewReviewForm({ ...newReviewForm, author: e.target.value })}
            />
            <TextField
              label="描述"
              fullWidth
              multiline
              rows={4}
              value={newReviewForm.description}
              onChange={(e) => setNewReviewForm({ ...newReviewForm, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewReviewDialogOpen(false)}>取消</Button>
          <Button variant="contained" sx={{ bgcolor: "#3b82f6" }} onClick={handleCreateReview}>
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RsReviewPageRefactored;
