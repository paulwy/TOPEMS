import { designTokens } from '@topems/tokens';
/**
 * ComponentTree — 组件树
 *
 * 显示画布中节点的层级结构。
 * 支持选中、折叠、拖拽排序。
 */

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { LazyIcon } from '@/components/icons/LazyIcon';
import type { CanvasNode } from './types';
import { getComponentByType } from './types';
import i18n from '@/i18n';

interface ComponentTreeProps {
  nodes: CanvasNode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}

export function ComponentTree({ nodes, selectedNodeId, onSelectNode }: ComponentTreeProps) {
  if (nodes.length === 0) {
    return (
      <Paper
        elevation={1}
        sx={{
          width: 200,
          height: '100%',
          p: 1.5,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          {i18n.t('components.component_tree.k0')}
        </Typography>
      </Paper>
    );
  }

  const renderTreeItem = (node: CanvasNode) => {
    const comp = getComponentByType(node.type);
    const iconName = comp?.icon || null;

    const label = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {iconName && (
          <LazyIcon
            name={iconName}
            size={14}
          />
        )}
        <Typography
          variant='body2'
          sx={{ fontSize: designTokens.typography.fontSize.scale['0.8rem'] }}
        >
          {node.label}
        </Typography>
      </Box>
    );

    const treeItemProps = {
      key: node.id,
      nodeId: node.id,
      label,
      children: node.children?.map(renderTreeItem) ?? null,
    };

    return <TreeItem {...(treeItemProps as unknown as React.ComponentProps<typeof TreeItem>)} />;
  };

  return (
    <Paper
      elevation={1}
      sx={{
        width: 200,
        height: '100%',
        overflow: 'auto',
        p: 1.5,
        borderRadius: 2,
      }}
    >
      <Typography
        variant='subtitle2'
        sx={{ mb: 1, fontWeight: 600 }}
      >
        {i18n.t('components.component_tree.k1')}
      </Typography>

      <SimpleTreeView
        selectedItems={selectedNodeId ?? null}
        onItemSelectionToggle={(_, nodeId, isSelected) => onSelectNode(isSelected ? nodeId : null)}
        slots={{ expandIcon: ChevronRight, collapseIcon: ChevronDown }}
      >
        {nodes.map(renderTreeItem)}
      </SimpleTreeView>
    </Paper>
  );
}
