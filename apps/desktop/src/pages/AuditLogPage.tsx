import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import { Download, RefreshCw, Search, ScrollText, Filter } from 'lucide-react';
import { auditApi, AUDIT_ACTIONS, type AuditLogEntry, type AuditLogParams } from '../api/audit';
import ExportWizard from '../components/ExportWizard';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const ACTION_COLORS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  create: 'success',
  update: 'info',
  delete: 'error',
  login: 'default',
  logout: 'warning',
  export: 'info',
  import: 'success',
};

const formatDateTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
};

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AuditLogPage = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<AuditLogParams>({
    action: '',
    target_type: '',
    user_id: '',
    from: '',
    to: '',
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [exportWizardOpen, setExportWizardOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<AuditLogEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: AuditLogParams = {};
      if (filters.action) params.action = filters.action;
      if (filters.target_type) params.target_type = filters.target_type;
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const data = await auditApi.getAuditLogs(params);
      setLogs(data);
      setPage(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取审计日志失败';
      setError(message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    fetchLogs();
  };

  const handleReset = () => {
    setFilters({ action: '', target_type: '', user_id: '', from: '', to: '' });
  };

  const handleQuickDateRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setFilters((prev) => ({
      ...prev,
      from: formatDateForInput(from),
      to: formatDateForInput(to),
    }));
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedLogs = useMemo(() => {
    const start = page * rowsPerPage;
    return logs.slice(start, start + rowsPerPage);
  }, [logs, page, rowsPerPage]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ScrollText size={28} color="#1976d2" />
          <Typography variant="h4" component="h1">
            审计日志
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            onClick={fetchLogs}
            disabled={loading}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<Download size={18} />}
            onClick={() => setExportWizardOpen(true)}
          >
            导出数据
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Filter size={18} color="#6b7280" />
          <Typography variant="subtitle1">筛选条件</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <FormControl sx={{ flex: '1 1 180px', minWidth: '160px' }}>
            <InputLabel>操作类型</InputLabel>
            <Select
              value={filters.action ?? ''}
              label="操作类型"
              onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}
            >
              {AUDIT_ACTIONS.map((a) => (
                <MenuItem key={a.value} value={a.value}>
                  {a.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="目标类型"
            sx={{ flex: '1 1 180px', minWidth: '160px' }}
            value={filters.target_type ?? ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, target_type: e.target.value }))}
            placeholder="如: user, project"
          />
          <TextField
            label="用户 ID"
            sx={{ flex: '1 1 180px', minWidth: '160px' }}
            value={filters.user_id ?? ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, user_id: e.target.value }))}
            placeholder="输入用户 ID"
          />
          <TextField
            type="date"
            label="开始日期"
            sx={{ flex: '1 1 150px', minWidth: '140px' }}
            slotProps={{ inputLabel: { shrink: true } }}
            value={filters.from ?? ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
          />
          <TextField
            type="date"
            label="结束日期"
            sx={{ flex: '1 1 150px', minWidth: '140px' }}
            slotProps={{ inputLabel: { shrink: true } }}
            value={filters.to ?? ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<Search size={16} />} onClick={handleSearch} disabled={loading}>
            查询
          </Button>
          <Button variant="text" onClick={handleReset} disabled={loading}>
            重置
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button size="small" onClick={() => handleQuickDateRange(1)}>今天</Button>
          <Button size="small" onClick={() => handleQuickDateRange(7)}>近7天</Button>
          <Button size="small" onClick={() => handleQuickDateRange(30)}>近30天</Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={fetchLogs}>重试</Button>}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>时间</TableCell>
                <TableCell>操作</TableCell>
                <TableCell>目标类型</TableCell>
                <TableCell>目标 ID</TableCell>
                <TableCell>用户</TableCell>
                <TableCell>IP 地址</TableCell>
                <TableCell align="right">详情</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      暂无审计日志数据
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {log.created_at ? formatDateTime(String(log.created_at)) : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={String(log.action ?? '-')}
                        color={ACTION_COLORS[String(log.action)] ?? 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{String(log.target_type ?? '-')}</TableCell>
                    <TableCell>{String(log.target_id ?? '-')}</TableCell>
                    <TableCell>
                      {log.user_name ? `${log.user_name}` : String(log.user_id ?? '-')}
                    </TableCell>
                    <TableCell>{String(log.ip_address ?? '-')}</TableCell>
                    <TableCell align="right">
                      {log.details ? (
                        <Tooltip title="查看详情">
                          <IconButton size="small" onClick={() => setDetailRow(log)}>
                            <Search size={16} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={logs.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          labelRowsPerPage="每页行数"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count} 条`}
        />
      </Paper>

      <ExportWizard
        open={exportWizardOpen}
        onClose={() => setExportWizardOpen(false)}
      />

      <Dialog open={!!detailRow} onClose={() => setDetailRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>日志详情</DialogTitle>
        <DialogContent>
          {detailRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">日志 ID</Typography>
                <Typography variant="body2">{detailRow.id}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">操作</Typography>
                <Typography variant="body2">{detailRow.action}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">目标类型</Typography>
                <Typography variant="body2">{detailRow.target_type}</Typography>
              </Box>
              {detailRow.target_id && (
                <Box>
                  <Typography variant="caption" color="text.secondary">目标 ID</Typography>
                  <Typography variant="body2">{detailRow.target_id}</Typography>
                </Box>
              )}
              {detailRow.user_id && (
                <Box>
                  <Typography variant="caption" color="text.secondary">用户 ID</Typography>
                  <Typography variant="body2">{detailRow.user_id}</Typography>
                </Box>
              )}
              {detailRow.ip_address && (
                <Box>
                  <Typography variant="caption" color="text.secondary">IP 地址</Typography>
                  <Typography variant="body2">{detailRow.ip_address}</Typography>
                </Box>
              )}
              {detailRow.created_at && (
                <Box>
                  <Typography variant="caption" color="text.secondary">时间</Typography>
                  <Typography variant="body2">{formatDateTime(String(detailRow.created_at))}</Typography>
                </Box>
              )}
              {detailRow.details && (
                <Box>
                  <Typography variant="caption" color="text.secondary">详情</Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 0.5 }}>
                    <pre style={{ margin: 0, fontSize: '12px', overflow: 'auto', maxHeight: '300px' }}>
                      {JSON.stringify(detailRow.details, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AuditLogPage;
