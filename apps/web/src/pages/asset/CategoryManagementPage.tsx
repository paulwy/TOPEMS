import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Chip,
} from '@mui/material';
import { Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudTab } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { assetCategorySchema } from '@/schemas/erp/assetCategory';
import { assetCategoryApi } from '@/api/erp/finance/assetCategory';
import type { AssetCategory, CreateAssetCategoryRequest } from '@/api/erp/finance/assetCategory';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';

import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const baseAdapter = createCrudPageAdapter<AssetCategory, CreateAssetCategoryRequest>({
  list: assetCategoryApi.list,
  create: assetCategoryApi.create,
  update: assetCategoryApi.update,
  delete: assetCategoryApi.delete,
});

interface TreeNode {
  id: string;
  name: string;
  code: string;
  children: TreeNode[];
  parentId?: string | null;
  status?: string;
}

function buildTree(items: AssetCategory[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  items.forEach((item) => {
    map.set(item.id, {
      id: item.id,
      name: item.name,
      code: item.code,
      children: [],
      parentId: item.parentId,
      status: item.status,
    });
  });

  items.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function extractListData(response: unknown): AssetCategory[] {
  if (!response || typeof response !== 'object') return [];
  const obj = response as Record<string, unknown>;
  const data = obj.data;
  if (!data) return [];
  if (Array.isArray(data)) return data as AssetCategory[];
  if (typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.items)) return d.items as AssetCategory[];
    if (Array.isArray(d.data)) return d.data as AssetCategory[];
  }
  return [];
}

const TreeItem: React.FC<{
  node: TreeNode;
  level: number;
  selectedId: string | null;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}> = ({ node, level, selectedId, expanded, onSelect, onToggle }) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <>
      <ListItem
        disablePadding
        sx={{ display: 'block' }}
      >
        <ListItemButton
          selected={isSelected}
          onClick={() => onSelect(node.id)}
          sx={{
            pl: level * 2 + 1,
            minHeight: 40,
            borderRadius: 1,
            '&.Mui-selected': {
              backgroundColor: 'primary.lighter',
              '&:hover': {
                backgroundColor: 'primary.lighter',
              },
            },
          }}
        >
          {hasChildren ? (
            <ListItemIcon sx={{ minWidth: 28 }}>
              <Box
                component='span'
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(node.id);
                }}
                sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </Box>
            </ListItemIcon>
          ) : (
            <ListItemIcon sx={{ minWidth: 28 }}>
              <Folder
                size={16}
                color={isSelected ? 'primary' : undefined}
              />
            </ListItemIcon>
          )}
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {hasChildren &&
                  (isExpanded ? (
                    <FolderOpen
                      size={14}
                      style={{ color: isSelected ? 'var(--mui-palette-primary-main)' : undefined }}
                    />
                  ) : (
                    <Folder
                      size={14}
                      style={{ color: isSelected ? 'var(--mui-palette-primary-main)' : undefined }}
                    />
                  ))}
                <Typography
                  variant='body2'
                  sx={{
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? 'primary.main' : 'text.primary',
                  }}
                >
                  {node.name}
                </Typography>
              </Box>
            }
            secondary={node.code}
            slotProps={{ secondary: { variant: 'caption', sx: { fontSize: '0.75rem' } } }}
          />
        </ListItemButton>
      </ListItem>
      {hasChildren && (
        <Collapse
          in={isExpanded}
          timeout='auto'
          unmountOnExit
        >
          <List
            component='div'
            disablePadding
          >
            {node.children.map((child) => (
              <TreeItem
                key={child.id}
                node={child}
                level={level + 1}
                selectedId={selectedId}
                expanded={expanded}
                onSelect={onSelect}
                onToggle={onToggle}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

export const CategoryManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: categoriesResp } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.ASSET_CATEGORIES_BASE,
    queryFn: async () => assetCategoryApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const categories = extractListData(categoriesResp);
  const tree = useMemo(() => buildTree(categories), [categories]);

  const filteredCategories = useMemo(() => {
    if (!selectedCategoryId) return categories;
    const getDescendants = (id: string): string[] => {
      const node = categories.some((c) => c.id === id);
      if (!node) return [id];
      const children = categories.flatMap((c) => (c.parentId === id ? getDescendants(c.id) : []));
      return [id, ...children];
    };
    const ids = new Set(getDescendants(selectedCategoryId));
    return categories.filter((c) => ids.has(c.id));
  }, [categories, selectedCategoryId]);

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const treeContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 1 }}
        >
          {t('asset:categorymanagement.tree_title')}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1,
            borderRadius: 1,
            cursor: 'pointer',
            bgcolor: selectedCategoryId === null ? 'primary.lighter' : 'transparent',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => setSelectedCategoryId(null)}
        >
          <Folder
            size={16}
            color={selectedCategoryId === null ? 'primary' : undefined}
          />
          <Typography
            variant='body2'
            sx={{
              fontWeight: selectedCategoryId === null ? 600 : 400,
              color: selectedCategoryId === null ? 'primary.main' : 'text.primary',
            }}
          >
            {t('asset:categorymanagement.all_categories')}
          </Typography>
          <Chip
            label={categories.length}
            size='small'
            sx={{ ml: 'auto', height: 20, fontSize: '0.75rem' }}
          />
        </Box>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {tree.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            {t('asset:categorymanagement.no_category_data')}
          </Box>
        ) : (
          <List
            dense
            sx={{ width: '100%' }}
          >
            {tree.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                level={0}
                selectedId={selectedCategoryId}
                expanded={expanded}
                onSelect={setSelectedCategoryId}
                onToggle={handleToggle}
              />
            ))}
          </List>
        )}
      </Box>
    </Box>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Folder style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary.dark} 100%)`,
      }}
      maxWidth='xl'
    >
      <Box sx={{ display: 'flex', gap: 3, minHeight: 600 }}>
        <Drawer
          variant='permanent'
          anchor='left'
          sx={{
            width: 280,
            flexShrink: 0,
            position: 'relative',
            '& .MuiDrawer-paper': {
              width: 280,
              position: 'relative',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              height: 'auto',
              minHeight: 600,
            },
          }}
        >
          {treeContent}
        </Drawer>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <CrudPage
            schema={assetCategorySchema}
            apiAdapter={baseAdapter}
            breadcrumbs={[
              { label: t('asset:categorymanagement.breadcrumb_asset_management') },
              { label: t('asset:categorymanagement.breadcrumb_asset_category') },
            ]}
            detailMaxWidth='md'
          />
        </Box>
      </Box>
    </PageContainer>
  );
};

export default CategoryManagementPage;
