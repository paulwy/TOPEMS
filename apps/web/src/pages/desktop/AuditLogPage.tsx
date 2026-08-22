import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Chip,
  Stack,
  Alert,
  Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useTranslation } from 'react-i18next';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
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
  const [page, setPage] = useState(0);
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
      setPage(0);
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

  const handleSort = useCallback((_sortBy: string, order: 'asc' | 'desc') => {
    setSortAsc(order === 'asc');
  }, []);

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      const cmp = a.timestamp.localeCompare(b.timestamp);
      return sortAsc ? cmp : -cmp;
    });
  }, [logs, sortAsc]);

  const paginatedLogs = useMemo(() => {
    return sortedLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [sortedLogs, page]);

  const handleExport = useCallback(() => {
    if (sortedLogs.length === 0) return;
    const blob = new Blob([JSON.stringify(sortedLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sortedLogs]);

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

  const columns: ColumnDef<AuditLog>[] = useMemo(
    () => [
      {
        id: 'timestamp',
        label: t('admin.audit_log.timestamp'),
        sortable: true,
        render: (row) => (
          <Typography sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: 12 }}>
            {new Date(row.timestamp).toLocaleString()}
          </Typography>
        ),
      },
      {
        id: 'action',
        label: t('admin.audit_log.action'),
        sortable: false,
        render: (row) => (
          <Chip
            label={row.action}
            size='small'
            color={actionColor(row.action)}
            variant='outlined'
          />
        ),
      },
      {
        id: 'target_type',
        label: t('admin.audit_log.target_type'),
        sortable: false,
        render: (row) => <Typography>{row.target_type}</Typography>,
      },
      {
        id: 'target_id',
        label: t('admin.audit_log.target_id'),
        sortable: false,
        render: (row) => (
          <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>{row.target_id}</Typography>
        ),
      },
      {
        id: 'user_id',
        label: t('admin.audit_log.user_id'),
        sortable: false,
        render: (row) => (
          <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>{row.user_id}</Typography>
        ),
      },
    ],
    [t]
  );

  const actions = useMemo(
    () => [
      {
        label: t('admin.audit_log.refresh'),
        icon: <RefreshIcon />,
        onClick: () => {
          if (!loading) {
            fetchLogs(appliedFilters);
          }
        },
        variant: 'outlined' as const,
      },
      {
        label: t('admin.audit_log.export_json'),
        icon: <FileDownloadIcon />,
        onClick: handleExport,
        variant: 'outlined' as const,
      },
      {
        label: t('admin.audit_log.auto_refresh'),
        onClick: () => setAutoRefresh((prev) => !prev),
        variant: autoRefresh ? ('contained' as const) : ('outlined' as const),
      },
    ],
    [t, loading, appliedFilters, fetchLogs, handleExport, autoRefresh]
  );

  const filterContent = useMemo(
    () => (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: filterOpen ? 2 : 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: filterOpen ? 2 : 0,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
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
    ),
    [filterOpen, filters, t]
  );

  const headerContent = useMemo(
    () =>
      lastRefresh ? (
        <Chip
          label={t('admin.audit_log.updated_at', { time: lastRefresh.toLocaleTimeString() })}
          size='small'
          variant='outlined'
          sx={{ mb: 2 }}
        />
      ) : null,
    [lastRefresh, t]
  );

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
    <>
      {error && (
        <Alert
          severity='error'
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      <ListPageTemplate<AuditLog>
        title={t('admin.audit_log.title')}
        columns={columns}
        data={paginatedLogs}
        loading={loading && logs.length === 0}
        actions={actions}
        filterContent={filterContent}
        headerContent={headerContent}
        sortable
        defaultSortBy='timestamp'
        defaultSortOrder='desc'
        onSort={handleSort}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total: sortedLogs.length,
          onPageChange: setPage,
        }}
        expandable={(row) =>
          row.details ? (
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
                {JSON.stringify(row.details, null, 2)}
              </Typography>
            </Box>
          ) : (
            <Typography
              variant='body2'
              color='text.secondary'
            >
              —
            </Typography>
          )
        }
        emptyMessage={t('admin.audit_log.no_records')}
      />
    </>
  );
};

export default AuditLogPage;
