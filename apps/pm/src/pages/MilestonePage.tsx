import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';

import { usePmStore } from '../store/pmStore';
import type { CreateMilestoneRequest } from '../api/pm';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
const AddIcon = Plus;
const DeleteIcon = Trash2;
const EditIcon = Pencil;
const RefreshIcon = RefreshCw;

const getStatusColor = (status: string): 'success' | 'default' | 'warning' | 'primary' => {
  switch (status) {
    case 'completed':
    case 'achieved':
      return 'success';
    case 'in_progress':
    case 'active':
      return 'primary';
    case 'pending':
    case 'planned':
      return 'warning';
    case 'missed':
    case 'delayed':
      return 'default';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed':
    case 'achieved':
      return '已完成';
    case 'in_progress':
    case 'active':
      return '进行中';
    case 'pending':
    case 'planned':
      return '计划中';
    case 'missed':
    case 'delayed':
      return '已延期';
    default:
      return status;
  }
};

export const MilestonePage: React.FC = () => {
  const {
    milestones,
    milestonesTotal,
    milestonesPage,
    milestonesPageSize,
    loading,
    error,
    loadMilestones,
    addMilestone,
    removeMilestone,
  } = usePmStore();

  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState<CreateMilestoneRequest>({
    project_id: '',
    name: '',
    date: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMilestones({ page: 1, pageSize: 10 });
  }, [loadMilestones]);

  const handleSearch = () => {
    loadMilestones({
      page: 1,
      pageSize: milestonesPageSize,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadMilestones({
      page,
      pageSize: milestonesPageSize,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleCreate = async () => {
    if (!newMilestone.name || !newMilestone.project_id || !newMilestone.date) return;
    setSubmitting(true);
    try {
      await addMilestone(newMilestone);
      setCreateDialogOpen(false);
      setNewMilestone({ project_id: '', name: '', date: '' });
    } catch (err) {
      console.error('创建里程碑失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该里程碑吗？')) return;
    try {
      await removeMilestone(id);
    } catch (err) {
      console.error('删除里程碑失败:', err);
    }
  };

  const totalPages = useMemo(
    () => Math.ceil(milestonesTotal / milestonesPageSize),
    [milestonesTotal, milestonesPageSize]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            里程碑
          </Typography>
          <Typography variant="body2" color="text.secondary">
            跟踪项目关键节点
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() =>
              loadMilestones({
                page: milestonesPage,
                pageSize: milestonesPageSize,
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
            新建里程碑
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: "center" }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter}
                label="状态"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="planned">计划中</MenuItem>
                <MenuItem value="in_progress">进行中</MenuItem>
                <MenuItem value="completed">已完成</MenuItem>
                <MenuItem value="delayed">已延期</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
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
                <TableCell>里程碑名称</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>目标日期</TableCell>
                <TableCell>阶段</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : milestones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无里程碑数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                milestones.map((milestone) => (
                  <TableRow key={milestone.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {milestone.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(milestone.status)}
                        size="small"
                        color={getStatusColor(milestone.status)}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      {milestone.date
                        ? new Date(milestone.date).toLocaleDateString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell>{milestone.phase_id || '-'}</TableCell>
                    <TableCell>
                      {milestone.created_at
                        ? new Date(milestone.created_at).toLocaleDateString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="编辑">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(milestone.id)}
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
        {milestonesTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={milestonesPage}
              onChange={handlePageChange}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建里程碑</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="项目 ID"
              required
              value={newMilestone.project_id}
              onChange={(e) =>
                setNewMilestone({ ...newMilestone, project_id: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="里程碑名称"
              required
              value={newMilestone.name}
              onChange={(e) =>
                setNewMilestone({ ...newMilestone, name: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="目标日期"
              type="date"
              required
              value={newMilestone.date}
              onChange={(e) =>
                setNewMilestone({ ...newMilestone, date: e.target.value })
              }
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="描述"
              multiline
              rows={3}
              value={newMilestone.description || ''}
              onChange={(e) =>
                setNewMilestone({ ...newMilestone, description: e.target.value })
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
            disabled={
              submitting ||
              !newMilestone.name ||
              !newMilestone.project_id ||
              !newMilestone.date
            }
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MilestonePage;
