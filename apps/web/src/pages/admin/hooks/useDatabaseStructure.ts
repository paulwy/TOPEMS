/**
 * @done V79 Phase 2 split
 * Database structure management centralized state and API calls hook
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiLogger } from '@/utils/logger';
import { extractErrorMessage } from '@/utils/errors';
import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';

import {
  dbStructureApi,
  type TableInfo,
  type TableDetail,
  type DbChange,
  type DbColumnDefinition,
  type SqlPreview,
} from '@/api/system';

export type NotificationState = {
  type: 'success' | 'error';
  message: string;
} | null;

export const useDatabaseStructure = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // State
  const [selectedTable, setSelectedTable] = useState<TableDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'structure' | 'changes'>('structure');
  const [notification, setNotification] = useState<NotificationState>(null);

  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [sqlPreview, setSqlPreview] = useState<SqlPreview | null>(null);
  const [pendingColumn, setPendingColumn] = useState<DbColumnDefinition | null>(null);

  const [newColumn, setNewColumn] = useState<DbColumnDefinition>({
    column_name: '',
    data_type: 'VARCHAR',
    is_nullable: true,
    default_value: '',
    max_length: 255,
  });

  // Queries
  const tablesQuery = useQuery<TableInfo[]>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_DB_TABLES_BASE,
    queryFn: async () => {
      const res = await dbStructureApi.listTables({ schema: 'public' });
      return res.success && res.data ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const dbChangesQuery = useQuery<DbChange[]>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_DB_CHANGES_BASE,
    queryFn: async () => {
      const res = await dbStructureApi.listChanges({ pagesize: 50 });
      return res.success && res.data ? res.data.items || [] : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const tableDetailQuery = useQuery<TableDetail>({
    queryKey: [...QUERY_KEYS.AD_HOC.ADMIN_DB_TABLE_DETAIL_BASE, selectedTable?.table_name],
    queryFn: async () => {
      const res = await dbStructureApi.getTableDetail(selectedTable!.table_name);
      if (res.success && res.data) return res.data;
      throw new Error(res.message || t('admin.database_structure.failed_to_load_table_structure'));
    },
    enabled: !!selectedTable?.table_name && activeTab === 'structure',
    staleTime: 5 * 60 * 1000,
  });

  // Computed values
  const loading = tablesQuery.isLoading;
  const detailLoading = tableDetailQuery.isLoading;
  const tables = tablesQuery.data ?? [];
  const dbChanges = dbChangesQuery.data ?? [];

  // Effects
  useEffect(() => {
    if (tableDetailQuery.data) {
      setSelectedTable(tableDetailQuery.data);
    }
  }, [tableDetailQuery.data]);

  useEffect(() => {
    if (tablesQuery.isError) {
      showNotification(
        'error',
        extractErrorMessage(
          tablesQuery.error,
          t('admin.database_structure.failed_to_load_table_list')
        )
      );
    }
  }, [tablesQuery.isError, tablesQuery.error]);

  useEffect(() => {
    if (dbChangesQuery.isError) {
      apiLogger.error(t('admin.database_structure_page.log_553e3d'), dbChangesQuery.error);
    }
  }, [dbChangesQuery.isError, dbChangesQuery.error]);

  useEffect(() => {
    if (tableDetailQuery.isError) {
      showNotification(
        'error',
        extractErrorMessage(
          tableDetailQuery.error,
          t('admin.database_structure.failed_to_load_table_structure')
        )
      );
    }
  }, [tableDetailQuery.isError, tableDetailQuery.error]);

  // Notification helpers
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const handleNotificationClose = () => {
    setNotification(null);
  };

  // Mutations
  const previewAddColumnMutation = useMutation({
    mutationFn: async (params: { table_name: string; column: DbColumnDefinition }) => {
      const res = await dbStructureApi.previewAddColumn(params);
      if (res.success && res.data) return res.data;
      throw new Error(res.message || t('admin.database_structure.failed_to_generate_sql_preview'));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_DB_TABLES_BASE,
        exact: false,
        refetchType: 'active',
      });
      setSqlPreview(data);
      setPendingColumn(newColumn);
      setShowPreviewModal(true);
    },
    onError: (err: unknown) => {
      showNotification(
        'error',
        extractErrorMessage(err, t('admin.database_structure.failed_to_generate_sql_preview'))
      );
    },
  });

  const executeAddColumnMutation = useMutation({
    mutationFn: async (params: { table_name: string; column: DbColumnDefinition }) => {
      const res = await dbStructureApi.addColumn(params);
      if (res.success) return true;
      throw new Error(res.message || t('admin.database_structure.failed_to_add_field'));
    },
    onSuccess: async () => {
      showNotification('success', t('admin.database_structure.field_added_successfully'));
      setShowPreviewModal(false);
      setShowAddColumnModal(false);
      setNewColumn({
        column_name: '',
        data_type: 'VARCHAR',
        is_nullable: true,
        default_value: '',
        max_length: 255,
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_DB_TABLE_DETAIL_BASE,
        exact: false,
        refetchType: 'active',
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_DB_CHANGES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      showNotification(
        'error',
        extractErrorMessage(err, t('admin.database_structure.failed_to_add_field'))
      );
    },
  });

  const dropColumnMutation = useMutation({
    mutationFn: async (params: { tableName: string; columnName: string }) => {
      const res = await dbStructureApi.dropColumn(params.tableName, params.columnName);
      if (res.success) return true;
      throw new Error(res.message || t('admin.database_structure.failed_to_delete_field'));
    },
    onSuccess: async () => {
      showNotification('success', t('admin.database_structure.field_deleted_successfully'));
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_DB_TABLE_DETAIL_BASE,
        exact: false,
        refetchType: 'active',
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_DB_CHANGES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      showNotification(
        'error',
        extractErrorMessage(err, t('admin.database_structure.failed_to_delete_field'))
      );
    },
  });

  // Handlers
  const handlePreviewAddColumn = async () => {
    if (!selectedTable || !newColumn.column_name) {
      showNotification('error', t('admin.database_structure.please_enter_field_name'));
      return;
    }
    previewAddColumnMutation.mutate({
      table_name: selectedTable.table_name,
      column: newColumn,
    });
  };

  const handleExecuteAddColumn = async () => {
    if (!selectedTable || !pendingColumn) return;
    executeAddColumnMutation.mutate({
      table_name: selectedTable.table_name,
      column: pendingColumn,
    });
  };

  const handleDropColumn = async (columnName: string) => {
    if (!selectedTable) return;
    if (!confirm(t('admin.database_structure_page.text_7b397b', { columnName }))) return;
    dropColumnMutation.mutate({
      tableName: selectedTable.table_name,
      columnName,
    });
  };

  // Filtered data
  const filteredTables = tables.filter((table) =>
    table.table_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    // State
    selectedTable,
    setSelectedTable,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    notification,
    showAddColumnModal,
    setShowAddColumnModal,
    showPreviewModal,
    setShowPreviewModal,
    sqlPreview,
    newColumn,
    setNewColumn,

    // Query results
    loading,
    detailLoading,
    tables,
    dbChanges,
    filteredTables,

    // Handlers
    handleNotificationClose,
    handlePreviewAddColumn,
    handleExecuteAddColumn,
    handleDropColumn,
    showNotification,
  };
};
