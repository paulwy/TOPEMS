/**
 * ComponentTree — 组件树
 *
 * 显示画布中节点的层级结构。
 * 支持选中、折叠、拖拽排序。
 */

import React from 'react';
import { Box, Paper, Typography, TreeView, TreeItem, IconButton, Tooltip } from '@mui/material';
import * as LucideIcons from 'lucide-react';
import type { CanvasNode } from '../types';
import { getComponentByType } from '../types';

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
          无组件
        </Typography>
      </Paper>
    );
  }

  const renderTreeItem = (node: CanvasNode) => {
    const comp = getComponentByType(node.type);
    const IconComp = comp?.icon
      ? (LucideIcons as Record<string, React.ComponentType<{ size?: number }>>)[comp.icon]
      : null;

    const label = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {IconComp && <IconComp size={14} />}
        <Typography
          variant='body2'
          sx={{ fontSize: '0.8rem' }}
        >
          {node.label}
        </Typography>
      </Box>
    );

    return (
      <TreeItem
        key={node.id}
        nodeId={node.id}
        label={label}
      >
        {node.children?.map(renderTreeItem)}
      </TreeItem>
    );
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
        组件结构
      </Typography>

      <TreeView
        selected={selectedNodeId ?? ''}
        onNodeSelect={(_, nodeId) => onSelectNode(nodeId === selectedNodeId ? null : nodeId)}
        defaultExpandIcon={<LucideIcons.ChevronRight size={16} />}
        defaultCollapseIcon={<LucideIcons.ChevronDown size={16} />}
      >
        {nodes.map(renderTreeItem)}
      </TreeView>
    </Paper>
  );
}
