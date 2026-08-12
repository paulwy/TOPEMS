/**
 * @done V80 split
 * BI Permission page centralized state, queries, mutations, and handlers.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { QUERY_KEYS } from '@/lib/reactQuery';

import {

  listRowLevelPermissions,
  createRowLevelPermission,
  updateRowLevelPermission,
  deleteRowLevelPermission,
  testRowLevelPermission,
  listDataPermissions,
  type RowLevelPermission,
  type DataPermissionRule,
} from '@/api/bi';

export type BiPermissionTab = 'row-level' | 'data';

export interface TestResult {
  success: boolean;
  message: string;
}

export interface UseBiPermissionResult {
  // tab + search
  activeTab: BiPermissionTab;
  setActiveTab: (tab: BiPermissionTab) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;

  // data
  rowPermissions: RowLevelPermission[];
  dataPermissions: DataPermissionRule[];
  filteredRowPermissions: RowLevelPermission[];
  filteredDataPermissions: DataPermissionRule[];
  loading: boolean;
  actionLoading: boolean;

  // dialog + form
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  editingItem: RowLevelPermission | null;
  formData: Partial<RowLevelPermission>;
  setFormData: (data: Partial<RowLevelPermission>) => void;
  testResult: TestResult | null;
  setTestResult: (r: TestResult | null) => void;

  // handlers
  handleOpenDialog: (item?: RowLevelPermission) => void;
  handleSave: () => void;
  handleDelete: (id: string) => void;
  handleToggle: (item: RowLevelPermission) => void;
  handleTest: (item: RowLevelPermission) => Promise<void>;

  // label helpers
  getResourceTypeLabel: (type: string) => string;
  getPermissionTypeLabel: (type: string) => string;
  getPermissionTypeColor: (type: string) => 'primary' | 'success' | 'warning' | 'error';
}

const DEFAULT_FORM: Partial<RowLevelPermission> = {
  name: '',
  description: '',
  data_source_id: '',
  table_name: '',
  condition: '',
  roles: [],
  users: [],
  isEnabled: true,
  priority: 1,
};

export const useBiPermission = (): UseBiPermissionResult => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<BiPermissionTab>('row-level');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RowLevelPermission | null>(null);
  const [formData, setFormData] = useState<Partial<RowLevelPermission>>(DEFAULT_FORM);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const rowPermissionsQuery = useQuery<RowLevelPermission[]>({
    queryKey: QUERY_KEYS.AD_HOC.BI_ROW_PERMISSIONS_BASE,
    queryFn: async () => {
      const res = await listRowLevelPermissions();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const dataPermissionsQuery = useQuery<DataPermissionRule[]>({
    queryKey: QUERY_KEYS.AD_HOC.BI_DATA_PERMISSIONS_BASE,
    queryFn: async () => {
      const res = await listDataPermissions();
      if (res.success && res.data) {
        return res.data || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const rowPermissions = rowPermissionsQuery.data ?? [];
  const dataPermissions = dataPermissionsQuery.data ?? [];
  const loading = rowPermissionsQuery.isLoading;

  useEffect(() => {
    if (rowPermissionsQuery.isError) {
      logger.error('Failed to load row level permissions:', rowPermissionsQuery.error);
    }
    if (dataPermissionsQuery.isError) {
      logger.error('Failed to load data permissions:', dataPermissionsQuery.error);
    }
  }, [
    rowPermissionsQuery.isError,
    rowPermissionsQuery.error,
    dataPermissionsQuery.isError,
    dataPermissionsQuery.error,
  ]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingItem) {
        return await updateRowLevelPermission(editingItem.id, formData);
      } else {
        return await createRowLevelPermission(formData as RowLevelPermission);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.BI_ROW_PERMISSIONS_BASE ,
  exact: false,
  refetchType: 'active',
});
      setDialogOpen(false);
    },
    onError: (error: unknown) => {
      logger.error('Failed to save permission:', error);
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRowLevelPermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.BI_ROW_PERMISSIONS_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: (error: unknown) => {
      logger.error('Failed to delete permission:', error);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (item: RowLevelPermission) =>
      updateRowLevelPermission(item.id, { isEnabled: !item.isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.BI_ROW_PERMISSIONS_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: (error: unknown) => {
      logger.error('Failed to toggle permission:', error);
    },
  });

  const actionLoading =
    saveMutation.isPending || deleteMutation.isPending || toggleMutation.isPending;

  const handleOpenDialog = (item?: RowLevelPermission) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({ ...DEFAULT_FORM });
    }
    setTestResult(null);
    setDialogOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleDelete = (id: string) => {
    if (!confirm(t('bi.bi_permission_page.confirm'))) return;
    deleteMutation.mutate(id);
  };

  const handleToggle = (item: RowLevelPermission) => {
    toggleMutation.mutate(item);
  };

  const handleTest = async (item: RowLevelPermission) => {
    try {
      const res = await testRowLevelPermission(item.id);
      if (res.success) {
        setTestResult({ success: true, message: t('bi.bi_permission_page.message_e7fc60') });
      } else {
        setTestResult({ success: false, message: t('bi.bi_permission_page.message_c0ea04') });
      }
    } catch (error: unknown) {
      logger.error('Failed to test permission:', error);
      setTestResult({ success: true, message: t('bi.bi_permission_page.message_dd26a1') });
    }
  };

  const filteredRowPermissions = rowPermissions.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDataPermissions = dataPermissions.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getResourceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      dashboard: t('bi.bi_permission_page.text_3fa8b3'),
      dataset: t('bi.bi_permission_page.text_e20804'),
      datasource: t('bi.bi_permission_page.text_c11322'),
      report: t('bi.bi_permission_page.text_fc00f3'),
    };
    return labels[type] || type;
  };

  const getPermissionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      view: t('bi.bi_permission_page.view'),
      edit: t('bi.bi_permission_page.edit'),
      admin: t('bi.bi_permission_page.text_08b55f'),
      export: t('bi.bi_permission_page.export'),
    };
    return labels[type] || type;
  };

  const getPermissionTypeColor = (type: string) => {
    const colors: Record<string, 'primary' | 'success' | 'warning' | 'error'> = {
      view: 'primary',
      edit: 'success',
      admin: 'warning',
      export: 'primary',
    };
    return colors[type] || 'primary';
  };

  return {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    rowPermissions,
    dataPermissions,
    filteredRowPermissions,
    filteredDataPermissions,
    loading,
    actionLoading,
    dialogOpen,
    setDialogOpen,
    editingItem,
    formData,
    setFormData,
    testResult,
    setTestResult,
    handleOpenDialog,
    handleSave,
    handleDelete,
    handleToggle,
    handleTest,
    getResourceTypeLabel,
    getPermissionTypeLabel,
    getPermissionTypeColor,
  };
};
