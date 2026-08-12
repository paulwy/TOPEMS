import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  CircularProgress,
  Paper,
  Chip,
  useTheme,
} from '@mui/material';
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
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { BackButton, PageContainer } from '@/components/common';
import { dictTypeApi, dictItemApi, type DictType, type DictItem } from '@/api/system';
import { dictItemSchema, toggleDictItemStatus } from '@/schemas/admin';
import { useNotificationStore } from '../../store';
import { extractErrorMessage } from '@/utils/errors';
import { apiLogger } from '@/utils/logger';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { ConfirmDialog } from '@topems/shared-components';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';

interface DictionaryManagementPageProps {
  onNavigate?: (page: string) => void;
}

const categoryLabels: Record<string, string> = {
  system: '系统字典',
  business: '业务字典',
  basic: '基础数据',
  custom: '自定义字典',
};

const DictionaryManagementPage: React.FC<DictionaryManagementPageProps> = ({ onNavigate }) => {
  const theme = useTheme();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [selectedType, setSelectedType] = useState<DictType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<DictType | null>(null);
  const [newType, setNewType] = useState<Partial<DictType>>({
    code: '',
    name: '',
    category: 'business',
    description: '',
    status: 'active',
  });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const openConfirmDialog = useCallback(
    (config: { title: string; message: string; onConfirm: () => void; danger?: boolean }) => {
      setConfirmDialogConfig(config);
      setConfirmDialogOpen(true);
    },
    []
  );

  const dictTypesQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_LIST_BASE,
    queryFn: async () => {
      const res = await dictTypeApi.list();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      throw new Error(res.message || '加载字典类型失败');
    },
  
      staleTime: CACHE_DURATIONS.LONG,});

  const dictTypes = dictTypesQuery.data || [];
  const typesLoading = dictTypesQuery.isLoading;

  React.useEffect(() => {
    if (!selectedType && dictTypes.length > 0) {
      setSelectedType(dictTypes[0]);
    }
  }, [dictTypes, selectedType]);

  const createTypeMutation = useMutation({
    mutationFn: async (data: Partial<DictType>) => {
      const res = await dictTypeApi.create(data);
      if (!res.success) throw new Error(res.message || '创建失败');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_LIST_BASE ,
  exact: false,
  refetchType: 'active',
});
      addNotification({ title: '成功', message: '字典类型创建成功', type: 'success' });
      setShowTypeModal(false);
      setNewType({ code: '', name: '', category: 'business', description: '', status: 'active' });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_LIST_BASE ,
  exact: false,
  refetchType: 'active',
});
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_LIST_BASE ,
  exact: false,
  refetchType: 'active',
});
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.DICT_ITEM_LIST_BASE ,
  exact: false,
  refetchType: 'active',
});
      addNotification({ title: '成功', message: '状态切换成功', type: 'success' });
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

  const handleToggleStatus = useCallback(
    (row: Record<string, unknown>) => {
      const item = row as unknown as DictItem;
      toggleStatusMutation.mutate({ id: item.id, status: item.status });
    },
    [toggleStatusMutation]
  );

  const handleExport = useCallback(() => {
    if (!selectedType) return;
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.DICT_ITEM_LIST_BASE ,
  exact: false,
  refetchType: 'active',
});
    addNotification({ title: '成功', message: '字典项导出成功', type: 'success' });
    setShowExportModal(false);
  }, [selectedType, addNotification, queryClient]);

  const handleImport = useCallback(async () => {
    if (!importFile || !selectedType) return;
    try {
      const text = await importFile.text();
      const items = JSON.parse(text);
      if (!Array.isArray(items)) throw new Error('导入文件格式不正确');

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
        title: successCount === items.length ? '成功' : '部分成功',
        message:
          successCount === items.length
            ? `成功导入 ${successCount} 个字典项`
            : `成功导入 ${successCount} 条，失败 ${items.length - successCount} 条`,
        type: successCount === items.length ? 'success' : 'warning',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.DICT_ITEM_LIST_BASE ,
  exact: false,
  refetchType: 'active',
});
      setShowImportModal(false);
      setImportFile(null);
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '导入失败'),
        type: 'error',
      });
    }
  }, [importFile, selectedType, addNotification, queryClient]);

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
        throw new Error(res.message || '加载字典项失败');
      },
      create: async (data) => {
        if (!selectedType) throw new Error('请先选择字典类型');
        const res = await dictItemApi.create({ ...data, dict_type_id: selectedType.id });
        if (!res.success) throw new Error(res.message || '创建失败');
        return res.data as unknown as Record<string, unknown>;
      },
      update: async (id, data) => {
        const res = await dictItemApi.update(id, data);
        if (!res.success) throw new Error(res.message || '更新失败');
        return res.data as unknown as Record<string, unknown>;
      },
      delete: async (id) => {
        const res = await dictItemApi.delete(id);
        if (!res.success) throw new Error(res.message || '删除失败');
      },
    }),
    [selectedType]
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

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ width: 320, flexShrink: 0 }}>
            <Paper sx={{ p: 2 }}>
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
                          sx={{ mr: 1, display: 'flex', alignItems: 'center' }}
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

              {typesLoading ? (
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
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                label={type.status === 'active' ? '启用' : '禁用'}
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
            </Paper>
          </Box>

          <Box sx={{ flex: 1 }}>
            {selectedType ? (
              <CrudPage
                schema={dictItemSchema}
                apiAdapter={dictItemAdapter}
                breadcrumbs={[{ label: '字典管理' }, { label: selectedType.name }]}
                extraQueryParams={{ dict_type_id: selectedType.id }}
                customRowActions={[
                  {
                    label: '切换状态',
                    icon: <Edit size={16} />,
                    onClick: (row) => handleToggleStatus(row),
                  },
                ]}
                headerContent={
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      编码: {selectedType.code} | 分类:{' '}
                      {categoryLabels[selectedType.category] || selectedType.category}
                    </Typography>
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
                      删除类型
                    </Button>
                    <Button
                      variant='outlined'
                      size='small'
                      startIcon={<Download size={16} />}
                      onClick={() => setShowExportModal(true)}
                    >
                      导出
                    </Button>
                    <Button
                      variant='outlined'
                      size='small'
                      startIcon={<Upload size={16} />}
                      onClick={() => setShowImportModal(true)}
                    >
                      导入
                    </Button>
                  </Box>
                }
              />
            ) : (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
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
              </Paper>
            )}
          </Box>
        </Box>
      </Box>

      <Dialog
        open={showTypeModal}
        onClose={() => {
          setShowTypeModal(false);
          setEditingType(null);
        }}
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
                      setEditingType({ ...editingType, category: e.target.value });
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
                    setEditingType({ ...editingType, description: e.target.value });
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

      <Dialog
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>导入字典项</DialogTitle>
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
            onClick={() => {
              setShowImportModal(false);
              setImportFile(null);
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleImport}
            disabled={!importFile}
          >
            确认导入
          </Button>
        </DialogActions>
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
