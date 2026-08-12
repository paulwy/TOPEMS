import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { databaseApi, type TableInfo, type TableDetail } from '@/api/erp/database';
import { extractErrorMessage } from '@/utils/errors';
import i18n from '@/i18n';


import { QUERY_KEYS } from '@/lib/reactQuery';

// Module-level t for use outside React components (shadowed by useTranslation inside components)
const t = i18n.t;

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

const mockBackups: BackupRecord[] = [
  {
    id: '1',
    backup_name: 'backup_full_20240615_0200',
    backup_type: 'full',
    filesize: '156.8 MB',
    status: 'success',
    created_at: '2024-06-15 02:00:00',
    created_by: 'system',
    remark: t('erp.database.mock.backup_daily_full'),
  },
  {
    id: '2',
    backup_name: 'backup_incr_20240614_2000',
    backup_type: 'incremental',
    filesize: '12.4 MB',
    status: 'success',
    created_at: '2024-06-14 20:00:00',
    created_by: 'system',
    remark: t('erp.database.mock.backup_incremental'),
  },
  {
    id: '3',
    backup_name: 'backup_incr_20240613_2000',
    backup_type: 'incremental',
    filesize: '8.7 MB',
    status: 'success',
    created_at: '2024-06-13 20:00:00',
    created_by: 'system',
    remark: t('erp.database.mock.backup_incremental'),
  },
  {
    id: '4',
    backup_name: 'backup_full_20240601_0200',
    backup_type: 'full',
    filesize: '142.3 MB',
    status: 'success',
    created_at: '2024-06-01 02:00:00',
    created_by: 'system',
    remark: t('erp.database.mock.backup_monthly_full'),
  },
  {
    id: '5',
    backup_name: 'backup_manual_20240520',
    backup_type: 'full',
    filesize: '128.5 MB',
    status: 'failed',
    created_at: '2024-05-20 14:30:00',
    created_by: t('erp.database.mock.admin'),
    remark: t('erp.database.mock.manual_backup_failed'),
  },
];

export function useDatabaseManagement() {
  const addNotification = useNotificationStore((state) => state.addNotification);

  // State
  const [activeTab, setActiveTab] = useState('tables');
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [backups, setBackups] = useState<BackupRecord[]>(() => mockBackups);
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

  // Queries
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
  const tables = tablesQuery.data ?? [];
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

  // Error handling
  useMemo(() => {
    if (tablesQuery.isError) {
      apiLogger.error('Load tables failed:', tablesQuery.error);
      addNotification({
        title: t('erp.database.message.error'),
        message: extractErrorMessage(
          tablesQuery.error,
          t('erp.database.message.load_tables_failed')
        ),
        type: 'error',
      });
    }
  }, [tablesQuery.isError, tablesQuery.error, addNotification]);

  useMemo(() => {
    if (tableDetailQuery.isError) {
      apiLogger.error('Get table structure failed:', tableDetailQuery.error);
      addNotification({
        title: t('erp.database.message.error'),
        message: extractErrorMessage(
          tableDetailQuery.error,
          t('erp.database.message.load_table_structure_failed')
        ),
        type: 'error',
      });
    }
  }, [tableDetailQuery.isError, tableDetailQuery.error, addNotification]);

  // Computed values
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const matchesSearch =
        !searchQuery || table.table_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [tables, searchQuery]);

  const stats = useMemo(() => {
    return {
      tableCount: tables.length,
      backupCount: backups.filter((b) => b.status === 'success').length,
    };
  }, [tables, backups]);

  // Handlers
  const handleViewStructure = useCallback((table: TableInfo) => {
    setCurrentTable(table);
    setShowStructureModal(true);
  }, []);

  const handleBackup = useCallback(() => {
    setShowBackupModal(true);
  }, []);

  const startBackup = useCallback(async () => {
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
      created_by: t('erp.database.mock.current_user'),
      remark: t('erp.database.mock.manual_backup'),
    };
    setBackups((prev) => [newBackup, ...prev]);

    addNotification({
      title: t('erp.database.message.backup_success'),
      message: t('erp.database.message.backup_completed'),
      type: 'success',
    });
  }, [t, addNotification]);

  const handleRestore = useCallback((backupId: string) => {
    setRestoreBackupId(backupId);
    setShowRestoreModal(true);
  }, []);

  const confirmRestore = useCallback(async () => {
    setShowRestoreModal(false);
    addNotification({
      title: t('erp.database.message.restoring'),
      message: t('erp.database.message.restore_started'),
      type: 'info',
    });
    setRestoreBackupId(null);
  }, [t, addNotification]);

  const handleDeleteBackup = useCallback((id: string) => {
    setDeletingBackupId(id);
    setDeleteBackupDialogOpen(true);
  }, []);

  const confirmDeleteBackup = useCallback(async () => {
    if (!deletingBackupId) return;
    try {
      setBackups((prev) => prev.filter((b) => b.id !== deletingBackupId));
      addNotification({
        title: t('erp.database.message.success'),
        message: t('erp.database.message.backup_deleted'),
        type: 'success',
      });
    } catch (err: unknown) {
      addNotification({
        title: t('erp.database.message.error'),
        message: t('erp.database.message.operation_failed'),
        type: 'error',
      });
    } finally {
      setDeleteBackupDialogOpen(false);
      setDeletingBackupId(null);
    }
  }, [deletingBackupId, t, addNotification]);

  return {
    // State
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    tableFilter,
    setTableFilter,
    backups,
    setBackups,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    showStructureModal,
    setShowStructureModal,
    currentTable,
    setCurrentTable,
    showBackupModal,
    setShowBackupModal,
    showRestoreModal,
    setShowRestoreModal,
    backingUp,
    setBackingUp,
    backupProgress,
    setBackupProgress,
    deleteBackupDialogOpen,
    setDeleteBackupDialogOpen,
    deletingBackupId,
    setDeletingBackupId,
    restoreBackupId,
    setRestoreBackupId,

    // Query data
    tables,
    loading,
    tableColumns,
    tableRowCount,
    filteredTables,
    tablesQuery,

    // Computed
    stats,

    // Handlers
    handleViewStructure,
    handleBackup,
    startBackup,
    handleRestore,
    confirmRestore,
    handleDeleteBackup,
    confirmDeleteBackup,
  };
}
