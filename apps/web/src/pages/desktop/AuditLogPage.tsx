import { Fragment, useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  Button,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
  CircularProgress,
  Stack,
  Tooltip,
  Pagination,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useTranslation } from 'react-i18next';
import { tauriApi } from '../../services/tauriApi';
import { tauriAuth } from '../../services/tauriAuth';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  target_type: string;
  target_id: string;
  user_id: string;
  details?: Record<string, unknown>;
}

interface Filters {
  action: string;
  target_type: string;
  user_id: string;
  from: string;
  to: string;
}

const ACTION_OPTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT'];
const TARGET_TYPE_OPTIONS = ['ISSUE', 'PROJECT', 'USER', 'ROLE', 'SYSTEM'];

const INITIAL_FILTERS: Filters = {
  action: '',
  target_type: '',
  user_id: '',
  from: '',
  to: '',
};

const PAGE_SIZE = 20;

const row = { display: 'flex', flexDirection: 'row' as const };
const center = { alignItems: 'center' as const };
const gap = (n: number) => ({ gap: n * 8 });

const AuditLogPage = () => {
  const { t } = useTranslation('admin');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(true);
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (f.action) params.action = f.action;
      if (f.target_type) params.target_type = f.target_type;
      if (f.user_id) params.user_id = f.user_id;
      if (f.from) params.from = f.from;
      if (f.to) params.to = f.to;

      const result = await tauriApi.getAuditLogs(
        Object.keys(params).length > 0 ? params : undefined
      );

      let data: AuditLog[] = [];
      if (Array.isArray(result)) {
        data = result as AuditLog[];
      } else if (result && typeof result === 'object') {
        const obj = result as Record<string, unknown>;
        if (Array.isArray(obj.data)) {
          data = obj.data as AuditLog[];
        } else if (Array.isArray(obj.logs)) {
          data = obj.logs as AuditLog[];
        }
      }

      setLogs(data);
      setLastRefresh(new Date());
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsDesktop(tauriAuth.isAvailable());
    if (tauriAuth.isAvailable()) {
      fetchLogs(INITIAL_FILTERS);
    }
  }, [fetchLogs]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setAppliedFilters(filters);
      fetchLogs(filters);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, fetchLogs]);

  useEffect(() => {
    if (autoRefresh && isDesktop) {
      intervalRef.current = setInterval(() => {
        fetchLogs(appliedFilters);
      }, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, isDesktop, fetchLogs, appliedFilters]);

  const handleSearch = () => {
    setAppliedFilters(filters);
    fetchLogs(filters);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    fetchLogs(INITIAL_FILTERS);
  };

  const handleExport = () => {
    const sorted = [...logs].sort((a, b) => {
      const cmp = a.timestamp.localeCompare(b.timestamp);
      return sortAsc ? cmp : -cmp;
    });
    const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSortToggle = () => {
    setSortAsc((prev) => !prev);
  };

  const sortedLogs = [...logs].sort((a, b) => {
    const cmp = a.timestamp.localeCompare(b.timestamp);
    return sortAsc ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / PAGE_SIZE));
  const paginatedLogs = sortedLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const actionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'success' as const;
      case 'UPDATE':
        return 'info' as const;
      case 'DELETE':
        return 'error' as const;
      case 'LOGIN':
        return 'primary' as const;
      case 'LOGOUT':
        return 'default' as const;
      case 'EXPORT':
        return 'warning' as const;
      case 'IMPORT':
        return 'secondary' as const;
      default:
        return 'default' as const;
    }
  };

  if (!isDesktop) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <Paper sx={{ p: 4, maxWidth: 600, textAlign: 'center' }}>
          <BugReportIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography
            variant='h5'
            gutterBottom
          >
            {t('admin.audit_log.title')}
          </Typography>
          <Typography color='text.secondary'>{t('admin.audit_log.not_desktop')}</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ ...row, ...center, justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ ...row, ...center, ...gap(2) }}>
          <BugReportIcon color='primary' />
          <Typography variant='h5'>{t('admin.audit_log.title')}</Typography>
          {lastRefresh && (
            <Chip
              label={t('admin.audit_log.updated_at', { time: lastRefresh.toLocaleTimeString() })}
              size='small'
              variant='outlined'
            />
          )}
        </Box>
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                size='small'
              />
            }
            label={<Typography variant='body2'>{t('admin.audit_log.auto_refresh')}</Typography>}
          />
          <Tooltip title={t('admin.audit_log.export_json')}>
            <IconButton
              onClick={handleExport}
              disabled={logs.length === 0}
            >
              <FileDownloadIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant='outlined'
            startIcon={loading ? <CircularProgress size={18} /> : <RefreshIcon />}
            onClick={() => fetchLogs(appliedFilters)}
            disabled={loading}
            size='small'
          >
            {t('admin.audit_log.refresh')}
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert
          severity='error'
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: filterOpen ? 2 : 0 }}>
          <Box sx={{ ...row, ...center, justifyContent: 'space-between', mb: filterOpen ? 2 : 0 }}>
            <Box sx={{ ...row, ...center, ...gap(1) }}>
              <FilterListIcon
                fontSize='small'
                color='action'
              />
              <Typography variant='subtitle2'>{t('admin.audit_log.filter_conditions')}</Typography>
            </Box>
            <IconButton
              size='small'
              onClick={() => setFilterOpen((v) => !v)}
            >
              {filterOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          {filterOpen && (
            <Stack
              direction='row'
              spacing={2}
              sx={{ mb: 2, flexWrap: 'wrap', gap: 2 }}
            >
              <TextField
                select
                label={t('admin.audit_log.action_type')}
                value={filters.action}
                onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                size='small'
                sx={{ minWidth: 140 }}
              >
                <MenuItem value=''>{t('admin.audit_log.all')}</MenuItem>
                {ACTION_OPTIONS.map((opt) => (
                  <MenuItem
                    key={opt}
                    value={opt}
                  >
                    {opt}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label={t('admin.audit_log.target_type')}
                value={filters.target_type}
                onChange={(e) => setFilters((f) => ({ ...f, target_type: e.target.value }))}
                size='small'
                sx={{ minWidth: 140 }}
              >
                <MenuItem value=''>{t('admin.audit_log.all')}</MenuItem>
                {TARGET_TYPE_OPTIONS.map((opt) => (
                  <MenuItem
                    key={opt}
                    value={opt}
                  >
                    {opt}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label={t('admin.audit_log.user_id')}
                value={filters.user_id}
                onChange={(e) => setFilters((f) => ({ ...f, user_id: e.target.value }))}
                size='small'
                sx={{ minWidth: 160 }}
                placeholder={t('admin.audit_log.enter_user_id')}
              />

              <TextField
                label={t('admin.audit_log.start_time')}
                type='datetime-local'
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                size='small'
                sx={{ minWidth: 200 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <TextField
                label={t('admin.audit_log.end_time')}
                type='datetime-local'
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                size='small'
                sx={{ minWidth: 200 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          )}

          {filterOpen && (
            <Box sx={{ ...row, justifyContent: 'flex-end', ...gap(1) }}>
              <Button
                variant='outlined'
                size='small'
                onClick={handleReset}
              >
                {t('admin.audit_log.reset')}
              </Button>
              <Button
                variant='contained'
                size='small'
                startIcon={<SearchIcon />}
                onClick={handleSearch}
              >
                {t('admin.audit_log.search')}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading && logs.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : logs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <BugReportIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography color='text.secondary'>{t('admin.audit_log.no_records')}</Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                        onClick={handleSortToggle}
                      >
                        <Box sx={{ ...row, ...center, ...gap(0.5) }}>
                          {t('admin.audit_log.timestamp')}
                          {sortAsc ? (
                            <ExpandMoreIcon fontSize='small' />
                          ) : (
                            <ExpandLessIcon fontSize='small' />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('admin.audit_log.action')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {t('admin.audit_log.target_type')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {t('admin.audit_log.target_id')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('admin.audit_log.user_id')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('admin.audit_log.details')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedLogs.map((log) => (
                      <Fragment key={log.id}>
                        <TableRow
                          hover
                          onClick={() => setExpandedId((prev) => (prev === log.id ? null : log.id))}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell
                            sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: 12 }}
                          >
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={log.action}
                              size='small'
                              color={actionColor(log.action)}
                              variant='outlined'
                            />
                          </TableCell>
                          <TableCell>{log.target_type}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {log.target_id}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {log.user_id}
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant='body2'
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 300,
                                color: 'text.secondary',
                              }}
                            >
                              {log.details ? JSON.stringify(log.details) : '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                        {expandedId === log.id && log.details && (
                          <TableRow key={`${log.id}-expanded`}>
                            <TableCell
                              colSpan={6}
                              sx={{ py: 0 }}
                            >
                              <Box
                                sx={{
                                  bgcolor: 'grey.50',
                                  p: 2,
                                  borderRadius: 1,
                                  m: 1,
                                }}
                              >
                                <Typography
                                  component='pre'
                                  sx={{ fontSize: 12, m: 0, overflow: 'auto' }}
                                >
                                  {JSON.stringify(log.details, null, 2)}
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ ...row, justifyContent: 'space-between', mt: 2, ...center }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('admin.audit_log.pagination_info', {
                    count: logs.length,
                    current: page,
                    total: totalPages,
                  })}
                </Typography>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  size='small'
                  disabled={loading}
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AuditLogPage;
