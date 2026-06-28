import React, { useEffect, useState } from 'react';
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
  Grid,
  Card,
  CardContent,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
} from '@mui/material';

import { useMesStore } from '../store/mesStore';
import type { CreateSafetyCheckRequest, CreateInspectionPlanRequest } from '../api';
import { AlertTriangle, CircleCheck, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2 } from 'lucide-react';
const AddIcon = Plus;
const CheckCircleIcon = CircleCheck;
const DeleteIcon = Trash2;
const EditIcon = Pencil;
const RefreshIcon = RefreshCw;
const SearchIcon = Search;
const SecurityIcon = ShieldCheck;
const WarningIcon = AlertTriangle;

const getCheckStatusColor = (status: string): 'success' | 'default' | 'error' | 'warning' | 'info' => {
  switch (status) {
    case 'completed':
    case 'qualified':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'pending':
      return 'warning';
    case 'failed':
    case 'unqualified':
      return 'error';
    default:
      return 'default';
  }
};

const getCheckStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: '待执行',
    in_progress: '进行中',
    completed: '已完成',
    failed: '未通过',
  };
  return map[status] || status;
};

export const EhsCheckPage: React.FC = () => {
  const {
    safetyChecks,
    safetyChecksTotal,
    safetyChecksPage,
    safetyChecksPageSize,
    inspectionPlans,
    inspectionPlansTotal,
    inspectionPlansPage,
    inspectionPlansPageSize,
    ehsStatistics,
    loading,
    error,
    loadSafetyChecks,
    addSafetyCheck,
    removeSafetyCheck,
    loadInspectionPlans,
    addInspectionPlan,
    removeInspectionPlan,
    loadEhsStatistics,
  } = useMesStore();

  const [tab, setTab] = useState<'plans' | 'checks'>('checks');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createCheckOpen, setCreateCheckOpen] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [newCheck, setNewCheck] = useState<CreateSafetyCheckRequest>({
    check_no: '',
    check_type: 'daily',
    inspector: '',
    result: 'qualified',
    issues: [],
    status: 'pending',
  });
  const [newPlan, setNewPlan] = useState<CreateInspectionPlanRequest>({
    title: '',
    inspection_type: 'daily',
    frequency: 'daily',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSafetyChecks({ page: 1, pageSize: 10 });
    loadInspectionPlans({ page: 1, pageSize: 10 });
    loadEhsStatistics();
  }, [loadSafetyChecks, loadInspectionPlans, loadEhsStatistics]);

  const handleSearchChecks = () => {
    loadSafetyChecks({
      page: 1,
      pageSize: safetyChecksPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChangeChecks = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadSafetyChecks({
      page,
      pageSize: safetyChecksPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChangePlans = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadInspectionPlans({ page, pageSize: inspectionPlansPageSize });
  };

  const handleCreateCheck = async () => {
    if (!newCheck.check_no || !newCheck.inspector) return;
    setSubmitting(true);
    try {
      await addSafetyCheck(newCheck);
      setCreateCheckOpen(false);
      setNewCheck({
        check_no: '',
        check_type: 'daily',
        inspector: '',
        result: 'qualified',
        issues: [],
        status: 'pending',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.title) return;
    setSubmitting(true);
    try {
      await addInspectionPlan(newPlan);
      setCreatePlanOpen(false);
      setNewPlan({ title: '', inspection_type: 'daily', frequency: 'daily' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCheck = async (id: string) => {
    if (!window.confirm('确定要删除该安全检查吗？')) return;
    await removeSafetyCheck(id);
  };

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm('确定要删除该检查计划吗？')) return;
    await removeInspectionPlan(id);
  };

  const checkTotalPages = Math.ceil(safetyChecksTotal / safetyChecksPageSize);
  const planTotalPages = Math.ceil(inspectionPlansTotal / inspectionPlansPageSize);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>EHS 安全检查</Typography>
          <Typography variant="body2" color="text.secondary">管理 EHS 安全检查和检查计划</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { loadSafetyChecks({ page: 1, pageSize: 10 }); loadInspectionPlans({ page: 1, pageSize: 10 }); loadEhsStatistics(); }}>
            刷新
          </Button>
          {tab === 'checks' ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateCheckOpen(true)}>
              新建检查
            </Button>
          ) : (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreatePlanOpen(true)}>
              新建计划
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">检查总数</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>{ehsStatistics?.total_checks ?? 0}</Typography>
                </Box>
                <SecurityIcon style={{ color: 'var(--mui-palette-primary-main, #1976d2)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">已完成</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>{ehsStatistics?.completed_checks ?? 0}</Typography>
                </Box>
                <CheckCircleIcon style={{ color: 'var(--mui-palette-success-main, #2e7d32)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">未通过</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'error.main' }}>{ehsStatistics?.failed_checks ?? 0}</Typography>
                </Box>
                <WarningIcon style={{ color: 'var(--mui-palette-error-main, #d32f2f)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">活动计划</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>{ehsStatistics?.active_plans ?? 0}</Typography>
                </Box>
                <SecurityIcon style={{ color: 'var(--mui-palette-info-main, #0288d1)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Stack direction="row" spacing={0}>
          <Button
            fullWidth
            variant={tab === 'checks' ? 'contained' : 'text'}
            onClick={() => setTab('checks')}
            sx={{ borderRadius: 0 }}
          >
            检查记录
          </Button>
          <Button
            fullWidth
            variant={tab === 'plans' ? 'contained' : 'text'}
            onClick={() => setTab('plans')}
            sx={{ borderRadius: 0 }}
          >
            检查计划
          </Button>
        </Stack>
      </Paper>

      {tab === 'checks' && (
        <>
          <Paper sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                placeholder="搜索检查单..."
                
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchChecks()}
                 
            slotProps={{ input: { size: 'small', startAdornment: <SearchIcon style={{ color: '#9e9e9e', marginRight: 4, fontSize: 20 }}  />  }}}
                sx={{ minWidth: 300 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>状态</InputLabel>
                <Select value={statusFilter} label="状态" onChange={(e) => setStatusFilter(e.target.value)}>
                  <MenuItem value="all">全部</MenuItem>
                  <MenuItem value="pending">待执行</MenuItem>
                  <MenuItem value="in_progress">进行中</MenuItem>
                  <MenuItem value="completed">已完成</MenuItem>
                  <MenuItem value="failed">未通过</MenuItem>
                </Select>
              </FormControl>
              <Button variant="outlined" onClick={handleSearchChecks}>搜索</Button>
            </Box>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}

          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>检查单号</TableCell>
                    <TableCell>检查类型</TableCell>
                    <TableCell>检查员</TableCell>
                    <TableCell>位置</TableCell>
                    <TableCell>检查日期</TableCell>
                    <TableCell>结果</TableCell>
                    <TableCell>状态</TableCell>
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
                  ) : safetyChecks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">暂无检查数据</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    safetyChecks.map((check) => (
                      <TableRow key={check.id} hover>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{check.check_no}</Typography></TableCell>
                        <TableCell>{check.check_type}</TableCell>
                        <TableCell>{check.inspector}</TableCell>
                        <TableCell>{check.location || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {check.check_date ? new Date(check.check_date).toLocaleDateString('zh-CN') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={check.result} size="small" color={check.result === 'qualified' ? 'success' : 'error'} />
                        </TableCell>
                        <TableCell>
                          <Chip label={getCheckStatusLabel(check.status)} size="small" color={getCheckStatusColor(check.status)} />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="error" onClick={() => handleDeleteCheck(check.id)} title="删除">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {safetyChecksTotal > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
                <Pagination count={checkTotalPages} page={safetyChecksPage} onChange={handlePageChangeChecks} size="small" />
              </Box>
            )}
          </Paper>
        </>
      )}

      {tab === 'plans' && (
        <>
          <Paper sx={{ mb: 3, p: 2 }}>
            <Typography variant="subtitle2">共 {inspectionPlansTotal} 个检查计划</Typography>
          </Paper>
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>计划编号</TableCell>
                    <TableCell>标题</TableCell>
                    <TableCell>检查类型</TableCell>
                    <TableCell>频次</TableCell>
                    <TableCell>检查员</TableCell>
                    <TableCell>开始日期</TableCell>
                    <TableCell>状态</TableCell>
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
                  ) : inspectionPlans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">暂无计划数据</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    inspectionPlans.map((plan) => (
                      <TableRow key={plan.id} hover>
                        <TableCell>{plan.plan_no}</TableCell>
                        <TableCell>{plan.title}</TableCell>
                        <TableCell>{plan.inspection_type}</TableCell>
                        <TableCell>{plan.frequency}</TableCell>
                        <TableCell>{plan.inspector || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {plan.start_date ? new Date(plan.start_date).toLocaleDateString('zh-CN') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={plan.status} size="small" color={plan.status === 'active' ? 'success' : 'default'} />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" title="编辑">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeletePlan(plan.id)} title="删除">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {inspectionPlansTotal > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
                <Pagination count={planTotalPages} page={inspectionPlansPage} onChange={handlePageChangePlans} size="small" />
              </Box>
            )}
          </Paper>
        </>
      )}

      <Dialog open={createCheckOpen} onClose={() => setCreateCheckOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建安全检查</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="检查单号" required value={newCheck.check_no} onChange={(e) => setNewCheck({ ...newCheck, check_no: e.target.value })} fullWidth />
            <FormControl fullWidth required>
              <InputLabel>检查类型</InputLabel>
              <Select value={newCheck.check_type} label="检查类型" onChange={(e) => setNewCheck({ ...newCheck, check_type: e.target.value })}>
                <MenuItem value="daily">日常检查</MenuItem>
                <MenuItem value="weekly">周检查</MenuItem>
                <MenuItem value="monthly">月度检查</MenuItem>
                <MenuItem value="special">专项检查</MenuItem>
              </Select>
            </FormControl>
            <TextField label="检查员" required value={newCheck.inspector} onChange={(e) => setNewCheck({ ...newCheck, inspector: e.target.value })} fullWidth />
            <TextField label="位置" value={newCheck.location || ''} onChange={(e) => setNewCheck({ ...newCheck, location: e.target.value })} fullWidth />
            <FormControl fullWidth>
              <InputLabel>结果</InputLabel>
              <Select value={newCheck.result} label="结果" onChange={(e) => setNewCheck({ ...newCheck, result: e.target.value })}>
                <MenuItem value="qualified">合格</MenuItem>
                <MenuItem value="unqualified">不合格</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateCheckOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateCheck} disabled={submitting || !newCheck.check_no || !newCheck.inspector}>
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createPlanOpen} onClose={() => setCreatePlanOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建检查计划</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="计划标题" required value={newPlan.title} onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })} fullWidth />
            <FormControl fullWidth required>
              <InputLabel>检查类型</InputLabel>
              <Select value={newPlan.inspection_type} label="检查类型" onChange={(e) => setNewPlan({ ...newPlan, inspection_type: e.target.value })}>
                <MenuItem value="daily">日常检查</MenuItem>
                <MenuItem value="weekly">周检查</MenuItem>
                <MenuItem value="monthly">月度检查</MenuItem>
                <MenuItem value="quarterly">季度检查</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>频次</InputLabel>
              <Select value={newPlan.frequency} label="频次" onChange={(e) => setNewPlan({ ...newPlan, frequency: e.target.value })}>
                <MenuItem value="daily">每天</MenuItem>
                <MenuItem value="weekly">每周</MenuItem>
                <MenuItem value="monthly">每月</MenuItem>
                <MenuItem value="quarterly">每季度</MenuItem>
              </Select>
            </FormControl>
            <TextField label="检查员" value={newPlan.inspector || ''} onChange={(e) => setNewPlan({ ...newPlan, inspector: e.target.value })} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePlanOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreatePlan} disabled={submitting || !newPlan.title}>
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EhsCheckPage;
