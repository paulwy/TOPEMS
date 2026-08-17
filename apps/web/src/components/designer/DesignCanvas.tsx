/**
 * DesignCanvas — 设计画布
 *
 * 显示和编辑页面节点。支持：
 * - 接收拖放的新组件
 * - 选中节点
 * - 显示组件预览
 * - 内联编辑节点标签
 */

import React from 'react';
import { Box, Paper, Typography, IconButton, Tooltip } from '@mui/material';
import { EmptyState } from '@topems/shared-components';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { LazyIcon } from '@/components/icons/LazyIcon';
import type { CanvasNode, DesignerComponent } from './types';
import { getComponentByType } from './types';
import i18n from '@/i18n';

interface DesignCanvasProps {
  nodes: CanvasNode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onDrop: (type: string, index?: number) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onAddNode: () => void;
}

export function DesignCanvas({
  nodes,
  selectedNodeId,
  onSelectNode,
  onDrop,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddNode,
}: DesignCanvasProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const type = e.dataTransfer.getData('component-type');
    if (type) {
      onDrop(type);
    }
  };

  if (nodes.length === 0) {
    return (
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed',
          borderColor: isDragOver ? 'primary.main' : 'divider',
          borderRadius: 2,
          bgcolor: isDragOver ? 'action.hover' : 'background.default',
          transition: 'all 0.2s',
          minHeight: 300,
        }}
      >
        <EmptyState
          icon='layout'
          title={i18n.t('components.design_canvas.k0')}
          description={i18n.t('components.design_canvas.k1')}
        >
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('components.design_canvas.k0')}
          </Typography>
        </EmptyState>
      </Box>
    );
  }

  return (
    <Box
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        flex: 1,
        overflow: 'auto',
        p: 2,
        border: '2px dashed',
        borderColor: isDragOver ? 'primary.main' : 'transparent',
        borderRadius: 2,
        bgcolor: isDragOver ? 'action.hover' : 'background.default',
        transition: 'all 0.2s',
      }}
    >
      {nodes.map((node, index) => (
        <CanvasNodeItem
          key={node.id}
          node={node}
          index={index}
          isSelected={selectedNodeId === node.id}
          onSelect={() => onSelectNode(node.id)}
          onRemove={() => onRemove(node.id)}
          onMoveUp={() => onMoveUp(node.id)}
          onMoveDown={() => onMoveDown(node.id)}
        />
      ))}
    </Box>
  );
}

interface CanvasNodeItemProps {
  node: CanvasNode;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function CanvasNodeItem({
  node,
  index,
  isSelected,
  onSelect,
  onRemove,
  onMoveUp,
  onMoveDown,
}: CanvasNodeItemProps) {
  const comp = getComponentByType(node.type);
  const iconName = comp?.icon || null;

  return (
    <Paper
      elevation={isSelected ? 3 : 1}
      onClick={onSelect}
      sx={{
        p: 1.5,
        mb: 1,
        border: isSelected ? '2px solid' : '1px solid',
        borderColor: isSelected ? 'primary.main' : 'divider',
        borderRadius: 1,
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.15s',
        '&:hover': {
          borderColor: isSelected ? 'primary.main' : 'grey.400',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {iconName && (
          <LazyIcon
            name={iconName}
            size={16}
          />
        )}
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {node.label}
        </Typography>
        {comp && (
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            ({comp.label})
          </Typography>
        )}

        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
          <Tooltip title={i18n.t('components.design_canvas.k2')}>
            <IconButton
              size='small'
              aria-label={i18n.t('components.design_canvas.k3')}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onMoveUp();
              }}
            >
              <ArrowUp size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title={i18n.t('components.design_canvas.k4')}>
            <IconButton
              size='small'
              aria-label={i18n.t('components.design_canvas.k5')}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onMoveDown();
              }}
            >
              <ArrowDown size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title={i18n.t('components.design_canvas.k6')}>
            <IconButton
              size='small'
              aria-label={i18n.t('components.design_canvas.k7')}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 size={14} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {Object.keys(node.props).length > 0 && (
        <Box sx={{ mt: 1, pl: 3 }}>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            {Object.entries(node.props)
              .filter(([k, v]) => k !== 'label' && k !== 'type' && v !== undefined && v !== '')
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(' | ')}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
