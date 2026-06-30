/**
 * IAM 数据字典页面 - V4.0 标准化改造
 *
 * 改造要点：
 * 1. 使用 TreePageTemplate 按分类展示字典类型
 * 2. 左侧字典类型树形导航，右侧字典项列表
 * 3. PageContainer autoTitle + autoBreadcrumbs
 * 4. 使用 ConfirmDialog 替代原生 confirm()
 * 5. 支持导入导出功能
 *
 * @module pages/iam
 * @path /iam/dictionaries
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  Switch,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Book,
  Plus,
  Edit,
  Trash2,
  Tag,
  Download,
  Upload,
  FolderOpen,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import { dictTypeApi, dictItemApi, type DictType, type DictItem } from '@/api/system';
import { useAppStore } from '../../store';
import {
  TreePageTemplate,
  type TreeNode,
  type TreeAction,
  ListPageTemplate,
  type ColumnDef,
} from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';

/**
 * 分类标签映射
 */
const CATEGORY_LABELS: Record<string, string> = {
  system: '系统字典',
  business: '业务字典',
  basic: '基础数据',
  custom: '自定义字典',
};

/**
 * 分类颜色配置
 */
const CATEGORY_COLORS: Record<string, string> = {
  system: '#1976d2',
  business: '#2e7d32',
  basic: '#ed6c02',
  custom: '#7b1fa2',
};

/**
 * 状态标签映射
 */
const STATUS_LABELS: Record<string, string> = {
  active: '启用',
  inactive: '禁用',
};

export const IamDictionariesPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [dictTypes, setDictTypes] = useState<DictType[]>([]);
  const [selectedType, setSelectedType] = useState<DictType | null>(null);
  const [dictItems, setDictItems] = useState<DictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // 选中节点
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  // 弹窗状态
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingType, setEditingType] = useState<DictType | null>(null);
  const [editingItem, setEditingItem] = useState<DictItem | null>(null);

  // 确认对话框状态
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  // 导入导出弹窗
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // 表单状态
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
    status: 'active',
  });

  /**
   * 打开确认对话框
   */
  const openConfirmDialog = useCallback(
    (config: { title: string; message: string; onConfirm: () => void; danger?: boolean }) => {
      setConfirmDialogConfig(config);
      setConfirmDialogOpen(true);
    },
    []
  );

  /**
   * 加载字典类型
   */
  const loadDictTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dictTypeApi.list();
      if (res.success && res.data) {
        const items = res.data.items || [];
        setDictTypes(items);
        if (!selectedType && items.length > 0) {
          setSelectedType(items[0]);
        }
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err, '加载字典类型失败'));
      addNotification({
        title: '加载失败',
        message: extractErrorMessage(err, '加载字典类型失败'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification, selectedType]);

  /**
   * 加载字典项
   */
  const loadDictItems = useCallback(async (typeId: string) => {
    setItemsLoading(true);
    try {
      const res = await dictItemApi.list(typeId);
      if (res.success && res.data) {
        setDictItems(res.data.items || []);
      }
    } catch {
      setDictItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadDictTypes();
  }, [loadDictTypes]);

  // 选中类型变化时加载字典项
  useEffect(() => {
    if (selectedType) {
      loadDictItems(selectedType.id);
    }
  }, [selectedType, loadDictItems]);

  /**
   * 将字典类型转换为树结构
   */
  const treeData = useMemo((): TreeNode[] => {
    // 按分类分组
    const grouped = dictTypes.reduce((acc, type) => {
      const category = type.category || 'custom';
      if (!acc[category]) acc[category] = [];
      acc[category].push(type);
      return acc;
    }, {} as Record<string, DictType[]>);

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, types]) => {
        const color = CATEGORY_COLORS[category] || '#607D8B';
        return {
          id: `category-${category}`,
          name: CATEGORY_LABELS[category] || category,
          type: 'folder' as const,
          accentColor: color,
          icon: (
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${color}20`,
              }}
            >
              <FolderOpen sx={{ width: 16, height: 16, color }} />
            </Box>
          ),
          children: types.map((type) => ({
            id: type.id,
            name: type.name,
            type: 'item' as const,
            data: type,
            accentColor: color,
            icon: (
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: type.status === 'active' ? 'grey.100' : 'grey.50',
                  opacity: type.status === 'active' ? 1 : 0.5,
                }}
              >
                <Tag sx={{ width: 16, height: 16, color: 'grey.600' }} />
              </Box>
            ),
          })),
        };
      });
  }, [dictTypes]);

  /**
   * 筛选后的树数据
   */
  const filteredTreeData = useMemo((): TreeNode[] => {
    let result = treeData;

    // 按分类筛选
    if (categoryFilter !== 'all') {
      result = result.filter((node) => node.id === `category-${categoryFilter}`);
    }

    // 按搜索关键词筛选
    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase();
      result = result
        .map((node) => {
          const matchingChildren = node.children?.filter(
            (child) =>
              child.name.toLowerCase().includes(search) ||
              (child.data as DictType)?.code?.toLowerCase().includes(search) ||
              (child.data as DictType)?.description?.toLowerCase().includes(search)
          );
          if (matchingChildren && matchingChildren.length > 0) {
            return { ...node, children: matchingChildren };
          }
          if (node.name.toLowerCase().includes(search)) {
            return node;
          }
          return null;
        })
        .filter((n): n is TreeNode => n !== null);
    }

    return result;
  }, [treeData, searchQuery, categoryFilter]);

  /**
   * 树节点选择处理
   */
  const handleSelectNode = useCallback(
    (node: TreeNode | null) => {
      setSelectedNode(node);
      if (node && node.type === 'item' && node.data) {
        setSelectedType(node.data as DictType);
      }
    },
    []
  );

  /**
   * 行操作按钮
   */
  const rowActions = useMemo((): TreeAction[] => {
    if (!selectedNode || selectedNode.type === 'folder') {
      return [];
    }

    const dictType = selectedNode.data as DictType;

    return [
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: () => {
          setEditingType(dictType);
          setShowTypeModal(true);
        },
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: () => handleDeleteType(dictType.id),
        divider: true,
      },
    ];
  }, [selectedNode]);

  /**
   * 新增字典类型
   */
  const handleAddType = useCallback(() => {
    setEditingType(null);
    setNewType({
      code: '',
      name: '',
      category: 'business',
      description: '',
      status: 'active',
    });
    setShowTypeModal(true);
  }, []);

  /**
   * 创建字典类型
   */
  const handleCreateType = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const res = await dictTypeApi.create(newType);
        if (res.success) {
          addNotification({
            title: '成功',
            message: '字典类型创建成功',
            type: 'success',
          });
          setShowTypeModal(false);
          loadDictTypes();
        } else {
          addNotification({
            title: '失败',
            message: res.message || '创建失败',
            type: 'error',
          });
        }
      } catch (err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(err, '创建失败'),
          type: 'error',
        });
      }
    },
    [newType, addNotification, loadDictTypes]
  );

  /**
   * 更新字典类型
   */
  const handleUpdateType = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingType) return;
      try {
        const res = await dictTypeApi.update(editingType.id, editingType);
        if (res.success) {
          addNotification({
            title: '成功',
            message: '字典类型更新成功',
            type: 'success',
          });
          setShowTypeModal(false);
          setEditingType(null);
          loadDictTypes();
        } else {
          addNotification({
            title: '失败',
            message: res.message || '更新失败',
            type: 'error',
          });
        }
      } catch (err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(err, '更新失败'),
          type: 'error',
        });
      }
    },
    [editingType, addNotification, loadDictTypes]
  );

  /**
   * 删除字典类型
   */
  const handleDeleteType = useCallback(
    (id: string) => {
      const type = dictTypes.find((t) => t.id === id);
      openConfirmDialog({
        title: '确认删除',
        message: `确定要删除字典类型"${type?.name || ''}"吗？所有字典项也会被删除！`,
        danger: true,
        onConfirm: async () => {
          try {
            const res = await dictTypeApi.delete(id);
            if (res.success) {
              addNotification({
                title: '成功',
                message: '字典类型删除成功',
                type: 'success',
              });
              if (selectedType?.id === id) {
                setSelectedType(null);
                setSelectedNode(null);
              }
              loadDictTypes();
            }
          } catch (err: unknown) {
            addNotification({
              title: '失败',
              message: extractErrorMessage(err, '删除失败'),
              type: 'error',
            });
          }
        },
      });
    },
    [dictTypes, selectedType, addNotification, loadDictTypes, openConfirmDialog]
  );

  /**
   * 新增字典项
   */
  const handleAddItem = useCallback(() => {
    if (!selectedType) return;
    setEditingItem(null);
    setNewItem({
      code: '',
      name: '',
      value: '',
      sort_order: dictItems.length,
      status: 'active',
    });
    setShowItemModal(true);
  }, [selectedType, dictItems.length]);

  /**
   * 创建字典项
   */
  const handleCreateItem = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedType) return;
      try {
        const res = await dictItemApi.create({
          ...newItem,
          dict_type_id: selectedType.id,
        });
        if (res.success) {
          addNotification({
            title: '成功',
            message: '字典项创建成功',
            type: 'success',
          });
          setShowItemModal(false);
          loadDictItems(selectedType.id);
        }
      } catch (err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(err, '创建失败'),
          type: 'error',
        });
      }
    },
    [newItem, selectedType, addNotification, loadDictItems]
  );

  /**
   * 更新字典项
   */
  const handleUpdateItem = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingItem) return;
      try {
        const res = await dictItemApi.update(editingItem.id, editingItem);
        if (res.success) {
          addNotification({
            title: '成功',
            message: '字典项更新成功',
            type: 'success',
          });
          setShowItemModal(false);
          setEditingItem(null);
          if (selectedType) loadDictItems(selectedType.id);
        }
      } catch (err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(err, '更新失败'),
          type: 'error',
        });
      }
    },
    [editingItem, selectedType, addNotification, loadDictItems]
  );

  /**
   * 删除字典项
   */
  const handleDeleteItem = useCallback(
    (id: string) => {
      openConfirmDialog({
        title: '确认删除',
        message: '确定要删除这个字典项吗？',
        danger: true,
        onConfirm: async () => {
          try {
            const res = await dictItemApi.delete(id);
            if (res.success) {
              addNotification({
                title: '成功',
                message: '字典项删除成功',
                type: 'success',
              });
              if (selectedType) loadDictItems(selectedType.id);
            }
          } catch (err: unknown) {
            addNotification({
              title: '失败',
              message: extractErrorMessage(err, '删除失败'),
              type: 'error',
            });
          }
        },
      });
    },
    [selectedType, addNotification, loadDictItems, openConfirmDialog]
  );

  /**
   * 切换字典项状态
   */
  const handleToggleItemStatus = useCallback(
    async (item: DictItem) => {
      const newStatus = item.status === 'active' ? 'inactive' : 'active';
      try {
        const res = await dictItemApi.update(item.id, { ...item, status: newStatus });
        if (res.success) {
          addNotification({
            title: '成功',
            message: `字典项已${STATUS_LABELS[newStatus]}`,
            type: 'success',
          });
          if (selectedType) loadDictItems(selectedType.id);
        }
      } catch (err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(err, '状态切换失败'),
          type: 'error',
        });
      }
    },
    [selectedType, addNotification, loadDictItems]
  );

  /**
   * 导出字典项
   */
  const handleExport = useCallback(() => {
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
    a.download = `${selectedType.code}_items.json`;
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
  }, [selectedType, dictItems, addNotification]);

  /**
   * 导入字典项
   */
  const handleImport = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!importFile || !selectedType) return;

      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
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

            for (const item of items) {
              await dictItemApi.create({
                dict_type_id: selectedType.id,
                code: item.code,
                name: item.name,
                value: item.value,
                sort_order: item.sort_order || 0,
                status: item.status || 'active',
              });
            }

            addNotification({
              title: '成功',
              message: `成功导入 ${items.length} 个字典项`,
              type: 'success',
            });
            setShowImportModal(false);
            setImportFile(null);
            loadDictItems(selectedType.id);
          } catch (err: unknown) {
            addNotification({
              title: '失败',
              message: extractErrorMessage(err, '导入失败'),
              type: 'error',
            });
          }
        };
        reader.readAsText(importFile);
      } catch (err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(err, '导入失败'),
          type: 'error',
        });
      }
    },
    [importFile, selectedType, addNotification, loadDictItems]
  );

  // 字典项列定义
  const itemColumns: ColumnDef<DictItem>[] = useMemo(
    () => [
      {
        id: 'sort_order',
        label: '排序',
        width: 60,
        render: (item) => (
          <Typography variant='body2' color='text.secondary'>
            {item.sort_order}
          </Typography>
        ),
      },
      {
        id: 'code',
        label: '编码',
        render: (item) => (
          <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
            {item.code}
          </Typography>
        ),
      },
      {
        id: 'name',
        label: '名称',
        render: (item) => <Typography variant='body2'>{item.name}</Typography>,
      },
      {
        id: 'value',
        label: '值',
        render: (item) => (
          <Typography variant='body2' color='text.secondary'>
            {item.value || '-'}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
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
              {STATUS_LABELS[item.status]}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
            <Tooltip title='编辑'>
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
            </Tooltip>
            <Tooltip title='删除'>
              <IconButton
                size='small'
                color='error'
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteItem(item.id);
                }}
              >
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [handleToggleItemStatus, handleDeleteItem]
  );

  /**
   * 详情面板 - 字典项列表
   */
  const detailPanel = useCallback(
    (node: TreeNode | null) => {
      if (!node || node.type === 'folder' || !selectedType) {
        return (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Book size={48} style={{ color: 'text.disabled', margin: '0 auto 16px' }} />
            <Typography color='text.secondary'>选择一个字典类型查看字典项</Typography>
          </Box>
        );
      }

      const dictType = node.data as DictType;

      return (
        <Box>
          {/* 字典类型信息头部 */}
          <Box sx={{ mb: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant='h6' sx={{ fontWeight: 600, mb: 0.5 }}>
              {dictType.name}
            </Typography>
            <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
              <Chip
                size='small'
                label={CATEGORY_LABELS[dictType.category] || dictType.category}
                variant='outlined'
                sx={{
                  borderColor: CATEGORY_COLORS[dictType.category],
                  color: CATEGORY_COLORS[dictType.category],
                }}
              />
              <Typography variant='caption' color='text.secondary'>
                编码: {dictType.code}
              </Typography>
              {dictType.status === 'active' ? (
                <Chip
                  size='small'
                  icon={<CheckCircle size={12} />}
                  label='启用'
                  color='success'
                  variant='outlined'
                />
              ) : (
                <Chip
                  size='small'
                  icon={<XCircle size={12} />}
                  label='禁用'
                  color='default'
                  variant='outlined'
                />
              )}
            </Stack>
            {dictType.description && (
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                {dictType.description}
              </Typography>
            )}
          </Box>

          {/* 字典项列表 */}
          <ListPageTemplate
            title=''
            subtitle=''
            columns={itemColumns}
            data={dictItems}
            loading={itemsLoading}
            searchable
            searchPlaceholder='搜索字典项...'
            searchValue={searchQuery}
            onSearch={setSearchQuery}
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
                onClick: handleAddItem,
                variant: 'contained',
              },
            ]}
            onRefresh={() => loadDictItems(selectedType.id)}
            emptyMessage='暂无字典项'
          />
        </Box>
      );
    },
    [selectedType, dictItems, itemsLoading, itemColumns, searchQuery, handleAddItem, loadDictItems]
  );

  /**
   * 筛选选项
   */
  const filterOptions = useMemo(() => {
    const categories = Object.keys(CATEGORY_LABELS);
    return [
      { label: '全部分类', value: 'all' },
      ...categories.map((cat) => ({
        label: CATEGORY_LABELS[cat],
        value: cat,
      })),
    ];
  }, []);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Book size={20} />,
        backButton: {
          href: '/iam/dashboard',
        },
      }}
    >
      <TreePageTemplate
        title=''
        subtitle=''
        data={filteredTreeData}
        loading={loading}
        error={error}
        searchPlaceholder='搜索字典类型名称、编码...'
        filterOptions={filterOptions}
        filterValue={categoryFilter}
        onFilterChange={setCategoryFilter}
        onSearch={setSearchQuery}
        onSelect={handleSelectNode}
        selectedId={selectedNode?.id}
        detailPanel={detailPanel}
        detailPanelTitle={selectedNode?.type === 'item' ? '字典详情' : undefined}
        rowActions={rowActions}
        onAdd={handleAddType}
        addButtonText='新增字典类型'
        addButtonIcon={<Plus size={18} />}
        onRefresh={loadDictTypes}
        showFilter={true}
        showAddButton={true}
        showRefresh={true}
        emptyState={{
          emoji: '📚',
          title: '暂无字典类型',
          description: '点击"新增字典类型"按钮创建新的字典',
          actionLabel: '新增字典类型',
          onAction: handleAddType,
        }}
      />

      {/* 字典类型对话框 */}
      <Dialog
        open={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editingType ? '编辑字典类型' : '新增字典类型'}</DialogTitle>
        <Box component='form' onSubmit={editingType ? handleUpdateType : handleCreateType}>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
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
              <FormControl size='small' fullWidth>
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
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='body2'>状态</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant='body2' color='text.secondary'>
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
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant='outlined' onClick={() => { setShowTypeModal(false); setEditingType(null); }}>
              取消
            </Button>
            <Button type='submit' variant='contained'>
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
        <Box component='form' onSubmit={editingItem ? handleUpdateItem : handleCreateItem}>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
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
                value={editingItem?.sort_order ?? newItem.sort_order ?? 0}
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
              {editingItem && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant='body2'>状态</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant='body2' color='text.secondary'>
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
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant='outlined' onClick={() => { setShowItemModal(false); setEditingItem(null); }}>
              取消
            </Button>
            <Button type='submit' variant='contained'>
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
          <Typography variant='body2' color='text.secondary'>
            将当前字典类型的所有字典项导出为 JSON 文件。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' onClick={() => setShowExportModal(false)}>
            取消
          </Button>
          <Button variant='contained' onClick={handleExport}>
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
        <Box component='form' onSubmit={handleImport}>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Typography variant='body2' sx={{ mb: 1 }}>
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
            <Button variant='outlined' type='button' onClick={() => setShowImportModal(false)}>
              取消
            </Button>
            <Button type='submit' variant='contained' disabled={!importFile}>
              确认导入
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* 确认对话框 */}
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

export default IamDictionariesPage;
