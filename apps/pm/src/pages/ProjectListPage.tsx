import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Pagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { usePmStore } from '../store/pmStore';
import type { CreateProjectRequest } from '../api/pm';

const getStatusColor = (status: string): 'success' | 'default' | 'warning' | 'primary' | 'error' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'completed':
      return 'primary';
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'default';
    case 'draft':
      return 'default';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return '进行中';
    case 'completed':
      return '已完成';
    case 'pending':
      return '待审批';
    case 'cancelled':
      return '已取消';
    case 'draft':
      return '草稿';
    case 'approved':
      return '已批准';
    default:
      return status;
  }
};

export const ProjectListPage: React.FC = () => {
  const {
    projects,
    projectsTotal,
    projectsPage,
    projectsPageSize,
    loading,
    error,
    loadProjects,
    addProject,
    removeProject,
  } = usePmStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState<CreateProjectRequest>({
    name: '',
    code: '',
    project_type: 'research',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProjects({ page: 1, pageSize: 10 });
  }, [loadProjects]);

  const handleSearch = () => {
    loadProjects({
      page: 1,
      pageSize: projectsPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadProjects({
      page,
      pageSize: projectsPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleCreate = async () => {
    if (!newProject.name || !newProject.code) return;
    setSubmitting(true);
    try {
      await addProject(newProject);
      setCreateDialogOpen(false);
      setNewProject({ name: '', code: '', project_type: 'research' });
    } catch (err) {
      console.error('创建项目失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该项目吗？')) return;
    try {
      await removeProject(id);
    } catch (err) {
      console.error('删除项目失败:', err);
    }
  };

  const totalPages = useMemo(
    () => Math.ceil(projectsTotal / projectsPageSize),
    [projectsTotal, projectsPageSize]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            项目列表
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理所有项目，跟踪进度和状态
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() =>
              loadProjects({
                page: projectsPage,
                pageSize: projectsPageSize,
                search: searchKeyword || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
              })
            }
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新建项目
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              placeholder="搜索项目名称、编码..."
              size="small"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
              }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter}
                label="状态"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="active">进行中</MenuItem>
                <MenuItem value="pending">待审批</MenuItem>
                <MenuItem value="completed">已完成</MenuItem>
                <MenuItem value="cancelled">已取消</MenuItem>
                <MenuItem value="draft">草稿</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button variant="outlined" onClick={handleSearch} fullWidth>
              搜索
            </Button>
          </Grid>
        </Grid>
      </Paper>

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
                <TableCell>项目名称</TableCell>
                <TableCell>项目编码</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>进度</TableCell>
                <TableCell>负责人</TableCell>
                <TableCell>开始日期</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无项目数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {project.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={project.code} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{project.project_type}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(project.status)}
                        size="small"
                        color={getStatusColor(project.status)}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 80 }}>
                          <LinearProgress
                            variant="determinate"
                            value={project.progress || 0}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                        <Box sx={{ fontSize: '0.875rem', color: 'grey.600', minWidth: 35 }}>
                          {project.progress || 0}%
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{project.leader || '-'}</TableCell>
                    <TableCell>
                      {project.start_date
                        ? new Date(project.start_date).toLocaleDateString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="查看详情">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="编辑">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(project.id)}
                        title="删除"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {projectsTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={projectsPage}
              onChange={handlePageChange}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建项目</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="项目名称"
              required
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="项目编码"
              required
              value={newProject.code}
              onChange={(e) => setNewProject({ ...newProject, code: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>项目类型</InputLabel>
              <Select
                value={newProject.project_type}
                label="项目类型"
                onChange={(e) =>
                  setNewProject({ ...newProject, project_type: e.target.value })
                }
              >
                <MenuItem value="research">科研项目</MenuItem>
                <MenuItem value="production">生产项目</MenuItem>
                <MenuItem value="construction">施工项目</MenuItem>
                <MenuItem value="design">设计项目</MenuItem>
                <MenuItem value="service">服务项目</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="描述"
              multiline
              rows={3}
              value={newProject.description || ''}
              onChange={(e) =>
                setNewProject({ ...newProject, description: e.target.value })
              }
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newProject.name || !newProject.code}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectListPage;
