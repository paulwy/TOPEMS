import React, { useState } from 'react';
import { Box, IconButton, Typography, Chip } from '@mui/material';
import { Building2, Users, ChevronDown, ChevronRight } from 'lucide-react';
import type { TreeViewComponentProps, TreeNode } from '../types';

const TreeViewComponent: React.FC<TreeViewComponentProps> = ({ data, selectedId, onSelect }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedId === node.id;

    return (
      <Box key={node.id}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            py: 0.75,
            pl: level * 2 + 1,
            cursor: 'pointer',
            borderRadius: 1,
            bgcolor: isSelected ? 'primary.light' : 'transparent',
            '&:hover': {
              bgcolor: isSelected ? 'primary.light' : 'action.hover',
            },
          }}
          onClick={() => {
            if (node.type === 'department' && hasChildren) {
              toggleExpand(node.id);
            }
            onSelect(node);
          }}
        >
          {hasChildren && (
            <IconButton
              size='small'
              sx={{ p: 0.25 }}
            >
              {isExpanded ? (
                <ChevronDown sx={{ width: 16, height: 16 }} />
              ) : (
                <ChevronRight sx={{ width: 16, height: 16 }} />
              )}
            </IconButton>
          )}
          {!hasChildren && <Box sx={{ width: 24 }} />}
          {node.type === 'department' ? (
            <Building2 sx={{ width: 16, height: 16, color: 'success.main' }} />
          ) : (
            <Users sx={{ width: 16, height: 16, color: 'primary.main' }} />
          )}
          <Typography
            variant='body2'
            sx={{ flex: 1 }}
          >
            {node.name}
          </Typography>
          {node.type === 'department' && node.children && (
            <Chip
              label={node.children.length}
              size='small'
              sx={{ height: 20, fontSize: '0.75rem' }}
            />
          )}
        </Box>
        {hasChildren && isExpanded && (
          <Box>{node.children?.map((child: TreeNode) => renderNode(child, level + 1))}</Box>
        )}
      </Box>
    );
  };

  return <Box>{data.map((node) => renderNode(node))}</Box>;
};

export default TreeViewComponent;
