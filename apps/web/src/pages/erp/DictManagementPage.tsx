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
import i18n from '@/i18n';
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
import { QUERY_KEYS } from '@/lib/reactQuery';

const categoryLabels: Record<string, string> = {
  system: i18n.t('erp.dict_management_page.k0'),
  iam: i18n.t('pages.dict_management_page.iam_0'),
  workflow: i18n.t('erp.dict_management_page.k1'),
  hrm: i18n.t('pages.dict_management_page.hrm_1'),
  crm: i18n.t('pages.dict_management_page.crm_2'),
  erp: i18n.t('pages.dict_management_page.erp_3'),
  wms: i18n.t('pages.dict_management_page.wms_4'),
  mes: i18n.t('pages.dict_management_page.mes_5'),
  common: i18n.t('erp.dict_management_page.k2'),
  notification: i18n.t('erp.dict_management_page.k3'),
  audit: i18n.t('erp.dict_management_page.k4'),
  business: i18n.t('erp.dict_management_page.k5'),
  basic: i18n.t('erp.dict_management_page.k6'),
  custom: i18n.t('erp.dict_management_page.k7'),
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
    queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_BASE,
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
      addNotification({
        title: i18n.t('erp.dict_management_page.k9'),
        message: i18n.t('erp.dict_management_page.k8'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_BASE,
        exact: false,
        refetchType: 'active',
      });
      setTypeDialogOpen(false);
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('erp.dict_management_page.k10'),
        message: extractErrorMessage(err, i18n.t('erp.dict_management_page.k11')),
        type: 'error',
      });
    },
  });
  const updateTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DictType> }) =>
      dictTypeApi.update(id, data),
    onSuccess: () => {
      addNotification({
        title: i18n.t('erp.dict_management_page.k13'),
        message: i18n.t('erp.dict_management_page.k12'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_BASE,
        exact: false,
        refetchType: 'active',
      });
      setTypeDialogOpen(false);
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('erp.dict_management_page.k14'),
        message: extractErrorMessage(err, i18n.t('erp.dict_management_page.k15')),
        type: 'error',
      });
    },
  });
  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) => dictTypeApi.delete(id),
    onSuccess: (_, id) => {
      addNotification({
        title: i18n.t('erp.dict_management_page.k17'),
        message: i18n.t('erp.dict_management_page.k16'),
        type: 'success',
      });
      if (selectedTypeId === id) {
        setSelectedTypeId(null);
      }
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('erp.dict_management_page.k18'),
        message: extractErrorMessage(err, i18n.t('erp.dict_management_page.k19')),
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
      addNotification({
        title: i18n.t('erp.dict_management_page.k21'),
        message: i18n.t('erp.dict_management_page.k20'),
        type: 'warning',
      });
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
      title: i18n.t('erp.dict_management_page.k22'),
      message: `${i18n.t('pages.dict_management_page.k6')}${type.name}${i18n.t('pages.dict_management_page.k7')}`,
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
        if (!selectedTypeId) throw new Error(i18n.t('erp.dict_management_page.k23'));
        const res = await dictItemApi.create({
          ...data,
          dict_type_id: selectedTypeId,
        });
        if (!res.success) throw new Error(res.message || i18n.t('erp.dict_management_page.k24'));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_BASE,
          exact: false,
          refetchType: 'active',
        });
        return res.data as DictItem;
      },
      update: async (id, data) => {
        const res = await dictItemApi.update(id, data);
        if (!res.success) throw new Error(res.message || i18n.t('erp.dict_management_page.k25'));
        return res.data as DictItem;
      },
      delete: async (id) => {
        const res = await dictItemApi.delete(id);
        if (!res.success) throw new Error(res.message || i18n.t('erp.dict_management_page.k26'));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_BASE,
          exact: false,
          refetchType: 'active',
        });
      },
    }),
    [selectedTypeId, queryClient]
  );
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.SYSTEM_DICT_TYPES_BASE,
      exact: false,
      refetchType: 'active',
    });
  }, [queryClient]);
  const saving = createTypeMutation.isPending || updateTypeMutation.isPending;
  return (
    <PageContainer
      title={i18n.t('erp.dict_management_page.k27')}
      subtitle={i18n.t('erp.dict_management_page.k28')}
      headerActions={
        <Button
          variant='outlined'
          size='small'
          startIcon={typesLoading ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
          onClick={handleRefresh}
          disabled={typesLoading}
        >
          {i18n.t('pages.dict_management_page.k0')}
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
              sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}
            >
              <Book size={18} />
              {i18n.t('pages.dict_management_page.k1')}
            </Typography>
            <IconButton
              size='small'
              color='primary'
              onClick={handleCreateType}
              aria-label={i18n.t('erp.dict_management_page.k29')}
              title={i18n.t('erp.dict_management_page.k30')}
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
              {i18n.t('pages.dict_management_page.k2')}
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
                      sx={{ fontWeight: 500 }}
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
                    <Tooltip title={i18n.t('erp.dict_management_page.k31')}>
                      <IconButton
                        size='small'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditType(type);
                        }}
                        aria-label={i18n.t('erp.dict_management_page.k32')}
                      >
                        <Edit size={14} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={i18n.t('erp.dict_management_page.k33')}>
                      <IconButton
                        size='small'
                        color='error'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteType(type);
                        }}
                        aria-label={i18n.t('erp.dict_management_page.k34')}
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
              breadcrumbs={[
                { label: i18n.t('erp.dict_management_page.k35') },
                { label: selectedType.name },
              ]}
              headerContent={
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {selectedType.description ||
                      `${i18n.t('pages.dict_management_page.k8')}${selectedType.name}${i18n.t('pages.dict_management_page.k9')}`}
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
                  {i18n.t('pages.dict_management_page.k3')}
                </Typography>
                <Button
                  variant='outlined'
                  size='small'
                  startIcon={<Plus size={16} />}
                  onClick={handleCreateType}
                  sx={{ mt: 2 }}
                >
                  {i18n.t('pages.dict_management_page.k4')}
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
        <DialogTitle>
          {editingType
            ? i18n.t('erp.dict_management_page.k37')
            : i18n.t('erp.dict_management_page.k36')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={i18n.t('erp.dict_management_page.k38')}
              value={typeForm.code || ''}
              onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
              disabled={!!editingType}
              helperText={
                editingType
                  ? i18n.t('erp.dict_management_page.k40')
                  : i18n.t('erp.dict_management_page.k39')
              }
              size='small'
            />
            <TextField
              label={i18n.t('erp.dict_management_page.k41')}
              value={typeForm.name || ''}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              size='small'
            />
            <FormControl size='small'>
              <InputLabel>{i18n.t('erp.dict_management_page.k42')}</InputLabel>
              <Select
                value={typeForm.category || 'business'}
                label={i18n.t('erp.dict_management_page.k43')}
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
              label={i18n.t('erp.dict_management_page.k44')}
              value={typeForm.description || ''}
              onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
              multiline
              rows={2}
              size='small'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypeDialogOpen(false)}>
            {i18n.t('erp.dict_management_page.k45')}
          </Button>
          <Button
            variant='contained'
            onClick={handleSaveType}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : i18n.t('erp.dict_management_page.k46')}
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
