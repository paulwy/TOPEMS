import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Paper,
} from '@mui/material';
import { Button } from '@mui/material';
import {
  Plus,
  Download,
  GitBranch,
  GitCommit,
  History,
  GitPullRequest,
  Code,
  Eye,
} from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type FilterConfig } from '@/components/templates';

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

const RsCodePage: React.FC = () => {
  const [repos, setRepos] = useState<CodeRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [repoFilter, setRepoFilter] = useState<string | null>(null);
  const [branchTypeFilter, setBranchTypeFilter] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<CodeRepo | null>(null);

  useEffect(() => {
    const mockRepos: CodeRepo[] = [
      {
        id: '1',
        repo_name: 'frontend-app',
        branch_name: 'main',
        last_commit: 'feat: add user authentication',
        committer: '张三',
        lines_of_code: 15420,
        last_update: '2024-06-15 14:30:00',
        branch_type: 'main',
      },
      {
        id: '2',
        repo_name: 'backend-api',
        branch_name: 'develop',
        last_commit: 'fix: resolve null pointer exception',
        committer: '李四',
        lines_of_code: 28350,
        last_update: '2024-06-15 10:20:00',
        branch_type: 'develop',
      },
      {
        id: '3',
        repo_name: 'mobile-app',
        branch_name: 'feature/new-ui',
        last_commit: 'refactor: update navigation component',
        committer: '王五',
        lines_of_code: 12580,
        last_update: '2024-06-14 16:45:00',
        branch_type: 'feature',
      },
      {
        id: '4',
        repo_name: 'shared-utils',
        branch_name: 'main',
        last_commit: 'chore: update dependencies',
        committer: '赵六',
        lines_of_code: 8960,
        last_update: '2024-06-14 09:15:00',
        branch_type: 'main',
      },
      {
        id: '5',
        repo_name: 'data-service',
        branch_name: 'hotfix/bug-123',
        last_commit: 'fix: correct data parsing logic',
        committer: '孙七',
        lines_of_code: 19240,
        last_update: '2024-06-13 11:30:00',
        branch_type: 'hotfix',
      },
    ];
    setRepos(mockRepos);
    setLoading(false);
  }, []);

  const getBranchTypeColor = (type: string): 'primary' | 'success' | 'warning' | 'error' => {
    switch (type) {
      case 'main':
        return 'primary';
      case 'develop':
        return 'success';
      case 'feature':
        return 'warning';
      case 'hotfix':
        return 'error';
      default:
        return 'primary';
    }
  };

  const filteredRepos = repos.filter((repo) => {
    const matchesSearch =
      repo.repo_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.branch_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.committer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRepo = !repoFilter || repo.repo_name === repoFilter;
    const matchesBranchType = !branchTypeFilter || repo.branch_type === branchTypeFilter;
    return matchesSearch && matchesRepo && matchesBranchType;
  });

  const paginatedRepos = filteredRepos.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const uniqueRepos = [...new Set(repos.map((r) => r.repo_name))];
  const uniqueBranchTypes = [...new Set(repos.map((r) => r.branch_type))];

  const handleViewDetail = (repo: CodeRepo) => {
    setSelectedRepo(repo);
    setDetailDialogOpen(true);
  };

  const handleViewHistory = (repo: CodeRepo) => {
    setSelectedRepo(repo);
    setHistoryDialogOpen(true);
  };

  const columns: ColumnDef<CodeRepo>[] = [
    {
      id: 'repo_name',
      label: '仓库名称',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Code
            size={16}
            color='primary.main'
          />
          {row.repo_name}
        </Box>
      ),
    },
    {
      id: 'branch_name',
      label: '分支名称',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GitBranch size={16} />
          {row.branch_name}
          <Chip
            label={row.branch_type}
            size='small'
            color={getBranchTypeColor(row.branch_type)}
          />
        </Box>
      ),
    },
    {
      id: 'last_commit',
      label: '最近提交',
      render: (row) => (
        <Typography
          variant='body2'
          sx={{
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={row.last_commit}
        >
          <GitCommit
            size={14}
            style={{ marginRight: 4, verticalAlign: 'middle' }}
          />
          {row.last_commit}
        </Typography>
      ),
    },
    {
      id: 'committer',
      label: '提交者',
    },
    {
      id: 'lines_of_code',
      label: '代码行数',
      render: (row) => row.lines_of_code.toLocaleString(),
    },
    {
      id: 'last_update',
      label: '最后更新时间',
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'repo',
      label: '仓库',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        ...uniqueRepos.map((repo) => ({ label: repo, value: repo })),
      ],
      value: repoFilter || '',
      onChange: (value) => setRepoFilter(value || null),
    },
    {
      id: 'branch_type',
      label: '分支类型',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        ...uniqueBranchTypes.map((type) => ({ label: type, value: type })),
      ],
      value: branchTypeFilter || '',
      onChange: (value) => setBranchTypeFilter(value || null),
    },
  ];

  const rowActions = [
    {
      label: '代码浏览',
      icon: <Eye size={16} />,
      onClick: handleViewDetail,
    },
    {
      label: '提交历史',
      icon: <History size={16} />,
      onClick: handleViewHistory,
    },
    {
      label: '合并请求',
      icon: <GitPullRequest size={16} />,
      onClick: () => {},
    },
  ];

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100vh', py: 3 }}>
      <ListPageTemplate
        title='代码管理'
        columns={columns}
        data={paginatedRepos}
        loading={loading}
        searchable
        searchPlaceholder='搜索仓库、分支或提交者...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        filters={filters}
        filtersValue={{
          repo: repoFilter || '',
          branch_type: branchTypeFilter || '',
        }}
        onFilterChange={(filters) => {
          if (filters.repo !== undefined) {
            setRepoFilter(filters.repo || null);
          }
          if (filters.branch_type !== undefined) {
            setBranchTypeFilter(filters.branch_type || null);
          }
        }}
        pagination={{
          page,
          pageSize: rowsPerPage,
          total: filteredRepos.length,
          onPageChange: setPage,
          onPageSizeChange: setRowsPerPage,
        }}
        actions={[
          {
            label: '导出',
            variant: 'outlined',
            icon: <Download size={18} />,
            onClick: () => {
              // 导出功能
              const headers = [
                '仓库名称',
                '分支名称',
                '分支类型',
                '最近提交',
                '提交者',
                '代码行数',
                '最后更新时间',
              ];
              const csvData = filteredRepos.map((r) => [
                r.repo_name,
                r.branch_name,
                r.branch_type,
                r.last_commit,
                r.committer,
                r.lines_of_code,
                r.last_update,
              ]);
              const csvContent = [headers, ...csvData].map((row) => row.join(',')).join('\n');
              const blob = new Blob(['\ufeff' + csvContent], {
                type: 'text/csv;charset=utf-8;',
              });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = '代码仓库数据.csv';
              link.click();
              URL.revokeObjectURL(url);
            },
          },
          {
            label: '新建仓库',
            variant: 'contained',
            icon: <Plus size={18} />,
            onClick: () => {},
          },
        ]}
        rowActions={rowActions}
        showRowNumber
        emptyMessage='暂无代码仓库数据'
      />

      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>代码浏览</DialogTitle>
        <DialogContent>
          {selectedRepo && (
            <Box sx={{ py: 2 }}>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 'bold' }}
              >
                {selectedRepo.repo_name} / {selectedRepo.branch_name}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mt: 1 }}
              >
                代码行数: {selectedRepo.lines_of_code.toLocaleString()}
              </Typography>
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.100' }}>
                <Typography
                  variant='body2'
                  sx={{ fontFamily: 'monospace' }}
                >
                  // 代码浏览功能待实现
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>提交历史</DialogTitle>
        <DialogContent>
          {selectedRepo && (
            <Box sx={{ py: 2 }}>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 'bold' }}
              >
                {selectedRepo.repo_name} / {selectedRepo.branch_name}
              </Typography>
              <Stack
                spacing={2}
                sx={{ mt: 2 }}
              >
                {[1, 2, 3].map((i) => (
                  <Paper
                    key={i}
                    sx={{ p: 2 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GitCommit
                        size={16}
                        color='primary.main'
                      />
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 'bold' }}
                      >
                        commit {selectedRepo.id.padStart(7, '0')}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {selectedRepo.last_update}
                      </Typography>
                    </Box>
                    <Typography
                      variant='body2'
                      sx={{ mt: 1 }}
                    >
                      {selectedRepo.last_commit}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      by {selectedRepo.committer}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RsCodePage;
