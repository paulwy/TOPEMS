import React, { useState, useCallback } from 'react';
import { Box, Typography, IconButton, Collapse, Badge, SxProps, Theme } from '@mui/material';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';

export interface TreeNode {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  badge?: string | number;
  disabled?: boolean;
}

export interface TreeViewProps {
  data: TreeNode[];
  selected?: string;
  expanded?: string[];
  onSelect?: (node: TreeNode) => void;
  onExpand?: (nodeId: string) => void;
  density?: 'compact' | 'normal' | 'comfortable';
}

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  selected?: string;
  expanded: Set<string>;
  onSelect?: (node: TreeNode) => void;
  onToggle: (nodeId: string) => void;
  density: 'compact' | 'normal' | 'comfortable';
}

const densityStyles = {
  compact: {
    padding: '4px 8px',
    fontSize: '0.875rem',
    iconSize: 16,
    indent: 16,
  },
  normal: {
    padding: '8px 12px',
    fontSize: '1rem',
    iconSize: 20,
    indent: 24,
  },
  comfortable: {
    padding: '12px 16px',
    fontSize: '1.125rem',
    iconSize: 24,
    indent: 32,
  },
};

function TreeNodeItem({
  node,
  level,
  selected,
  expanded,
  onSelect,
  onToggle,
  density,
}: TreeNodeItemProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = selected === node.id;
  const isDisabled = node.disabled;

  const styles = densityStyles[density];

  const handleClick = useCallback(() => {
    if (!isDisabled) {
      onSelect?.(node);
    }
  }, [node, isDisabled, onSelect]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isDisabled && hasChildren) {
        onToggle(node.id);
      }
    },
    [node.id, isDisabled, hasChildren, onToggle]
  );

  const getNodeIcon = () => {
    if (node.icon) {
      return node.icon;
    }
    if (hasChildren) {
      return <Folder size={styles.iconSize} />;
    }
    return <File size={styles.iconSize} />;
  };

  const getExpandIcon = () => {
    if (!hasChildren) {
      return <Box sx={{ width: styles.iconSize, height: styles.iconSize }} />;
    }
    return isExpanded ? (
      <ChevronDown size={styles.iconSize} />
    ) : (
      <ChevronRight size={styles.iconSize} />
    );
  };

  return (
    <Box>
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: styles.padding,
          paddingLeft: level * styles.indent + 12,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          backgroundColor: isSelected ? 'action.selected' : 'transparent',
          opacity: isDisabled ? 0.5 : 1,
          '&:hover': {
            backgroundColor: isDisabled ? 'transparent' : 'action.hover',
          },
          transition: 'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          userSelect: 'none',
        }}
      >
        <IconButton
          size='small'
          onClick={handleToggle}
          disabled={isDisabled || !hasChildren}
          sx={{
            padding: 0.5,
            '&:hover': {
              backgroundColor: 'transparent',
            },
          }}
        >
          {getExpandIcon()}
        </IconButton>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flex: 1,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'text.secondary',
            }}
          >
            {getNodeIcon()}
          </Box>

          <Typography
            variant='body2'
            sx={{
              fontSize: styles.fontSize,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {node.label}
          </Typography>

          {node.badge !== undefined && (
            <Badge
              badgeContent={node.badge}
              color='primary'
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.75rem',
                  height: '20px',
                  minWidth: '20px',
                },
              }}
            />
          )}
        </Box>
      </Box>

      {hasChildren && (
        <Collapse
          in={isExpanded}
          timeout='auto'
          unmountOnExit
        >
          <Box>
            {node.children!.map((child) => (
              <TreeNodeItem
                key={child.id}
                node={child}
                level={level + 1}
                selected={selected}
                expanded={expanded}
                onSelect={onSelect}
                onToggle={onToggle}
                density={density}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

export default function TreeView({
  data,
  selected,
  expanded: controlledExpanded,
  onSelect,
  onExpand,
  density = 'normal',
}: TreeViewProps) {
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(
    () => new Set(controlledExpanded || [])
  );

  const expanded = controlledExpanded ? new Set(controlledExpanded) : internalExpanded;

  const handleToggle = useCallback(
    (nodeId: string) => {
      if (controlledExpanded) {
        onExpand?.(nodeId);
      } else {
        setInternalExpanded((prev) => {
          const next = new Set(prev);
          if (next.has(nodeId)) {
            next.delete(nodeId);
          } else {
            next.add(nodeId);
          }
          return next;
        });
        onExpand?.(nodeId);
      }
    },
    [controlledExpanded, onExpand]
  );

  return (
    <Box
      sx={{
        width: '100%',
        overflow: 'auto',
        '& .MuiIconButton-root': {
          color: 'text.secondary',
        },
      }}
    >
      {data.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          level={0}
          selected={selected}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={handleToggle}
          density={density}
        />
      ))}
    </Box>
  );
}
