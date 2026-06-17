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
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Stack,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  GitBranch,
  GitCommit,
  History,
  GitPullRequest,
  Code,
  Filter,
} from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [repoFilter, setRepoFilter] = useState<string | null>(null);
  const [branchTypeFilter, setBranchTypeFilter] = useState<string | null>(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<CodeRepo | null>(null);

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
    setRepos(mockRepos);
    setLoading(false);
  }, []);

  const getBranchTypeColor = (
    type: string,
  ): "primary" | "success" | "warning" | "error" => {
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
  };

  const filteredRepos = repos.filter((repo) => {
    const matchesSearch =
      repo.repo_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.branch_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.committer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRepo = !repoFilter || repo.repo_name === repoFilter;
    const matchesBranchType =
      !branchTypeFilter || repo.branch_type === branchTypeFilter;
    return matchesSearch && matchesRepo && matchesBranchType;
  });

  const uniqueRepos = [...new Set(repos.map((r) => r.repo_name))];
  const uniqueBranchTypes = [...new Set(repos.map((r) => r.branch_type))];

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetail = (repo: CodeRepo) => {
    setSelectedRepo(repo);
    setDetailDialogOpen(true);
  };

  const handleViewHistory = (repo: CodeRepo) => {
    setSelectedRepo(repo);
    setHistoryDialogOpen(true);
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
          <Typography variant="h5" fontWeight="bold" sx={{ color: "#3b82f6" }}>
            代码管理
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            sx={{ bgcolor: "#3b82f6" }}
          >
            新建仓库
          </Button>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="搜索仓库、分支或提交者..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="outlined"
              startIcon={<Filter size={18} />}
              onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
            >
              筛选
            </Button>
            <Menu
              anchorEl={filterMenuAnchor}
              open={Boolean(filterMenuAnchor)}
              onClose={() => setFilterMenuAnchor(null)}
            >
              <MenuItem>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>仓库</InputLabel>
                  <Select
                    value={repoFilter || ""}
                    label="仓库"
                    onChange={(e) => setRepoFilter(e.target.value || null)}
                  >
                    <MenuItem value="">全部</MenuItem>
                    {uniqueRepos.map((repo) => (
                      <MenuItem key={repo} value={repo}>
                        {repo}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </MenuItem>
              <MenuItem>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>分支类型</InputLabel>
                  <Select
                    value={branchTypeFilter || ""}
                    label="分支类型"
                    onChange={(e) =>
                      setBranchTypeFilter(e.target.value || null)
                    }
                  >
                    <MenuItem value="">全部</MenuItem>
                    {uniqueBranchTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </MenuItem>
            </Menu>
          </Stack>
        </Paper>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#3b82f6" }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    仓库名称
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    分支名称
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    最近提交
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    提交者
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    代码行数
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    最后更新时间
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    操作
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRepos
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((repo) => (
                    <TableRow key={repo.id} hover>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Code size={16} color="#3b82f6" />
                          {repo.repo_name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <GitBranch size={16} />
                          {repo.branch_name}
                          <Chip
                            label={repo.branch_type}
                            size="small"
                            color={getBranchTypeColor(repo.branch_type)}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={repo.last_commit}>
                          <Box
                            sx={{
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <GitCommit
                              size={14}
                              style={{
                                marginRight: 4,
                                verticalAlign: "middle",
                              }}
                            />
                            {repo.last_commit}
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{repo.committer}</TableCell>
                      <TableCell>
                        {repo.lines_of_code.toLocaleString()}
                      </TableCell>
                      <TableCell>{repo.last_update}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="代码浏览">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetail(repo)}
                            >
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="提交历史">
                            <IconButton
                              size="small"
                              onClick={() => handleViewHistory(repo)}
                            >
                              <History size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="合并请求">
                            <IconButton size="small">
                              <GitPullRequest size={16} />
                            </IconButton>
                          </Tooltip>
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
            count={filteredRepos.length}
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
              <Paper sx={{ p: 2, mt: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="body2" fontFamily="monospace">
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
                  <Paper key={i} sx={{ p: 2 }}>
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
