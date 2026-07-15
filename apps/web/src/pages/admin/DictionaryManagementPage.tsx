import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import {
  Book,
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronRight,
  FolderOpen,
  Tag,
  Download,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { BackButton, PageContainer } from '@/components/common';
import { dictTypeApi, dictItemApi, type DictType, type DictItem } from '@/api/system';
import { useNotificationStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { extractErrorMessage } from '@/utils/errors';
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Checkbox,
  Paper,
  Switch,
  IconButton,
  Button,
  useTheme,
} from '@mui/material';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { ConfirmDialog } from '@topems/shared-components';
import { DASHBOARD_PATHS } from '@/routes/dashboard';

interface DictionaryManagementPageProps {
  onNavigate?: (page: string) => void;
}

const categoryLabels: Record<string, string> = {
  system: '系统字典',
  business: '业务字典',
  basic: '基础数据',
  custom: '自定义字典',
};

const statusLabels: Record<string, string> = {
  active: '启用',
  inactive: '禁用',
};

const DictionaryManagementPage: React.FC<DictionaryManagementPageProps> = ({ onNavigate }) => {
  const theme = useTheme();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [selectedType, setSelectedType] = useState<DictType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingType, setEditingType] = useState<DictType | null>(null);
  const [editingItem, setEditingItem] = useState<DictItem | null>(null);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  const openConfirmDialog = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }) => {
    setConfirmDialogConfig(config);
    setConfirmDialogOpen(true);
  };

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [newType, setNewType] = useState<Partial<DictType>>({
    code: '',
    name: '',
    category: 'business',
    description: '',
    status: 'active',
  });

  const [newItem, setNewItem] = useState<Partial<DictItem>>({
    code: '',
    name: '',
    value: '',
    sort_order: 0,
    parent_id: undefined,
  });

  const dictTypesQuery = useQuery({
    queryKey: QUERY_KEYS.SYSTEM.DICT_TYPES,
    queryFn: async () => {
      const res = await dictTypeApi.list();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      throw new Error(res.message || '加载字典类型失败');
    },
  });

  const dictItemsQuery = useQuery({
    queryKey: QUERY_KEYS.SYSTEM.DICT_ITEMS(selectedType?.id ?? ''),
    queryFn: async () => {
      if (!selectedType) return [];
      const res = await dictItemApi.list(selectedType.id);
      if (res.success && res.data) {
        return res.data.items || [];
      }
      throw new Error(res.message || '加载字典项失败');
    },
    enabled: !!selectedType,
  });

  const dictTypes = dictTypesQuery.data || [];
  const dictItems = dictItemsQuery.data || [];
  const loading = dictTypesQuery.isLoading;
  const itemsLoading = dictItemsQuery.isLoading;
  const error = dictTypesQuery.error
    ? extractErrorMessage(dictTypesQuery.error, '加载字典类型失败')
    : null;

  useEffect(() => {
    if (!selectedType && dictTypes.length > 0) {
      setSelectedType(dictTypes[0]);
    }
  }, [dictTypes, selectedType]);

  useEffect(() => {
    setSelectedItems([]);
  }, [selectedType]);

  const loadDictTypes = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SYSTEM.DICT_TYPES });
  };

  const loadDictItems = (typeId: string) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SYSTEM.DICT_ITEMS(typeId) });
  };

  const createTypeMutation = useMutation({
    mutationFn: async (data: Partial<DictType>) => {
      const res = await dictTypeApi.create(data);
      if (!res.success) throw new Error(res.message || '创建失败');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SYSTEM.DICT_TYPES });
      addNotification({ title: '成功', message: '字典类型创建成功', type: 'success' });
      setShowTypeModal(false);
      setNewType({
        code: '',
        name: '',
        category: 'business',
        description: '',
        status: 'active',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('创建字典类型失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '创建失败'),
        type: 'error',
      });
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DictType> }) => {
      const res = await dictTypeApi.update(id, data);
      if (!res.success) throw new Error(res.message || '更新失败');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SYSTEM.DICT_TYPES });
      addNotification({ title: '成功', message: '字典类型更新成功', type: 'success' });
      setShowTypeModal(false);
      setEditingType(null);
    },
    onError: (err: unknown) => {
      apiLogger.error('更新字典类型失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '更新失败'),
        type: 'error',
      });
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await dictTypeApi.delete(id);
      if (!res.success) throw new Error(res.message || '删除失败');
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SYSTEM.DICT_TYPES });
      addNotification({ title: '成功', message: '字典类型删除成功', type: 'success' });
      if (selectedType?.id === id) {
        setSelectedType(null);
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('删除字典类型失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '删除失败'),
        type: 'error',
      });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: Partial<DictItem> & { dict_type_id: string }) => {
      const res = await dictItemApi.create(data);
      if (!res.success) throw new Error(res.message || '创建失败');
      return res.data;
    },
    onSuccess: () => {
      if (selectedType) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SYSTEM.DICT_ITEMS(selectedType.id),
        });
      }
      addNotification({ title: '成功', message: '字典项创建成功', type: 'success' });
      setShowItemModal(false);
      setNewItem({
        code: '',
        name: '',
        value: '',
        sort_order: dictItems.length,
        parent_id: undefined,
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('创建字典项失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '创建失败'),
        type: 'error',
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DictItem> }) => {
      const res = await dictItemApi.update(id, data);
      if (!res.success) throw new Error(res.message || '更新失败');
      return res.data;
    },
    onSuccess: () => {
      if (selectedType) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SYSTEM.DICT_ITEMS(selectedType.id),
        });
      }
      addNotification({ title: '成功', message: '字典项更新成功', type: 'success' });
      setShowItemModal(false);
      setEditingItem(null);
    },
    onError: (err: unknown) => {
      apiLogger.error('更新字典项失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '更新失败'),
        type: 'error',
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await dictItemApi.delete(id);
      if (!res.success) throw new Error(res.message || '删除失败');
      return id;
    },
    onSuccess: (id) => {
      if (selectedType) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SYSTEM.DICT_ITEMS(selectedType.id),
        });
      }
      addNotification({ title: '成功', message: '字典项删除成功', type: 'success' });
      setSelectedItems((prev) => prev.filter((itemId) => itemId !== id));
    },
    onError: (err: unknown) => {
      apiLogger.error('删除字典项失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '删除失败'),
        type: 'error',
      });
    },
  });

  const toggleItemStatusMutation = useMutation({
    mutationFn: async (item: DictItem) => {
      const newStatus = item.status === 'active' ? 'inactive' : 'active';
      const res = await dictItemApi.update(item.id, { ...item, status: newStatus });
      if (!res.success) throw new Error(res.message || '状态切换失败');
      return { item, newStatus };
    },
    onSuccess: ({ newStatus }) => {
      if (selectedType) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SYSTEM.DICT_ITEMS(selectedType.id),
        });
      }
      addNotification({
        title: '成功',
        message: `字典项已${newStatus === 'active' ? '启用' : '禁用'}`,
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('切换字典项状态失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '状态切换失败'),
        type: 'error',
      });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(ids.map((id) => dictItemApi.delete(id)));
      const successCount = results.filter((r) => r.success).length;
      return { successCount, total: ids.length };
    },
    onSuccess: ({ successCount, total }) => {
      if (selectedType) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SYSTEM.DICT_ITEMS(selectedType.id),
        });
      }
      if (successCount === total) {
        addNotification({
          title: '成功',
          message: `成功删除 ${successCount} 个字典项`,
          type: 'success',
        });
      } else {
        addNotification({
          title: '部分成功',
          message: `成功删除 ${successCount} 条，失败 ${total - successCount} 条`,
          type: 'warning',
        });
      }
      setSelectedItems([]);
    },
    onError: (err: unknown) => {
      apiLogger.error('批量删除字典项失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '批量删除失败'),
        type: 'error',
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async ({
      typeId,
      items,
    }: {
      typeId: string;
      items: Array<{
        code: string;
        name: string;
        value?: string;
        sort_order?: number;
        status?: string;
      }>;
    }) => {
      const results = await Promise.all(
        items.map((item) =>
          dictItemApi.create({
            dict_type_id: typeId,
            code: item.code,
            name: item.name,
            value: item.value,
            sort_order: item.sort_order || 0,
            status: (item.status as 'active' | 'inactive') || 'active',
          })
        )
      );
      const successCount = results.filter((r) => r.success).length;
      return { successCount, total: items.length };
    },
    onSuccess: ({ successCount, total }) => {
      if (selectedType) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SYSTEM.DICT_ITEMS(selectedType.id),
        });
      }
      if (successCount === total) {
        addNotification({
          title: '成功',
          message: `成功导入 ${successCount} 个字典项`,
          type: 'success',
        });
      } else {
        addNotification({
          title: '部分成功',
          message: `成功导入 ${successCount} 条，失败 ${total - successCount} 条`,
          type: 'warning',
        });
      }
      setShowImportModal(false);
      setImportFile(null);
    },
    onError: (err: unknown) => {
      apiLogger.error('导入字典项失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '导入失败'),
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

  const handleDeleteType = (id: string) => {
    deleteTypeMutation.mutate(id);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    createItemMutation.mutate({ ...newItem, dict_type_id: selectedType.id });
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    updateItemMutation.mutate({ id: editingItem.id, data: editingItem });
  };

  const handleDeleteItem = useCallback(
    (id: string) => {
      deleteItemMutation.mutate(id);
    },
    [deleteItemMutation]
  );

  const handleToggleItemStatus = useCallback(
    (item: DictItem) => {
      toggleItemStatusMutation.mutate(item);
    },
    [toggleItemStatusMutation]
  );

  const handleBatchDelete = () => {
    if (selectedItems.length === 0) return;
    batchDeleteMutation.mutate(selectedItems);
  };

  const handleExport = () => {
    if (!selectedType || dictItems.length === 0) return;

    const exportData = dictItems.map((item) => ({
      code: item.code,
      name: item.name,
      value: item.value || '',
      sort_order: item.sort_order,
      status: item.status,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType.code}items.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addNotification({
      title: '成功',
      message: '字典项导出成功',
      type: 'success',
    });
    setShowExportModal(false);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !selectedType) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const items = JSON.parse(event.target?.result as string);
        if (!Array.isArray(items)) {
          addNotification({
            title: '失败',
            message: '导入文件格式不正确',
            type: 'error',
          });
          return;
        }
        importMutation.mutate({ typeId: selectedType.id, items });
      } catch (err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(err, '导入失败'),
          type: 'error',
        });
      }
    };
    reader.readAsText(importFile);
  };

  const filteredTypes = dictTypes.filter(
    (type) =>
      type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const parentItems = useMemo(() => {
    return dictItems.filter((item) => !item.parent_id);
  }, [dictItems]);

  // 过滤后的字典项
  const filteredDictItems = useMemo(() => {
    return dictItems.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [dictItems, searchQuery]);

  // 分页数据
  const paginatedDictItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredDictItems.slice(start, end);
  }, [filteredDictItems, page, pageSize]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // 字典项列定义
  const columns: ColumnDef<DictItem>[] = useMemo(
    () => [
      {
        id: 'sort_order',
        label: '排序',
        width: 64,
        render: (item) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {item.sort_order}
          </Typography>
        ),
      },
      {
        id: 'code',
        label: '编码',
        render: (item) => (
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace' }}
          >
            {item.code}
          </Typography>
        ),
      },
      {
        id: 'name',
        label: '名称',
        sortable: true,
        render: (item) => (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {item.parent_id && (
              <Box
                component='span'
                sx={{ color: 'text.disabled', mr: 0.5 }}
              >
                └─
              </Box>
            )}
            <Typography variant='body2'>{item.name}</Typography>
          </Box>
        ),
      },
      {
        id: 'value',
        label: '值',
        render: (item) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {item.value || '-'}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 96,
        render: (item) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch
              checked={item.status === 'active'}
              onChange={() => handleToggleItemStatus(item)}
              size='small'
            />
            <Typography
              variant='caption'
              sx={{
                fontWeight: 500,
                color: item.status === 'active' ? 'success.main' : 'text.disabled',
              }}
            >
              {statusLabels[item.status]}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        width: 100,
        render: (item) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              justifyContent: 'flex-end',
            }}
          >
            <IconButton
              size='small'
              onClick={(e) => {
                e.stopPropagation();
                setEditingItem(item);
                setShowItemModal(true);
              }}
            >
              <Edit size={16} />
            </IconButton>
            <IconButton
              size='small'
              color='error'
              onClick={(e) => {
                e.stopPropagation();
                openConfirmDialog({
                  title: '确认删除',
                  message: '确定要删除这个字典项吗？',
                  onConfirm: () => handleDeleteItem(item.id),
                  danger: true,
                });
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </Box>
        ),
      },
    ],

    [handleToggleItemStatus, handleDeleteItem]
  );

  // 筛选器定义
  const filters = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { label: '全部', value: '' },
          { label: '启用', value: 'active' },
          { label: '禁用', value: 'inactive' },
        ],
      },
    ],
    []
  );

  return (
    <PageContainer>
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BackButton href={DASHBOARD_PATHS.dashboard} />
              <Box>
                <Typography
                  variant='h5'
                  sx={{
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Book
                    size={28}
                    style={{ marginRight: 12, color: theme.palette.primary.dark }}
                  />
                  字典管理
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mt: 0.5 }}
                >
                  管理系统字典、业务字典、基础数据字典
                </Typography>
              </Box>
            </Box>
            <Button
              variant='contained'
              startIcon={<Plus size={20} />}
              onClick={() => {
                setEditingType(null);
                setNewType({
                  code: '',
                  name: '',
                  category: 'business',
                  description: '',
                  status: 'active',
                });
                setShowTypeModal(true);
              }}
            >
              新增字典类型
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 2 }}>
          <Paper sx={{ bgcolor: 'error.light', borderColor: 'error.light', p: 2, border: 1 }}>
            <Typography color='error'>{error}</Typography>
          </Paper>
        </Box>
      )}

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* 左侧字典类型列表 */}
          <Box sx={{ width: 320, flexShrink: 0 }}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ position: 'relative', mb: 2 }}>
                  <TextField
                    type='text'
                    placeholder='搜索字典类型...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size='small'
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Box
                            component='span'
                            sx={{
                              mr: 1,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Search
                              size={16}
                              style={{ color: theme.palette.text.disabled }}
                            />
                          </Box>
                        ),
                      },
                    }}
                  />
                </Box>

                {loading ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {Object.entries(groupedTypes).map(([category, types]) => (
                        <Box key={category}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <FolderOpen
                              size={16}
                              style={{ color: theme.palette.text.secondary }}
                            />
                            <Typography
                              variant='caption'
                              sx={{
                                fontWeight: 500,
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                              }}
                            >
                              {categoryLabels[category] || category}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.5,
                            }}
                          >
                            {types.map((type) => (
                              <Box
                                key={type.id}
                                onClick={() => setSelectedType(type)}
                                sx={{
                                  p: 1.5,
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  border: 1,
                                  borderColor:
                                    selectedType?.id === type.id ? 'primary.main' : 'transparent',
                                  bgcolor:
                                    selectedType?.id === type.id ? 'primary.50' : 'transparent',
                                  '&:hover': {
                                    bgcolor:
                                      selectedType?.id === type.id ? 'primary.50' : 'action.hover',
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                    }}
                                  >
                                    <Tag
                                      size={16}
                                      style={{ color: theme.palette.text.disabled }}
                                    />
                                    <Box>
                                      <Typography
                                        variant='body2'
                                        sx={{ fontWeight: 500 }}
                                      >
                                        {type.name}
                                      </Typography>
                                      <Typography
                                        variant='caption'
                                        color='text.secondary'
                                      >
                                        {type.code}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <ChevronRight
                                    size={16}
                                    style={{ color: theme.palette.text.disabled }}
                                  />
                                </Box>
                                <Chip
                                  label={statusLabels[type.status]}
                                  size='small'
                                  variant='outlined'
                                  sx={{ mt: 1 }}
                                />
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* 右侧字典项表格 */}
          <Box sx={{ flex: 1 }}>
            {selectedType ? (
              <ListPageTemplate
                title={selectedType.name}
                subtitle={`编码: ${selectedType.code} | 分类: ${categoryLabels[selectedType.category] || selectedType.category}`}
                columns={columns}
                data={paginatedDictItems}
                loading={itemsLoading}
                pagination={{
                  page,
                  pageSize,
                  total: filteredDictItems.length,
                  onPageChange: handlePageChange,
                }}
                searchable
                searchPlaceholder='搜索字典项...'
                searchValue={searchQuery}
                onSearch={setSearchQuery}
                filters={filters}
                selectable
                selectedIds={selectedItems}
                onSelectionChange={(ids) => setSelectedItems(ids.map(String))}
                actions={[
                  {
                    label: '导出',
                    icon: <Download size={16} />,
                    onClick: () => setShowExportModal(true),
                    variant: 'outlined',
                  },
                  {
                    label: '导入',
                    icon: <Upload size={16} />,
                    onClick: () => setShowImportModal(true),
                    variant: 'outlined',
                  },
                  {
                    label: '新增字典项',
                    icon: <Plus size={16} />,
                    onClick: () => {
                      setEditingItem(null);
                      setNewItem({
                        code: '',
                        name: '',
                        value: '',
                        sort_order: dictItems.length,
                        parent_id: undefined,
                      });
                      setShowItemModal(true);
                    },
                    variant: 'contained',
                  },
                ]}
                batchActions={[
                  {
                    label: '批量删除',
                    icon: <Trash2 size={16} />,
                    color: 'error',
                    confirm: true,
                    confirmMessage: `确定要删除选中的 ${selectedItems.length} 个字典项吗？`,
                    onClick: handleBatchDelete,
                  },
                ]}
                onRefresh={() => selectedType && loadDictItems(selectedType.id)}
                emptyMessage='暂无字典项'
                headerContent={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant='outlined'
                      size='small'
                      startIcon={<Edit size={16} />}
                      onClick={() => {
                        setEditingType(selectedType);
                        setShowTypeModal(true);
                      }}
                    >
                      编辑类型
                    </Button>
                    <Button
                      variant='outlined'
                      size='small'
                      color='error'
                      startIcon={<Trash2 size={16} />}
                      onClick={() => {
                        openConfirmDialog({
                          title: '确认删除',
                          message: '确定要删除这个字典类型吗？所有字典项也会被删除！',
                          onConfirm: () => handleDeleteType(selectedType.id),
                          danger: true,
                        });
                      }}
                    >
                      删除
                    </Button>
                  </Box>
                }
              />
            ) : (
              <Card>
                <CardContent sx={{ p: 6, textAlign: 'center' }}>
                  <Book
                    size={64}
                    style={{ color: theme.palette.text.disabled, marginBottom: 16 }}
                  />
                  <Typography
                    variant='h6'
                    sx={{ mb: 1 }}
                  >
                    请选择字典类型
                  </Typography>
                  <Typography color='text.secondary'>
                    从左侧列表选择一个字典类型查看和管理字典项
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>
      </Box>

      {/* 字典类型对话框 */}
      <Dialog
        open={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editingType ? '编辑字典类型' : '新增字典类型'}</DialogTitle>
        <Box
          component='form'
          onSubmit={editingType ? handleUpdateType : handleCreateType}
        >
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                fullWidth
                label='编码 *'
                required
                disabled={!!editingType}
                value={editingType?.code || newType.code || ''}
                onChange={(e) => {
                  if (editingType) {
                    setEditingType({ ...editingType, code: e.target.value });
                  } else {
                    setNewType({ ...newType, code: e.target.value });
                  }
                }}
                placeholder='如: status_type'
                size='small'
              />
              <TextField
                fullWidth
                label='名称 *'
                required
                value={editingType?.name || newType.name || ''}
                onChange={(e) => {
                  if (editingType) {
                    setEditingType({ ...editingType, name: e.target.value });
                  } else {
                    setNewType({ ...newType, name: e.target.value });
                  }
                }}
                placeholder='如: 状态类型'
                size='small'
              />
              <FormControl
                size='small'
                fullWidth
              >
                <InputLabel>分类</InputLabel>
                <Select
                  value={editingType?.category || newType.category || 'business'}
                  label='分类'
                  onChange={(e) => {
                    if (editingType) {
                      setEditingType({
                        ...editingType,
                        category: e.target.value,
                      });
                    } else {
                      setNewType({ ...newType, category: e.target.value });
                    }
                  }}
                >
                  <MenuItem value='system'>系统字典</MenuItem>
                  <MenuItem value='business'>业务字典</MenuItem>
                  <MenuItem value='basic'>基础数据</MenuItem>
                  <MenuItem value='custom'>自定义字典</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label='描述'
                value={editingType?.description || newType.description || ''}
                onChange={(e) => {
                  if (editingType) {
                    setEditingType({
                      ...editingType,
                      description: e.target.value,
                    });
                  } else {
                    setNewType({ ...newType, description: e.target.value });
                  }
                }}
                multiline
                rows={2}
                size='small'
              />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant='body2'>状态</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {(editingType?.status || newType.status) === 'active' ? '启用' : '禁用'}
                  </Typography>
                  <Switch
                    checked={(editingType?.status || newType.status) === 'active'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const status = e.target.checked ? 'active' : 'inactive';
                      if (editingType) {
                        setEditingType({ ...editingType, status });
                      } else {
                        setNewType({ ...newType, status });
                      }
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => {
                setShowTypeModal(false);
                setEditingType(null);
              }}
            >
              取消
            </Button>
            <Button
              type='submit'
              variant='contained'
            >
              {editingType ? '保存' : '创建'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* 字典项对话框 */}
      <Dialog
        open={showItemModal}
        onClose={() => setShowItemModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editingItem ? '编辑字典项' : '新增字典项'}</DialogTitle>
        <Box
          component='form'
          onSubmit={editingItem ? handleUpdateItem : handleCreateItem}
        >
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                fullWidth
                label='编码 *'
                required
                value={editingItem?.code || newItem.code || ''}
                onChange={(e) => {
                  if (editingItem) {
                    setEditingItem({ ...editingItem, code: e.target.value });
                  } else {
                    setNewItem({ ...newItem, code: e.target.value });
                  }
                }}
                placeholder='如: active'
                size='small'
              />
              <TextField
                fullWidth
                label='名称 *'
                required
                value={editingItem?.name || newItem.name || ''}
                onChange={(e) => {
                  if (editingItem) {
                    setEditingItem({ ...editingItem, name: e.target.value });
                  } else {
                    setNewItem({ ...newItem, name: e.target.value });
                  }
                }}
                placeholder='如: 启用'
                size='small'
              />
              <TextField
                fullWidth
                label='值'
                value={editingItem?.value || newItem.value || ''}
                onChange={(e) => {
                  if (editingItem) {
                    setEditingItem({ ...editingItem, value: e.target.value });
                  } else {
                    setNewItem({ ...newItem, value: e.target.value });
                  }
                }}
                placeholder='可选，存储实际值'
                size='small'
              />
              <TextField
                fullWidth
                label='排序'
                type='number'
                value={editingItem?.sort_order || newItem.sort_order || 0}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  if (editingItem) {
                    setEditingItem({ ...editingItem, sort_order: value });
                  } else {
                    setNewItem({ ...newItem, sort_order: value });
                  }
                }}
                size='small'
              />
              <FormControl
                size='small'
                fullWidth
              >
                <InputLabel>上级字典项</InputLabel>
                <Select
                  value={editingItem?.parent_id || newItem.parent_id || ''}
                  label='上级字典项'
                  onChange={(e) => {
                    const parentId = e.target.value || undefined;
                    if (editingItem) {
                      setEditingItem({ ...editingItem, parent_id: parentId });
                    } else {
                      setNewItem({ ...newItem, parent_id: parentId });
                    }
                  }}
                >
                  <MenuItem value=''>无（顶级）</MenuItem>
                  {parentItems
                    .filter((item) => item.id !== editingItem?.id)
                    .map((item) => (
                      <MenuItem
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              {editingItem && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant='body2'>状态</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {editingItem.status === 'active' ? '启用' : '禁用'}
                    </Typography>
                    <Switch
                      checked={editingItem.status === 'active'}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setEditingItem({
                          ...editingItem,
                          status: e.target.checked ? 'active' : 'inactive',
                        });
                      }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => {
                setShowItemModal(false);
                setEditingItem(null);
              }}
            >
              取消
            </Button>
            <Button
              type='submit'
              variant='contained'
            >
              {editingItem ? '保存' : '创建'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* 导出对话框 */}
      <Dialog
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>导出字典项</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            将当前字典类型的所有字典项导出为 JSON 文件。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowExportModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleExport}
          >
            确认导出
          </Button>
        </DialogActions>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>导入字典项</DialogTitle>
        <Box
          component='form'
          onSubmit={handleImport}
        >
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Typography
                variant='body2'
                sx={{ mb: 1 }}
              >
                选择 JSON 文件
              </Typography>
              <input
                type='file'
                accept='.json'
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                style={{ width: '100%' }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              type='button'
              onClick={() => setShowImportModal(false)}
            >
              取消
            </Button>
            <Button
              type='submit'
              variant='contained'
            >
              确认导入
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogOpen(false);
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default DictionaryManagementPage;
