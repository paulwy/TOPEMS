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
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { usePmStore } from '../store/pmStore';
import type { CreateRiskRequest } from '../api/pm';

const getLevelColor = (
  level?: string
): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
  switch (level) {
    case 'high':
    case 'critical':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
};

const getLevelLabel = (level?: string) => {
  switch (level) {
    case 'high':
    case 'critical':
      return '高';
    case 'medium':
      return '中';
    case 'low':
      return '低';
    default:
      return level || '-';
  }
};

const getStatusColor = (status: string): 'success' | 'default' | 'warning' | 'primary' => {
  switch (status) {
    case 'closed':
    case 'resolved':
      return 'success';
    case 'mitigated':
    case 'monitoring':
      return 'primary';
    case 'open':
    case 'active':
      return 'warning';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'closed':
    case 'resolved':
      return '已关闭';
    case 'mitigated':
    case 'monitoring':
      return '已缓解';
    case 'open':
    case 'active':
      return '开放中';
    default:
      return status;
  }
};

export const RiskManagementPage: React.FC = () => {
  const {
    risks,
    risksTotal,
    risksPage,
    risksPageSize,
    loading,
    error,
    loadRisks,
    addRisk,
    removeRisk,
  } = usePmStore();

  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRisk, setNewRisk] = useState<CreateRiskRequest>({
    project_id: '',
    risk_name: '',
    likelihood: 'medium',
    impact: 'medium',
    risk_score: 5,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRisks({ page: 1, pageSize: 10 });
  }, [loadRisks]);

  const handleSearch = () => {
    loadRisks({
      page: 1,
      pageSize: risksPageSize,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadRisks({
      page,
      pageSize: risksPageSize,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleCreate = async () => {
    if (!newRisk.risk_name || !newRisk.project_id) return;
    setSubmitting(true);
    try {
      await addRisk(newRisk);
      setCreateDialogOpen(false);
      setNewRisk({
        project_id: '',
        risk_name: '',
        likelihood: 'medium',
        impact: 'medium',
        risk_score: 5,
      });
    } catch (err) {
      console.error('创建风险失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该风险吗？')) return;
    try {
      await removeRisk(id);
    } catch (err) {
      console.error('删除风险失败:', err);
    }
  };

  const totalPages = useMemo(
    () => Math.ceil(risksTotal / risksPageSize),
    [risksTotal, risksPageSize]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            风险管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            识别、评估和缓解项目风险
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() =>
              loadRisks({
                page: risksPage,
                pageSize: risksPageSize,
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
            新建风险
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter}
                label="状态"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="open">开放中</MenuItem>
                <MenuItem value="mitigated">已缓解</MenuItem>
                <MenuItem value="closed">已关闭</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
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
                <TableCell>风险名称</TableCell>
                <TableCell>类别</TableCell>
                <TableCell>等级</TableCell>
                <TableCell>可能性</TableCell>
                <TableCell>影响</TableCell>
                <TableCell>分值</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>负责人</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : risks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无风险数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                risks.map((risk) => (
                  <TableRow key={risk.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {risk.risk_name}
                      </Typography>
                    </TableCell>
                    <TableCell>{risk.risk_category || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getLevelLabel(risk.level)}
                        size="small"
                        color={getLevelColor(risk.level)}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>{risk.likelihood}</TableCell>
                    <TableCell>{risk.impact}</TableCell>
                    <TableCell>{risk.risk_score}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(risk.status || '')}
                        size="small"
                        color={getStatusColor(risk.status || '')}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{risk.owner || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="编辑">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(risk.id)}
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
        {risksTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={risksPage}
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
        <DialogTitle>新建风险</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="项目 ID"
              required
              value={newRisk.project_id}
              onChange={(e) =>
                setNewRisk({ ...newRisk, project_id: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="风险名称"
              required
              value={newRisk.risk_name}
              onChange={(e) =>
                setNewRisk({ ...newRisk, risk_name: e.target.value })
              }
              fullWidth
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>可能性</InputLabel>
                  <Select
                    value={newRisk.likelihood}
                    label="可能性"
                    onChange={(e) =>
                      setNewRisk({ ...newRisk, likelihood: e.target.value })
                    }
                  >
                    <MenuItem value="low">低</MenuItem>
                    <MenuItem value="medium">中</MenuItem>
                    <MenuItem value="high">高</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>影响</InputLabel>
                  <Select
                    value={newRisk.impact}
                    label="影响"
                    onChange={(e) =>
                      setNewRisk({ ...newRisk, impact: e.target.value })
                    }
                  >
                    <MenuItem value="low">低</MenuItem>
                    <MenuItem value="medium">中</MenuItem>
                    <MenuItem value="high">高</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              label="风险分值"
              type="number"
              value={newRisk.risk_score}
              onChange={(e) =>
                setNewRisk({ ...newRisk, risk_score: Number(e.target.value) })
              }
              fullWidth
            />
            <TextField
              label="应对策略"
              multiline
              rows={3}
              value={newRisk.mitigation_strategy || ''}
              onChange={(e) =>
                setNewRisk({ ...newRisk, mitigation_strategy: e.target.value })
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
            disabled={submitting || !newRisk.risk_name || !newRisk.project_id}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RiskManagementPage;
