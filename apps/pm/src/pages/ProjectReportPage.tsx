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
  Card,
  CardContent,
} from '@mui/material';

import { usePmStore } from '../store/pmStore';
import type { CreateReportRequest } from '../api/pm';
import { BarChart3, Plus, RefreshCw, Trash2 } from 'lucide-react';
const AddIcon = Plus;
const AssessmentIcon = BarChart3;
const DeleteIcon = Trash2;
const RefreshIcon = RefreshCw;

const getStatusColor = (status: string): 'success' | 'default' | 'warning' | 'primary' => {
  switch (status) {
    case 'published':
    case 'finalized':
      return 'success';
    case 'generating':
    case 'processing':
      return 'warning';
    case 'draft':
      return 'default';
    case 'archived':
      return 'primary';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'published':
    case 'finalized':
      return '已发布';
    case 'generating':
    case 'processing':
      return '生成中';
    case 'draft':
      return '草稿';
    case 'archived':
      return '已归档';
    default:
      return status;
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

export const ProjectReportPage: React.FC = () => {
  const {
    reports,
    reportsTotal,
    reportsPage,
    reportsPageSize,
    loading,
    error,
    loadReports,
    generateReport,
    removeReport,
  } = usePmStore();

  const [typeFilter, setTypeFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newReport, setNewReport] = useState<CreateReportRequest>({
    project_id: '',
    report_name: '',
    report_type: 'progress',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReports({ page: 1, pageSize: 10 });
  }, [loadReports]);

  const handleSearch = () => {
    loadReports({
      page: 1,
      pageSize: reportsPageSize,
      report_type: typeFilter !== 'all' ? typeFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadReports({
      page,
      pageSize: reportsPageSize,
      report_type: typeFilter !== 'all' ? typeFilter : undefined,
    });
  };

  const handleCreate = async () => {
    if (!newReport.report_name || !newReport.project_id) return;
    setSubmitting(true);
    try {
      await generateReport(newReport);
      setCreateDialogOpen(false);
      setNewReport({ project_id: '', report_name: '', report_type: 'progress' });
    } catch (err) {
      console.error('生成报表失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该报表吗？')) return;
    try {
      await removeReport(id);
    } catch (err) {
      console.error('删除报表失败:', err);
    }
  };

  const totalPages = useMemo(
    () => Math.ceil(reportsTotal / reportsPageSize),
    [reportsTotal, reportsPageSize]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            项目报表
          </Typography>
          <Typography variant="body2" color="text.secondary">
            生成和管理项目进度报告
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() =>
              loadReports({
                page: reportsPage,
                pageSize: reportsPageSize,
                report_type: typeFilter !== 'all' ? typeFilter : undefined,
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
            生成报表
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssessmentIcon color="primary" />
                <Typography variant="body2" color="text.secondary">
                  报表总数
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 600 }}>
                {reportsTotal}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: "center" }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>报表类型</InputLabel>
              <Select
                value={typeFilter}
                label="报表类型"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="progress">进度报告</MenuItem>
                <MenuItem value="cost">成本报告</MenuItem>
                <MenuItem value="quality">质量报告</MenuItem>
                <MenuItem value="risk">风险报告</MenuItem>
                <MenuItem value="summary">项目总结</MenuItem>
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
                <TableCell>报表名称</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>周期</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>生成时间</TableCell>
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
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无报表数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {report.report_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={report.report_type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{report.report_period || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(report.status || '')}
                        size="small"
                        color={getStatusColor(report.status || '')}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>{formatDate(report.generated_at)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(report.id)}
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
        {reportsTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={reportsPage}
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
        <DialogTitle>生成报表</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="项目 ID"
              required
              value={newReport.project_id}
              onChange={(e) =>
                setNewReport({ ...newReport, project_id: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="报表名称"
              required
              value={newReport.report_name}
              onChange={(e) =>
                setNewReport({ ...newReport, report_name: e.target.value })
              }
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>报表类型</InputLabel>
              <Select
                value={newReport.report_type}
                label="报表类型"
                onChange={(e) =>
                  setNewReport({ ...newReport, report_type: e.target.value })
                }
              >
                <MenuItem value="progress">进度报告</MenuItem>
                <MenuItem value="cost">成本报告</MenuItem>
                <MenuItem value="quality">质量报告</MenuItem>
                <MenuItem value="risk">风险报告</MenuItem>
                <MenuItem value="summary">项目总结</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="周期"
              placeholder="例如：2024-Q1"
              value={newReport.report_period || ''}
              onChange={(e) =>
                setNewReport({ ...newReport, report_period: e.target.value })
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
            disabled={submitting || !newReport.report_name || !newReport.project_id}
          >
            {submitting ? '生成中...' : '生成'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectReportPage;
