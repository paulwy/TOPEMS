import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dictTypeApi, dictItemApi, type DictType, type DictItem } from '@/api/system';
import { toggleDictItemStatus } from '@/schemas/admin';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { apiLogger } from '@/utils/logger';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  onConfirm: () => void;
  danger?: boolean;
}
const DEFAULT_NEW_TYPE: Partial<DictType> = {
  code: '',
  name: '',
  category: 'business',
  description: '',
  status: 'active',
};
export function useDictionaryManagement() {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<DictType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<DictType | null>(null);
  const [newType, setNewType] = useState<Partial<DictType>>({ ...DEFAULT_NEW_TYPE });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<ConfirmDialogConfig | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const openConfirmDialog = useCallback((config: ConfirmDialogConfig) => {
    setConfirmDialogConfig(config);
    setConfirmDialogOpen(true);
  }, []);
  const dictTypesQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_LIST_BASE,
    queryFn: async () => {
      const res = await dictTypeApi.list();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      throw new Error(
        res.message || i18n.t('admin.dictionary_management.failed_to_load_dictionary_types')
      );
    },

    staleTime: CACHE_DURATIONS.LONG,
  });
  const dictTypes = dictTypesQuery.data || [];
  const typesLoading = dictTypesQuery.isLoading;
  useEffect(() => {
    if (!selectedType && dictTypes.length > 0) {
      setSelectedType(dictTypes[0]);
    }
  }, [dictTypes, selectedType]);
  const createTypeMutation = useMutation({
    mutationFn: async (data: Partial<DictType>) => {
      const res = await dictTypeApi.create(data);
      if (!res.success)
        throw new Error(res.message || i18n.t('admin.dictionary_management.create_failed'));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_LIST_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('admin.dictionary_management.success'),
        message: i18n.t('admin.dictionary_management.dictionary_type_created_successfully'),
        type: 'success',
      });
      setShowTypeModal(false);
      setNewType({ ...DEFAULT_NEW_TYPE });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('admin.dictionary_management_page.log_0de7e5'), err);
      addNotification({
        title: i18n.t('admin.dictionary_management.failed'),
        message: extractErrorMessage(err, i18n.t('admin.dictionary_management.create_failed')),
        type: 'error',
      });
    },
  });
  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DictType> }) => {
      const res = await dictTypeApi.update(id, data);
      if (!res.success)
        throw new Error(res.message || i18n.t('admin.dictionary_management.update_failed'));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_LIST_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('admin.dictionary_management.success'),
        message: i18n.t('admin.dictionary_management.dictionary_type_updated_successfully'),
        type: 'success',
      });
      setShowTypeModal(false);
      setEditingType(null);
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('admin.dictionary_management_page.log_c23773'), err);
      addNotification({
        title: i18n.t('admin.dictionary_management.failed'),
        message: extractErrorMessage(err, i18n.t('admin.dictionary_management.update_failed')),
        type: 'error',
      });
    },
  });
  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await dictTypeApi.delete(id);
      if (!res.success)
        throw new Error(res.message || i18n.t('admin.dictionary_management.delete_failed'));
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_LIST_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('admin.dictionary_management.success'),
        message: i18n.t('admin.dictionary_management.dictionary_type_deleted_successfully'),
        type: 'success',
      });
      if (selectedType?.id === id) {
        setSelectedType(null);
      }
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('admin.dictionary_management_page.log_84e4ed'), err);
      addNotification({
        title: i18n.t('admin.dictionary_management.failed'),
        message: extractErrorMessage(err, i18n.t('admin.dictionary_management.delete_failed')),
        type: 'error',
      });
    },
  });
  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    createTypeMutation.mutate(newType);
  };
  const handleUpdateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    updateTypeMutation.mutate({ id: editingType.id, data: editingType });
  };
  const handleDeleteType = useCallback(
    (id: string) => {
      deleteTypeMutation.mutate(id);
    },
    [deleteTypeMutation]
  );
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return toggleDictItemStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.DICT_ITEM_LIST_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('admin.dictionary_management.success'),
        message: i18n.t('admin.dictionary_management.status_toggled_successfully'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('admin.dictionary_management_page.log_76c0de'), err);
      addNotification({
        title: i18n.t('admin.dictionary_management.failed'),
        message: extractErrorMessage(
          err,
          i18n.t('admin.dictionary_management.status_toggle_failed')
        ),
        type: 'error',
      });
    },
  });
  const handleToggleStatus = useCallback(
    (row: Record<string, unknown>) => {
      const item = row as unknown as DictItem;
      toggleStatusMutation.mutate({ id: item.id, status: item.status });
    },
    [toggleStatusMutation]
  );
  const handleExport = useCallback(() => {
    if (!selectedType) return;
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.DICT_ITEM_LIST_BASE,
      exact: false,
      refetchType: 'active',
    });
    addNotification({
      title: i18n.t('admin.dictionary_management.success'),
      message: i18n.t('admin.dictionary_management.dictionary_items_exported_successfully'),
      type: 'success',
    });
    setShowExportModal(false);
  }, [selectedType, addNotification, queryClient, i18n.t]);
  const handleImport = useCallback(async () => {
    if (!importFile || !selectedType) return;
    try {
      const text = await importFile.text();
      const items = JSON.parse(text);
      if (!Array.isArray(items))
        throw new Error(i18n.t('admin.dictionary_management.incorrect_import_file_format'));
      let successCount = 0;
      for (const item of items) {
        const res = await dictItemApi.create({
          dict_type_id: selectedType.id,
          code: item.code,
          name: item.name,
          value: item.value,
          sort_order: item.sort_order || 0,
          status: item.status || 'active',
        });
        if (res.success) successCount++;
      }
      addNotification({
        title:
          successCount === items.length
            ? i18n.t('admin.dictionary_management.success')
            : i18n.t('admin.dictionary_management.partial_success'),
        message:
          successCount === items.length
            ? i18n.t('admin.dictionary_management_page.text_7b7935', { successCount })
            : i18n.t('admin.dictionary_management_page.text_6fe2d1', {
                var0: successCount,
                var1: items.length - successCount,
              }),
        type: successCount === items.length ? 'success' : 'warning',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.DICT_ITEM_LIST_BASE,
        exact: false,
        refetchType: 'active',
      });
      setShowImportModal(false);
      setImportFile(null);
    } catch (err: unknown) {
      addNotification({
        title: i18n.t('admin.dictionary_management.failed'),
        message: extractErrorMessage(err, i18n.t('admin.dictionary_management.import_failed')),
        type: 'error',
      });
    }
  }, [importFile, selectedType, addNotification, queryClient, i18n.t]);
  const dictItemAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        if (!selectedType) return { data: [], total: 0 };
        const res = await dictItemApi.list(selectedType.id, params);
        if (res.success && res.data) {
          return {
            data: (res.data.items || []) as unknown as Record<string, unknown>[],
            total: res.data.total || 0,
          };
        }
        throw new Error(
          res.message || i18n.t('admin.dictionary_management.failed_to_load_dictionary_items')
        );
      },
      create: async (data) => {
        if (!selectedType)
          throw new Error(
            i18n.t('admin.dictionary_management.please_select_a_dictionary_type_first')
          );
        const res = await dictItemApi.create({ ...data, dict_type_id: selectedType.id });
        if (!res.success)
          throw new Error(res.message || i18n.t('admin.dictionary_management.create_failed'));
        return res.data as unknown as Record<string, unknown>;
      },
      update: async (id, data) => {
        const res = await dictItemApi.update(id, data);
        if (!res.success)
          throw new Error(res.message || i18n.t('admin.dictionary_management.update_failed'));
        return res.data as unknown as Record<string, unknown>;
      },
      delete: async (id) => {
        const res = await dictItemApi.delete(id);
        if (!res.success)
          throw new Error(res.message || i18n.t('admin.dictionary_management.delete_failed'));
      },
    }),
    [selectedType, i18n.t]
  );
  const filteredTypes = useMemo(() => {
    return dictTypes.filter(
      (type) =>
        type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [dictTypes, searchQuery]);
  const groupedTypes = useMemo(() => {
    return filteredTypes.reduce(
      (acc, type) => {
        const category = type.category || 'custom';
        if (!acc[category]) acc[category] = [];
        acc[category].push(type);
        return acc;
      },
      {} as Record<string, DictType[]>
    );
  }, [filteredTypes]);
  const openCreateTypeModal = useCallback(() => {
    setEditingType(null);
    setNewType({ ...DEFAULT_NEW_TYPE });
    setShowTypeModal(true);
  }, []);
  const openEditTypeModal = useCallback((type: DictType) => {
    setEditingType(type);
    setShowTypeModal(true);
  }, []);
  const closeTypeModal = useCallback(() => {
    setShowTypeModal(false);
    setEditingType(null);
  }, []);
  return {
    selectedType,
    setSelectedType,
    searchQuery,
    setSearchQuery,
    showTypeModal,
    editingType,
    setEditingType,
    newType,
    setNewType,
    confirmDialogOpen,
    setConfirmDialogOpen,
    confirmDialogConfig,
    openConfirmDialog,
    showExportModal,
    setShowExportModal,
    showImportModal,
    setShowImportModal,
    importFile,
    setImportFile,
    dictTypes,
    typesLoading,
    createTypeMutation,
    updateTypeMutation,
    deleteTypeMutation,
    toggleStatusMutation,
    handleCreateType,
    handleUpdateType,
    handleDeleteType,
    handleToggleStatus,
    handleExport,
    handleImport,
    dictItemAdapter,
    filteredTypes,
    groupedTypes,
    openCreateTypeModal,
    openEditTypeModal,
    closeTypeModal,
  };
}
