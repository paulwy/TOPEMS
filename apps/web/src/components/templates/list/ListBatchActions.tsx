import React from 'react';
import { Box, Typography, Button, ButtonGroup } from '@mui/material';
import { X } from 'lucide-react';
import type { BatchAction } from './types';

interface ListBatchActionsProps {
  show: boolean;
  selectedCount: number;
  onClearSelection: () => void;
  batchActions: BatchAction[];
}

export const ListBatchActions: React.FC<ListBatchActionsProps> = ({
  show,
  selectedCount,
  onClearSelection,
  batchActions,
}) => {
  if (!show || selectedCount === 0) return null;

  const availableActions = batchActions.filter((action) => {
    if (action.minSelected && selectedCount < action.minSelected) {
      return false;
    }
    if (action.showWhenSelected === false) {
      return false;
    }
    return true;
  });

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        p: 2,
        bgcolor: 'primary.50',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'primary.200',
      }}
    >
      <Typography
        variant='body2'
        sx={{ fontWeight: 500, color: 'primary.main' }}
      >
        已选择 {selectedCount} 条记录
      </Typography>

      <Button
        size='small'
        variant='outlined'
        onClick={onClearSelection}
        startIcon={<X size={16} />}
      >
        取消选择
      </Button>

      {availableActions.length > 0 && (
        <ButtonGroup
          size='small'
          variant='outlined'
        >
          {availableActions.map((action, index) => (
            <Button
              key={index}
              color={action.color || 'primary'}
              startIcon={action.icon}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </ButtonGroup>
      )}
    </Box>
  );
};
