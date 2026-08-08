import React from 'react';
import { Divider, Paper, Stack, Tooltip, Typography } from '@mui/material';
import type { AutomationNodeType } from '@/api/automation';
import { NODE_TYPE_BORDER_COLOR, NODE_TYPE_ICON, NODE_TYPE_LABEL } from '../shared';

export interface NodeLibraryProps {
  availableNodeTypes: AutomationNodeType[];
  nodesCount: number;
  onAddNodeAt: (type: AutomationNodeType, x: number, y: number) => void;
}

export const NodeLibrary: React.FC<NodeLibraryProps> = ({
  availableNodeTypes,
  nodesCount,
  onAddNodeAt,
}) => {
  return (
    <Paper
      variant='outlined'
      sx={{ p: 1.5, height: '100%', minHeight: 600 }}
    >
      <Typography
        variant='subtitle2'
        sx={{ mb: 1 }}
      >
        节点类型
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Stack spacing={1}>
        {availableNodeTypes.map((t) => {
          const Icon = NODE_TYPE_ICON[t];
          return (
            <Tooltip
              key={t}
              title='拖拽到画布或点击添加'
              placement='right'
            >
              <Paper
                variant='outlined'
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/node-type', t);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() =>
                  onAddNodeAt(t, 120 + (nodesCount % 6) * 30, 120 + (nodesCount % 6) * 30)
                }
                sx={{
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'grab',
                  borderColor: NODE_TYPE_BORDER_COLOR[t],
                  '&:hover': { boxShadow: 2 },
                  '&:active': { cursor: 'grabbing' },
                }}
              >
                {Icon && <Icon size={16} />}
                <Typography variant='body2'>{NODE_TYPE_LABEL[t]}</Typography>
              </Paper>
            </Tooltip>
          );
        })}
      </Stack>
    </Paper>
  );
};

export default NodeLibrary;
