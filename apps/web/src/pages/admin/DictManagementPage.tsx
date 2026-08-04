import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Plus, Edit, Trash2, ChevronRight, Save, X, RefreshCw } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { dictApi, type DictType, type DictItem } from '@/api/dict/dict';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';

const DictManagementPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [selectedType, setSelectedType] = useState<DictType | null>(null);

  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<DictType | null>(null);
  const [typeForm, setTypeForm] = useState({
    code: '',
    name: '',
    category: 'system',
    description: '',
  });

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DictItem | null>(null);
  const [itemForm, setItemForm] = useState({
    code: '',
    name: '',
    value: '',
    sort_order: 0,
    is_default: false,
  });
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const dictTypesQuery = useQuery({
    queryKey: ['admin-dict-types'],
    queryFn: async () => {
      const response = await dictApi.getTypes();
      if (response.success) {
        return response.data || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const dictTypes = dictTypesQuery.data || [];
  const loading = dictTypesQuery.isLoading;

  const dictItemsQuery = useQuery({
    queryKey: ['admin-dict-items', selectedType?.code],
    queryFn: async () => {
      if (!selectedType) return [];
      const response = await dictApi.getItems(selectedType.code);
      if (response.success) {
        return response.data || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!selectedType,
  });
  const dictItems = dictItemsQuery.data || [];

  const createTypeMutation = useMutation({
    mutationFn: (data: Parameters<typeof dictApi.createType>[0]) => dictApi.createType(data),
    onSuccess: () => {
      addNotification({
        title: '创建成功',
        message: '字典类型已创建',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-dict-types'] });
    },
    onError: (error: unknown) => {
      apiLogger.error('创建字典类型失败:', error);
      addNotification({
        title: '创建失败',
        message: (error as { message?: string }).message || '未知错误',
        type: 'error',
      });
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({
      code,
      data,
    }: {
      code: string;
      data: Parameters<typeof dictApi.updateType>[1];
    }) => dictApi.updateType(code, data),
    onSuccess: () => {
      addNotification({
        title: '更新成功',
        message: '字典类型已更新',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-dict-types'] });
    },
    onError: (error: unknown) => {
      apiLogger.error('更新字典类型失败:', error);
      addNotification({
        title: '更新失败',
        message: (error as { message?: string }).message || '未知错误',
        type: 'error',
      });
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (code: string) => dictApi.deleteType(code),
    onSuccess: () => {
      addNotification({
        title: '删除成功',
        message: '字典类型已删除',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-dict-types'] });
    },
    onError: (error: unknown) => {
      apiLogger.error('删除字典类型失败:', error);
      addNotification({
        title: '删除失败',
        message: (error as { message?: string }).message || '未知错误',
        type: 'error',
      });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: ({
      typeCode,
      data,
    }: {
      typeCode: string;
      data: Parameters<typeof dictApi.createItem>[1];
    }) => dictApi.createItem(typeCode, data),
    onSuccess: () => {
      addNotification({
        title: '创建成功',
        message: '字典项已创建',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-dict-items'] });
    },
    onError: (error: unknown) => {
      apiLogger.error('创建字典项失败:', error);
      addNotification({
        title: '创建失败',
        message: (error as { message?: string }).message || '未知错误',
        type: 'error',
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({
      typeCode,
      itemCode,
      data,
    }: {
      typeCode: string;
      itemCode: string;
      data: Parameters<typeof dictApi.updateItem>[2];
    }) => dictApi.updateItem(typeCode, itemCode, data),
    onSuccess: () => {
      addNotification({
        title: '更新成功',
        message: '字典项已更新',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-dict-items'] });
    },
    onError: (error: unknown) => {
      apiLogger.error('更新字典项失败:', error);
      addNotification({
        title: '更新失败',
        message: (error as { message?: string }).message || '未知错误',
        type: 'error',
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ typeCode, itemCode }: { typeCode: string; itemCode: string }) =>
      dictApi.deleteItem(typeCode, itemCode),
    onSuccess: () => {
      addNotification({
        title: '删除成功',
        message: '字典项已删除',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-dict-items'] });
    },
    onError: (error: unknown) => {
      apiLogger.error('删除字典项失败:', error);
      addNotification({
        title: '删除失败',
        message: (error as { message?: string }).message || '未知错误',
        type: 'error',
      });
    },
  });

  const handleSelectType = (type: DictType) => {
    setSelectedType(type);
  };

  const handleOpenTypeDialog = (type?: DictType) => {
    if (type) {
      setEditingType(type);
      setTypeForm({
        code: type.code,
        name: type.name,
        category: type.category,
        description: type.description || '',
      });
    } else {
      setEditingType(null);
      setTypeForm({
        code: '',
        name: '',
        category: 'system',
        description: '',
      });
    }
    setTypeDialogOpen(true);
  };

  const handleCloseTypeDialog = () => {
    setTypeDialogOpen(false);
    setEditingType(null);
  };

  const handleSaveType = async () => {
    if (editingType) {
      await updateTypeMutation.mutateAsync({ code: editingType.code, data: typeForm });
    } else {
      await createTypeMutation.mutateAsync(typeForm);
    }
    handleCloseTypeDialog();
  };

  const handleDeleteType = (code: string) => {
    openConfirmDialog({
      title: '确认删除',
      message: '确定要删除此字典类型吗？所有关联的字典项也将被删除。',
      danger: true,
      onConfirm: async () => {
        await deleteTypeMutation.mutateAsync(code);
        if (selectedType?.code === code) {
          setSelectedType(null);
        }
      },
    });
  };

  const handleOpenItemDialog = (item?: DictItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        code: item.code,
        name: item.name,
        value: item.value || '',
        sort_order: item.sort_order,
        is_default: item.is_default || false,
      });
    } else {
      setEditingItem(null);
      setItemForm({
        code: '',
        name: '',
        value: '',
        sort_order: dictItems.length,
        is_default: false,
      });
    }
    setItemDialogOpen(true);
  };

  const handleCloseItemDialog = () => {
    setItemDialogOpen(false);
    setEditingItem(null);
  };

  const handleSaveItem = async () => {
    if (!selectedType) return;

    if (editingItem) {
      await updateItemMutation.mutateAsync({
        typeCode: selectedType.code,
        itemCode: editingItem.code,
        data: itemForm,
      });
    } else {
      await createItemMutation.mutateAsync({
        typeCode: selectedType.code,
        data: itemForm,
      });
    }
    handleCloseItemDialog();
  };

  const handleDeleteItem = (itemCode: string) => {
    if (!selectedType) return;
    openConfirmDialog({
      title: '确认删除',
      message: '确定要删除此字典项吗？',
      danger: true,
      onConfirm: () => {
        deleteItemMutation.mutate({ typeCode: selectedType.code, itemCode });
      },
    });
  };

  const categories = useMemo(() => {
    const cats = new Set(dictTypes.map((t) => t.category));
    return Array.from(cats);
  }, [dictTypes]);

  return (
    <Box sx={{ display: 'flex', height: '100%', gap: 3 }}>
      <Box sx={{ width: 320, flexShrink: 0 }}>
        <Paper sx={{ height: '100%', p: 2 }}>
          <Stack
            direction='row'
            sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant='h6'>字典类型</Typography>
            <Stack
              direction='row'
              sx={{ gap: 1 }}
            >
              <Tooltip title='刷新'>
                <IconButton
                  size='small'
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-dict-types'] })}
                >
                  <RefreshCw size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title='新增'>
                <IconButton
                  size='small'
                  color='primary'
                  onClick={() => handleOpenTypeDialog()}
                >
                  <Plus size={18} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          <Box sx={{ maxHeight: 'calc(100% - 60px)', overflowY: 'auto' }}>
            {categories.map((category) => (
              <Box
                key={category}
                sx={{ mb: 2 }}
              >
                <Typography
                  variant='caption'
                  sx={{ fontWeight: 500, color: 'text.secondary' }}
                >
                  {category}
                </Typography>
                <Stack
                  spacing={1}
                  sx={{ mt: 1 }}
                >
                  {dictTypes
                    .filter((t) => t.category === category)
                    .map((type) => (
                      <Paper
                        key={type.code}
                        elevation={0}
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          borderLeft: selectedType?.code === type.code ? '3px solid' : 'none',
                          borderColor:
                            selectedType?.code === type.code ? 'primary.main' : 'transparent',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                        onClick={() => handleSelectType(type)}
                      >
                        <Stack
                          direction='row'
                          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <Box>
                            <Typography
                              variant='body1'
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
                          <Stack
                            direction='row'
                            sx={{ gap: 1 }}
                          >
                            <Tooltip title='编辑'>
                              <IconButton
                                size='small'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenTypeDialog(type);
                                }}
                              >
                                <Edit size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='删除'>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteType(type.code);
                                }}
                                disabled={deleteTypeMutation.isPending}
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                </Stack>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>

      <Box sx={{ flex: 1 }}>
        {selectedType ? (
          <Paper sx={{ height: '100%', p: 3 }}>
            <Stack
              direction='row'
              sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
            >
              <Box>
                <Typography variant='h5'>{selectedType.name}</Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {selectedType.code}
                  {selectedType.description && (
                    <span style={{ marginLeft: '8px' }}>- {selectedType.description}</span>
                  )}
                </Typography>
              </Box>
              <Button
                variant='contained'
                startIcon={<Plus size={18} />}
                onClick={() => handleOpenItemDialog()}
                disabled={createItemMutation.isPending}
              >
                新增字典项
              </Button>
            </Stack>

            <Stack spacing={2}>
              {dictItems.map((item) => (
                <Paper
                  key={item.code}
                  elevation={0}
                  sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  <Box sx={{ minWidth: 60 }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      排序
                    </Typography>
                    <Typography variant='body1'>{item.sort_order}</Typography>
                  </Box>
                  <Box sx={{ minWidth: 100 }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      编码
                    </Typography>
                    <Typography variant='body1'>{item.code}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      名称
                    </Typography>
                    <Typography variant='body1'>{item.name}</Typography>
                  </Box>
                  <Box sx={{ minWidth: 100 }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      值
                    </Typography>
                    <Typography variant='body1'>{item.value || '-'}</Typography>
                  </Box>
                  <Box sx={{ minWidth: 80 }}>
                    {item.is_default && (
                      <Chip
                        label='默认'
                        size='small'
                        color='primary'
                        variant='outlined'
                      />
                    )}
                  </Box>
                  <Stack
                    direction='row'
                    sx={{ gap: 1 }}
                  >
                    <Tooltip title='编辑'>
                      <IconButton
                        size='small'
                        onClick={() => handleOpenItemDialog(item)}
                      >
                        <Edit size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='删除'>
                      <IconButton
                        size='small'
                        color='error'
                        onClick={() => handleDeleteItem(item.code)}
                        disabled={deleteItemMutation.isPending}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Paper>
              ))}

              {dictItems.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                  <Typography variant='body1'>暂无字典项</Typography>
                  <Typography variant='caption'>点击上方按钮添加</Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        ) : (
          <Paper
            sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography
              variant='body1'
              color='text.secondary'
            >
              请选择一个字典类型查看详情
            </Typography>
          </Paper>
        )}
      </Box>

      <Dialog
        open={typeDialogOpen}
        onClose={handleCloseTypeDialog}
      >
        <DialogTitle>{editingType ? '编辑字典类型' : '新建字典类型'}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 2 }}
          >
            <TextField
              label='编码'
              value={typeForm.code}
              onChange={(e) => setTypeForm((prev) => ({ ...prev, code: e.target.value }))}
              disabled={!!editingType}
              fullWidth
              required
            />
            <TextField
              label='名称'
              value={typeForm.name}
              onChange={(e) => setTypeForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label='分类'
              value={typeForm.category}
              onChange={(e) => setTypeForm((prev) => ({ ...prev, category: e.target.value }))}
              fullWidth
            />
            <TextField
              label='描述'
              value={typeForm.description}
              onChange={(e) => setTypeForm((prev) => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTypeDialog}>取消</Button>
          <Button
            onClick={handleSaveType}
            variant='contained'
            disabled={editingType ? updateTypeMutation.isPending : createTypeMutation.isPending}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={itemDialogOpen}
        onClose={handleCloseItemDialog}
      >
        <DialogTitle>{editingItem ? '编辑字典项' : '新建字典项'}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 2 }}
          >
            <TextField
              label='编码'
              value={itemForm.code}
              onChange={(e) => setItemForm((prev) => ({ ...prev, code: e.target.value }))}
              disabled={!!editingItem}
              fullWidth
              required
            />
            <TextField
              label='名称'
              value={itemForm.name}
              onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label='值'
              value={itemForm.value}
              onChange={(e) => setItemForm((prev) => ({ ...prev, value: e.target.value }))}
              fullWidth
            />
            <TextField
              label='排序'
              type='number'
              value={itemForm.sort_order}
              onChange={(e) =>
                setItemForm((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))
              }
              fullWidth
            />
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                variant={itemForm.is_default ? 'contained' : 'outlined'}
                onClick={() => setItemForm((prev) => ({ ...prev, is_default: !prev.is_default }))}
              >
                {itemForm.is_default ? '设为默认' : '默认'}
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseItemDialog}>取消</Button>
          <Button
            onClick={handleSaveItem}
            variant='contained'
            disabled={editingItem ? updateItemMutation.isPending : createItemMutation.isPending}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={setConfirmDialogClosed}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogClosed();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </Box>
  );
};

export default DictManagementPage;
