import React, { useState, useMemo } from 'react';
import {
  Book,
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Check,
  X,
  List,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { PageContainer, StatusBadge, ActionButton, ConfirmDialog } from '@/components/common';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
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
  Switch,
  FormControlLabel,
  TablePagination,
  InputAdornment,
} from '@mui/material';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { extractErrorMessage } from '@/utils/errors';
import { useNavigate } from 'react-router-dom';
import { ERP_PATHS } from '@/modules/erp/config';
import { dictTypeApi, dictItemApi, type DictType, type DictItem } from '@/api/system';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const categoryLabels: Record<string, string> = {
  system: '系统字典',
  iam: 'IAM字典',
  workflow: '审批字典',
  hrm: 'HRM字典',
  crm: 'CRM字典',
  erp: 'ERP字典',
  wms: 'WMS字典',
  mes: 'MES字典',
  common: '通用字典',
  notification: '通知字典',
  audit: '审计字典',
  business: '业务字典',
  basic: '基础数据',
  custom: '自定义字典',
};

const DictManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDict, setSelectedDict] = useState<DictType | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingType, setEditingType] = useState<DictType | null>(null);
  const [editingItem, setEditingItem] = useState<DictItem | null>(null);

  const [deleteTypeDialogOpen, setDeleteTypeDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

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
    status: 'active',
  });

  const dictTypesQuery = useQuery({
    queryKey: ['system-dict-types'],
    queryFn: async () => {
      const res = await dictTypeApi.list();
      if (res.success && res.data) {
        return { items: res.data.items || [], total: res.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    staleTime: 30 * 60 * 1000,
    onSuccess: (data) => {
      if (!selectedDict && data.items.length > 0) {
        setSelectedDict(data.items[0]);
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('加载字典类型失败:', err);
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '加载字典类型失败'),
        type: 'error',
      });
    },
  });
  const dictTypes = dictTypesQuery.data?.items || [];
  const totalCount = dictTypesQuery.data?.total || 0;
  const loading = dictTypesQuery.isLoading;

  const dictItemsQuery = useQuery({
    queryKey: ['system-dict-items', selectedDict?.id],
    queryFn: async () => {
      if (!selectedDict) return [];
      const res = await dictItemApi.list(selectedDict.id);
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!selectedDict,
    onError: (err: unknown) => {
      apiLogger.error('加载字典项失败:', err);
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '加载字典项失败'),
        type: 'error',
      });
    },
  });
  const dictItems = dictItemsQuery.data || [];
  const itemLoading = dictItemsQuery.isLoading;

  const createTypeMutation = useMutation({
    mutationFn: (data: Partial<DictType>) => dictTypeApi.create(data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '字典类型创建成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['system-dict-types'] });
    },
    onError: (err: unknown) => {
      addNotification({ title: '错误', message: extractErrorMessage(err, '创建失败'), type: 'error' });
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DictType> }) => dictTypeApi.update(id, data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '字典类型更新成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['system-dict-types'] });
    },
    onError: (err: unknown) => {
      addNotification({ title: '错误', message: extractErrorMessage(err, '更新失败'), type: 'error' });
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) => dictTypeApi.delete(id),
    onSuccess: (_, id) => {
      addNotification({ title: '成功', message: '删除成功', type: 'success' });
      if (selectedDict?.id === id) {
        setSelectedDict(null);
      }
      queryClient.invalidateQueries({ queryKey: ['system-dict-types'] });
    },
    onError: (err: unknown) => {
      addNotification({ title: '错误', message: extractErrorMessage(err, '删除失败'), type: 'error' });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (data: Partial<DictItem> & { dict_type_id: string }) => dictItemApi.create(data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '字典项创建成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['system-dict-items', selectedDict?.id] });
      queryClient.invalidateQueries({ queryKey: ['system-dict-types'] });
    },
    onError: (err: unknown) => {
      addNotification({ title: '错误', message: extractErrorMessage(err, '创建失败'), type: 'error' });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DictItem> }) => dictItemApi.update(id, data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '字典项更新成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['system-dict-items', selectedDict?.id] });
    },
    onError: (err: unknown) => {
      addNotification({ title: '错误', message: extractErrorMessage(err, '更新失败'), type: 'error' });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => dictItemApi.delete(id),
    onSuccess: () => {
      addNotification({ title: '成功', message: '删除成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['system-dict-items', selectedDict?.id] });
      queryClient.invalidateQueries({ queryKey: ['system-dict-types'] });
    },
    onError: (err: unknown) => {
      addNotification({ title: '错误', message: extractErrorMessage(err, '删除失败'), type: 'error' });
    },
  });

  const filteredDictTypes = useMemo(() => {
    return dictTypes.filter((dict) => {
      const matchesSearch =
        !searchQuery ||
        dict.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dict.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || dict.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [dictTypes, searchQuery, statusFilter]);

  const filteredDictItems = useMemo(() => {
    return dictItems.filter((item) => {
      return (
        !itemSearchQuery ||
        item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        (item.value && item.value.toLowerCase().includes(itemSearchQuery.toLowerCase()))
      );
    });
  }, [dictItems, itemSearchQuery]);

  const handleCreateType = async () => {
    if (!newType.code || !newType.name) {
      addNotification({
        title: '提示',
        message: '请填写必填字段',
        type: 'warning',
      });
      return;
    }

    try {
      const res = await createTypeMutation.mutateAsync(newType);
      if (res.success) {
        setShowTypeModal(false);
        resetTypeForm();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '创建失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '创建失败'),
        type: 'error',
      });
    }
  };

  const handleUpdateType = async () => {
    if (!editingType || !newType.code || !newType.name) {
      addNotification({
        title: '提示',
        message: '请填写必填字段',
        type: 'warning',
      });
      return;
    }

    try {
      const res = await updateTypeMutation.mutateAsync({ id: editingType.id, data: newType });
      if (res.success) {
        setShowTypeModal(false);
        resetTypeForm();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '更新失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '更新失败'),
        type: 'error',
      });
    }
  };

  const handleEditType = (dict: DictType) => {
    setEditingType(dict);
    setNewType({
      code: dict.code,
      name: dict.name,
      category: dict.category,
      description: dict.description,
      status: dict.status,
    });
    setShowTypeModal(true);
  };

  const handleDeleteType = (id: string) => {
    setDeletingTypeId(id);
    setDeleteTypeDialogOpen(true);
  };

  const confirmDeleteType = async () => {
    if (!deletingTypeId) return;
    try {
      await deleteTypeMutation.mutateAsync(deletingTypeId);
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '删除失败'),
        type: 'error',
      });
    } finally {
      setDeleteTypeDialogOpen(false);
      setDeletingTypeId(null);
    }
  };

  const resetTypeForm = () => {
    setNewType({
      code: '',
      name: '',
      category: 'business',
      description: '',
      status: 'active',
    });
    setEditingType(null);
  };

  const handleCreateItem = async () => {
    if (!newItem.code || !newItem.name) {
      addNotification({
        title: '提示',
        message: '请填写必填字段',
        type: 'warning',
      });
      return;
    }

    if (!selectedDict) return;

    try {
      const res = await createItemMutation.mutateAsync({
        ...newItem,
        dict_type_id: selectedDict.id,
      });
      if (res.success) {
        setShowItemModal(false);
        resetItemForm();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '创建失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '创建失败'),
        type: 'error',
      });
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !newItem.code || !newItem.name) {
      addNotification({
        title: '提示',
        message: '请填写必填字段',
        type: 'warning',
      });
      return;
    }

    try {
      const res = await updateItemMutation.mutateAsync({ id: editingItem.id, data: newItem });
      if (res.success) {
        setShowItemModal(false);
        resetItemForm();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '更新失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '更新失败'),
        type: 'error',
      });
    }
  };

  const handleEditItem = (item: DictItem) => {
    setEditingItem(item);
    setNewItem({
      code: item.code,
      name: item.name,
      value: item.value,
      sort_order: item.sort_order,
      parent_id: item.parent_id,
      status: item.status,
    });
    setShowItemModal(true);
  };

  const handleDeleteItem = (id: string) => {
    setDeletingItemId(id);
    setDeleteItemDialogOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!deletingItemId || !selectedDict) return;
    try {
      await deleteItemMutation.mutateAsync(deletingItemId);
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '删除失败'),
        type: 'error',
      });
    } finally {
      setDeleteItemDialogOpen(false);
      setDeletingItemId(null);
    }
  };

  const resetItemForm = () => {
    setNewItem({
      code: '',
      name: '',
      value: '',
      sort_order: 0,
      parent_id: undefined,
      status: 'active',
    });
    setEditingItem(null);
  };

  const handleToggleTypeStatus = async (dict: DictType) => {
    try {
      const newStatus = dict.status === 'active' ? 'inactive' : 'active';
      const res = await updateTypeMutation.mutateAsync({ id: dict.id, data: { status: newStatus } });
      if (res.success) {
        addNotification({
          title: '成功',
          message: `已${newStatus === 'active' ? '启用' : '禁用'}`,
          type: 'success',
        });
      } else {
        addNotification({
          title: '失败',
          message: res.message || '状态切换失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '状态切换失败'),
        type: 'error',
      });
    }
  };

  const handleToggleItemStatus = async (item: DictItem) => {
    try {
      const newStatus = item.status === 'active' ? 'inactive' : 'active';
      const res = await updateItemMutation.mutateAsync({ id: item.id, data: { status: newStatus } });
      if (res.success) {
        addNotification({
          title: '成功',
          message: `已${newStatus === 'active' ? '启用' : '禁用'}`,
          type: 'success',
        });
      } else {
        addNotification({
          title: '失败',
          message: res.message || '状态切换失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '状态切换失败'),
        type: 'error',
      });
    }
  };

  const parentItems = useMemo(() => {
    return dictItems.filter((item) => !item.parent_id);
  }, [dictItems]);

  return (
    <PageContainer
      title='数据字典管理'
      subtitle='字典类型管理、字典项维护'
      maxWidth='xl'
      headerProps={{
        backButton: {
          onClick: () => navigate(ERP_PATHS.dashboard),
        },
        actions: [
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: loadDictTypes,
            variant: 'outlined',
          },
          {
            label: '新增字典',
            icon: <Plus size={16} />,
            onClick: () => {
              resetTypeForm();
              setShowTypeModal(true);
            },
            variant: 'contained',
          },
        ],
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' },
          gap: 3,
        }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 1,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <List
              size={18}
              style={{ opacity: 0.6 }}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              字典类型
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Chip
              label={dictTypes.length}
              size='small'
              color='primary'
              variant='outlined'
            />
          </Box>

          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              size='small'
              fullWidth
              placeholder='搜索字典...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search
                        size={16}
                        style={{ opacity: 0.5 }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl
              size='small'
              fullWidth
              sx={{ mt: 1.5 }}
            >
              <InputLabel>状态筛选</InputLabel>
              <Select
                value={statusFilter}
                label='状态筛选'
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value=''>全部状态</MenuItem>
                <MenuItem value='active'>启用</MenuItem>
                <MenuItem value='inactive'>禁用</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
              {filteredDictTypes.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Book
                    sx={{ width: 36, height: 36, color: 'text.disabled', mx: 'auto', mb: 1.5 }}
                  />
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    暂无字典类型
                  </Typography>
                </Box>
              ) : (
                filteredDictTypes.map((dict) => (
                  <Box
                    key={dict.id}
                    onClick={() => setSelectedDict(dict)}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: selectedDict?.id === dict.id ? 'primary.50' : 'transparent',
                      '&:hover': {
                        bgcolor: selectedDict?.id === dict.id ? 'primary.100' : 'grey.50',
                      },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 0.5,
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                        {dict.name}
                      </Typography>
                      <StatusBadge
                        status={dict.status}
                        label={dict.status === 'active' ? '启用' : '禁用'}
                        color={dict.status === 'active' ? 'success' : 'default'}
                      />
                    </Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary', fontFamily: 'monospace' }}
                    >
                      {dict.code}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.disabled' }}
                    >
                      {categoryLabels[dict.category] || dict.category}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography
                        variant='caption'
                        sx={{ color: 'text.disabled' }}
                      >
                        {dict.description || '-'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title='编辑'>
                          <IconButton
                            size='small'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditType(dict);
                            }}
                          >
                            <Edit size={14} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='删除'>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteType(dict.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 1,
            overflow: 'hidden',
          }}
        >
          {selectedDict ? (
            <>
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {selectedDict.name}
                    <Chip
                      label={selectedDict.code}
                      size='small'
                      sx={{ ml: 1, height: 20 }}
                      variant='outlined'
                    />
                  </Typography>
                  {selectedDict.description && (
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary', mt: 0.5 }}
                    >
                      {selectedDict.description}
                    </Typography>
                  )}
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.disabled', mt: 0.5, display: 'block' }}
                  >
                    分类: {categoryLabels[selectedDict.category] || selectedDict.category}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedDict.status === 'active'}
                        onChange={() => handleToggleTypeStatus(selectedDict)}
                        size='small'
                      />
                    }
                    label={
                      <Typography variant='body2'>
                        {selectedDict.status === 'active' ? '启用' : '禁用'}
                      </Typography>
                    }
                  />
                  <Button
                    size='small'
                    startIcon={<Plus size={16} />}
                    variant='contained'
                    onClick={() => {
                      resetItemForm();
                      setShowItemModal(true);
                    }}
                  >
                    新增字典项
                  </Button>
                </Box>
              </Box>

              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <TextField
                  size='small'
                  placeholder='搜索字典项...'
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position='start'>
                          <Search
                            size={16}
                            style={{ opacity: 0.5 }}
                          />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ width: 300 }}
                />
              </Box>

              {itemLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 'bold', width: 80 }}>排序</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>项目编码</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>项目名称</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>项目值</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>状态</TableCell>
                        <TableCell
                          align='center'
                          sx={{ fontWeight: 'bold', width: 160 }}
                        >
                          操作
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredDictItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            sx={{ py: 8, textAlign: 'center' }}
                          >
                            <List
                              sx={{
                                width: 40,
                                height: 40,
                                color: 'text.disabled',
                                mx: 'auto',
                                mb: 2,
                              }}
                            />
                            <Typography
                              variant='body1'
                              sx={{ color: 'text.secondary' }}
                            >
                              暂无字典项
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDictItems.map((item) => (
                          <TableRow
                            key={item.id}
                            hover
                          >
                            <TableCell>{item.sort_order}</TableCell>
                            <TableCell>
                              <Typography sx={{ fontFamily: 'monospace' }}>
                                {item.code}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {item.parent_id && (
                                  <Box
                                    component='span'
                                    sx={{ color: 'text.disabled', mr: 0.5 }}
                                  >
                                    └─
                                  </Box>
                                )}
                                {item.name}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.value || '-'}
                                size='small'
                                variant='outlined'
                              />
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                status={item.status}
                                label={item.status === 'active' ? '启用' : '禁用'}
                                color={item.status === 'active' ? 'success' : 'default'}
                              />
                            </TableCell>
                            <TableCell align='center'>
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                <Tooltip title='编辑'>
                                  <IconButton
                                    size='small'
                                    color='primary'
                                    onClick={() => handleEditItem(item)}
                                  >
                                    <Edit size={16} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={item.status === 'active' ? '禁用' : '启用'}>
                                  <IconButton
                                    size='small'
                                    color={item.status === 'active' ? 'warning' : 'success'}
                                    onClick={() => handleToggleItemStatus(item)}
                                  >
                                    {item.status === 'active' ? (
                                      <X size={16} />
                                    ) : (
                                      <Check size={16} />
                                    )}
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title='删除'>
                                  <IconButton
                                    size='small'
                                    color='error'
                                    onClick={() => handleDeleteItem(item.id)}
                                  >
                                    <Trash2 size={16} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          ) : (
            <Box sx={{ py: 12, textAlign: 'center' }}>
              <Settings sx={{ width: 48, height: 48, color: 'text.disabled', mx: 'auto', mb: 2 }} />
              <Typography
                variant='body1'
                sx={{ color: 'text.secondary' }}
              >
                请从左侧选择一个字典类型
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Dialog
        open={showTypeModal}
        onClose={() => {
          setShowTypeModal(false);
          resetTypeForm();
        }}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Plus size={20} />
            {editingType ? '编辑字典类型' : '新增字典类型'}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              size='small'
              label='字典编码 *'
              value={newType.code || ''}
              onChange={(e) => setNewType((prev) => ({ ...prev, code: e.target.value }))}
              placeholder='如: voucher_type'
              disabled={!!editingType}
            />
            <TextField
              size='small'
              label='字典名称 *'
              value={newType.name || ''}
              onChange={(e) => setNewType((prev) => ({ ...prev, name: e.target.value }))}
              placeholder='如: 凭证类型'
            />
            <FormControl
              size='small'
              fullWidth
            >
              <InputLabel>分类</InputLabel>
              <Select
                value={newType.category || 'business'}
                label='分类'
                onChange={(e) => setNewType((prev) => ({ ...prev, category: e.target.value }))}
              >
                <MenuItem value='system'>系统字典</MenuItem>
                <MenuItem value='iam'>IAM字典</MenuItem>
                <MenuItem value='workflow'>审批字典</MenuItem>
                <MenuItem value='hrm'>HRM字典</MenuItem>
                <MenuItem value='crm'>CRM字典</MenuItem>
                <MenuItem value='erp'>ERP字典</MenuItem>
                <MenuItem value='wms'>WMS字典</MenuItem>
                <MenuItem value='mes'>MES字典</MenuItem>
                <MenuItem value='common'>通用字典</MenuItem>
                <MenuItem value='notification'>通知字典</MenuItem>
                <MenuItem value='audit'>审计字典</MenuItem>
                <MenuItem value='business'>业务字典</MenuItem>
                <MenuItem value='basic'>基础数据</MenuItem>
                <MenuItem value='custom'>自定义字典</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size='small'
              label='描述'
              multiline
              rows={2}
              value={newType.description || ''}
              onChange={(e) => setNewType((prev) => ({ ...prev, description: e.target.value }))}
              placeholder='字典类型描述'
            />
            <FormControlLabel
              control={
                <Switch
                  checked={(newType.status || 'active') === 'active'}
                  onChange={(e) =>
                    setNewType((prev) => ({
                      ...prev,
                      status: e.target.checked ? 'active' : 'inactive',
                    }))
                  }
                />
              }
              label={(newType.status || 'active') === 'active' ? '启用' : '禁用'}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setShowTypeModal(false);
              resetTypeForm();
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={editingType ? handleUpdateType : handleCreateType}
          >
            {editingType ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showItemModal}
        onClose={() => {
          setShowItemModal(false);
          resetItemForm();
        }}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Plus size={20} />
            {editingItem ? '编辑字典项' : '新增字典项'}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                size='small'
                label='项目编码 *'
                value={newItem.code || ''}
                onChange={(e) => setNewItem((prev) => ({ ...prev, code: e.target.value }))}
                placeholder='项目编码'
                disabled={!!editingItem}
              />
              <TextField
                size='small'
                label='项目名称 *'
                value={newItem.name || ''}
                onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
                placeholder='项目名称'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                size='small'
                label='项目值'
                value={newItem.value || ''}
                onChange={(e) => setNewItem((prev) => ({ ...prev, value: e.target.value }))}
                placeholder='项目值'
              />
              <TextField
                size='small'
                label='排序'
                type='number'
                value={newItem.sort_order || 0}
                onChange={(e) =>
                  setNewItem((prev) => ({
                    ...prev,
                    sort_order: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </Box>
            <FormControl
              size='small'
              fullWidth
            >
              <InputLabel>上级字典项</InputLabel>
              <Select
                value={newItem.parent_id || ''}
                label='上级字典项'
                onChange={(e) => {
                  const parentId = e.target.value || undefined;
                  setNewItem((prev) => ({ ...prev, parent_id: parentId }));
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
            <FormControlLabel
              control={
                <Switch
                  checked={(newItem.status || 'active') === 'active'}
                  onChange={(e) =>
                    setNewItem((prev) => ({
                      ...prev,
                      status: e.target.checked ? 'active' : 'inactive',
                    }))
                  }
                />
              }
              label={(newItem.status || 'active') === 'active' ? '启用' : '禁用'}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setShowItemModal(false);
              resetItemForm();
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={editingItem ? handleUpdateItem : handleCreateItem}
          >
            {editingItem ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={deleteTypeDialogOpen}
        onClose={() => {
          setDeleteTypeDialogOpen(false);
          setDeletingTypeId(null);
        }}
        onConfirm={confirmDeleteType}
        title='确认删除'
        message='确定要删除该字典类型吗？删除后所有关联的字典项也将被删除，此操作不可撤销。'
        danger
      />

      <ConfirmDialog
        isOpen={deleteItemDialogOpen}
        onClose={() => {
          setDeleteItemDialogOpen(false);
          setDeletingItemId(null);
        }}
        onConfirm={confirmDeleteItem}
        title='确认删除'
        message='确定要删除该字典项吗？此操作不可撤销。'
        danger
      />
    </PageContainer>
  );
};

export default DictManagementPage;
