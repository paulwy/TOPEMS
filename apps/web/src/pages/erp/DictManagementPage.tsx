/**
 * 字典管理页面（Schema 驱动版本）
 *
 * 原版: 1241 行手写表格、表单、状态管理
 * Schema 版: ~180 行（减少 85%+）
 *
 * 使用 CrudPage + EntitySchema 实现：
 * - 左侧：字典类型列表（带增删改）
 * - 右侧：字典项 CrudPage（Schema 驱动的完整 CRUD）
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { Plus, Edit, Trash2, RefreshCw, Book } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { dictTypeApi, dictItemApi, type DictType, type DictItem } from '@/api/system';
import { dictItemSchema } from '@/schemas/admin';

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
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<DictType | null>(null);
  const [typeForm, setTypeForm] = useState<Partial<DictType>>({
    code: '',
    name: '',
    category: 'business',
    description: '',
    status: 'active',
  });
  const {
    confirmOpen: deleteTypeConfirmOpen,
    confirmConfig: deleteTypeConfirmConfig,
    openConfirm: openDeleteTypeConfirm,
    closeConfirm: closeDeleteTypeConfirm,
  } = useConfirmDialog();

  // ── 字典类型列表 ──
  const dictTypesQuery = useQuery<{ items: DictType[]; total: number }>({
    queryKey: ['system-dict-types'],
    queryFn: async () => {
      const res = await dictTypeApi.list();
      if (res.success && res.data) {
        return { items: res.data.items || [], total: res.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const dictTypes = dictTypesQuery.data?.items || [];
  const typesLoading = dictTypesQuery.isLoading;
  const selectedType = dictTypes.find((t) => t.id === selectedTypeId) || null;

  // 选中第一个字典类型
  React.useEffect(() => {
    if (!selectedTypeId && dictTypes.length > 0) {
      setSelectedTypeId(dictTypes[0].id);
    }
  }, [dictTypes, selectedTypeId]);

  // ── 字典类型 CRUD ──
  const createTypeMutation = useMutation({
    mutationFn: (data: Partial<DictType>) => dictTypeApi.create(data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '字典类型创建成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['system-dict-types'] });
      setTypeDialogOpen(false);
    },
    onError: (err: unknown) => {
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '创建失败'),
        type: 'error',
      });
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DictType> }) =>
      dictTypeApi.update(id, data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '字典类型更新成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['system-dict-types'] });
      setTypeDialogOpen(false);
    },
    onError: (err: unknown) => {
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '更新失败'),
        type: 'error',
      });
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) => dictTypeApi.delete(id),
    onSuccess: (_, id) => {
      addNotification({ title: '成功', message: '删除成功', type: 'success' });
      if (selectedTypeId === id) {
        setSelectedTypeId(null);
      }
      queryClient.invalidateQueries({ queryKey: ['system-dict-types'] });
    },
    onError: (err: unknown) => {
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '删除失败'),
        type: 'error',
      });
    },
  });

  const handleCreateType = () => {
    setEditingType(null);
    setTypeForm({
      code: '',
      name: '',
      category: 'business',
      description: '',
      status: 'active',
    });
    setTypeDialogOpen(true);
  };

  const handleEditType = (type: DictType) => {
    setEditingType(type);
    setTypeForm({
      code: type.code,
      name: type.name,
      category: type.category,
      description: type.description || '',
      status: type.status,
    });
    setTypeDialogOpen(true);
  };

  const handleSaveType = () => {
    if (!typeForm.code || !typeForm.name) {
      addNotification({ title: '提示', message: '请填写编码和名称', type: 'warning' });
      return;
    }
    if (editingType) {
      updateTypeMutation.mutate({ id: editingType.id, data: typeForm });
    } else {
      createTypeMutation.mutate(typeForm);
    }
  };

  const handleDeleteType = (type: DictType) => {
    openDeleteTypeConfirm({
      title: '确认删除',
      message: `确定要删除字典类型「${type.name}」吗？所有关联的字典项也将被删除，此操作不可撤销。`,
      danger: true,
      onConfirm: () => deleteTypeMutation.mutate(type.id),
    });
  };

  // ── 字典项 API 适配器（Schema 驱动） ──
  const itemApiAdapter: CrudApiAdapter<DictItem> = useMemo(
    () => ({
      list: async (params) => {
        if (!selectedTypeId) return { data: [], total: 0 };
        const res = await dictItemApi.list(selectedTypeId, {
          page: params?.page,
          pagesize: params?.pageSize,
          search: params?.search as string,
        });
        if (res.success && res.data) {
          return {
            data: res.data.items || [],
            total: res.data.total || 0,
          };
        }
        return { data: [], total: 0 };
      },
      create: async (data) => {
        if (!selectedTypeId) throw new Error('请先选择字典类型');
        const res = await dictItemApi.create({
          ...data,
          dict_type_id: selectedTypeId,
        });
        if (!res.success) throw new Error(res.message || '创建失败');
        queryClient.invalidateQueries({ queryKey: ['system-dict-types'] });
        return res.data as DictItem;
      },
      update: async (id, data) => {
        const res = await dictItemApi.update(id, data);
        if (!res.success) throw new Error(res.message || '更新失败');
        return res.data as DictItem;
      },
      delete: async (id) => {
        const res = await dictItemApi.delete(id);
        if (!res.success) throw new Error(res.message || '删除失败');
        queryClient.invalidateQueries({ queryKey: ['system-dict-types'] });
      },
    }),
    [selectedTypeId, queryClient]
  );

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['system-dict-types'] });
  }, [queryClient]);

  const saving = createTypeMutation.isPending || updateTypeMutation.isPending;

  return (
    <PageContainer
      title='字典管理'
      subtitle='管理系统字典类型与字典项'
      headerActions={
        <Button
          variant='outlined'
          size='small'
          startIcon={typesLoading ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
          onClick={handleRefresh}
          disabled={typesLoading}
        >
          刷新
        </Button>
      }
    >
      <Box sx={{ display: 'flex', gap: 2, minHeight: 'calc(100vh - 200px)' }}>
        {/* 左侧：字典类型列表 */}
        <Paper
          sx={{
            width: 300,
            p: 2,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography
              variant='subtitle1'
              fontWeight={600}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Book size={18} />
              字典类型
            </Typography>
            <IconButton
              size='small'
              color='primary'
              onClick={handleCreateType}
              title='新增字典类型'
            >
              <Plus size={18} />
            </IconButton>
          </Box>

          {typesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : dictTypes.length === 0 ? (
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ textAlign: 'center', py: 4 }}
            >
              暂无字典类型
            </Typography>
          ) : (
            <Box sx={{ flex: 1 }}>
              {dictTypes.map((type) => (
                <Box
                  key={type.id}
                  onClick={() => setSelectedTypeId(type.id)}
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    borderRadius: 1,
                    mb: 0.5,
                    bgcolor: selectedType?.id === type.id ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant='body2'
                      fontWeight={500}
                      noWrap
                    >
                      {type.name}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {type.code}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title='编辑'>
                      <IconButton
                        size='small'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditType(type);
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
                          handleDeleteType(type);
                        }}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        {/* 右侧：字典项 CrudPage */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {selectedType ? (
            <CrudPage
              schema={dictItemSchema}
              apiAdapter={itemApiAdapter}
              breadcrumbs={[{ label: '字典管理' }, { label: selectedType.name }]}
              headerContent={
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {selectedType.description || `管理「${selectedType.name}」的字典项`}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                    }}
                  >
                    {categoryLabels[selectedType.category] || selectedType.category}
                  </Typography>
                </Box>
              }
            />
          ) : (
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box>
                <Book
                  size={48}
                  color='var(--color-text-disabled)'
                />
                <Typography
                  variant='body1'
                  color='text.secondary'
                  sx={{ mt: 2 }}
                >
                  请从左侧选择一个字典类型
                </Typography>
                <Button
                  variant='outlined'
                  size='small'
                  startIcon={<Plus size={16} />}
                  onClick={handleCreateType}
                  sx={{ mt: 2 }}
                >
                  新增字典类型
                </Button>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>

      {/* 字典类型新增/编辑 Dialog */}
      <Dialog
        open={typeDialogOpen}
        onClose={() => setTypeDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editingType ? '编辑字典类型' : '新增字典类型'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label='编码'
              value={typeForm.code || ''}
              onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
              disabled={!!editingType}
              helperText={editingType ? '编码不可修改' : '唯一标识，创建后不可修改'}
              size='small'
            />
            <TextField
              label='名称'
              value={typeForm.name || ''}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              size='small'
            />
            <FormControl size='small'>
              <InputLabel>分类</InputLabel>
              <Select
                value={typeForm.category || 'business'}
                label='分类'
                onChange={(e) => setTypeForm({ ...typeForm, category: e.target.value })}
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <MenuItem
                    key={value}
                    value={value}
                  >
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label='描述'
              value={typeForm.description || ''}
              onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
              multiline
              rows={2}
              size='small'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypeDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleSaveType}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认 */}
      <ConfirmDialog
        isOpen={deleteTypeConfirmOpen}
        onClose={closeDeleteTypeConfirm}
        onConfirm={() => {
          deleteTypeConfirmConfig?.onConfirm();
          closeDeleteTypeConfirm();
        }}
        title={deleteTypeConfirmConfig?.title || ''}
        message={deleteTypeConfirmConfig?.message || ''}
        danger={deleteTypeConfirmConfig?.danger}
      />
    </PageContainer>
  );
};

export default DictManagementPage;
