/**
 * RsCodePage 重构版本
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
} from "@mui/material";
import {
  Plus,
  Eye,
  GitBranch,
  GitCommit,
  History,
  GitPullRequest,
  Code,
  Download,
  RefreshCw,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef } from "../../components/templates";
import { PageHeader } from "../../components/layout";
import { FilterBar, type FilterConfig } from "../../components/mui";

// ============ 类型定义 ============
interface CodeRepo {
  id: string;
  repo_name: string;
  branch_name: string;
  last_commit: string;
  committer: string;
  lines_of_code: number;
  last_update: string;
  branch_type: string;
}

interface FilterValues {
  search: string;
  repo: string;
  branchType: string;
}

// ============ 列定义 ============
const columns: ColumnDef<CodeRepo>[] = [
  {
    id: "repo_name",
    header: "仓库名称",
    accessor: "repo_name",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Code size={16} color="#3b82f6" />
        {value}
      </Box>
    ),
  },
  {
    id: "branch_name",
    header: "分支名称",
    accessor: "branch_name",
    render: (_, row) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <GitBranch size={16} />
        {row.branch_name}
        <Chip label={row.branch_type} size="small" color={getBranchTypeColor(row.branch_type)} />
      </Box>
    ),
  },
  {
    id: "last_commit",
    header: "最近提交",
    accessor: "last_commit",
    render: (value) => (
      <Tooltip title={value}>
        <Box sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <GitCommit size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
          {value}
        </Box>
      </Tooltip>
    ),
  },
  {
    id: "committer",
    header: "提交者",
    accessor: "committer",
  },
  {
    id: "lines_of_code",
    header: "代码行数",
    accessor: "lines_of_code",
    render: (value) => (value as number).toLocaleString(),
  },
  {
    id: "last_update",
    header: "最后更新时间",
    accessor: "last_update",
  },
];

// ============ 辅助函数 ============
function getBranchTypeColor(type: string): "primary" | "success" | "warning" | "error" {
  switch (type) {
    case "main":
      return "primary";
    case "develop":
      return "success";
    case "feature":
      return "warning";
    case "hotfix":
      return "error";
    default:
      return "primary";
  }
}

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
  },
  {
    id: "repo",
    label: "仓库",
    type: "text",
  },
  {
    id: "branchType",
    label: "分支类型",
    type: "text",
  },
];

// ============ 组件 ============
const RsCodePageRefactored: React.FC = () => {
  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CodeRepo[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    repo: "",
    branchType: "",
  });

  // 模态框状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<CodeRepo | null>(null);

  // 模拟数据
  useEffect(() => {
    const mockRepos: CodeRepo[] = [
      {
        id: "1",
        repo_name: "frontend-app",
        branch_name: "main",
        last_commit: "feat: add user authentication",
        committer: "张三",
        lines_of_code: 15420,
        last_update: "2024-06-15 14:30:00",
        branch_type: "main",
      },
      {
        id: "2",
        repo_name: "backend-api",
        branch_name: "develop",
        last_commit: "fix: resolve null pointer exception",
        committer: "李四",
        lines_of_code: 28350,
        last_update: "2024-06-15 10:20:00",
        branch_type: "develop",
      },
      {
        id: "3",
        repo_name: "mobile-app",
        branch_name: "feature/new-ui",
        last_commit: "refactor: update navigation component",
        committer: "王五",
        lines_of_code: 12580,
        last_update: "2024-06-14 16:45:00",
        branch_type: "feature",
      },
      {
        id: "4",
        repo_name: "shared-utils",
        branch_name: "main",
        last_commit: "chore: update dependencies",
        committer: "赵六",
        lines_of_code: 8960,
        last_update: "2024-06-14 09:15:00",
        branch_type: "main",
      },
      {
        id: "5",
        repo_name: "data-service",
        branch_name: "hotfix/bug-123",
        last_commit: "fix: correct data parsing logic",
        committer: "孙七",
        lines_of_code: 19240,
        last_update: "2024-06-13 11:30:00",
        branch_type: "hotfix",
      },
    ];

    setTimeout(() => {
      setData(mockRepos);
      setTotal(mockRepos.length);
      setLoading(false);
    }, 500);
  }, []);

  // 获取数据
  const fetchRepos = useCallback(() => {
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
  const handleViewDetail = useCallback((repo: CodeRepo) => {
    setSelectedRepo(repo);
    setDetailDialogOpen(true);
  }, []);

  // 处理查看历史
  const handleViewHistory = useCallback((repo: CodeRepo) => {
    setSelectedRepo(repo);
    setHistoryDialogOpen(true);
  }, []);

  // 过滤数据
  const filteredData = data.filter((repo) => {
    const matchesSearch =
      !filtersValue.search ||
      repo.repo_name.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      repo.branch_name.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      repo.committer.toLowerCase().includes(filtersValue.search.toLowerCase());
    const matchesRepo =
      !filtersValue.repo || repo.repo_name === filtersValue.repo;
    const matchesBranchType =
      !filtersValue.branchType || repo.branch_type === filtersValue.branchType;
    return matchesSearch && matchesRepo && matchesBranchType;
  });

  // 处理导出
  const handleExport = useCallback(() => {
    // 导出功能开发中
  }, []);

  // 行操作
  const rowActions = [
    {
      label: "代码浏览",
      icon: <Eye size={16} />,
      onClick: handleViewDetail,
      color: "primary" as const,
    },
    {
      label: "提交历史",
      icon: <History size={16} />,
      onClick: handleViewHistory,
      color: "primary" as const,
    },
    {
      label: "合并请求",
      icon: <GitPullRequest size={16} />,
      onClick: () => {},
      color: "primary" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="代码管理"
        subtitle="管理代码仓库、分支和提交记录"
        createButton={{
          label: "新建仓库",
          onClick: () => {},
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
            <IconButton onClick={fetchRepos}>
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
        emptyMessage="暂无代码仓库数据"
        searchable
        searchPlaceholder="搜索仓库、分支或提交者..."
      />

      {/* 代码浏览对话框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>代码浏览</DialogTitle>
        <DialogContent>
          {selectedRepo && (
            <Box sx={{ py: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {selectedRepo.repo_name} / {selectedRepo.branch_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                代码行数: {selectedRepo.lines_of_code.toLocaleString()}
              </Typography>
              <Box sx={{ p: 2, mt: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="body2" fontFamily="monospace">
                  // 代码浏览功能待实现
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 提交历史对话框 */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>提交历史</DialogTitle>
        <DialogContent>
          {selectedRepo && (
            <Box sx={{ py: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {selectedRepo.repo_name} / {selectedRepo.branch_name}
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {[1, 2, 3].map((i) => (
                  <Box key={i} sx={{ p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <GitCommit size={16} color="#3b82f6" />
                      <Typography variant="body2" fontWeight="bold">
                        commit {selectedRepo.id.padStart(7, "0")}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedRepo.last_update}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {selectedRepo.last_commit}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      by {selectedRepo.committer}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RsCodePageRefactored;
