/**
 * TreeBuilder — 树形结构数据展示与编辑器
 *
 * 用于层级数据场景（组织架构、分类体系、BOM 等），支持：
 * - 树形展开/折叠
 * - 节点新增/编辑/删除
 * - 异步懒加载子节点
 * - 多选 / 复选框联动
 *
 * 与 CrudPage 集成时，在 schema.extensions.tree 中配置即可。
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
} from '@mui/material';
import i18n from '@/i18n';
import { TreeView, TreeItem } from '@mui/lab';
import {
  ChevronRight as ChevronRightIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  File as FileIcon,
  Plus as PlusIcon,
  Edit as EditIcon,
  Trash2 as TrashIcon,
  MoreVertical as MoreIcon,
} from 'lucide-react';
import type { TreeConfig } from '@/schema/schemaExtensions';
import type { SchemaField } from '@/schema/types';

// ============ 类型 ============

export interface TreeNode {
  id: string | number;
  label: string;
  children?: TreeNode[];
  data?: Record<string, unknown>;
  hasChildren?: boolean;
  [key: string]: unknown;
}

interface TreeBuilderProps {
  config: TreeConfig;
  data: TreeNode[];
  fields?: SchemaField[];
  value?: Record<string, unknown>;
  onChange?: (rows: TreeNode[]) => void;
  mode?: 'view' | 'edit';
  onNodeAdd?: (parentId: string | number | null, node: Record<string, unknown>) => Promise<void>;
  onNodeUpdate?: (id: string | number, data: Record<string, unknown>) => Promise<void>;
  onNodeDelete?: (id: string | number) => Promise<void>;
  loading?: boolean;
}

// ============ 辅助函数 ============

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children));
    }
  }
  return result;
}

function updateNodeInTree(
  nodes: TreeNode[],
  id: string | number,
  updater: (node: TreeNode) => TreeNode,
  keyField: string
): TreeNode[] {
  return nodes.map((node) => {
    if (node[keyField] === id) {
      return updater(node);
    }
    if (node.children) {
      return {
        ...node,
        children: updateNodeInTree(node.children, id, updater, keyField),
      };
    }
    return node;
  });
}

function deleteNodeFromTree(nodes: TreeNode[], id: string | number, keyField: string): TreeNode[] {
  return nodes
    .filter((node) => node[keyField] !== id)
    .map((node) => ({
      ...node,
      children: node.children ? deleteNodeFromTree(node.children, id, keyField) : undefined,
    }));
}

// ============ 自定义内容组件 ============

interface CustomContentProps {
  node: TreeNode;
  isExpanded: boolean;
  onEdit: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  onAddChild: (node: TreeNode) => void;
  mode: 'view' | 'edit';
  renderIcon?: (node: Record<string, unknown>) => React.ReactNode;
  renderLabel?: (node: Record<string, unknown>) => React.ReactNode;
  defaultIcon?: React.ReactNode;
}

const CustomContent: React.FC<CustomContentProps> = ({
  node,
  isExpanded,
  onEdit,
  onDelete,
  onAddChild,
  mode,
  renderIcon,
  renderLabel,
  defaultIcon,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => setAnchorEl(null);

  const hasChildren = (node.children && node.children.length > 0) || node.hasChildren;

  const iconNode = (() => {
    if (renderIcon) {
      const custom = renderIcon(node.data ?? node);
      if (custom !== null && custom !== undefined) return custom;
    }
    if (defaultIcon) return defaultIcon;
    return hasChildren ? (
      isExpanded ? (
        <FolderOpenIcon size={18} />
      ) : (
        <FolderIcon size={18} />
      )
    ) : (
      <FileIcon size={18} />
    );
  })();

  const labelNode = (() => {
    if (renderLabel) {
      const custom = renderLabel(node.data ?? node);
      if (custom !== null && custom !== undefined) return custom;
    }
    return node.label;
  })();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexGrow: 1,
        py: 0.5,
        pr: 1,
      }}
    >
      <Box sx={{ mr: 0.5, display: 'flex', alignItems: 'center' }}>{iconNode}</Box>

      <Typography
        variant='body2'
        sx={{ flexGrow: 1, fontWeight: hasChildren ? 500 : 400 }}
      >
        {labelNode}
      </Typography>

      {mode === 'edit' && (
        <>
          <IconButton
            size='small'
            onClick={handleMenuOpen}
            sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
            aria-label={i18n.t('templates.tree_builder.k0')}
          >
            <MoreIcon size={16} />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem
              onClick={() => {
                handleMenuClose();
                onAddChild(node);
              }}
            >
              <ListItemIcon>
                <PlusIcon size={16} />
              </ListItemIcon>
              <ListItemText>{i18n.t('templates.tree_builder.k1')}</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleMenuClose();
                onEdit(node);
              }}
            >
              <ListItemIcon>
                <EditIcon size={16} />
              </ListItemIcon>
              <ListItemText>{i18n.t('templates.tree_builder.k2')}</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleMenuClose();
                onDelete(node);
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon sx={{ color: 'error.main' }}>
                <TrashIcon size={16} />
              </ListItemIcon>
              <ListItemText>{i18n.t('templates.tree_builder.k3')}</ListItemText>
            </MenuItem>
          </Menu>
        </>
      )}
    </Box>
  );
};

// ============ 主组件 ============

export function TreeBuilder({
  config,
  data,
  fields = [],
  onChange,
  mode = 'view',
  onNodeAdd,
  onNodeUpdate,
  onNodeDelete,
  loading = false,
}: TreeBuilderProps) {
  const keyField = config.keyField || 'id';
  const labelField = config.labelField || 'label';

  const [internalData, setInternalData] = useState<TreeNode[]>(data);
  const [expandedKeys, setExpandedKeys] = useState<Array<string | number>>(
    config.defaultExpandedKeys ||
      (config.defaultExpandAll ? flattenTree(data).map((n) => n.id) : [])
  );
  const [selectedKey, setSelectedKey] = useState<string | number | null>(null);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    parentId: string | number | null;
    node?: TreeNode;
  }>({ open: false, mode: 'add', parentId: null });
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  React.useEffect(() => {
    setInternalData(data);
  }, [data]);

  const handleToggle = useCallback(
    (_event: React.SyntheticEvent, nodeId: string | number, isExpanded: boolean) => {
      setExpandedKeys((prev) => {
        if (isExpanded) {
          return [...prev, nodeId];
        }
        return prev.filter((key) => key !== nodeId);
      });
    },
    []
  );

  const handleSelect = useCallback((_event: React.SyntheticEvent, nodeId: string | number) => {
    setSelectedKey(nodeId);
  }, []);

  const openAddDialog = useCallback(
    (parentId: string | number | null) => {
      setEditDialog({ open: true, mode: 'add', parentId });
      setEditForm({ [labelField]: '' });
    },
    [labelField]
  );

  const openEditDialog = useCallback(
    (node: TreeNode) => {
      setEditDialog({ open: true, mode: 'edit', parentId: null, node });
      setEditForm({
        [labelField]: node.label,
        ...(node.data as Record<string, string> | undefined),
      });
    },
    [labelField]
  );

  const closeDialog = useCallback(() => {
    setEditDialog({ open: false, mode: 'add', parentId: null });
    setEditForm({});
  }, []);

  const handleSave = useCallback(async () => {
    if (!editForm[labelField]?.trim()) return;

    if (editDialog.mode === 'edit' && editDialog.node) {
      if (onNodeUpdate) {
        await onNodeUpdate(editDialog.node.id, editForm);
      }
      setInternalData((prev) =>
        updateNodeInTree(
          prev,
          editDialog.node!.id,
          (n) => ({
            ...n,
            label: editForm[labelField],
            data: { ...n.data, ...editForm },
          }),
          keyField
        )
      );
    } else {
      const newId = `new_${Date.now()}`;
      const newNode: TreeNode = {
        id: newId,
        label: editForm[labelField],
        data: editForm,
      };
      if (onNodeAdd) {
        await onNodeAdd(editDialog.parentId, editForm);
      }
      setInternalData((prev) => {
        if (editDialog.parentId === null) {
          return [...prev, newNode];
        }
        return updateNodeInTree(
          prev,
          editDialog.parentId!,
          (n) => ({
            ...n,
            children: [...(n.children || []), newNode],
          }),
          keyField
        );
      });
    }

    closeDialog();
  }, [editDialog, editForm, labelField, onNodeAdd, onNodeUpdate, closeDialog, keyField]);

  const handleDelete = useCallback(
    async (node: TreeNode) => {
      if (
        !window.confirm(
          `${i18n.t('components.tree_builder.k0')}${node.label}${i18n.t('components.tree_builder.k1')}`
        )
      )
        return;
      if (onNodeDelete) {
        await onNodeDelete(node.id);
      }
      setInternalData((prev) => deleteNodeFromTree(prev, node.id, keyField));
      onChange?.(internalData);
    },
    [onNodeDelete, onChange, internalData, keyField]
  );

  const renderTreeItems = useCallback(
    (nodes: TreeNode[]): React.ReactNode => {
      return nodes.map((node) => {
        const hasChildren = (node.children && node.children.length > 0) || node.hasChildren;

        return (
          <TreeItem
            key={String(node.id)}
            nodeId={String(node.id)}
            ContentComponent={CustomContent}
            ContentProps={
              {
                node,
                isExpanded: expandedKeys.includes(node.id),
                onEdit: openEditDialog,
                onDelete: handleDelete,
                onAddChild: (n: TreeNode) => openAddDialog(n.id),
                mode,
                renderIcon: config.renderIcon,
                renderLabel: config.renderLabel,
              } as unknown as React.ComponentProps<typeof CustomContent>
            }
          >
            {hasChildren ? renderTreeItems(node.children || []) : null}
          </TreeItem>
        );
      });
    },
    [expandedKeys, mode, openEditDialog, handleDelete, openAddDialog, config]
  );

  const dialogFields = useMemo(() => {
    if (fields.length > 0) return fields;
    return [
      {
        name: labelField,
        label: i18n.t('templates.tree_builder.k4'),
        type: 'text' as const,
        required: true,
      },
    ];
  }, [fields, labelField]);

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {mode === 'edit' && (
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <Button
            size='small'
            startIcon={<PlusIcon size={16} />}
            onClick={() => openAddDialog(null)}
          >
            {i18n.t('components.tree_builder.k0')}
          </Button>
          <Chip
            label={`${i18n.t('components.tree_builder.k2')}${flattenTree(internalData).length}${i18n.t('components.tree_builder.k3')}`}
            size='small'
            variant='outlined'
          />
        </Box>
      )}

      <Box
        sx={{
          flexGrow: 1,
          maxWidth: 400,
          overflow: 'auto',
          '& .MuiTreeItem-content': {
            '&:hover': { backgroundColor: 'action.hover' },
          },
          '& .Mui-selected > .MuiTreeItem-content': {
            backgroundColor: 'action.selected',
            '&:hover': { backgroundColor: 'action.selectedHover' },
          },
        }}
      >
        {loading ? (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ p: 2 }}
          >
            {i18n.t('components.tree_builder.k1')}
          </Typography>
        ) : internalData.length === 0 ? (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ p: 2 }}
          >
            {i18n.t('components.tree_builder.k2')}
          </Typography>
        ) : (
          <TreeView
            expanded={expandedKeys.map(String)}
            selected={selectedKey !== null ? String(selectedKey) : ''}
            onNodeToggle={handleToggle}
            onNodeSelect={handleSelect}
            defaultExpandIcon={<ChevronRightIcon size={16} />}
            defaultEndIcon={<FileIcon size={16} />}
          >
            {renderTreeItems(internalData)}
          </TreeView>
        )}
      </Box>

      <Dialog
        open={editDialog.open}
        onClose={closeDialog}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          {editDialog.mode === 'edit'
            ? i18n.t('templates.tree_builder.k6')
            : i18n.t('templates.tree_builder.k5')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {dialogFields.map((field) => (
              <TextField
                key={field.name}
                label={field.label}
                value={editForm[field.name] ?? ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                required={field.required}
                fullWidth
                size='small'
                autoFocus={field.name === labelField}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{i18n.t('templates.tree_builder.k7')}</Button>
          <Button
            onClick={handleSave}
            variant='contained'
            disabled={!editForm[labelField]?.trim()}
          >
            {editDialog.mode === 'edit'
              ? i18n.t('templates.tree_builder.k9')
              : i18n.t('templates.tree_builder.k8')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TreeBuilder;
