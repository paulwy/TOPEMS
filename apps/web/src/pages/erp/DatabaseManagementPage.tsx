import { designTokens } from '@topems/tokens';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Database,
  Table,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Trash2,
  Play,
  CheckCircle,
  AlertCircle,
  Info,
  Settings,
} from 'lucide-react';
import i18n from '@/i18n';
import { StatusBadge, ConfirmDialog } from '@/components/common';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { ERP_PATHS } from '@/modules/erp/config';
import { databaseApi, type TableInfo, type TableDetail } from '@/api/erp/database';
import { extractErrorMessage } from '@/utils/errors';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';

export interface BackupRecord {
  id: string;
  backup_name: string;
  backup_type: 'full' | 'incremental';
  filesize: string;
  status: 'success' | 'failed' | 'running';
  created_at: string;
  created_by: string;
  remark?: string;
}

type TableInfoRow = TableInfo & { id: string };

const mockBackups: BackupRecord[] = [
  {
    id: '1',
    backup_name: 'backup_full_20240615_0200',
    backup_type: 'full',
    filesize: '156.8 MB',
    status: 'success',
    created_at: '2024-06-15 02:00:00',
    created_by: 'system',
    remark: i18n.t('pages.database_management_page.k0'),
  },
  {
    id: '2',
    backup_name: 'backup_incr_20240614_2000',
    backup_type: 'incremental',
    filesize: '12.4 MB',
    status: 'success',
    created_at: '2024-06-14 20:00:00',
    created_by: 'system',
    remark: i18n.t('pages.database_management_page.k1'),
  },
  {
    id: '3',
    backup_name: 'backup_incr_20240613_2000',
    backup_type: 'incremental',
    filesize: '8.7 MB',
    status: 'success',
    created_at: '2024-06-13 20:00:00',
    created_by: 'system',
    remark: i18n.t('pages.database_management_page.k2'),
  },
  {
    id: '4',
    backup_name: 'backup_full_20240601_0200',
    backup_type: 'full',
    filesize: '142.3 MB',
    status: 'success',
    created_at: '2024-06-01 02:00:00',
    created_by: 'system',
    remark: i18n.t('pages.database_management_page.k3'),
  },
  {
    id: '5',
    backup_name: 'backup_manual_20240520',
    backup_type: 'full',
    filesize: '128.5 MB',
    status: 'failed',
    created_at: '2024-05-20 14:30:00',
    created_by: i18n.t('pages.database_management_page.k4'),
    remark: i18n.t('pages.database_management_page.k5'),
  },
];

const DatabaseManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState('tables');
  const [searchQuery, setSearchQuery] = useState('');

  const [backups, setBackups] = useState<BackupRecord[]>(mockBackups);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showStructureModal, setShowStructureModal] = useState(false);
  const [currentTable, setCurrentTable] = useState<TableInfo | null>(null);

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  const [deleteBackupDialogOpen, setDeleteBackupDialogOpen] = useState(false);
  const [deletingBackupId, setDeletingBackupId] = useState<string | null>(null);

  const [restoreBackupId, setRestoreBackupId] = useState<string | null>(null);

  const tablesQuery = useQuery<TableInfo[]>({
    queryKey: [...QUERY_KEYS.AD_HOC.ERP_DATABASE_TABLES_BASE, searchQuery],
    queryFn: async () => {
      const res = await databaseApi.listTables({ search: searchQuery || undefined });
      if (res.success && res.data) return res.data;
      return [];
    },
    enabled: activeTab === 'tables',
    staleTime: 5 * 60 * 1000,
  });
  const tableRows: TableInfoRow[] = useMemo(
    () => (tablesQuery.data ?? []).map((t) => ({ ...t, id: t.table_name })),
    [tablesQuery.data]
  );
  const loading = tablesQuery.isLoading;

  const tableDetailQuery = useQuery<TableDetail | null>({
    queryKey: [...QUERY_KEYS.AD_HOC.ERP_DATABASE_TABLE_DETAIL_BASE, currentTable?.table_name],
    queryFn: async () => {
      if (!currentTable?.table_name) return null;
      const res = await databaseApi.getTableDetail(currentTable.table_name);
      return res.success && res.data ? res.data : null;
    },
    enabled: !!currentTable?.table_name && showStructureModal,
    staleTime: 5 * 60 * 1000,
  });
  const tableColumns = tableDetailQuery.data?.columns ?? [];
  const tableRowCount = tableDetailQuery.data?.row_count ?? null;

  useEffect(() => {
    if (tablesQuery.isError) {
      apiLogger.error(i18n.t('pages.database_management_page.k0'), tablesQuery.error);
      addNotification({
        title: i18n.t('pages.database_management_page.k6'),
        message: extractErrorMessage(
          tablesQuery.error,
          i18n.t('pages.database_management_page.k7')
        ),
        type: 'error',
      });
    }
  }, [tablesQuery.isError, tablesQuery.error, addNotification]);

  useEffect(() => {
    if (tableDetailQuery.isError) {
      apiLogger.error(i18n.t('pages.database_management_page.k1'), tableDetailQuery.error);
      addNotification({
        title: i18n.t('pages.database_management_page.k8'),
        message: extractErrorMessage(
          tableDetailQuery.error,
          i18n.t('pages.database_management_page.k9')
        ),
        type: 'error',
      });
    }
  }, [tableDetailQuery.isError, tableDetailQuery.error, addNotification]);

  const filteredTables = useMemo(() => {
    return tableRows.filter((table) => {
      const matchesSearch =
        !searchQuery || table.table_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [tableRows, searchQuery]);

  const paginatedTables = useMemo(
    () => filteredTables.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [filteredTables, page, rowsPerPage]
  );

  const paginatedBackups = useMemo(
    () => backups.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [backups, page, rowsPerPage]
  );

  const handleViewStructure = useCallback((table: TableInfo) => {
    setCurrentTable(table);
    setShowStructureModal(true);
  }, []);

  const handleBackup = useCallback(() => {
    setShowBackupModal(true);
  }, []);

  const startBackup = async () => {
    setBackingUp(true);
    setBackupProgress(0);
    setShowBackupModal(false);

    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setBackupProgress(i);
    }

    setBackingUp(false);
    setBackupProgress(0);

    const newBackup: BackupRecord = {
      id: Date.now().toString(),
      backup_name: `backup_manual_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      backup_type: 'full',
      filesize: `${(Math.random() * 50 + 100).toFixed(1)} MB`,
      status: 'success',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      created_by: i18n.t('pages.database_management_page.k10'),
      remark: i18n.t('pages.database_management_page.k11'),
    };
    setBackups((prev) => [newBackup, ...prev]);

    addNotification({
      title: i18n.t('pages.database_management_page.k12'),
      message: i18n.t('pages.database_management_page.k13'),
      type: 'success',
    });
  };

  const handleRestore = useCallback((backupId: string) => {
    setRestoreBackupId(backupId);
    setShowRestoreModal(true);
  }, []);

  const confirmRestore = async () => {
    setShowRestoreModal(false);
    addNotification({
      title: i18n.t('pages.database_management_page.k14'),
      message: i18n.t('pages.database_management_page.k15'),
      type: 'info',
    });
    setRestoreBackupId(null);
  };

  const handleDeleteBackup = useCallback((id: string) => {
    setDeletingBackupId(id);
    setDeleteBackupDialogOpen(true);
  }, []);

  const confirmDeleteBackup = async () => {
    if (!deletingBackupId) return;
    try {
      setBackups((prev) => prev.filter((b) => b.id !== deletingBackupId));
      addNotification({
        title: i18n.t('pages.database_management_page.k16'),
        message: i18n.t('pages.database_management_page.k17'),
        type: 'success',
      });
    } catch (_err: unknown) {
      addNotification({
        title: i18n.t('pages.database_management_page.k19'),
        message: i18n.t('pages.database_management_page.k18'),
        type: 'error',
      });
    } finally {
      setDeleteBackupDialogOpen(false);
      setDeletingBackupId(null);
    }
  };

  const getBackupStatusBadge = useCallback((status: string) => {
    const badges: Record<
      string,
      { color: 'success' | 'error' | 'info' | 'default'; label: string; icon: React.ReactNode }
    > = {
      success: {
        color: 'success',
        label: i18n.t('pages.database_management_page.k20'),
        icon: <CheckCircle size={14} />,
      },
      failed: {
        color: 'error',
        label: i18n.t('pages.database_management_page.k21'),
        icon: <AlertCircle size={14} />,
      },
      running: {
        color: 'info',
        label: i18n.t('pages.database_management_page.k22'),
        icon: <CircularProgress size={14} />,
      },
    };
    const config = badges[status] || { color: 'default', label: status, icon: <Info size={14} /> };
    return (
      <StatusBadge
        status={status}
        label={config.label}
        color={config.color}
        icon={config.icon}
      />
    );
  }, []);

  const stats = useMemo(() => {
    return {
      tableCount: tableRows.length,
      backupCount: backups.filter((b) => b.status === 'success').length,
    };
  }, [tableRows, backups]);

  const tabs = useMemo(
    () => (
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          value='tables'
          label={i18n.t('pages.database_management_page.k29')}
          icon={<Table size={16} />}
          iconPosition='start'
        />
        <Tab
          value='backup'
          label={i18n.t('pages.database_management_page.k30')}
          icon={<Download size={16} />}
          iconPosition='start'
        />
      </Tabs>
    ),
    [activeTab]
  );

  const statsCards = useMemo(
    () => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          {
            label: i18n.t('pages.database_management_page.k27'),
            value: stats.tableCount,
            icon: <Table size={20} />,
            color: 'primary',
            bg: 'primary.100',
          },
          {
            label: i18n.t('pages.database_management_page.k28'),
            value: stats.backupCount,
            icon: <Download size={20} />,
            color: 'info',
            bg: 'info.100',
          },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              p: 2.5,
              bgcolor: 'background.paper',
              borderRadius: 3,
              boxShadow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: stat.bg,
                color: `${stat.color}.main`,
              }}
            >
              {stat.icon}
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {stat.label}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {stat.value}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    ),
    [stats]
  );

  const headerContent = useMemo(
    () => (
      <>
        {statsCards}
        {tabs}
      </>
    ),
    [statsCards, tabs]
  );

  const tablesColumns: ColumnDef<TableInfoRow>[] = useMemo(
    () => [
      {
        id: 'table_name',
        label: i18n.t('pages.database_management_page.k36'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Table
              size={16}
              style={{ opacity: 0.5 }}
            />
            <Typography
              sx={{
                fontWeight: 500,
                color: 'primary.main',
                fontFamily: 'monospace',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {row.table_name}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'table_type',
        label: i18n.t('pages.database_management_page.k37'),
        render: (row) => (
          <Chip
            label={row.table_type}
            size='small'
            variant='outlined'
          />
        ),
      },
    ],
    []
  );

  const tablesRowActions: RowAction<TableInfoRow>[] = useMemo(
    () => [
      {
        key: 'view-structure',
        label: i18n.t('pages.database_management_page.k38'),
        icon: <Eye size={16} />,
        onClick: (row) => handleViewStructure(row),
      },
    ],
    [handleViewStructure]
  );

  const tablesActions = useMemo(
    () => [
      {
        label: i18n.t('pages.database_management_page.k25'),
        icon: <RefreshCw size={16} />,
        onClick: () => tablesQuery.refetch(),
        variant: 'outlined' as const,
      },
    ],
    [tablesQuery]
  );

  const backupColumns: ColumnDef<BackupRecord>[] = useMemo(
    () => [
      {
        id: 'backup_name',
        label: i18n.t('pages.database_management_page.k41'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Database
              size={16}
              style={{ opacity: 0.5 }}
            />
            <Typography
              sx={{
                fontWeight: 500,
                fontFamily: 'monospace',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {row.backup_name}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'backup_type',
        label: i18n.t('pages.database_management_page.k42'),
        render: (row) => (
          <Chip
            label={
              row.backup_type === 'full'
                ? i18n.t('pages.database_management_page.k49')
                : i18n.t('pages.database_management_page.k48')
            }
            size='small'
            color={row.backup_type === 'full' ? 'primary' : 'default'}
            variant='outlined'
          />
        ),
      },
      {
        id: 'filesize',
        label: i18n.t('pages.database_management_page.k43'),
        render: (row) => <Typography>{row.filesize}</Typography>,
      },
      {
        id: 'status',
        label: i18n.t('pages.database_management_page.k44'),
        render: (row) => getBackupStatusBadge(row.status),
      },
      {
        id: 'created_by',
        label: i18n.t('pages.database_management_page.k45'),
        render: (row) => <Typography>{row.created_by}</Typography>,
      },
      {
        id: 'created_at',
        label: i18n.t('pages.database_management_page.k46'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {row.created_at}
          </Typography>
        ),
      },
      {
        id: 'remark',
        label: i18n.t('pages.database_management_page.k47'),
        render: (row) => (
          <Typography
            sx={{
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'text.secondary',
            }}
          >
            {row.remark || '-'}
          </Typography>
        ),
      },
    ],
    [getBackupStatusBadge]
  );

  const backupRowActions: RowAction<BackupRecord>[] = useMemo(
    () => [
      {
        key: 'download',
        label: i18n.t('pages.database_management_page.k50'),
        icon: <Download size={16} />,
      },
      {
        key: 'restore',
        label: i18n.t('pages.database_management_page.k52'),
        icon: <Upload size={16} />,
        onClick: (row) => handleRestore(row.id),
        show: (row) => row.status === 'success',
      },
      {
        key: 'delete',
        label: i18n.t('pages.database_management_page.k54'),
        icon: <Trash2 size={16} />,
        onClick: (row) => handleDeleteBackup(row.id),
        color: 'error',
      },
    ],
    [handleRestore, handleDeleteBackup]
  );

  const backupActions = useMemo(
    () => [
      {
        label: i18n.t('pages.database_management_page.k26'),
        icon: <Download size={16} />,
        onClick: handleBackup,
        variant: 'contained' as const,
      },
      {
        label: i18n.t('pages.database_management_page.k6'),
        icon: <Upload size={16} />,
        onClick: () => setShowRestoreModal(true),
        variant: 'outlined' as const,
      },
    ],
    [handleBackup]
  );

  return (
    <>
      {backingUp && (
        <Alert
          severity='info'
          sx={{ mb: 2 }}
        >
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant='body2'>{i18n.t('pages.database_management_page.k2')}</Typography>
              <Typography variant='body2'>{backupProgress}%</Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={backupProgress}
            />
          </Box>
        </Alert>
      )}

      {activeTab === 'tables' && (
        <ListPageTemplate<TableInfoRow>
          title={i18n.t('pages.database_management_page.k23')}
          subtitle={i18n.t('pages.database_management_page.k24')}
          backButton={{ onClick: () => navigate(ERP_PATHS.dashboard) }}
          columns={tablesColumns}
          data={paginatedTables}
          loading={loading}
          actions={tablesActions}
          rowActions={tablesRowActions}
          searchable
          searchPlaceholder={i18n.t('pages.database_management_page.k3')}
          searchValue={searchQuery}
          onSearch={(value) => {
            setSearchQuery(value);
            setPage(0);
          }}
          pagination={{
            page: page + 1,
            pageSize: rowsPerPage,
            total: filteredTables.length,
            onPageChange: (newPage) => setPage(newPage - 1),
            onPageSizeChange: (newPageSize) => {
              setRowsPerPage(newPageSize);
              setPage(0);
            },
          }}
          headerContent={headerContent}
          emptyMessage={i18n.t('pages.database_management_page.k5')}
        />
      )}

      {activeTab === 'backup' && (
        <ListPageTemplate<BackupRecord>
          title={i18n.t('pages.database_management_page.k23')}
          subtitle={i18n.t('pages.database_management_page.k24')}
          backButton={{ onClick: () => navigate(ERP_PATHS.dashboard) }}
          columns={backupColumns}
          data={paginatedBackups}
          loading={false}
          actions={backupActions}
          rowActions={backupRowActions}
          pagination={{
            page: page + 1,
            pageSize: rowsPerPage,
            total: backups.length,
            onPageChange: (newPage) => setPage(newPage - 1),
            onPageSizeChange: (newPageSize) => {
              setRowsPerPage(newPageSize);
              setPage(0);
            },
          }}
          headerContent={headerContent}
          emptyMessage={i18n.t('pages.database_management_page.k9')}
        />
      )}

      <Dialog
        open={showStructureModal}
        onClose={() => setShowStructureModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings size={20} />
            {i18n.t('pages.database_management_page.k0')} {currentTable?.table_name}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {currentTable && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    {i18n.t('pages.database_management_page.k10')}
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                    {currentTable.table_name}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    {i18n.t('pages.database_management_page.k11')}
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>{currentTable.table_type}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    {i18n.t('pages.database_management_page.k12')}
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>
                    {tableRowCount?.toLocaleString() || '-'}
                  </Typography>
                </Box>
              </Box>

              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mt: 1 }}
              >
                {i18n.t('pages.database_management_page.k13')}
              </Typography>

              <TableContainer
                component={Paper}
                variant='outlined'
              >
                <MuiTable size='small'>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {i18n.t('pages.database_management_page.k56')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {i18n.t('pages.database_management_page.k57')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {i18n.t('pages.database_management_page.k58')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {i18n.t('pages.database_management_page.k59')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {i18n.t('pages.database_management_page.k60')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {i18n.t('pages.database_management_page.k61')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableColumns.map((col) => (
                      <TableRow key={col.column_name}>
                        <TableCell>
                          <Typography sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                            {col.column_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={col.data_type}
                            size='small'
                            variant='outlined'
                          />
                        </TableCell>
                        <TableCell>{col.character_maximum_length || '-'}</TableCell>
                        <TableCell>
                          {col.is_nullable === 'YES' ? (
                            <Chip
                              label={i18n.t('pages.database_management_page.k62')}
                              size='small'
                              color='default'
                              variant='outlined'
                            />
                          ) : (
                            <Chip
                              label={i18n.t('pages.database_management_page.k63')}
                              size='small'
                              color='warning'
                              variant='outlined'
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                            {col.column_default || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>-</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </MuiTable>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowStructureModal(false)}>
            {i18n.t('pages.database_management_page.k64')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Download size={20} />
            {i18n.t('pages.database_management_page.k14')}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Alert severity='info'>{i18n.t('pages.database_management_page.k15')}</Alert>
            <FormControl size='small'>
              <InputLabel>{i18n.t('pages.database_management_page.k65')}</InputLabel>
              <Select
                value='full'
                label={i18n.t('pages.database_management_page.k66')}
              >
                <MenuItem value='full'>{i18n.t('pages.database_management_page.k67')}</MenuItem>
                <MenuItem value='incremental'>
                  {i18n.t('pages.database_management_page.k68')}
                </MenuItem>
              </Select>
            </FormControl>
            <TextField
              size='small'
              label={i18n.t('pages.database_management_page.k69')}
              multiline
              rows={2}
              placeholder={i18n.t('pages.database_management_page.k70')}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowBackupModal(false)}>
            {i18n.t('pages.database_management_page.k71')}
          </Button>
          <Button
            variant='contained'
            startIcon={<Play size={16} />}
            onClick={startBackup}
          >
            {i18n.t('pages.database_management_page.k16')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showRestoreModal}
        onClose={() => {
          setShowRestoreModal(false);
          setRestoreBackupId(null);
        }}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Upload size={20} />
            {i18n.t('pages.database_management_page.k17')}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1 }}>
            <Alert severity='warning'>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, mb: 1 }}
              >
                {i18n.t('pages.database_management_page.k18')}
              </Typography>
              <Typography variant='body2'>
                {i18n.t('pages.database_management_page.k19')}
              </Typography>
            </Alert>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary', mb: 0.5 }}
              >
                {i18n.t('pages.database_management_page.k20')}
              </Typography>
              <Typography sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                {backups.find((b) => b.id === restoreBackupId)?.backup_name || '-'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setShowRestoreModal(false);
              setRestoreBackupId(null);
            }}
          >
            {i18n.t('pages.database_management_page.k21')}
          </Button>
          <Button
            variant='contained'
            color='warning'
            startIcon={<Upload size={16} />}
            onClick={confirmRestore}
          >
            {i18n.t('pages.database_management_page.k22')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={deleteBackupDialogOpen}
        onClose={() => {
          setDeleteBackupDialogOpen(false);
          setDeletingBackupId(null);
        }}
        onConfirm={confirmDeleteBackup}
        title={i18n.t('pages.database_management_page.k72')}
        message={i18n.t('pages.database_management_page.k73')}
        danger
      />
    </>
  );
};

export default DatabaseManagementPage;
